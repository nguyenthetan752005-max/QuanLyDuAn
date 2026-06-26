"""
Universal Video Downloader
Hỗ trợ: TikTok, Douyin, Instagram, YouTube
"""
import os
import re
import logging
import requests
import yt_dlp
from contextlib import contextmanager
from dataclasses import dataclass, field
from playwright.sync_api import sync_playwright, BrowserContext, Response
 
logging.basicConfig(level=logging.INFO, format="[%(levelname)s] %(message)s")
log = logging.getLogger(__name__)
 
# ─── Cấu hình ────────────────────────────────────────────────────────────────
 
SUPPORTED_DOMAINS = re.compile(
    r"(douyin\.com|tiktok\.com|instagram\.com|youtube\.com|youtu\.be)",
    re.IGNORECASE,
)
 
REFERER_MAP = {
    "douyin.com":   "https://www.douyin.com/",
    "tiktok.com":   "https://www.tiktok.com/",
    "instagram.com":"https://www.instagram.com/",
    "youtube.com":  "https://www.youtube.com/",
    "youtu.be":     "https://www.youtube.com/",
}
 
WORKER_DIR      = os.path.dirname(os.path.abspath(__file__))
BOT_PROFILE_DIR = os.path.join(WORKER_DIR, "bot_profile")
COOKIE_FILE     = os.path.join(WORKER_DIR, "temp_cookies.txt")
 
# ─── Data class ──────────────────────────────────────────────────────────────
 
@dataclass
class CaptureResult:
    direct_url: str | None = None
    title: str = "video_media"
    is_note: bool = False
    is_tiktok: bool = False         # FIX: đánh dấu nguồn TikTok để routing đúng
    user_agent: str = ""
    resolved_url: str = ""
    cookies: list = field(default_factory=list)
    quality_info: str = ""
    capture_layer: int = 0
    duration: int = 0
 
 
# ─── Helpers ─────────────────────────────────────────────────────────────────
 
def sanitize_title(text: str, max_len: int = 60) -> str:
    return re.sub(r'[\\/*?:"<>|]', "", text)[:max_len].strip()
 
 
def get_referer(url: str) -> str:
    for domain, referer in REFERER_MAP.items():
        if domain in url:
            return referer
    return "https://www.google.com/"
 
 
def is_tiktok_url(url: str) -> bool:
    return "tiktok.com" in url.lower()
 
 
def write_netscape_cookies(path: str, cookies: list) -> None:
    with open(path, "w", encoding="utf-8") as f:
        f.write("# Netscape HTTP Cookie File\n")
        for c in cookies:
            expires = c.get("expires") or 0
            expires = 0 if expires < 0 else int(expires)
            secure  = "TRUE" if c.get("secure") else "FALSE"
            domain  = c["domain"]
            if not domain.startswith(".") and domain.count(".") > 1:
                domain = "." + domain
            include_sub = "TRUE" if domain.startswith(".") else "FALSE"
            f.write(
                f"{domain}\t{include_sub}\t{c['path']}\t"
                f"{secure}\t{expires}\t{c['name']}\t{c['value']}\n"
            )
 
 
# ─── Playwright layer ────────────────────────────────────────────────────────
 
@contextmanager
def open_browser():
    """Context manager mở persistent Chromium và đóng đúng cách."""
    with sync_playwright() as p:
        ctx = p.chromium.launch_persistent_context(
            user_data_dir=BOT_PROFILE_DIR,
            headless=False,
            channel="chrome",
            args=["--disable-blink-features=AutomationControlled", "--start-maximized"],
            ignore_default_args=["--enable-automation"],
            no_viewport=True,
        )
        try:
            yield ctx
        finally:
            ctx.close()
 
 
