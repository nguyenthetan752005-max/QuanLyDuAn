# ĐỀ XUẤT CHỨC NĂNG CÒN THIẾU ĐỂ HOÀN THIỆN LILY

---

## ✅ TIẾN ĐỘ ĐÃ THỰC HIỆN (cập nhật 17/06/2026)

Đã làm xong và **biên dịch/kiểm cú pháp đạt** (chưa chạy live vì cần MongoDB/FFmpeg trên máy bạn):

**Nâng cấp chỉnh sửa ảnh**
- ✅ A1 — 3 filter mới (trắng đen, sepia, đảo màu) + 8 preset 1-chạm
- ✅ A2 — Opacity từng lớp
- ✅ A4 — Nhân bản lớp (nút + Ctrl+D)
- ✅ A5 — Căn chỉnh theo khung (6 hướng)

**Đúng cam kết trong yêu cầu (mục D)**
- ✅ US10 — Âm lượng từng clip video/audio (UI + render FFmpeg `volume=`)
- ✅ US11/US15 — Trang Admin `/admin`: thống kê + quản lý/xóa user (có vai trò ADMIN, seed sẵn tài khoản `admin`/`admin123`)
- ✅ FR07/US14 — Lịch sử phiên bản dự án (lưu mốc + khôi phục, giữ 20 bản gần nhất)
- ✅ FR08/US12/US18 — Sao lưu & phục hồi (export/import JSON cấp ứng dụng, không cần mongodump)

**Bổ sung (đã làm):**
- ✅ A7 — Phông chữ Google Fonts: 13 font (Roboto, Open Sans, Lato, Poppins, Montserrat, Oswald, Bebas Neue, Playfair Display, Merriweather, Dancing Script, Pacifico…) trong dropdown có preview inline.
- ✅ A10 — Bộ mẫu thiết kế nhanh (6 template: Story, Bài đăng vuông, Thumbnail YouTube, Video FHD, Bìa FB, Poster A4) trong modal tạo dự án.
- ✅ C5 — Hạn mức lưu trữ: SystemSetting `storage_quota_mb` (mặc định 500MB), endpoint `/me/usage` trả thêm quota & %, chặn upload khi vượt; thanh trạng thái + cảnh báo đỏ trong trang Profile.
- ✅ C7 — Nhật ký hoạt động: collection `activity_logs`, ghi log Login + tạo dự án + upload tệp; endpoint `/me/activities` + UI trong Profile.
- ✅ Nhóm B — Chuông thông báo trong dashboard (auto-poll 60s, dùng API `/api/v1/notifications`).
- ✅ Nhóm B — Tìm kiếm + lọc vai trò user trong trang Admin (lọc tại chỗ).
- ✅ Nhóm B — Endpoint `/api/v1/users/me/usage` + Profile hiện dung lượng đã dùng & số tệp.
- ✅ Nhóm C — Bảng phím tắt (mở bằng phím `?` hoặc menu File → "Phím tắt"; đóng bằng `Esc`).
- ✅ Nhóm C — Responsive editor: panel ẩn mặc định trên mobile, overlay khi mở; topbar gọn lại trên màn rất nhỏ.
- ✅ Nhóm C — Skeleton loading cho dashboard dự án (shimmer animation thay spinner).
- ✅ A3 — Bảng danh sách lớp (Layers panel): chọn, ẩn/hiện, đổi tên, lên/xuống, xóa.
- ✅ A9 — Hút màu (eyedropper) cho màu chữ & màu hình (dùng EyeDropper API của trình duyệt).
- ✅ Nhãn dán: bảng chọn emoji (lưới bấm-chọn) thay cho gõ tay.
- ✅ Thêm hình: tam giác, đường kẻ, bo góc cho hình chữ nhật.
- ✅ B4 — Filter màu cho video/ảnh khi render FFmpeg (`eq`/`hue`/`gblur`). Gated: clip không chỉnh filter thì render y như cũ. Hỗ trợ độ sáng/tương phản/bão hòa/hue/làm mờ/trắng đen; sepia & đảo màu tạm chưa map sang FFmpeg (vẫn hiện đúng ở xem trước & export ảnh client-side).
- ✅ Dọn log: bỏ qua `ClientAbortException` khi tua/hủy video; báo lỗi gọn khi upload quá 50MB.

**Còn lại (chưa làm — cần môi trường/khối lượng lớn):**
B2 transitions, B3 tốc độ clip, B5 phụ đề/STT,
B6 nhạc nền, B7 waveform/filmstrip, B8 keyframe, B9 PiP/reverse, A8 tách nền AI,
C1 thumbnail server, C2 phân trang, C3 SSE realtime, C4 refresh token, C8 test/responsive.
→ Các mục này đụng pipeline FFmpeg/AI nặng hoặc cần model ngoài (Whisper/rembg); nên làm từng cái
có kiểm thử trực tiếp trên máy để tránh làm hỏng chức năng export đang chạy tốt.

