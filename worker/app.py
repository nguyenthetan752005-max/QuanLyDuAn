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
import mediapipe as mp

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

# Initialize MediaPipe Face Detection
mp_face_detection = mp.solutions.face_detection
face_detection_model = mp_face_detection.FaceDetection(model_selection=1, min_detection_confidence=0.5)

@app.post("/api/worker/remove-bg")
def remove_bg(image: UploadFile = File(...)):
    try:
        content = image.file.read()
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
def detect_faces(image: UploadFile = File(...)):
    try:
        content = image.file.read()
        data = np.frombuffer(content, dtype=np.uint8)
        img = cv2.imdecode(data, cv2.IMREAD_COLOR)
        
        if img is None:
            raise HTTPException(status_code=400, detail="Invalid image")
             
        img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
        
        # Use MediaPipe to detect faces
        mp_results = face_detection_model.process(img_rgb)
        
        results = []
        if mp_results.detections:
            h_img, w_img, _ = img.shape
            for detection in mp_results.detections:
                bboxC = detection.location_data.relative_bounding_box
                
                # Bounding box values are relative, so multiply by image dimensions
                x = int(bboxC.xmin * w_img)
                y = int(bboxC.ymin * h_img)
                w = int(bboxC.width * w_img)
                h = int(bboxC.height * h_img)
                
                # Add some padding to cover the whole head properly
                pad_w = int(w * 0.1)
                pad_h = int(h * 0.1)
                x = max(0, x - pad_w)
                y = max(0, y - pad_h)
                w = min(w_img - x, w + 2 * pad_w)
                h = min(h_img - y, h + 2 * pad_h)

                results.append({
                    "x": x,
                    "y": y,
                    "width": w,
                    "height": h
                })
            
        return {"faces": results}
    except Exception as e:
        log.error(f"Error in detect_faces: {e}")
        raise HTTPException(status_code=500, detail=str(e))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
