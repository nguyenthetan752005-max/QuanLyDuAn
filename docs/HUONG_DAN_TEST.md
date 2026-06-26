# HƯỚNG DẪN TEST CÁC CHỨC NĂNG MỚI

> App chạy ở `http://localhost:8081`. Tài khoản admin seed sẵn: **admin / admin123**

## 0. Khởi động
1. Đảm bảo MongoDB đã kết nối được (local cổng 27017 hoặc Atlas qua `MONGODB_URI` trong `secret.properties`).
2. Chạy app:
   - IntelliJ: Run `DemoApplication`, hoặc
   - Terminal: `mvnw spring-boot:run`
3. Mở trình duyệt, **Ctrl+F5** (xóa cache) vào `http://localhost:8081`.

> Mẹo: mở DevTools (F12) → tab Console để thấy lỗi JS nếu có; tab Network để xem request API.

---

## A. NÂNG CẤP CHỈNH SỬA ẢNH (trong editor dự án IMAGE)

Tạo/mở 1 dự án **ảnh**, kéo 1 ảnh vào canvas rồi chọn ảnh đó.

### A1 — Bộ lọc preset + filter mới
1. Panel phải → tab **"Bộ lọc"**.
2. Khu **"Bộ lọc nhanh"**: bấm lần lượt **Đen trắng / Hoài cổ / Ấm / Lạnh / Rực rỡ / Mờ phai / Âm bản**.
   - ✅ Ảnh đổi màu ngay theo preset.
3. Khu **"Tinh chỉnh thủ công"**: kéo các thanh **Trắng đen / Cổ điển (Sepia) / Đảo màu** (3 cái mới).
   - ✅ Ảnh thay đổi tương ứng. Bấm **Reset Bộ lọc** → về gốc.

### A2 — Opacity từng lớp
1. Panel phải → tab **"Căn chỉnh & Lớp"** → thanh **"Độ mờ (Opacity)"**.
2. Kéo xuống ~40%.
   - ✅ Lớp mờ đi (nhìn xuyên thấy nền/lớp dưới).

### A4 — Nhân bản lớp
1. Chọn 1 lớp → tab "Căn chỉnh & Lớp" → nút **"Nhân bản lớp (Ctrl+D)"** (hoặc nhấn **Ctrl+D**).
   - ✅ Xuất hiện bản sao lệch 20px, được chọn sẵn.

### A5 — Căn chỉnh theo khung
1. Chọn 1 lớp → tab "Căn chỉnh & Lớp" → khu **"Căn chỉnh theo khung"**.
2. Bấm **Giữa ngang** rồi **Giữa dọc**.
   - ✅ Lớp nhảy về chính giữa canvas. Thử **Trái/Phải/Trên/Dưới** → dính sát các cạnh.

### Kiểm tra lưu & export ảnh
1. Đặt opacity 50% + 1 preset filter cho 1 ảnh → **Xuất ảnh** (PNG).
   - ✅ File tải về giữ đúng độ mờ + màu filter.
2. **Lưu dự án**, F5 lại → ✅ opacity/filter/preset vẫn còn (đã lưu vào dự án).

---

## B. ÂM LƯỢNG CLIP — US10 (dự án VIDEO)

Tạo/mở 1 dự án **video**, thêm 1 clip video (có tiếng) hoặc 1 file audio vào timeline.
1. Bấm chọn clip trên canvas (hoặc lớp tương ứng) → panel phải → tab **"Căn chỉnh & Lớp"**.
2. Trên cùng có thanh **"Âm lượng"** (chỉ hiện với clip video/audio của dự án VIDEO).
3. Kéo về ~0% rồi bấm **Phát** trên timeline.
   - ✅ Xem trước: clip đó im tiếng. Kéo lên 150% → to hơn.
4. **Xuất video** (WebM/MP4) với 1 clip để âm lượng 0%.
   - ✅ File xuất ra: clip đó không có tiếng (hoặc nhỏ/to đúng mức đã đặt).

> Nếu export lỗi, mở `ffmpeg_error.log` ở thư mục gốc dự án để xem lệnh FFmpeg.

---

## C. LỊCH SỬ PHIÊN BẢN — FR07/US14 (trong editor)
1. Trong editor, menu **File** (góc trên trái) → **"Lịch sử phiên bản"**.
2. Bấm **"+ Lưu mốc phiên bản hiện tại"** → nhập tên (vd "Bản 1") → OK.
   - ✅ Có dòng mới trong danh sách với thời gian.
3. Sửa canvas (di chuyển/xóa vài lớp), lưu thêm 1 mốc "Bản 2".
4. Mở lại "Lịch sử phiên bản" → bấm **"Khôi phục"** ở "Bản 1".
   - ✅ Xác nhận → trang tải lại → canvas trở về trạng thái "Bản 1".