def _on_response(response: Response, result: CaptureResult) -> None:
    """Callback xử lý từng network response — Lớp 1 & Lớp 2."""
    url = response.url
 
    # Lớp 1: Bắt luồng video qua content-type / URL pattern
    if not result.direct_url and not result.is_note and result.capture_layer == 0:
        try:
            ct = response.headers.get("content-type", "").lower()
            
            # Đã bổ sung 'fbcdn' và 'cdninstagram'
            is_video_cdn = any(k in url for k in (
                "douyinvod", "tiktokcdn", "tos", "v16-webapp", "v19-webapp",
                "fbcdn", "cdninstagram" 
            ))
            
            # Fix thêm: URL Reels đôi khi không có chữ "video" rõ ràng, 
            # dựa mạnh hơn vào is_video_cdn và content-type.
            if ("video/" in ct or is_video_cdn) and "audio" not in url:
                result.direct_url    = url
                result.capture_layer = 1
                result.quality_info  = "stream (chất lượng cao nhất từ browser)"
                log.info("Lớp 1 – Bắt được stream video qua Network (fallback)")
        except Exception as exc:
            log.debug("Lớp 1 parse error: %s", exc)
 
    # Lớp 2: Trích xuất từ API Douyin/TikTok
    if "aweme/v1/web/aweme/detail/" in url or "api/item/detail" in url:
        try:
            data  = response.json()
            aweme = (
                data.get("aweme_detail") or
                data.get("item_info", {}).get("item_struct") or {}
            )
 
            if desc := aweme.get("desc"):
                result.title = sanitize_title(desc)
 
            if aweme.get("aweme_type") == 68 or "image_post_info" in aweme:
                result.is_note = True
                log.warning("Phát hiện bài đăng dạng Note/Slide — không hỗ trợ tải.")
                return
 
            # Lấy thời lượng video (duration) nếu có
            duration_ms = aweme.get("duration") or aweme.get("video", {}).get("duration") or 0
            if duration_ms:
                result.duration = duration_ms // 1000

            # Ưu tiên mảng bit_rate[] — chứa nhiều phiên bản chất lượng khác nhau
            bit_rate_list = aweme.get("video", {}).get("bit_rate", [])
            if bit_rate_list:
                best = max(bit_rate_list, key=lambda x: x.get("bit_rate", 0))
                play_urls = best.get("play_addr", {}).get("url_list", [])
                if play_urls:
                    result.direct_url    = play_urls[0]
                    result.capture_layer = 2
                    kbps = best.get("bit_rate", 0) // 1000
                    result.quality_info  = f"{kbps}kbps (bit_rate API)"
                    log.info("Lớp 2 – Chọn chất lượng cao nhất: %s", result.quality_info)
                    return
 
            # Fallback: play_addr mặc định nếu không có bit_rate[]
            if not result.direct_url:
                play_list = aweme.get("video", {}).get("play_addr", {}).get("url_list", [])
                if play_list:
                    result.direct_url    = play_list[0]
                    result.capture_layer = 2
                    result.quality_info  = "play_addr mặc định"
                    log.info("Lớp 2 – Lấy play_addr mặc định từ API")
        except Exception as exc:
            log.debug("Lớp 2 parse error: %s", exc)
 
 
def _scrape_dom(page, result: CaptureResult) -> None:
    """Lớp 3: Quét thẻ <video> trong DOM khi Network/API thất bại."""
    try:
        for el in page.query_selector_all("video source, video"):
            src = el.get_attribute("src") or ""
            if src and any(k in src for k in ("mp4", "douyinvod", "tos")):
                result.direct_url = "https:" + src if src.startswith("//") else src
                try:
                    dur = page.evaluate("el => el.duration", el)
                    if dur:
                        result.duration = int(dur)
                except Exception:
                    pass
                log.info("Lớp 3 – Tìm được video src từ DOM!")
                return
    except Exception as exc:
        log.debug("Lớp 3 DOM error: %s", exc)
 
 
def _scrape_title(page, result: CaptureResult) -> None:
    """Lấy tiêu đề từ HTML nếu API không trả về."""
    if result.title != "video_media":
        return
    try:
        el = page.query_selector('h1, .title, [data-e2e="video-desc"]')
        if el and (text := el.inner_text()):
            result.title = sanitize_title(text)
    except Exception as exc:
        log.debug("Title scrape error: %s", exc)
 
 
def capture_via_playwright(url: str) -> CaptureResult:
    """Mở trình duyệt, điều hướng tới URL và capture dữ liệu video."""
    result = CaptureResult()
    result.is_tiktok = is_tiktok_url(url)  # FIX: đánh dấu nguồn
    log.info("Khởi động Chrome Bot tại: %s", BOT_PROFILE_DIR)
 
    with open_browser() as ctx:
        page = ctx.pages[0] if ctx.pages else ctx.new_page()
        page.on("response", lambda r: _on_response(r, result))
 
        log.info("Điều hướng tới: %s", url)
        page.goto(url, wait_until="domcontentloaded", timeout=60_000)
        page.mouse.wheel(0, 300)
        page.wait_for_timeout(3_000)

        # ── Chờ người dùng vượt CAPTCHA (nếu có) ────────────────────────────
        print("\n" + "="*60)
        print("  Chrome đã mở. Nếu có CAPTCHA, hãy giải quyết trong trình duyệt.")
        print("  Khi trang đã load hoàn toàn, quay lại đây và nhấn ENTER...")
        print("="*60 + "\n")
        input("  >>> Nhấn ENTER để bắt đầu capture video: ")

        # Scroll thêm sau khi xác nhận để trigger network requests
        page.mouse.wheel(0, 300)
        page.wait_for_timeout(2_000)

        if result.is_note:
            return result
 
        if not result.direct_url:
            _scrape_dom(page, result)
 
        _scrape_title(page, result)
 
        result.resolved_url = page.url
        result.user_agent   = page.evaluate("navigator.userAgent")
        result.cookies      = ctx.cookies()
 
    return result
 
 
# ─── Download layer ──────────────────────────────────────────────────────────
 
def download_direct(result: CaptureResult, headers: dict, output_dir: str) -> str:
    """Tải video bằng direct link, trả về đường dẫn file nếu thành công."""
    log.info("Tải bằng Direct Link...")
    try:
        resp = requests.get(result.direct_url, headers=headers, stream=True, timeout=30)
        resp.raise_for_status()
 
        filename = os.path.join(output_dir, f"{result.title}_direct.mp4")
        with open(filename, "wb") as f:
            for chunk in resp.iter_content(chunk_size=8_192):
                f.write(chunk)
        log.info("Tải hoàn tất → %s", filename)
        return filename
    except requests.RequestException as exc:
        log.error("Lỗi Direct Link: %s", exc)
        return ""
 
 
