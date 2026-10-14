from pathlib import Path
from collections import Counter
import csv
import re

BASE_DIR = Path(__file__).resolve().parent
ORIGINAL_FOLDER = BASE_DIR / "employee-photos"
CROPPED_FOLDER = BASE_DIR / "employee-photos-cropped"
REPORT_FILE = BASE_DIR / "laporan_pemeriksaan_foto.csv"

SUPPORTED_FORMATS = {".png", ".jpg", ".jpeg"}


def normalize_filename(filename):
    """Normalisasi nama file untuk perbandingan."""
    stem = Path(filename).stem.casefold().strip()
    stem = re.sub(r"\s+", " ", stem)
    return stem


def get_images(folder):
    if not folder.exists():
        raise FileNotFoundError(f"Folder tidak ditemukan: {folder}")

    return sorted(
        file for file in folder.iterdir()
        if file.is_file()
        and file.suffix.lower() in SUPPORTED_FORMATS
    )


def main():
    originals = get_images(ORIGINAL_FOLDER)
    cropped = get_images(CROPPED_FOLDER)

    original_map = {}
    cropped_map = {}

    for file in originals:
        original_map.setdefault(
            normalize_filename(file.name), []
        ).append(file.name)

    for file in cropped:
        cropped_map.setdefault(
            normalize_filename(file.name), []
        ).append(file.name)

    rows = []

    all_keys = sorted(set(original_map) | set(cropped_map))

    for key in all_keys:
        original_names = original_map.get(key, [])
        cropped_names = cropped_map.get(key, [])

        if len(original_names) > 1 or len(cropped_names) > 1:
            status = "PERIKSA_NAMA_DUPLIKAT"
        elif original_names and cropped_names:
            status = "NAMA_COCOK"
        elif original_names:
            status = "HASIL_POTONGAN_TIDAK_DITEMUKAN"
        else:
            status = "FILE_HASIL_TANPA_FILE_ASLI"

        rows.append({
            "nama_file_asli": "; ".join(original_names),
            "nama_file_hasil": "; ".join(cropped_names),
            "status": status
        })

    with REPORT_FILE.open(
        "w", newline="", encoding="utf-8-sig"
    ) as csvfile:
        writer = csv.DictWriter(
            csvfile,
            fieldnames=[
                "nama_file_asli",
                "nama_file_hasil",
                "status"
            ]
        )
        writer.writeheader()
        writer.writerows(rows)

    counts = Counter(row["status"] for row in rows)

    print("\n=== PEMERIKSAAN NAMA FILE SELESAI ===")
    print(f"Jumlah foto asli: {len(originals)}")
    print(f"Jumlah hasil potongan: {len(cropped)}")
    print(f"Nama cocok: {counts['NAMA_COCOK']}")
    print(
        "Hasil potongan tidak ditemukan: "
        f"{counts['HASIL_POTONGAN_TIDAK_DITEMUKAN']}"
    )
    print(
        "File hasil tanpa file asli: "
        f"{counts['FILE_HASIL_TANPA_FILE_ASLI']}"
    )
    print(
        "Nama duplikat yang perlu diperiksa: "
        f"{counts['PERIKSA_NAMA_DUPLIKAT']}"
    )
    print(f"\nLaporan: {REPORT_FILE}")


if __name__ == "__main__":
    try:
        main()
    except Exception as error:
        print(f"Terjadi kesalahan: {error}")