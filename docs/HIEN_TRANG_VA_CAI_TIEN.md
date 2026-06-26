# BÁO CÁO HIỆN TRẠNG HỆ THỐNG & ĐỀ XUẤT CẢI TIẾN

> Dự án: **Lily — Web quản lý & xử lý Multimedia** (môn Quản lý dự án phần mềm)
> Ngày lập: 12/06/2026

---

## 1. Tổng quan kiến trúc hiện tại

Khác với bản kế hoạch ban đầu (MySQL + JSP + Spring MVC truyền thống), code thực tế đã đi xa hơn:

| Thành phần | Công nghệ thực tế |
|---|---|
| Backend | **Spring Boot 4.0.6**, Java 21, kiến trúc Controller → Service → Repository |
| Database | **MongoDB** (Spring Data MongoDB) — không phải MySQL |
| Bảo mật | Spring Security + **JWT** (jjwt), BCrypt, Google OAuth (Google Identity Services) |
| View | **Thymeleaf** (không phải JSP) + CSS/JS thuần (ES Modules) |
| Xử lý video | **FFmpeg / FFprobe** chạy local (`bin/ffmpeg.exe`) — render video phía server |
| Worker | **Python microservice** (`worker/app.py` + `downloader.py`, dùng yt-dlp) tải video TikTok/YouTube/Instagram, callback về backend |
| Lưu trữ | Local storage (`uploads/`), đã bỏ ImageKit |
| Email | JavaMailSender (SMTP Gmail) — xác thực email, quên mật khẩu, thông báo |
| Cổng chạy | `http://localhost:8081` |

### Luồng chính
1. Người dùng đăng nhập (JWT lưu phía client, `auth.js` gắn token vào mọi request).
2. Dashboard `/projects`: CRUD dự án (IMAGE / VIDEO), thùng rác, quản lý tệp tin (folder + asset).
3. Editor `/editor?projectId=...`: canvas chỉnh sửa (kéo thả, text, vẽ, shape, sticker, filter), timeline đa track cho video, lưu dự án lên cloud (Mongo), export ảnh client-side (dom-to-image) hoặc render video server-side (FFmpeg).
4. Import video MXH: backend tạo `AsyncTask` → gọi Python worker → worker tải bằng yt-dlp → callback `/api/internal/jobs/callback` → asset tự xuất hiện trong thư viện.

---

## 2. Tóm tắt chức năng backend hiện có

### 2.1 Người dùng & bảo mật (`/api/v1/users`)
- Đăng ký (gửi email xác thực), đăng nhập (JWT), đăng nhập Google.
- Quên mật khẩu / đặt lại mật khẩu qua email (token).
- CRUD user, phân quyền cơ bản qua Spring Security filter chain.

### 2.2 Dự án (`/api/v1/projects`)
- CRUD dự án; mỗi dự án có loại (IMAGE/VIDEO), kích thước canvas, nội dung canvas (JSON).
- **Soft delete + Thùng rác**: `/deleted`, `/{id}/restore`, `/{id}/permanent`.
- `TrashCleanupScheduler` tự xóa vĩnh viễn sau N ngày (cấu hình bằng SystemSetting).

### 2.3 Thư viện media (`/api/v1/media-assets`, `/api/v1/media-folders`)
- Upload file (giới hạn 50MB), quản lý theo cây thư mục, di chuyển, đổi tên.
- Soft delete / restore / xóa vĩnh viễn cho cả file lẫn folder.
- Kiểm tra "usage" — asset đang được dự án nào dùng trước khi xóa.

### 2.4 Xử lý video (`/api/v1/video-processing`)
- `POST /render`: render video từ timeline bằng FFmpeg (scale, fps, format), trạng thái qua `ProjectProcessing` (PENDING → PROCESSING → DONE/FAILED), có hủy render.
- `ProjectProcessingController`: theo dõi lịch sử tác vụ xử lý.

### 2.5 Import mạng xã hội (`/api/.../import-social`)
- Tạo job bất đồng bộ (`AsyncTask`), đẩy sang Python worker (yt-dlp), polling `/api/jobs/{id}/status`, callback nội bộ khi xong.

### 2.6 Hệ thống & thông báo
- `SystemSetting`: cấu hình động (vd: số ngày giữ thùng rác).
- `Notification` + `NotificationTemplate` + `NotificationScheduler`: thông báo theo sự kiện (đăng ký, xác thực, reset mật khẩu) qua email, template HTML.
- `ActionCatalog`: danh mục hiệu ứng/thao tác phục vụ editor.
- `DataSeeder`: seed dữ liệu mẫu khi khởi động.

---

## 3. Điểm có thể cải tiến — BACKEND

Xếp theo độ ưu tiên, có ghi chú việc frontend cần thay đổi tương ứng (mục 4).

### Ưu tiên cao
| # | Vấn đề | Đề xuất |
|---|---|---|
| B1 | **JWT lưu localStorage**, không có refresh token → token sống lâu, dễ bị XSS đánh cắp | Thêm refresh token (httpOnly cookie), access token ngắn hạn 15–30 phút |
| B2 | **CORS `allowedOriginPatterns("*")` + allowCredentials(true)** | Giới hạn origin cụ thể khi deploy |
| B3 | **Endpoint nội bộ worker đang `permitAll`** (`/api/internal/jobs/callback`) | Bảo vệ bằng shared secret/API key giữa backend ↔ worker |
| B4 | **Phân quyền tài nguyên theo user chưa chặt** — một số API lấy theo `id` mà không kiểm tra chủ sở hữu | Thêm kiểm tra `userId` từ JWT trong service trước khi đọc/sửa/xóa |
| B5 | **Render FFmpeg đồng bộ trên thread request / thiếu hàng đợi** | Đưa render vào hàng đợi (Spring `@Async` + ThreadPool hoặc queue), giới hạn số job song song |

