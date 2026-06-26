import os
import requests
from pydantic import BaseModel
from fastapi import FastAPI, BackgroundTasks, HTTPException
import downloader
import logging

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

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
