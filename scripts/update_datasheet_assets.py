from pathlib import Path
import shutil
import subprocess

from PIL import Image
from pypdf import PdfReader, PdfWriter


ROOT = Path(__file__).resolve().parents[1]
CANVA = Path(r"D:\TOR\datasheetCarine2\DatasheetCanva")
TOR_DATA = Path(r"D:\TOR\datasheetCarine2\TOR - data")
PDF_OUT = ROOT / "assets" / "datasheets"
IMG_OUT = ROOT / "assets" / "product-images" / "tor-labeled"
TMP = ROOT / "tmp_pdf_pages"
PDFTOPPM = Path(
    r"C:\Users\vish8\.cache\codex-runtimes\codex-primary-runtime\dependencies\native\poppler\Library\bin\pdftoppm.exe"
)

PRODUCTS = [
    "DAC25GXXX",
    "QSFP100GLR410KM",
    "QSFP100GSR100M",
    "QSFP40GLR410KM",
    "QSFP40GSR100M",
    "SFP10G273310KM",
    "SFP10G273320KM",
    "SFP10G332710KM",
    "SFP10G332720KM",
    "SFP10GDLR10KM",
    "SFP10GDSR300M",
    "SFP10GRJ45100M",
    "SFP1G315510KM",
    "SFP1G553110KM",
    "SFP1GDSR550M",
    "SFP1GRJ45100M",
    "SFP25GDLR10KM",
    "SFP25GDSR100M",
]


def rotate_pdf_clockwise(src: Path, dest: Path) -> None:
    reader = PdfReader(str(src))
    writer = PdfWriter()
    for page in reader.pages:
        page.rotate(90)
        writer.add_page(page)
    with dest.open("wb") as handle:
        writer.write(handle)


def find_photo(product: str) -> Path | None:
    folder = next((p for p in TOR_DATA.iterdir() if p.is_dir() and p.name.lower().startswith(product.lower())), None)
    if not folder:
        return None
    images = sorted(
        [p for p in folder.iterdir() if p.suffix.lower() in {".png", ".jpg", ".jpeg"}],
        key=lambda p: (p.stem.lower() != product.lower(), "-2" not in p.stem.lower(), len(p.name)),
    )
    return images[0] if images else None


def crop_datasheet_image(product: str, pdf: Path, dest: Path) -> None:
    TMP.mkdir(exist_ok=True)
    prefix = TMP / f"{product}_page1"
    subprocess.run(
        [str(PDFTOPPM), "-png", "-f", "1", "-singlefile", str(pdf), str(prefix)],
        check=True,
    )
    rendered = prefix.with_suffix(".png")
    with Image.open(rendered) as img:
        width, height = img.size
        # Rendered after PDF rotation, this captures the clean product photo block.
        box = (
            int(width * 0.025),
            int(height * 0.115),
            int(width * 0.265),
            int(height * 0.355),
        )
        crop = img.crop(box)
        crop.save(dest)


def main() -> None:
    PDF_OUT.mkdir(parents=True, exist_ok=True)
    IMG_OUT.mkdir(parents=True, exist_ok=True)
    updated_images = []
    cropped_images = []

    crop_only = "--crop-only" in __import__("sys").argv

    for product in PRODUCTS:
        source_pdf = CANVA / product / f"{product}.pdf"
        if not source_pdf.exists():
            raise FileNotFoundError(source_pdf)
        dest_pdf = PDF_OUT / f"{product}.pdf"
        if not crop_only:
            rotate_pdf_clockwise(source_pdf, dest_pdf)

        dest_img = IMG_OUT / f"{product}.png"
        photo = find_photo(product)
        if photo and not crop_only:
            with Image.open(photo) as img:
                img.save(dest_img)
            updated_images.append(product)
        elif not photo:
            crop_datasheet_image(product, dest_pdf, dest_img)
            cropped_images.append(product)

    print(f"Rotated PDFs: {len(PRODUCTS)}")
    print(f"Copied photos: {', '.join(updated_images)}")
    print(f"Cropped from datasheet: {', '.join(cropped_images)}")


if __name__ == "__main__":
    main()
