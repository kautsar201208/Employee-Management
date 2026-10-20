import argparse
import datetime
import json
import posixpath
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path
from zipfile import ZipFile


NAMESPACE = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "relationships": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "package_relationships": "http://schemas.openxmlformats.org/package/2006/relationships",
}
DATE_FIELDS = ("tmt_cpns", "tmt_kgb_terakhir", "kgb_selanjutnya")


def read_env_file(path):
    values = {}
    if not path.exists():
        raise RuntimeError(f"Backend environment file was not found: {path}")

    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        value = value.strip()
        if len(value) >= 2 and value[0] == value[-1] and value[0] in "\"'":
            value = value[1:-1]
        values[key.strip()] = value
    return values


def cell_column(cell_reference):
    return "".join(char for char in cell_reference if char.isalpha())


def read_cell_value(cell, shared_strings):
    cell_type = cell.get("t")
    if cell_type == "inlineStr":
        return "".join(
            text.text or ""
            for text in cell.findall(".//main:t", NAMESPACE)
        )

    value = cell.find("main:v", NAMESPACE)
    if value is None or value.text is None:
        return ""
    if cell_type == "s":
        return shared_strings[int(value.text)]
    return value.text


def excel_date(value):
    if not value:
        return None
    try:
        return (
            datetime.datetime(1899, 12, 30)
            + datetime.timedelta(days=float(value))
        ).date().isoformat()
    except (ValueError, OverflowError):
        try:
            return datetime.date.fromisoformat(value[:10]).isoformat()
        except ValueError as error:
            raise ValueError(f"Invalid workbook date value: {value}") from error


def read_workbook(path):
    with ZipFile(path) as workbook:
        workbook_xml = ET.fromstring(workbook.read("xl/workbook.xml"))
        relationships_xml = ET.fromstring(
            workbook.read("xl/_rels/workbook.xml.rels")
        )
        relationships = {
            relationship.get("Id"): relationship.get("Target")
            for relationship in relationships_xml.findall(
                "package_relationships:Relationship", NAMESPACE
            )
        }
        first_sheet = workbook_xml.find(
            "main:sheets/main:sheet", NAMESPACE
        )
        if first_sheet is None:
            raise ValueError("Workbook does not contain a worksheet.")

        sheet_target = relationships.get(
            first_sheet.get(f"{{{NAMESPACE['relationships']}}}id")
        )
        if not sheet_target:
            raise ValueError("Workbook worksheet relationship is missing.")
        sheet_path = posixpath.normpath(
            posixpath.join("xl", sheet_target.lstrip("/"))
            if not sheet_target.startswith("/")
            else sheet_target.lstrip("/")
        )

        shared_strings = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            shared_xml = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(
                    text.text or ""
                    for text in item.findall(".//main:t", NAMESPACE)
                )
                for item in shared_xml.findall("main:si", NAMESPACE)
            ]

        sheet_xml = ET.fromstring(workbook.read(sheet_path))
        rows = []
        for row in sheet_xml.findall(".//main:sheetData/main:row", NAMESPACE):
            values = {
                cell_column(cell.get("r", "")): read_cell_value(
                    cell, shared_strings
                )
                for cell in row.findall("main:c", NAMESPACE)
            }
            rows.append((int(row.get("r", "0")), values))

    header_row = None
    required_headers = {
        "nip": "nip",
        "nama": "name",
        "tmt kgb terakhir": "tmt_kgb_terakhir",
        "kgb selanjutnya": "kgb_selanjutnya",
        "tmt cpns": "tmt_cpns",
    }
    column_map = {}
    for row_number, values in rows:
        normalized_headers = {
            str(value).strip().casefold(): column
            for column, value in values.items()
        }
        if all(header in normalized_headers for header in required_headers):
            header_row = row_number
            column_map = {
                field: normalized_headers[header]
                for header, field in required_headers.items()
            }
            break
    if header_row is None:
        raise ValueError("Required NIP and KGB column headers were not found.")

    employees = []
    for row_number, values in rows:
        if row_number <= header_row:
            continue
        nip = str(values.get(column_map["nip"], "")).strip()
        name = str(values.get(column_map["name"], "")).strip()
        if not nip and not name:
            continue
        if not re.fullmatch(r"\d{18}", nip):
            raise ValueError(
                f"Row {row_number} has an invalid 18-digit NIP."
            )
        employees.append(
            {
                "nip": nip,
                "name": name,
                "tmt_cpns": excel_date(
                    str(values.get(column_map["tmt_cpns"], "")).strip()
                ),
                "tmt_kgb_terakhir": excel_date(
                    str(values.get(column_map["tmt_kgb_terakhir"], "")).strip()
                ),
                "kgb_selanjutnya": excel_date(
                    str(values.get(column_map["kgb_selanjutnya"], "")).strip()
                ),
            }
        )

    nips = [employee["nip"] for employee in employees]
    if len(nips) != len(set(nips)):
        raise ValueError("Workbook contains duplicate NIP values.")
    return employees