---

## D. TRANG ADMIN — US11/US15 (quản lý + thống kê)
1. **Đăng xuất**, đăng nhập lại bằng **admin / admin123**.
2. Vào `/projects` → sidebar trái xuất hiện mục **"Quản trị hệ thống"** (chỉ admin thấy). Bấm vào (hoặc vào thẳng `http://localhost:8081/admin`).
3. ✅ **Thống kê**: số người dùng, tổng dự án, dự án ảnh/video, số tệp, dung lượng MB.
4. ✅ **Quản lý tài khoản**: bảng tất cả user, có badge ADMIN/USER.
   - Nút **"Xóa"** bị khóa với tài khoản admin và với chính bạn; bật với user thường.
   - Tạo 1 user thường (đăng ký 1 tài khoản test) → quay lại admin → **Xóa** user đó → ✅ biến mất khỏi bảng, số liệu cập nhật.
5. **Kiểm tra phân quyền**: đăng nhập bằng 1 user thường → vào thẳng `http://localhost:8081/admin`.
   - ✅ Hiện "Không có quyền truy cập" và tự chuyển về `/projects` (API trả 403).

---

## E. SAO LƯU & PHỤC HỒI — FR08/US12/US18 (trong trang Admin)
Vẫn ở `/admin`, kéo xuống mục **"Sao lưu & Phục hồi dữ liệu"**.
1. Bấm **"Tải bản sao lưu (JSON)"** → ✅ tải về file `lily-backup-....json`. Mở file thấy JSON các collection (users, projects...).
2. **Test phục hồi** (nên làm trên dữ liệu test, vì phục hồi GHI ĐÈ tất cả):
   - Tạo thêm 1 dự án mới bất kỳ.
   - Bấm **"Chọn tệp phục hồi…"** → chọn file backup ở bước 1 → nút **"Phục hồi"** sáng lên → bấm → xác nhận.
   - ✅ Thông báo thành công + số collection/bản ghi, trang tải lại. Dự án vừa tạo (sau lúc backup) **biến mất** vì đã khôi phục về trạng thái lúc sao lưu.

---

## GÓI A7 + A10 + C5 + C7 (mới)
1. **Phông chữ Google (A7)**: editor → chọn 1 text → tab **"Định dạng chữ"** → dropdown **"Phông chữ"** có 13 font chia 4 nhóm (Sans-serif Google / Serif / Decorative / Hệ thống). Mỗi option preview bằng chính font đó.
2. **Mẫu dự án (A10)**: `/projects` → bấm **"Tạo dự án mới"** → trong modal có **lưới 6 mẫu** (Story 9:16, Square 1:1, YT Thumbnail, Video FHD, FB Cover, Poster A4). Bấm 1 mẫu → tự điền kích thước + loại dự án (ảnh/video) + nền; có viền xanh chọn. Vẫn có thể đổi sau bằng dropdown.
3. **Hạn mức lưu trữ (C5)**:
   - `/profile` → có khối **"Dung lượng đã sử dụng"** với thanh bar màu xanh; đầy >70% sẽ chuyển vàng, >90% chuyển đỏ + cảnh báo "sắp đầy".
   - Mặc định quota = **500MB**. Admin đổi qua API `PUT /api/v1/system-settings/storage_quota_mb` (hoặc set giá trị `0` = không giới hạn).
   - Thử upload tệp khi đã gần đầy → backend trả lỗi *"Vượt quá hạn mức lưu trữ…"*.
4. **Nhật ký hoạt động (C7)**: `/profile` → cuộn xuống khối **"Nhật ký hoạt động gần đây"**. Mỗi lần đăng nhập / tạo dự án / upload tệp sẽ thêm 1 dòng. Tự cập nhật khi mở lại trang.

## NHÓM B+C — Trải nghiệm hệ thống (mới)
1. **Chuông thông báo** (trang `/projects`): icon chuông cạnh nút "Tạo dự án mới".
   - Bấm để mở popover; danh sách thông báo của bạn (lấy từ DB). Số chấm đỏ = số chưa đọc.
   - Bấm 1 thông báo → đánh dấu đã đọc. Nút **"Đánh dấu đã đọc"** → đánh dấu tất cả.
   - Tự refresh mỗi 60s. *Nếu DB chưa có thông báo nào của bạn, popover sẽ ghi "Chưa có thông báo nào".*
