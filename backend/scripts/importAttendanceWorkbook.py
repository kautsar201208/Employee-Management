import argparse
import json
import math
import posixpath
import re
import sys
import urllib.error
import urllib.parse
import urllib.request
import xml.etree.ElementTree as ET
from collections import Counter, defaultdict
from pathlib import Path
from zipfile import ZipFile


NAMESPACE = {
    "main": "http://schemas.openxmlformats.org/spreadsheetml/2006/main",
    "relationships": "http://schemas.openxmlformats.org/officeDocument/2006/relationships",
    "package_relationships": "http://schemas.openxmlformats.org/package/2006/relationships",
}
ACCUMULATION_COLUMNS = {
    "alpha_days": "BL",
    "late_minutes": "BM",
    "early_leave_minutes": "BN",
    "forgot_clock_in_count": "BO",
    "forgot_clock_out_count": "BP",
}


def read_env_file(path):
    if not path.exists():
        raise RuntimeError(f"Backend environment file was not found: {path}")
    values = {}
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


def cell_value(cell, shared_strings):
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


def parse_integer(value, field, row_number):
    if not value:
        return 0
    try:
        number = float(value)
    except ValueError as error:
        raise ValueError(
            f"Invalid {field} in workbook row {row_number}: {value}"
        ) from error
    if not math.isfinite(number) or number < 0 or not number.is_integer():
        raise ValueError(
            f"Expected a non-negative integer for {field} "
            f"in workbook row {row_number}: {value}"
        )
    return int(number)


def excel_duration_minutes(value, field, row_number):
    if not value:
        return 0
    try:
        excel_day_fraction = float(value)
    except ValueError as error:
        raise ValueError(
            f"Invalid Excel time for {field} in row {row_number}: {value}"
        ) from error
    minutes = excel_day_fraction * 24 * 60
    rounded_minutes = round(minutes)
    if (
        not math.isfinite(minutes)
        or minutes < 0
        or not math.isclose(minutes, rounded_minutes, abs_tol=0.001)
    ):
        raise ValueError(
            f"Expected {field} to contain whole minutes in row {row_number}: "
            f"{value}"
        )
    return rounded_minutes


def read_workbook(path):
    with ZipFile(path) as workbook:
        workbook_xml = ET.fromstring(workbook.read("xl/workbook.xml"))
        relationships_xml = ET.fromstring(
            workbook.read("xl/_rels/workbook.xml.rels")
        )
        relationships = {
            item.get("Id"): item.get("Target")
            for item in relationships_xml.findall(
                "package_relationships:Relationship", NAMESPACE
            )
        }
        sheet = workbook_xml.find("main:sheets/main:sheet", NAMESPACE)
        if sheet is None:
            raise ValueError("Workbook does not contain a worksheet.")

        target = relationships.get(
            sheet.get(f"{{{NAMESPACE['relationships']}}}id")
        )
        if not target:
            raise ValueError("Workbook worksheet relationship is missing.")
        sheet_path = (
            posixpath.normpath(posixpath.join("xl", target))
            if not target.startswith("/")
            else posixpath.normpath(target.lstrip("/"))
        )

        shared_strings = []
        if "xl/sharedStrings.xml" in workbook.namelist():
            strings_xml = ET.fromstring(workbook.read("xl/sharedStrings.xml"))
            shared_strings = [
                "".join(
                    item.text or ""
                    for item in string.findall(".//main:t", NAMESPACE)
                )
                for string in strings_xml.findall("main:si", NAMESPACE)
            ]

        worksheet = ET.fromstring(workbook.read(sheet_path))
        data_rows = []
        for row in worksheet.findall(".//main:sheetData/main:row", NAMESPACE):
            values = {
                cell_column(cell.get("r", "")): cell_value(cell, shared_strings)
                for cell in row.findall("main:c", NAMESPACE)
            }
            data_rows.append((int(row.get("r", "0")), values))

    employee_header_row = next(
        (
            row_number
            for row_number, values in data_rows
            if values.get("B", "").strip().casefold() == "nama"
            and values.get("C", "").strip().casefold() == "nip"
        ),
        None,
    )
    accumulation_header_row = next(
        (
            row_number
            for row_number, values in data_rows
            if values.get("BL", "").strip().casefold() == "alpha"
            and values.get("BO", "").strip().casefold()
            == "lupa absen datang"
            and values.get("BP", "").strip().casefold()
            == "lupa absen pulang"
        ),
        None,
    )
    if employee_header_row is None or accumulation_header_row is None:
        raise ValueError(
            "Expected Nama/NIP headers and accumulation columns BL through "
            "BP were not found."
        )
    first_data_row = max(employee_header_row, accumulation_header_row) + 1

    employees = []
    for row_number, values in data_rows:
        if row_number < first_data_row:
            continue
        nip = values.get("C", "").strip()
        name = values.get("B", "").strip()
        if not nip and not name:
            continue
        if not re.fullmatch(r"\d{18}", nip):
            raise ValueError(
                f"Invalid 18-digit NIP in workbook row {row_number}."
            )
        employee = {"nip": nip, "name": name}
        for field, column in ACCUMULATION_COLUMNS.items():
            raw_value = values.get(column, "").strip()
            if field in ("late_minutes", "early_leave_minutes"):
                employee[field] = excel_duration_minutes(
                    raw_value, field, row_number
                )
            else:
                employee[field] = parse_integer(
                    raw_value, field, row_number
                )
        employees.append(employee)

    nips = [employee["nip"] for employee in employees]
    if len(nips) != len(set(nips)):
        raise ValueError("Workbook contains duplicate NIP values.")
    if not employees:
        raise ValueError("Workbook contains no employee accumulation rows.")
    return employees