### Ưu tiên trung bình
| # | Vấn đề | Đề xuất |
|---|---|---|
| B6 | Chưa có **phân trang/tìm kiếm phía server** cho danh sách asset & project (FE đang lọc client-side) | Thêm `Pageable` + query param `search`, `type`, `sort` |
| B7 | Upload giới hạn 50MB, **chưa có upload theo chunk** cho video lớn | Chunked upload hoặc tăng giới hạn + stream trực tiếp ra disk |
| B8 | **Chưa sinh thumbnail server-side** — dashboard phải tải nguyên file ảnh/video để preview | Dùng FFmpeg/Thumbnailator sinh thumbnail khi upload, lưu kèm asset |
| B9 | Trạng thái job (render, import MXH) lấy bằng **polling** | Nâng cấp lên SSE hoặc WebSocket để đẩy tiến độ realtime |
| B10 | **Chưa có test** (unit/integration) cho service chính | Viết test cho UserService, ProjectService, quy trình soft-delete |

### Ưu tiên thấp / dài hạn
- B11: Versioning nội dung dự án (lịch sử lưu, khôi phục phiên bản cũ) — khớp FR07 "Lưu lịch sử thao tác".
- B16: API cập nhật user (`PUT /api/v1/users/{id}`) đang **bắt buộc gửi password mới** (DTO `@NotBlank`) — nên tách endpoint đổi mật khẩu riêng (yêu cầu mật khẩu cũ) và cho phép cập nhật username/email không cần đổi mật khẩu. Trang Profile hiện phải yêu cầu người dùng đặt mật khẩu mới mỗi lần cập nhật vì ràng buộc này.
- B12: Backup/restore MongoDB tự động (mongodump theo lịch) — khớp FR08/US12/US18.
- B13: Trang quản trị Admin (quản lý user, thống kê) — khớp US11, US15.
- B14: Chuyển local storage → S3-compatible (MinIO) để "Cloud" đúng nghĩa và scale được.
- B15: OpenAPI/Swagger cho toàn bộ REST API để nhóm FE/BE phối hợp dễ hơn.

---

## 4. Điểm có thể cải tiến — FRONTEND (khớp với cải tiến backend)

Những mục này **chưa làm trong đợt sửa UI lần này** (vì cần backend đổi trước), ghi lại để làm sau:

| # | Khi backend làm | Frontend cần làm |
|---|---|---|
| F1 | B1 (refresh token) | Sửa `auth.js`: tự refresh khi 401, bỏ lưu token dài hạn ở localStorage |
| F2 | B6 (phân trang) | Dashboard: infinite scroll / phân trang + ô tìm kiếm gọi API thay vì lọc mảng tại chỗ |
| F3 | B8 (thumbnail) | Project card & explorer hiển thị thumbnail thật thay vì icon placeholder |
| F4 | B9 (SSE/WebSocket) | Thanh tiến độ render/import nhận push realtime, bỏ `setInterval` polling |
| F5 | B11 (version) | UI "Lịch sử phiên bản" trong editor (danh sách + nút khôi phục) |
| F6 | B13 (admin) | Trang `/admin`: bảng user, thống kê dung lượng, số dự án (Chart.js) |
| F7 | B15 (Swagger) | — (tài liệu, không cần UI) |

### Cải tiến FE độc lập (không đụng backend — có thể làm tiếp)
- Responsive cho editor trên màn hình nhỏ (hiện ẩn 2 panel dưới 900px).
- Dọn inline style trong `sidebar.html` / `projects.html` về file CSS (đợt này đã làm một phần).
- Thêm trạng thái loading skeleton cho dashboard thay vì spinner đơn.
- i18n đầy đủ (hiện trộn tiếng Việt cứng + hệ thống `strings.js`).

---

## 5. Phạm vi đợt sửa UI (đã thực hiện)

### Đợt 1 — Cải tổ giao diện tổng thể
- Không đổi logic backend/JS — chỉ HTML (giữ nguyên ID/class mà JS bám vào) và CSS.
- Layout dark studio kiểu CapCut; trang chủ thành landing page; auth pages làm lại theo card; editor (topbar, toolbar, canvas, timeline, dialog) tinh chỉnh đồng bộ.

### Đợt 2 — Tinh chỉnh theo hướng chuyên nghiệp
- **Bỏ gradient tím–hồng**, chuyển sang **accent xanh phẳng** (#3D7BFD) thống nhất toàn hệ thống; gradient chỉ còn dùng rất nhẹ cùng tông để tạo chiều sâu cho nút chính.
- **Bỏ toàn bộ emoji** (🖼️🎬☁️📥❤️✦) — thay bằng bộ **SVG icon nét mảnh** tự vẽ, đồng bộ stroke.
- Giảm hiệu ứng glow/đổ bóng màu; chữ thương hiệu "Lily" dùng màu phẳng thay vì gradient text.
- Hệ 4 theme (Dark/Light/Warm/Cold) vẫn hoạt động đầy đủ.
- **Thêm trang Hồ sơ `/profile`**: xem thông tin tài khoản, thống kê dự án (tổng/ảnh/video), cập nhật username + email + mật khẩu (`PUT /api/v1/users/{id}`), xóa tài khoản (`DELETE /api/v1/users/{id}` — xác nhận bằng cách gõ lại tên đăng nhập). Backend chỉ thêm đúng 2 dòng khai báo: route `GET /profile` trong `HomeController` và permitAll trang này trong `SecurityConfig` (không đổi nghiệp vụ).
