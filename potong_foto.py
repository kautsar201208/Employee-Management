from pathlib import Path
from PIL import Image

# Lokasi folder dihitung berdasarkan lokasi script ini
BASE_DIR = Path(__file__).resolve().parent

# Folder foto asli dan folder hasil potongan
INPUT_FOLDER = BASE_DIR / "employee-photos"
OUTPUT_FOLDER = BASE_DIR / "employee-photos-cropped"

SUPPORTED_FORMATS = {".png", ".jpg", ".jpeg"}

def crop_employee_card(image_path, output_path):
    with Image.open(image_path) as image:
        width, height = image.size

        # Ambil sisi kiri kartu untuk membuang barcode di sisi kanan
        crop_width = width // 2
        cropped = image.crop((0, 0, crop_width, height))

        # Simpan hasil dalam format PNG
        cropped.save(output_path, format="PNG")

def main():
    if not INPUT_FOLDER.exists():
        print(f"Folder foto tidak ditemukan: {INPUT_FOLDER}")
        return

    OUTPUT_FOLDER.mkdir(parents=True, exist_ok=True)

    image_files = sorted(
        file for file in INPUT_FOLDER.iterdir()
        if file.is_file()
        and file.suffix.lower() in SUPPORTED_FORMATS
    )

    if not image_files:
        print("Tidak ada file gambar yang ditemukan.")
        return

    success = 0
    failed = 0

    for image_path in image_files:
        # Nama file dipertahankan, ekstensi hasil menjadi PNG
        output_path = OUTPUT_FOLDER / f"{image_path.stem}.png"

        try:
            crop_employee_card(image_path, output_path)
            success += 1
            print(f"Berhasil: {image_path.name}")
        except Exception as error:
            failed += 1
            print(f"Gagal: {image_path.name} - {error}")

    print("\n=== PEMROSESAN SELESAI ===")
    print(f"Total file: {len(image_files)}")
    print(f"Berhasil: {success}")
    print(f"Gagal: {failed}")
    print(f"Hasil tersimpan di: {OUTPUT_FOLDER}")

if __name__ == "__main__":
    main()