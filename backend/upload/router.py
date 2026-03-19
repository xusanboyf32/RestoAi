import os, uuid
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse

router     = APIRouter(prefix="/upload", tags=["Upload"])
UPLOAD_DIR = "./uploads"
ALLOWED    = {"image/jpeg", "image/png", "image/webp"}
MAX_SIZE   = 5 * 1024 * 1024

os.makedirs(UPLOAD_DIR, exist_ok=True)

@router.post("/image")
async def upload_image(file: UploadFile = File(...)):
    if file.content_type not in ALLOWED:
        raise HTTPException(400, "Faqat JPG, PNG, WEBP")
    content = await file.read()
    if len(content) > MAX_SIZE:
        raise HTTPException(400, "Max 5MB")
    ext      = file.filename.split(".")[-1].lower()
    filename = f"{uuid.uuid4().hex}.{ext}"
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        f.write(content)
    return {"url": f"/uploads/{filename}"}