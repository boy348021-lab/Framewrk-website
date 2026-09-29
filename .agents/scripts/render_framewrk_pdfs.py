import fitz
import os

files = [
    "attached_assets/FrameWrk_Website_Structure_1789527084870.pdf",
    "attached_assets/FrameWrk_Media_Brand_Kit_1789527084870.pdf",
]

os.makedirs(".agents/outputs", exist_ok=True)

for path in files:
    doc = fitz.open(path)
    stem = os.path.splitext(os.path.basename(path))[0]
    print(f"{stem}: {len(doc)} pages")
    for index, page in enumerate(doc):
        pixmap = page.get_pixmap(matrix=fitz.Matrix(1.5, 1.5), alpha=False)
        output = f".agents/outputs/{stem}-page-{index + 1}.png"
        pixmap.save(output)
        print(output)