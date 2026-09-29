from pathlib import Path

import pymupdf


source = Path("attached_assets/FRAMEWRK_MEDIA_CLIENT_BASE_FOR_WEBSITE_1790629004243.pdf")
output_dir = Path(".agents/outputs")
output_dir.mkdir(parents=True, exist_ok=True)

document = pymupdf.open(source)
page_index = 5 if document.page_count >= 6 else 0
page = document.load_page(page_index)
page_number = page_index + 1

rendered = page.get_pixmap(matrix=pymupdf.Matrix(2, 2), alpha=False)
render_path = output_dir / f"framewrk-client-page-{page_number}.png"
rendered.save(render_path)

print(f"Page count: {document.page_count}")
print(f"Rendered page {page_number}: {render_path}")
print(f"Page {page_number} text:\n{page.get_text()}")

seen_xrefs = set()
for image_index, image_info in enumerate(page.get_images(full=True), start=1):
    xref = image_info[0]
    if xref in seen_xrefs:
        continue
    seen_xrefs.add(xref)
    image = document.extract_image(xref)
    image_path = output_dir / f"framewrk-client-page-{page_number}-image-{image_index}.{image['ext']}"
    image_path.write_bytes(image["image"])
    print(f"Embedded image {image_index}: {image_path} ({image['width']}x{image['height']})")