2. **Tìm kiếm user trong Admin** (`/admin`): có ô **Tìm theo tên/email** + dropdown **Lọc vai trò** (All/Admin/User). Gõ là lọc ngay tại chỗ.
3. **Dung lượng ở Hồ sơ** (`/profile`): hàng thống kê có 5 ô — thêm **Tệp tin** + **Dung lượng (MB)** lấy từ `/api/v1/users/me/usage`.
4. **Bảng phím tắt** (editor): nhấn phím **`?`** (Shift+/) bất cứ lúc nào → popup liệt kê phím tắt; hoặc menu **File → "Phím tắt (?)"**. Nhấn **Esc** để đóng.
5. **Responsive editor**: thu hẹp cửa sổ trình duyệt dưới 900px → 2 panel trái/phải **tự ẩn**, mở bằng nút **Explorer** / **Tool** trên topbar (overlay che canvas tạm thời). Dưới 640px, topbar gọn lại.
6. **Skeleton loading dashboard**: vào `/projects` (nhấn F5) — thay vì spinner xoay, bạn thấy **6 ô card xám có hiệu ứng shimmer** chạy ngang trong lúc tải.

## A++. NHÓM A — Công cụ chỉnh sửa nâng cao (mới)
Mở 1 dự án (ảnh hoặc video) trong editor:
1. **Bảng lớp (Layers)** — panel phải, trên cùng luôn hiện "Lớp (n)".
   - Thêm vài đối tượng (ảnh/chữ/hình) → mỗi cái là 1 dòng.
   - Bấm 1 dòng → chọn đối tượng đó. Bấm **con mắt** → ẩn/hiện. Bấm **▲/▼** → đổi thứ tự chồng. **Thùng rác** → xóa. **Bấm đúp tên** → đổi tên.
2. **Bảng emoji** — bấm công cụ **"Nhãn dán"** trên thanh công cụ → hiện lưới emoji → bấm 1 cái để thêm. Bấm ra ngoài để đóng.
3. **Hình mới** — thanh công cụ có thêm **Tam giác** và **Đường kẻ**. Với **hình chữ nhật**, panel phải có slider **Bo góc**.
4. **Hút màu** — chọn 1 chữ (tab "Định dạng chữ") hoặc 1 hình (tab "Thiết lập hình") → bấm nút **ống hút** cạnh ô màu → con trỏ thành kính lúp → bấm vào bất kỳ điểm nào trên màn hình để lấy màu đó.
   - ✅ Chỉ hỗ trợ Chrome/Edge mới; trình duyệt cũ sẽ báo không hỗ trợ (không phải lỗi).
> Tất cả là frontend — nhớ **Ctrl+F5** để nạp lại JS/CSS mới.

## B+. FILTER MÀU CHO VIDEO KHI XUẤT (B4 — mới)
Trong dự án **video**, chọn 1 clip video → panel phải → tab **"Bộ lọc"**.
1. Kéo **Độ sáng / Tương phản / Bão hòa / Hue / Làm mờ / Trắng đen** (hoặc bấm 1 preset).
2. Xem trước: clip đổi màu ngay.
3. **Xuất video** (WebM/MP4) → mở file tải về.
   - ✅ Màu của clip trong video xuất **khớp với chỉnh sửa**.
4. **Kiểm tra an toàn (quan trọng):** xuất 1 dự án có clip **KHÔNG chỉnh filter** → phải xuất bình thường y như trước (tính năng được "gated" nên không ảnh hưởng clip không filter).
> Lưu ý: **Sepia** và **Đảo màu** hiện chỉ áp ở xem trước & export ảnh, **chưa** áp khi render video (đã ghi trong tài liệu). Các filter còn lại đều áp đủ.
> Nếu xuất video lỗi sau khi thêm filter: mở `ffmpeg_error.log` ở thư mục gốc, gửi mình dòng `Executing FFmpeg command:` để mình sửa nhanh.

## F. TRANG HỒ SƠ — /profile (làm ở đợt trước)
1. `/projects` → cạnh nút đăng xuất có icon người → vào **Hồ sơ**, hoặc vào `http://localhost:8081/profile`.
2. ✅ Thấy thông tin tài khoản + thống kê dự án của bạn.
3. Đổi tên/email + nhập mật khẩu mới → **Lưu thay đổi** → ✅ báo thành công rồi tự đăng xuất để đăng nhập lại.

---

## Nếu gặp lỗi
- **Trang trắng / nút không bấm được**: F12 → Console xem lỗi JS (thường do cache — Ctrl+F5).
- **401/redirect login liên tục**: token hết hạn, đăng nhập lại.
- **Admin 403 dù là admin**: đăng xuất & đăng nhập lại để `user_info` lưu `role` mới (role chỉ được lưu khi đăng nhập sau khi cập nhật backend).
- **Export video lỗi**: kiểm tra `bin/ffmpeg.exe` và file `ffmpeg_error.log`.