---


> Mục tiêu: đưa Lily lên mức một web chỉnh sửa ảnh/video "đủ tốt".
> Tài liệu chia theo: (A) chỉnh sửa ảnh, (B) chỉnh sửa video/âm thanh, (C) hệ thống/nền tảng,
> (D) phần đã cam kết trong yêu cầu nhưng chưa làm, (E) lộ trình ưu tiên cho đồ án.

---

## 0. Những gì ĐÃ CÓ (để không làm trùng)

**Ảnh:** canvas đa lớp, kéo/resize, smart guide + snapping, text (định dạng), shape (fill/stroke),
sticker, cọ vẽ + tẩy, filter (brightness/contrast/saturation/hue/blur), transform (rotate, flip X/Y),
crop, sắp xếp lớp (lên/xuống/đầu/đáy), undo/redo, export PNG/JPEG (scale, quality), server effects.

**Video:** timeline đa track (video/audio/text), split, trim, xóa clip, ẩn/tắt tiếng track,
đổi thứ tự track, playhead + zoom, play/pause/stop, render FFmpeg (webm/mp4, scale, fps).

**Hệ thống:** auth JWT + Google, xác thực email, reset mật khẩu, dự án CRUD + thùng rác + autosave cloud,
thư viện asset + folder (upload/cây/thùng rác/di chuyển), import video MXH (yt-dlp worker),
notification, system settings, action catalog, trang profile.

---

## A. CHỈNH SỬA ẢNH — còn thiếu

| # | Chức năng | Mô tả | Độ khó |
|---|---|---|---|
| A1 | **Bộ lọc preset 1-chạm** | Thêm sepia/grayscale/invert/vintage… và preset bấm-1-lần (chỉ cần thêm vào `FILTER_CONFIG`) | Dễ |
| A2 | **Độ mờ (opacity) từng lớp** | Thanh trượt 0–100% cho mỗi layer | Dễ |
| A3 | **Bảng danh sách lớp (Layer panel)** | Liệt kê tất cả lớp, bấm chọn, ẩn/hiện, khóa, đổi tên, kéo đổi thứ tự | TB |
| A4 | **Nhân bản / Copy–Paste / Nhóm lớp** | Ctrl+D, Ctrl+C/V, group nhiều lớp thành 1 | Dễ–TB |
| A5 | **Căn chỉnh theo canvas** | Nút căn giữa ngang/dọc, canh trái/phải/trên/dưới, phân bố đều | Dễ |
| A6 | **Xoay bằng tay trên canvas** | Núm xoay (rotation handle) thay vì chỉ thanh trượt | TB |
| A7 | **Text nâng cao** | Viền chữ, đổ bóng, nền chữ, giãn dòng/chữ, nhiều font Google Fonts | TB |
| A8 | **Tách nền AI (remove background)** | Đã quảng cáo ở màn tạo dự án nhưng chưa làm — dùng `rembg` trong Python worker | TB–Khó |
| A9 | **Hút màu (eyedropper) + gradient fill** | Lấy màu từ ảnh; tô màu chuyển sắc cho shape | TB |
| A10 | **Mẫu thiết kế (Templates)** | Bộ canvas dựng sẵn (poster, story, thumbnail) để bắt đầu nhanh | TB |

---

## B. CHỈNH SỬA VIDEO / ÂM THANH — còn thiếu

| # | Chức năng | Mô tả | Độ khó |
|---|---|---|---|
| B1 | **Âm lượng từng clip + fade in/out** | Hiện chỉ tắt tiếng cả track. Cần chỉnh âm lượng theo clip và fade — *đây là US10 trong yêu cầu* | TB |
| B2 | **Hiệu ứng chuyển cảnh (Transitions)** | Mờ dần, trượt, zoom giữa 2 clip (FFmpeg `xfade`) | TB |
| B3 | **Tốc độ phát (slow/fast motion)** | 0.5x–2x cho clip video/audio | TB |
| B4 | **Filter/color grading cho video** | Tái dùng bộ filter ảnh áp lên clip video | TB |
| B5 | **Phụ đề / Caption** | Thêm phụ đề thủ công; nâng cao: tự sinh bằng speech-to-text (Whisper) | TB–Khó |
| B6 | **Thư viện nhạc nền** | Bộ nhạc/âm thanh miễn phí bản quyền chèn nhanh | Dễ–TB |
| B7 | **Waveform + filmstrip trên clip** | Vẽ dạng sóng cho audio, ảnh thu nhỏ cho video để dễ cắt | TB |
| B8 | **Keyframe animation** | Cho vị trí/scale/opacity thay đổi theo thời gian (Ken Burns, motion) | Khó |
| B9 | **Ảnh/PiP overlay, freeze frame, reverse** | Chèn ảnh đè lên video, đóng băng khung hình, phát ngược | TB |