def download_via_ytdlp(result: CaptureResult, headers: dict, output_dir: str, max_duration: int = 600) -> str:
    """Tải video qua yt-dlp (YouTube, Instagram, TikTok, fallback)."""
    log.info("Chuyển cho yt-dlp xử lý...")
    write_netscape_cookies(COOKIE_FILE, result.cookies)
    
    outtmpl = os.path.join(output_dir, "%(title)s.%(ext)s")
 
    def duration_filter(info_dict, *, incomplete):
        duration = info_dict.get('duration')
        if duration and duration > max_duration:
            return f"Video quá dài (vượt quá giới hạn {max_duration} giây)"
        return None

    ydl_opts = {
        # Lấy video và audio tốt nhất, không quan tâm định dạng gốc là webm hay m4a
        "format": "bestvideo+bestaudio/best",
        
        # Thiết lập ưu tiên: Càng ở trên càng ưu tiên cao
        "format_sort": [
            "res",          # 1. Độ phân giải (Resolution) cao nhất
            "fps",          # 2. Tốc độ khung hình (FPS) cao nhất
            "hdr:hdr10",    # 3. Ưu tiên HDR nếu có
            "vcodec:vp9",   # 4. Ưu tiên VP9 (Codec tối ưu của YT cho 2K/4K)
            "vcodec:av1",   # 5. Fallback về AV1
            "ext:mp4"       # 6. Cuối cùng mới xét đến container ưu tiên
        ],
        
        # Yêu cầu yt-dlp gọi FFmpeg để gộp file. 
        # (Lưu ý: Bắt buộc hệ thống phải cài đặt FFmpeg)
        "merge_output_format": "mp4", 
        
        "outtmpl": outtmpl,
        "cookiefile": COOKIE_FILE,
        "http_headers": headers,
        "quiet": False,
        "no_warnings": True,
        "match_filter": duration_filter,
    }
    
    try:
        with yt_dlp.YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(result.resolved_url, download=True)
            # yt-dlp might change extension to mp4 after merge
            # so we should use prepare_filename to get the accurate one
            filename = ydl.prepare_filename(info)
            if filename.endswith(".webm") and ydl_opts.get("merge_output_format") == "mp4":
                filename = filename.replace(".webm", ".mp4")
            if not os.path.exists(filename) and os.path.exists(filename.rsplit('.', 1)[0] + '.mp4'):
                filename = filename.rsplit('.', 1)[0] + '.mp4'
                
        log.info(f"Tải hoàn tất bằng yt-dlp! {filename}")
        return filename
    except Exception as exc:
        log.error("Lỗi yt-dlp: %s", exc)
        return ""
    finally:
        if os.path.exists(COOKIE_FILE):
            os.remove(COOKIE_FILE)
 
 
# ─── Entry point ─────────────────────────────────────────────────────────────
 
def download_universal_video(url: str, output_dir: str = ".", max_duration: int = 600) -> str:
    # Bước 1: Kiểm tra URL hợp lệ
    if not SUPPORTED_DOMAINS.search(url):
        raise ValueError("Link không hợp lệ. Chỉ hỗ trợ TikTok, Douyin, Instagram, YouTube.")
 
    # Bước 2: Capture qua Playwright
    result = capture_via_playwright(url)
 
    if result.is_note:
        raise ValueError("Bài đăng dạng Note/Slide — không hỗ trợ tải!")
 
    # Kiểm tra thời lượng video ở bước capture
    if result.duration and result.duration > max_duration:
        raise ValueError(f"Thời lượng video vượt quá giới hạn cho phép ({max_duration} giây).")

    # Bước 3: Routing tải video
    headers = {
        "User-Agent": result.user_agent,
        "Referer":    get_referer(result.resolved_url),
    }
 
    # FIX: TikTok dùng tt_chain_token bind với browser session —
    #      direct link luôn bị 403 khi tải bằng requests bên ngoài.
    #      Lớp 2 (API) thường không kích hoạt được trên TikTok quốc tế.
    #      → Luôn dùng yt-dlp cho TikTok (có cookies từ Playwright).
    filename = ""
    if result.is_tiktok:
        log.info("TikTok detected — dùng yt-dlp với cookies từ trình duyệt (tránh 403 tt_chain_token)")
        filename = download_via_ytdlp(result, headers, output_dir, max_duration)
    else:
        # Douyin & các nguồn khác: thử direct link trước, fallback yt-dlp
        if result.direct_url:
            filename = download_direct(result, headers, output_dir)
            if not filename:
                log.info("Direct link thất bại, thử yt-dlp...")
                filename = download_via_ytdlp(result, headers, output_dir, max_duration)
        else:
            filename = download_via_ytdlp(result, headers, output_dir, max_duration)
            
    if not filename or not os.path.exists(filename):
        raise Exception("Tải video thất bại (không tìm thấy file đầu ra)")
        
    return filename
