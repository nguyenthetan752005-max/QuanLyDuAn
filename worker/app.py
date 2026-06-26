import os
import requests
from pydantic import BaseModel
from fastapi import FastAPI, BackgroundTasks, HTTPException, UploadFile, File, Response
import downloader
import logging
import cv2
import numpy as np
from rembg import remove, new_session
from PIL import Image
import io

app = FastAPI()
logging.basicConfig(level=logging.INFO)
log = logging.getLogger(__name__)

# Cấu hình API Backend Java
JAVA_BACKEND_URL = "http://localhost:8081/api/internal/jobs/callback"
SHARED_STORAGE_DIR = os.path.join(os.getcwd(), "shared_storage")
os.makedirs(SHARED_STORAGE_DIR, exist_ok=True)

class DownloadRequest(BaseModel):
    job_id: str
    url: str
    max_duration: str | None = None

def process_download(job_id: str, url: str, max_duration_str: str | None = None):
    log.info(f"Bắt đầu xử lý job {job_id} cho url: {url}, max_duration: {max_duration_str}")
    try:
        max_duration = 600
        if max_duration_str:
            try:
                max_duration = int(max_duration_str)
            except ValueError:
                pass
                
        # Gọi hàm download đã được refactor từ downloader.py
        file_path = downloader.download_universal_video(url, output_dir=SHARED_STORAGE_DIR, max_duration=max_duration)
        
        # Gọi callback về Java
        callback_data = {
            "jobId": job_id,
            "status": "SUCCESS",
            "filePath": file_path
        }
        requests.post(JAVA_BACKEND_URL, json=callback_data)
        log.info(f"Job {job_id} hoàn thành, file: {file_path}")
        
    except Exception as e:
        log.error(f"Lỗi job {job_id}: {e}")
        callback_data = {
            "jobId": job_id,
            "status": "FAILED",
            "errorMessage": str(e)
        }
        requests.post(JAVA_BACKEND_URL, json=callback_data)

@app.post("/worker/download-video")
async def start_download(req: DownloadRequest, background_tasks: BackgroundTasks):
    # Khởi động process tải ngầm
    background_tasks.add_task(process_download, req.job_id, req.url, req.max_duration)
    return {"status": "processing", "job_id": req.job_id, "message": "Tiến trình tải đang chạy ngầm"}

# Initialize u2netp session once for performance (CPU friendly)
rembg_session = new_session("u2netp")

# Use absolute path for cascade to ensure it loads
cascade_path = cv2.data.haarcascades + "haarcascade_frontalface_default.xml"
face_cascade = cv2.CascadeClassifier(cascade_path)

@app.post("/api/worker/remove-bg")
async def remove_bg(image: UploadFile = File(...)):
    try:
        content = await image.read()
        input_image = Image.open(io.BytesIO(content))
        
        output_image = remove(input_image, session=rembg_session)
        
        img_io = io.BytesIO()
        output_image.save(img_io, 'PNG')
        img_io.seek(0)
        
        return Response(content=img_io.getvalue(), media_type="image/png")
    except Exception as e:
        log.error(f"Error in remove_bg: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/api/worker/detect-faces")
async def detect_faces(image: UploadFile = File(...)):
    try:
        content = await image.read()
        data = np.frombuffer(content, dtype=np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")
             
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        faces = face_cascade.detectMultiScale(
            gray, 
            scaleFactor=1.1, 
            minNeighbors=5, 
            minSize=(30, 30)
        )
        
        results = []
        for (x, y, w, h) in faces:
            results.append({
                "x": int(x),
                "y": int(y),
                "width": int(w),
                "height": int(h)
            })
            
        return {"faces": results}
    except Exception as e:
        log.error(f"Error in detect_faces: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