def normalize_name(value):
    return " ".join(str(value or "").strip().casefold().split())


def match_employees(workbook_employees, database_employees):
    by_nip = defaultdict(list)
    by_name = defaultdict(list)
    for employee in database_employees:
        nip = str(employee.get("nip") or "").strip()
        if nip:
            by_nip[nip].append(employee)
        names = {
            normalize_name(employee.get("nama")),
            normalize_name(employee.get("nama_lengkap")),
        } - {""}
        for name in names:
            by_name[name].append(employee)

    matches = []
    issues = []
    used_employee_ids = set()
    for workbook_employee in workbook_employees:
        nip_matches = by_nip.get(workbook_employee["nip"], [])
        match_method = "nip"
        candidates = nip_matches
        if not candidates:
            match_method = "unique_name"
            candidates = by_name.get(normalize_name(workbook_employee["name"]), [])
            unique_candidates = {
                str(candidate.get("id")): candidate for candidate in candidates
            }
            candidates = list(unique_candidates.values())

        if len(candidates) != 1:
            issues.append(
                {
                    "name": workbook_employee["name"],
                    "nip": workbook_employee["nip"],
                    "reason": "not_found" if not candidates else "ambiguous",
                }
            )
            continue

        employee = candidates[0]
        employee_id = str(employee.get("id") or "")
        if not employee_id or employee_id in used_employee_ids:
            issues.append(
                {
                    "name": workbook_employee["name"],
                    "nip": workbook_employee["nip"],
                    "reason": "duplicate_employee_match",
                }
            )
            continue
        used_employee_ids.add(employee_id)
        matches.append(
            {
                **{
                    key: value
                    for key, value in workbook_employee.items()
                    if key != "name"
                },
                "employee_id": employee_id,
                "attendance_year": 2026,
                "match_method": match_method,
            }
        )
    return matches, issues


def summarize(rows):
    alpha_days = sum(row["alpha_days"] for row in rows)
    forgot_clock_in = sum(row["forgot_clock_in_count"] for row in rows)
    forgot_clock_out = sum(row["forgot_clock_out_count"] for row in rows)
    forgotten_days = (forgot_clock_in + forgot_clock_out) * 120 / 450
    return {
        "employee_count": len(rows),
        "alpha_days": alpha_days,
        "late_minutes": sum(row["late_minutes"] for row in rows),
        "early_leave_minutes": sum(
            row["early_leave_minutes"] for row in rows
        ),
        "forgot_clock_in_count": forgot_clock_in,
        "forgot_clock_out_count": forgot_clock_out,
        "forgotten_attendance_alpha_days": forgotten_days,
        "total_alpha_equivalent_days": alpha_days + forgotten_days,
    }