def normalize_name(value):
    return " ".join(str(value or "").casefold().split())


def api_request(base_url, api_key, path, method="GET", body=None):
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    if method == "PATCH":
        headers["Prefer"] = "return=representation"
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/rest/v1/{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            response_body = response.read()
            return json.loads(response_body) if response_body else []
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(detail).get("message", detail)
        except (AttributeError, json.JSONDecodeError):
            pass
        raise RuntimeError(
            f"Database request failed ({error.code}): {detail}"
        ) from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Database is unavailable: {error.reason}") from error


def main():
    parser = argparse.ArgumentParser(
        description="Preview or import KGB dates from the monitoring workbook."
    )
    parser.add_argument("workbook", type=Path)
    parser.add_argument(
        "--apply",
        action="store_true",
        help="Write the three validated date fields to matched employees.",
    )
    args = parser.parse_args()

    workbook_path = args.workbook.resolve()
    if not workbook_path.is_file():
        raise FileNotFoundError(f"Workbook was not found: {workbook_path}")
    workbook_rows = read_workbook(workbook_path)
    if not workbook_rows:
        raise ValueError("Workbook does not contain employee rows.")

    env = read_env_file(Path(__file__).resolve().parents[1] / ".env")
    base_url = env.get("SUPABASE_URL", "").rstrip("/")
    api_key = env.get("SUPABASE_SECRET_KEY", "")
    if not base_url or not api_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SECRET_KEY must be configured in backend/.env."
        )

    employees = api_request(
        base_url,
        api_key,
        "employees?select=id,nip,nama_lengkap,nama&limit=2000",
    )
    employee_by_nip = {}
    duplicate_db_nips = set()
    for employee in employees:
        nip = str(employee.get("nip") or "").strip()
        if not nip:
            continue
        if nip in employee_by_nip:
            duplicate_db_nips.add(nip)
        employee_by_nip[nip] = employee

    matched = [
        row for row in workbook_rows if row["nip"] in employee_by_nip
    ]
    unmatched = [
        row for row in workbook_rows if row["nip"] not in employee_by_nip
    ]
    name_differences = [
        row
        for row in matched
        if normalize_name(
            employee_by_nip[row["nip"]].get("nama_lengkap")
            or employee_by_nip[row["nip"]].get("nama")
        )
        != normalize_name(row["name"])
    ]
    print(f"Workbook employees: {len(workbook_rows)}")
    print(f"Matched by NIP: {len(matched)}")
    print(f"Unmatched workbook employees: {len(unmatched)}")
    print(f"Duplicate NIP values in database: {len(duplicate_db_nips)}")
    print(f"Name formatting differences on NIP matches: {len(name_differences)}")
    print(
        "Missing KGB dates in workbook: "
        f"{sum(row['tmt_kgb_terakhir'] is None or row['kgb_selanjutnya'] is None for row in workbook_rows)}"
    )

    if unmatched or duplicate_db_nips:
        unmatched_names = ", ".join(row["name"] for row in unmatched)
        raise RuntimeError(
            "No employee records were changed because the workbook has "
            f"unmatched employees ({unmatched_names}) or duplicate database NIPs."
        )

    api_request(
        base_url,
        api_key,
        "employees?select=id,tmt_cpns,tmt_kgb_terakhir,kgb_selanjutnya&limit=1",
    )
    if not args.apply:
        print("Preview only. No employee records were changed.")
        print("Use --apply after reviewing this preview to write the three date fields.")
        return

    updated = 0
    try:
        for row in workbook_rows:
            employee_id = str(employee_by_nip[row["nip"]]["id"])
            employee_id_filter = urllib.parse.quote(employee_id, safe="")
            updated_employee = api_request(
                base_url,
                api_key,
                f"employees?id=eq.{employee_id_filter}&select=id,nip",
                method="PATCH",
                body={field: row[field] for field in DATE_FIELDS},
            )
            if len(updated_employee) != 1:
                raise RuntimeError(
                    f"Expected one updated employee for NIP ending {row['nip'][-4:]}, "
                    f"received {len(updated_employee)}."
                )
            updated += 1
    except RuntimeError as error:
        raise RuntimeError(
            f"Import stopped after updating {updated} of {len(workbook_rows)} "
            f"employees. The operation is safe to rerun: {error}"
        ) from error

    print(
        f"Import complete: updated {updated} employees. "
        "Unmatched database employees and all other employee fields were left unchanged."
    )


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError, RuntimeError) as error:
        print(f"Import failed: {error}", file=sys.stderr)
        sys.exit(1)