---

## C. HỆ THỐNG / NỀN TẢNG — còn thiếu

| # | Chức năng | Mô tả | Độ khó |
|---|---|---|---|
| C1 | **Thumbnail sinh phía server** | Dashboard/explorer đang dùng icon giả; sinh thumbnail thật khi upload/lưu (FFmpeg/Thumbnailator) | TB |
| C2 | **Phân trang + tìm kiếm/lọc phía server** | Hiện tải hết rồi lọc ở client; thêm `Pageable` + query `search/type/sort` | TB |
| C3 | **Tiến độ realtime (SSE/WebSocket)** | Render & import MXH đang polling; đẩy tiến độ trực tiếp | TB |
| C4 | **Refresh token + siết bảo mật** | Access token ngắn hạn + refresh (httpOnly), bảo vệ endpoint worker callback | TB |
| C5 | **Hạn mức lưu trữ (quota) + thống kê dung lượng** | Giới hạn theo user, hiển thị đã dùng bao nhiêu | TB |
| C6 | **Chia sẻ / link xem trước** | Tạo link công khai cho dự án/asset | TB |
| C7 | **Nhật ký hoạt động (activity log)** | Ghi lại thao tác chính của user | Dễ–TB |
| C8 | **Kiểm thử + responsive + onboarding** | Unit/integration test, giao diện mobile, hướng dẫn lần đầu, phím tắt | TB |

---

## D. NẰM TRONG YÊU CẦU NHÓM NHƯNG CHƯA LÀM ⭐ (ưu tiên cao nhất)

Đây là phần **đã ghi trong tài liệu yêu cầu/User Story của chính nhóm** nhưng code hiện chưa có.
Làm xong nhóm vừa "đúng cam kết" vừa có điểm demo:

| Mã YC | Nội dung | Hiện trạng | Cần làm |
|---|---|---|---|
| US10 | Điều chỉnh âm lượng audio | Mới chỉ tắt/bật tiếng cả track | Âm lượng + fade theo clip (xem B1) |
| FR07 / US14 | Lưu & xem **lịch sử thao tác** | Chỉ undo/redo trong phiên, không lưu lại | Lưu snapshot phiên bản dự án, xem & khôi phục |
| FR08 / US12 / US18 | **Sao lưu & phục hồi** dữ liệu | Chưa có | `mongodump` theo lịch + chức năng restore |
| US11 | **Admin quản lý tài khoản** | API `getAllUsers/deleteUser` đã có nhưng chưa có role & UI | Thêm vai trò ADMIN + trang quản trị user |
| US15 | Admin **xuất báo cáo thống kê** | Chưa có | Trang thống kê (số user, dự án, dung lượng) + xuất CSV/PDF |

> Lưu ý: hệ thống hiện **chưa có phân biệt vai trò Admin/User** thật sự (entity User có `role`
> nhưng chưa dùng để chặn quyền). Đây là tiền đề cho US11/US12/US15/US18.

---

## E. LỘ TRÌNH ƯU TIÊN ĐỀ XUẤT (cho đồ án)

Cân đối **giá trị demo / công sức**, nên làm theo thứ tự:

**Giai đoạn 1 — Đúng cam kết (cao nhất):**
1. Vai trò Admin + trang quản trị user (US11) + thống kê (US15)
2. Âm lượng + fade audio theo clip (US10)
3. Sao lưu/phục hồi dữ liệu (FR08/US12/US18)
4. Lịch sử phiên bản dự án (FR07/US14)

**Giai đoạn 2 — Editor ấn tượng hơn (công sức vừa, demo đẹp):**
5. Filter preset 1-chạm + opacity lớp (A1, A2) — *rất dễ, hiệu quả cao*
6. Bảng danh sách lớp (A3)
7. Transitions + tốc độ clip (B2, B3)
8. Thumbnail server-side (C1)
9. Tách nền AI (A8) — đã lỡ quảng cáo, nên làm cho khớp

**Giai đoạn 3 — Chuyên nghiệp hoá nền tảng:**
10. Tiến độ realtime SSE (C3)
11. Refresh token bảo mật (C4)
12. Phân trang/tìm kiếm server (C2)
13. Phụ đề/caption, keyframe, nhạc nền (B5, B8, B6)
14. Test + responsive + onboarding (C8)

---

### Gợi ý "quick win" làm trước để thấy hiệu quả ngay
- **A1 + A2** (preset filter + opacity): chỉ thêm cấu hình + 1 thanh trượt, gần như không đụng backend.
- **US11 Admin**: API `getAllUsers`/`deleteUser` đã sẵn, chỉ cần thêm 1 trang + chặn quyền theo `role`.
- **B1 âm lượng clip**: thêm 1 thuộc tính `volume` cho clip + 1 cờ `-af volume=` khi render FFmpeg.