def api_request(base_url, api_key, path, method="GET", body=None):
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Accept": "application/json",
    }
    data = None
    if body is not None:
        headers["Content-Type"] = "application/json"
        headers["Prefer"] = "resolution=merge-duplicates,return=representation"
        data = json.dumps(body).encode("utf-8")
    request = urllib.request.Request(
        f"{base_url}/rest/v1/{path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=45) as response:
            response_body = response.read()
            return json.loads(response_body) if response_body else []
    except urllib.error.HTTPError as error:
        detail = error.read().decode("utf-8", errors="replace")
        try:
            detail = json.loads(detail).get("message", detail)
        except (AttributeError, json.JSONDecodeError):
            pass
        raise RuntimeError(
            f"Supabase request failed ({error.code}): {detail}"
        ) from error
    except urllib.error.URLError as error:
        raise RuntimeError(f"Supabase is unavailable: {error.reason}") from error


def main():
    parser = argparse.ArgumentParser(
        description="Import annual attendance accumulation into Supabase."
    )
    parser.add_argument("workbook", type=Path)
    parser.add_argument("--apply", action="store_true")
    arguments = parser.parse_args()

    workbook_path = arguments.workbook.resolve()
    if not workbook_path.is_file():
        raise FileNotFoundError(f"Workbook was not found: {workbook_path}")
    workbook_rows = read_workbook(workbook_path)

    env = read_env_file(Path(__file__).resolve().parents[1] / ".env")
    base_url = env.get("SUPABASE_URL", "").rstrip("/")
    api_key = env.get("SUPABASE_SECRET_KEY", "")
    if not base_url or not api_key:
        raise RuntimeError(
            "SUPABASE_URL and SUPABASE_SECRET_KEY must be configured "
            "in backend/.env."
        )

    database_employees = api_request(
        base_url,
        api_key,
        "employees?select=id,nip,nama,nama_lengkap&limit=2000",
    )
    matches, issues = match_employees(workbook_rows, database_employees)
    fallback_matches = [
        row for row in matches if row["match_method"] == "unique_name"
    ]
    print(f"Workbook employees: {len(workbook_rows)}")
    print(f"Matched by NIP: {len(matches) - len(fallback_matches)}")
    print(f"Matched by unique name (NIP differs): {len(fallback_matches)}")
    print(f"Unmatched or ambiguous employees: {len(issues)}")
    print("Summary:", json.dumps(summarize(workbook_rows), ensure_ascii=False))
    for issue in issues:
        print(
            f"Needs review: {issue['name']} (NIP {issue['nip']}): "
            f"{issue['reason']}"
        )

    if issues:
        raise RuntimeError(
            "No attendance summaries were written because at least one "
            "workbook employee could not be matched uniquely."
        )
    if len(matches) != len(workbook_rows):
        raise RuntimeError("Not all workbook rows were matched.")

    if not arguments.apply:
        print("Preview only. No attendance summaries were written.")
        print("Use --apply after reviewing this preview.")
        return

    rows_to_write = [
        {
            key: value
            for key, value in row.items()
            if key not in ("match_method", "nip")
        }
        for row in matches
    ]
    result = api_request(
        base_url,
        api_key,
        "employee_attendance_summaries?on_conflict=employee_id%2Cattendance_year",
        method="POST",
        body=rows_to_write,
    )
    if len(result) != len(rows_to_write):
        raise RuntimeError(
            f"Expected {len(rows_to_write)} stored summaries; "
            f"Supabase returned {len(result)}."
        )
    print(f"Import complete: stored {len(result)} summaries for 2026.")


if __name__ == "__main__":
    try:
        main()
    except (FileNotFoundError, ValueError, RuntimeError) as error:
        print(f"Attendance import failed: {error}", file=sys.stderr)
        sys.exit(1)
