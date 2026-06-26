# KẾ HOẠCH TRIỂN KHAI: NÂNG CẤP UX VÀ HOÀN THIỆN TÍNH NĂNG (LILY EDITOR)

> Bản kế hoạch này chia nhỏ các tác vụ thành từng **Phase (Giai đoạn)**. Mỗi Phase đều chứa đầy đủ công việc của cả **Front-end** và **Back-end**, giúp dễ dàng thực thi từng phần ("mỗi lần chạy sửa một phần") mà không làm phá vỡ sự ổn định của hệ thống hiện tại.

---

## 🎯 PHASE 0: VÁ LỖI BẢO MẬT & XUNG ĐỘT (SECURITY & CONFLICTS) - [HOÀN THÀNH]
**Tình trạng:** Các lỗi nghiêm trọng về IDOR, hiển thị thùng rác, Quota Bypass và Name Collision đã được xử lý triệt để.

### 0.1. Sửa lỗi IDOR (Insecure Direct Object Reference) [x]
Tôi đã rà soát mã nguồn `MediaAssetServiceImpl` và `MediaFolderServiceImpl` và phát hiện một lỗ hổng nghiêm trọng: **Các hàm Đổi tên, Di chuyển, Xóa mềm, và Khôi phục không hề kiểm tra quyền sở hữu (`userId`)**. Một người dùng nếu biết ID tệp/thư mục của người khác hoàn toàn có thể gọi API để đổi tên hoặc xóa nó.
*   **Back-end (`MediaAssetController` / `MediaFolderController`):** 
    *   Bắt buộc lấy `userId` từ `Principal` và truyền xuống các hàm Service tương ứng (`updateMediaAsset`, `softDeleteMediaAsset`, v.v.).
*   **Back-end (`MediaAssetServiceImpl` / `MediaFolderServiceImpl`):** 
    *   Cập nhật các hàm sửa/xóa: Khi dùng `findById(id)`, phải thêm bước kiểm tra `if (!entity.getUserId().equals(userId)) throw new AccessDeniedException(...)`. Hoặc an toàn hơn là đổi repository method thành `findByIdAndUserId(id, userId)`.

### 0.2. Sửa lỗi UX hiển thị "phẳng" trong Thùng rác [x]
Hiện tại khi xóa một Thư mục có chứa Tệp tin bên trong, API đang trả về toàn bộ thư mục và tệp tin bị xóa dưới dạng một danh sách phẳng (Flat list). Điều này khiến Thùng rác bị rác/rối nếu xóa thư mục chứa hàng trăm tệp.
*   **Back-end (`MediaFolderServiceImpl` & `MediaAssetServiceImpl`):**
    *   Cần phân biệt "Xóa chủ động" và "Xóa bị động" (bị xóa theo thư mục cha).
    *   Hoặc đơn giản nhất khi get `isDeleted=true`: Chỉ trả về những Thư mục/Tệp tin mà `deleted=true` VÀ ( `parentId`/`folderId` là null HOẶC thư mục cha của nó có `deleted=false`). Như vậy, trong Thùng rác chỉ hiển thị "Thư mục gốc" bị xóa chứ không hiển thị bung bét nội dung bên trong nó. Mặc dù khi Khôi phục thư mục gốc đó, code hiện tại đã tự động đệ quy khôi phục toàn bộ nội dung bên trong rất chuẩn.

### 0.3. Ngăn chặn Xung đột (Conflicts) khi Khôi phục & Xóa [x]
Tôi đã rà soát thêm và phát hiện ra các "kẽ hở" có thể gây lỗi nghiêm trọng khi khôi phục hoặc tương tác với tài nguyên:
*   **Back-end (`MediaAssetServiceImpl` / `MediaFolderServiceImpl`):**
    *   **Lỗi Vượt hạn mức (Storage Quota Bypass):** Hiện tại chỉ kiểm tra dung lượng lúc upload. Nếu user xóa file 100MB (dung lượng trống tăng thêm 100MB), upload tiếp 100MB mới cho đầy thẻ, rồi vào Thùng rác bấm "Khôi phục" file cũ thì file cũ vẫn được khôi phục -> Vượt quá dung lượng 500MB quy định. Cần thêm hàm check Quota trước khi `restoreMediaAsset`.
    *   **Lỗi Trùng tên (Name Collision):** User xóa `Ảnh.png` vào thùng rác. Tạo một file mới tên `Ảnh.png`. Khi khôi phục file cũ từ thùng rác, hai file sẽ bị trùng tên trong cùng thư mục (có thể gây crash hoặc lỗi UI). Giải pháp: Khi restore, nếu tên đã tồn tại, tự động thêm hậu tố `Ảnh (1).png`.
    *   **Lỗi thao tác trên tài nguyên đã xóa:** Chặn việc Đổi tên (`renameFolder`, `updateMediaAsset`) hoặc Di chuyển (`moveFolder`) đối với những thư mục/tệp tin đang nằm trong thùng rác (`isDeleted == true`). Muốn sửa thì phải khôi phục trước.

---

## 🛠️ PHASE 0.5: HOÀN THIỆN & VÁ LỖI QUẢN TRỊ (ADMIN FIXES) - [HOÀN THÀNH]
**Mục tiêu:** Xử lý các lỗ hổng nghiêm trọng liên quan đến tính toàn vẹn dữ liệu, sao lưu, và bổ sung các tính năng quản trị còn thiếu.

### 0.5.1. Rò rỉ Tài nguyên khi Xóa Người dùng (Orphaned Data) [x]
*   **Vấn đề:** Tính năng xóa tài khoản (`UserServiceImpl.deleteUser`) hiện tại chỉ xóa bản ghi trong bảng `User`. Toàn bộ Dự án, Thư mục, và Tệp tin vật lý (trên ổ cứng) của người dùng đó bị bỏ lại vĩnh viễn, gây lãng phí dung lượng ổ cứng (Resource Leak) và rác database.
*   **Giải pháp:** Cập nhật logic xóa user: Xóa vật lý toàn bộ `MediaAsset` thuộc về `userId`, sau đó xóa các bản ghi trong `Project`, `MediaFolder`, `Notification` rồi mới xóa `User`.

### 0.5.2. Sao lưu/Phục hồi không hoàn chỉnh (Incomplete Backup) [x]
*   **Vấn đề:** Tính năng Backup hiện tại (`BackupController`) chỉ xuất database ra file JSON. Nó **không** bao gồm các tệp tin vật lý (ảnh/video) trong thư mục `/uploads`. Nếu phục hồi trên máy khác, toàn bộ ảnh/video sẽ bị lỗi hiển thị.
*   **Giải pháp:** Nâng cấp API Backup để nén (ZIP) file JSON database cùng với toàn bộ thư mục `/uploads`. API Phục hồi sẽ giải nén file ZIP, copy file vật lý vào đúng vị trí và chèn JSON vào database.

### 0.5.3. Quản lý Mẫu Thông báo (Notification Templates) [x]
*   **Vấn đề:** Backend đã có API CRUD cho Notification Templates nhưng đang thiếu phân quyền Admin. Đồng thời, giao diện Admin hiện tại hoàn toàn chưa có khu vực để người quản trị xem, chỉnh sửa nội dung thông báo.
*   **Giải pháp:**
    *   **Back-end:** Thêm phân quyền kiểm tra `ADMIN` vào `NotificationTemplateController`.
    *   **Front-end:** Bổ sung thêm phần **"Quản lý Thông báo"** vào trang `admin.html`. Tích hợp logic vào `admin.js` để gọi API lấy danh sách Template, và cung cấp modal cho phép Admin sửa đổi Tiêu đề / Nội dung.

### 0.5.4. Gửi thông báo chủ động (Manual Broadcast) [x]
*   **Vấn đề:** Admin chưa có tính năng gửi tin nhắn đến toàn bộ người dùng (Bảo trì, cập nhật hệ thống...).
*   **Giải pháp:** 
    *   **Back-end:** Chặn quyền gọi `POST /api/v1/notifications` chỉ cho phép Admin.
    *   **Front-end:** Thêm form "Gửi thông báo toàn hệ thống" trên `admin.html`. Khi submit sẽ đẩy thông báo trực tiếp qua Email hoặc Profile (hoặc cả hai) tới "ALL" người dùng.

### 0.5.5. Quản lý Cấu hình Hệ thống (System Settings) [x]
*   **Vấn đề:** Entity `SystemSetting` lưu trữ các tham số sống còn của hệ thống (VD: Quota lưu trữ, Bảo trì...) nhưng Admin không có giao diện nào để điều chỉnh, dẫn đến việc phải sửa thủ công trong DB hoặc sửa code.
*   **Giải pháp:**
    *   **Back-end:** Thêm API `GET` và `POST` tại `/api/v1/admin/settings` trong `AdminController`.
    *   **Front-end:** Thêm khu vực "Cấu hình Hệ thống" ở cuối trang Admin, hiển thị danh sách dạng bảng và cung cấp Modal để cập nhật giá trị (Value) của cấu hình.

---

## 🛡️ PHASE 0.6: BẢO TOÀN DỮ LIỆU & VÁ LỖI XUNG ĐỘT (DATA INTEGRITY FIXES) - [HOÀN THÀNH]
**Mục tiêu:** Vá các lỗ hổng nghiêm trọng liên quan đến việc Đổi tên, Xóa mềm (Thùng rác) và Khôi phục Tài nguyên/Dự án.

### 0.6.1. Lỗi Xóa Media khi đang sử dụng trong Dự án đã Xóa (Data Integrity Bug)
*   **Vấn đề:** Khi Dự án (Project) bị xóa mềm, hệ thống sẽ bỏ qua dự án này khi kiểm tra "tài nguyên đang sử dụng" (`checkFolderInUse` và `getMediaAssetUsage`). Người dùng có thể vô tình hoặc cố ý xóa vĩnh viễn Media Asset đang nằm trong dự án đó. Khi khôi phục Dự án, nó sẽ bị hỏng hiển thị do mất file vật lý gốc.
*   **Giải pháp:** 
    *   Bắt buộc quét CẢ các dự án đã nằm trong thùng rác khi kiểm tra sử dụng.
    *   **Giải pháp (Đã triển khai):** Cập nhật `MediaAssetServiceImpl` và `MediaFolderServiceImpl` để truy vấn *toàn bộ* dự án của user (kể cả đã xóa) khi kiểm tra tệp tin đang được sử dụng.
    *   Gửi thông báo: *"Không thể xóa vì tệp tin đang được dùng trong dự án [Tên Dự Án] (trong thùng rác). Vui lòng xóa vĩnh viễn dự án đó trước."*

### 0.6.2. Lỗi Xung đột Tên khi Khôi phục Thư mục cha (Silent Name Collision)
*   **Vấn đề:** Khi khôi phục một tài nguyên từ sâu bên trong thùng rác, hệ thống có tính năng đệ quy khôi phục toàn bộ chuỗi Thư mục cha (`restoreParentFoldersRecursive`). Tuy nhiên, hàm này không hề kiểm tra xem việc khôi phục đó có gây trùng tên với một Thư mục đang hoạt động ở bên ngoài hay không.
*   **Giải pháp (Đã triển khai):** Bổ sung thuật toán `resolveConflictName` (thêm số `(1), (2)`) vào logic khôi phục thư mục cha tự động. Áp dụng cho cả `MediaFolderServiceImpl` và `MediaAssetServiceImpl`.

### 0.6.3. Xung đột khi Tạo mới / Đổi tên Dự án
*   **Vấn đề:** Hiện tại, người dùng có thể tạo vô số Dự án có tên giống hệt nhau, nhưng khi khôi phục từ thùng rác thì hệ thống lại báo trùng và tự gán thêm chữ `(Khôi phục)`.
*   **Giải pháp (Đã triển khai):** Đồng bộ logic. Sử dụng thống nhất cơ chế đánh số `(1), (2)` cho cả Tạo mới, Đổi tên và Khôi phục Dự án trong `ProjectServiceImpl`.

---

## 🔔 PHASE 0.7: VÁ LỖI LOGIC THÔNG BÁO BROADCAST [HOÀN THÀNH]
**Mục tiêu:** Xử lý triệt để lỗi đồng bộ trạng thái "đã đọc" khi gửi thông báo chung cho toàn hệ thống.

### 0.7.1. Lỗi Trạng thái isRead của Thông báo Broadcast
*   **Vấn đề:** Hiện tại, khi Admin gửi thông báo với cờ `userId = "ALL"`, hệ thống chỉ tạo đúng **1 bản ghi (1 Document)** duy nhất trong MongoDB. Khi một người dùng bất kỳ click đọc thông báo, trường `isRead` của bản ghi đó chuyển thành `true`, khiến **toàn bộ người dùng khác** cũng bị đánh dấu là đã đọc (mất thông báo/mất chấm đỏ).
*   **Giải pháp Đề xuất:** 
    *   Sửa đổi hàm `sendNotification` trong `NotificationServiceImpl`.
    *   Khi gửi một thông báo In-App (chọn hiển thị ở PROFILE hoặc BOTH) mang nhãn `ALL`, hệ thống sẽ truy vấn danh sách toàn bộ User hiện có.
    *   Nhân bản (clone) thông báo đó thành N bản ghi độc lập (gán `userId` cụ thể cho từng người) và dùng `notificationRepository.saveAll(list)` để lưu hàng loạt.
    *   Gỡ bỏ logic tải gộp `findByUserId("ALL")` ở API lấy thông báo của user (vì lúc này mỗi user đã có bản ghi riêng).

---

## 🎯 PHASE 1: TRẢI NGHIỆM NỀN TẢNG (HIỂN THỊ & REAL-TIME) - [HOÀN THÀNH]
*Mục tiêu: Đem lại cảm giác mượt mà ngay khi người dùng bước vào ứng dụng và trong lúc chờ hệ thống xử lý.*

### 1.1. Thumbnail Server-side (Mã C1)
Khắc phục tình trạng chỉ hiển thị icon tĩnh cho các file hình ảnh/video lớn.
*   **Back-end (`MediaAssetService.java`):** 
    *   Bổ sung luồng trích xuất ảnh thu nhỏ ngay khi user upload file.
    *   Ảnh: Dùng `Thumbnailator` tạo bản sao .thumb.jpg (~256x256).
    *   Video: Gọi tiến trình con `FFmpeg` (`-vframes 1`) để cắt khung hình đầu tiên làm thumbnail.
    *   Lưu thuộc tính `thumbnailUrl` vào entity trong MongoDB.
*   **Front-end (`projects.html`, `projects.js`):** 
    *   Thay đổi cơ chế render lưới thẻ dự án & tài nguyên.
    *   Gắn `src` của thẻ `<img>` trỏ về đường dẫn thumbnail do server cung cấp, fallback về icon tĩnh nếu lỗi.

### 1.2. SSE Real-time Progress & Luồng Xuất bản (Mã C3)
Chuyển đổi từ cơ chế Polling (hỏi liên tục) tốn tài nguyên sang luồng Push Real-time mượt mà. Đảm bảo trải nghiệm "Background Rendering".
*   **Back-end (`ProjectProcessingController.java`, `VideoRenderTask.java`):**
    *   Thiết lập endpoint `GET /api/v1/video-processing/stream/{taskId}` trả về đối tượng `SseEmitter`.
    *   Sửa logic gọi FFmpeg: Cập nhật sự kiện tiến trình (% hoàn thành) và đẩy thẳng về client qua `emitter.send()`.
*   **Front-end (`export-actions.js`, `editor.html`):**
    *   Xóa hàm `setInterval`. Khởi tạo `new EventSource(...)` để bắt sự kiện.
    *   **Background Rendering & Web Worker:** Thay vì màn hình khóa blocking (`rendering-lock-overlay`), chuyển tiến trình render thành một thanh Progress nhỏ ở góc dưới. Chuyển các tác vụ nặng xuống Web Worker xử lý ngầm, cho phép người dùng lướt web hoặc làm việc khác trong lúc chờ.

### 1.3. Tinh chỉnh Tương tác (Micro-interactions) & Phản hồi
*   **Front-end (Toàn hệ thống):**
    *   **Toast Notifications:** Thay thế các Message Dialog cản trở luồng công việc bằng các Toast thông báo nhỏ (VD: "Lưu thành công", "Copy layer") nổi lên ở góc dưới màn hình và tự động biến mất sau 3 giây.
    *   **[ĐÃ CÓ SẴN] Tooltips & Phím tắt:** Bảng phím tắt đã được triển khai (`shortcuts-dialog`). Sẽ chỉ cần nâng cấp thêm các phím tắt mới nếu cần.
    *   **Preview Quality (Chất lượng xem trước):** Thêm tính năng giảm độ phân giải xem trước (VD: 480p) trong Editor để đảm bảo thao tác mượt mà không giật lag, chỉ kết xuất chất lượng cao nhất khi Export.

### 1.4. Chunked Upload cho video lớn
Khắc phục tình trạng timeout khi upload file video lớn, thay thế cơ chế upload nguyên cục bằng upload từng phần (chunking).
*   **Back-end (`MediaAssetController`, `MediaAssetService`):**
    *   Mở API nhận file upload theo dạng part/chunk.
    *   Ghép nối các part lại khi hoàn tất.
*   **Front-end (`file-upload.js`):**
    *   Sử dụng FileReader API để chia file thành các chunk 2MB-5MB.
    *   Upload đồng thời hoặc tuần tự các chunk có Retry Mechanism nếu mạng rớt giữa chừng.

### 1.5. Trích xuất Âm thanh từ Video (Extract Audio)
*   **Bố trí Giao diện (UI/UX):**
    *   **Trong Timeline:** Click chuột phải vào layer Video trên Timeline hiện nút "Trích xuất âm thanh". (Hoặc nút tương ứng trong tab Audio ở Right Panel). Việc trích xuất chỉ được thực hiện đối với các layer đang có trên Timeline.
*   **Luồng hoạt động (Front-end):**
    *   Sau khi ra lệnh từ Timeline, hệ thống sẽ bật lên một hộp thoại (Modal) yêu cầu người dùng **chọn thư mục đích** trong Quản lý Tệp tin để lưu file âm thanh.
    *   Sau khi xác nhận, giao diện hiển thị trạng thái loading.
    *   Khi server trả về kết quả, file âm thanh mới sẽ xuất hiện trong thư mục người dùng vừa chọn ở **Quản lý Tệp tin (Media Explorer)**. Mặc định KHÔNG chèn tự động xuống Timeline. 
    *   Người dùng có thể tự do kéo thả file Audio đó từ Media Explorer vào Timeline nếu muốn.
*   **Xử lý Server (Back-end/Worker):**
    *   Backend nhận thông tin clip trên Timeline, gọi FFmpeg (VD: `ffmpeg -i input.mp4 -vn -acodec libmp3lame output.mp3`) để tách tệp âm thanh.
    *   Lưu file audio sinh ra thành một `MediaAsset` mới (loại `AUDIO`) vào thư mục (Folder ID) mà người dùng đã chỉ định. Đăng ký vào Database để quản lý chuẩn mực.
    *   Đổi tên tự động với hậu tố: `[Tên_Video_Gốc] (Audio).mp3` nếu trùng lặp. *(Lưu ý: Tạm thời vô hiệu hóa hoặc giả lập (Mock) việc kiểm tra giới hạn Storage Quota cho đến khi hoàn thiện Phase 5).*

---

## ✅ PHASE 2: TRẢI NGHIỆM CẮT GHÉP VIDEO (TIMELINE UX) [HOÀN THÀNH]
*Mục tiêu: Biến Timeline thành một công cụ chỉnh sửa trực quan, độ chính xác cao.*

### ✅ 2.1. Waveform và Filmstrip (Mã B7)
Giúp người dùng không phải "edit mù" khi cắt ghép video và âm thanh.
*   **Back-end (Tùy chọn tối ưu):** Có thể hỗ trợ trích xuất trước ảnh dải sóng âm (waveform.png) bằng FFmpeg để giảm tải cho client.
*   **Front-end (`timeline.js`, `timeline-player.js`):**
    *   Dùng `Web Audio API` giải mã file âm thanh (hoặc audio từ video) và vẽ biểu đồ sóng âm (Waveform) đè lên track. Điều này giúp thao tác "beat sync" cực kỳ trực quan.
    *   Tính toán độ dài clip để render dãy ảnh thu nhỏ (Filmstrip) liên tiếp trên thanh track của video.

### ✅ 2.2. [ĐÃ CÓ SẴN] Contextual Panel & Chuyển cảnh (Mã B2)
*   **Hiện trạng:** Bảng công cụ thông minh (Contextual Panel) đã được triển khai hoàn thiện trong `right-panel` (text-controls, other-controls).
*   **Cần làm thêm:** Thêm UI cho tab **Chuyển cảnh (Transitions)**, cho phép chọn Fade, Slide, Zoom... ở điểm giao giữa 2 clip, và xử lý FFmpeg command cho Transitions.

### ✅ 2.3. [HOÀN THÀNH] Không gian làm việc Không giới hạn (Workspace)
*   **[ĐÃ CÓ SẴN] Drag & Drop to Canvas:** Chức năng kéo thả file trực tiếp vào Canvas/DropZone đã được triển khai.
*   **[ĐÃ HOÀN THÀNH] Ruler & Guides:** Bổ sung 2 thanh thước `canvas-ruler` ở mép trên và trái của Canvas, tương tác dựa vào thông số thu phóng (zoom) hiện tại.
*   **[ĐÃ HOÀN THÀNH] Multi-selection (Chọn nhiều đối tượng):** Bổ sung biến trạng thái `selectedInstanceIds`. Hỗ trợ:
    *   **Shift + Click:** Chọn thêm/bỏ chọn đối tượng linh hoạt (cả trên Preview và Timeline).
    *   **Marquee Drag:** Kéo chuột tạo vùng chọn (với giao diện vùng quét trong mờ) quét qua các đối tượng để gom nhóm nhanh.
    *   **Thao tác đồng loạt:** Di chuyển (Drag Move), Xóa (Delete/Backspace/Nút xoá Timeline), Nhân bản (Ctrl+D) cùng lúc cho toàn bộ đối tượng được chọn mà không làm đứt gãy luồng xử lý riêng biệt.

### ✅ 2.4. Trải nghiệm Timeline Nâng cao (Advanced Timeline)
*   **Zoom Timeline:** Hỗ trợ tính năng thu phóng (Ctrl + Cuộn chuột hoặc thanh trượt) để người dùng có thể điều hướng mức độ chi tiết đến từng mili-giây (frame by frame).
*   **Magnetic Timeline (Từ tính):** Logic tự động "hút" các clip lại với nhau khi người dùng xóa một clip ở giữa, ngăn chặn việc tạo ra các "Khung hình đen" (Black frames) một cách vô ý.

---

## 🔒 PHASE 3: BẢO MẬT & HIỆU NĂNG HỆ THỐNG [HOÀN THÀNH]
*Mục tiêu: Đảm bảo người dùng không bị văng tài khoản vô lý và hệ thống chịu tải tốt với dữ liệu lớn.*

### 3.1. Cơ chế Refresh Token (Mã C4) & Bảo mật Worker [HOÀN THÀNH]
> **Migration Note:** Triển khai backend trước, sau đó mới cập nhật interceptor ở FE để tránh vòng lặp double-401.
*   **Back-end (`JwtTokenProvider.java`, `AuthController.java`, `SecurityConfig.java`, `SystemSetting`):**
    *   Chuyển Access Token thành loại ngắn hạn (ví dụ 15 phút) và sinh thêm Refresh Token thời hạn dài (ví dụ 7 ngày).
    *   Lưu các giá trị cấu hình (Thời gian sống của Access/Refresh Token, Secret Key của Worker) vào bảng `SystemSetting` (có thể chỉnh sửa qua giao diện Admin) và đọc từ Database bằng `SystemSettingService`.
    *   Mở API `POST /api/v1/users/refresh` để đánh giá cookie và cấp lại Access Token mới.
    *   **Bảo vệ Worker:** Khóa endpoint `/api/internal/jobs/callback` bằng shared secret key (đọc từ `SystemSetting`) thông qua Header `X-Worker-Token`.
    *   Siết chặt CORS: Đổi `allowedOriginPatterns("*")` sang mảng origin cụ thể cho production.
*   **Front-end (`auth.js`):**
    *   Đăng ký Axios/Fetch interceptor. Bất cứ khi nào gọi API bị lỗi `401 Unauthorized`, interceptor sẽ tự động gọi API `/refresh`. Nếu thành công, tự động thực hiện lại request đang dang dở.

### 3.2. Phân trang & Tìm kiếm (Mã C2)
> **Migration Note:** API phân trang mới cần có giá trị `size` mặc định hợp lý (vd 20) để FE cũ (gọi không tham số) chỉ nhận 20 item đầu tiên thay vì lấy hết. Cần lên lịch update FE ngay sau đó.
*   **Back-end (`MediaAssetController`, `ProjectController`):**
    *   Chuyển đổi các API lấy danh sách thành dạng nhận tham số `Pageable` của Spring Data.
    *   Hỗ trợ các tham số query `?search=...&page=0&size=20`.
*   **Front-end (`projects.js`):**
    *   Thay thế việc tải toàn bộ mảng và lọc ở client bằng cách tải trang đầu tiên.
    *   Bổ sung nút "Tải thêm" (Load More) hoặc logic cuộn vô tận (Infinite Scroll) gọi API trang tiếp theo.

### 3.3. Kiểm thử & Hướng dẫn sử dụng (Testing & Onboarding)
*   **Back-end (Unit & Integration Tests):**
    *   Viết Unit Tests sử dụng JUnit và Mockito cho các Service cốt lõi (`UserService`, `ProjectService`, `MediaAssetService`).
    *   Viết Integration Tests để kiểm tra luồng phức tạp: Thêm file -> Xóa vào thùng rác -> Kiểm tra Quota bị giảm -> Khôi phục file -> Kiểm tra Quota tăng.
*   **Front-end (Onboarding Flow):**
    *   Tạo Overlay hướng dẫn (Guided Tour) sử dụng `intro.js` hoặc custom dialogs.
    *   Chỉ hiển thị tour trong lần đầu tiên đăng nhập, hướng dẫn tạo dự án, kéo thả công cụ.

### 3.4. Cơ chế Đồng bộ trạng thái Dự án (Multi-tab Sync / Concurrent Editing)
*   **Vấn đề:** Nếu người dùng mở cùng một dự án trên 2 tab trình duyệt khác nhau và chỉnh sửa đồng thời, khi lưu lại (Save) có thể xảy ra tình trạng ghi đè dữ liệu cũ lên dữ liệu mới, gây ra lỗi logic hoặc mất mát dữ liệu (Data Loss).
*   **Giải pháp (Cơ chế Versioning / Last Modified Check):**
    *   **Back-end:** Mỗi khi truy vấn `Project`, API trả về kèm theo trường `updatedAt` (hoặc `version`). Khi client gọi API lưu dự án, bắt buộc phải gửi kèm giá trị này. Back-end sẽ so sánh, nếu bản ghi từ client cũ hơn trong Database, từ chối request với HTTP Status `409 Conflict`.
    *   **Front-end:** Khi lưu dự án, nếu bắt được lỗi `409 Conflict`, hiển thị thông báo: *"Dự án đã được cập nhật ở một tab hoặc thiết bị khác. Vui lòng tải lại trạng thái mới nhất để tránh ghi đè sai lệch dữ liệu."* kèm theo nút `Tải lại (Reload)` để đồng bộ dữ liệu mới nhất.

---

## 🚀 PHASE 4: TÍNH NĂNG CAO CẤP & WOW FACTOR (AI & NỘI DUNG)
*Mục tiêu: Tạo ra các điểm nhấn khác biệt cho Editor.*

### 4.1. Tách Nền AI (Mã A8)
*   **Worker Python (`worker/app.py`):**
    *   Mở endpoint `POST /api/worker/remove-bg`.
    *   Cài đặt thư viện `rembg`. Nhận hình ảnh, chạy model AI xóa nền và trả về định dạng PNG trong suốt.
*   **Back-end (Spring Boot):**
    *   Tạo Service làm cầu nối, gửi ảnh sang Worker xử lý, sau đó lưu file kết quả như một Asset mới.
*   **Front-end:**
    *   Gắn nút "Xóa nền AI" (Kèm icon sao lấp lánh) trên thanh công cụ khi user chọn một layer Ảnh.

### 4.2. Quản lý Thư viện Nhạc / Sound Effects (Mã B6)
*   **Back-end & Database:**
    *   Thêm logic để phân biệt Asset cá nhân (Private) và Asset hệ thống (Public).
    *   Chuẩn bị sẵn một bộ sưu tập nhạc nền / hiệu ứng âm thanh miễn phí bản quyền seed vào DB.
*   **Front-end:**
    *   Tại menu trái (Sidebar) của Editor, thêm tab **"Âm thanh"**. Cho phép người dùng duyệt, nghe thử và kéo thả thẳng đoạn nhạc đó vào Timeline.

### 4.3. Dò Tìm & Theo Dõi Khuôn Mặt AI (Face Tracking & Obfuscation)
*   **Worker Python (`worker/app.py`):**
    *   Tích hợp mô hình Computer Vision (như `OpenCV` Haar Cascades hoặc `MediaPipe` Face Detection).
    *   Mở endpoint nhận đầu vào là hình ảnh (hoặc khung hình video), trả về tọa độ (bounding box) của các khuôn mặt xuất hiện trong hình.
*   **Back-end (Spring Boot):** Tạo service làm trung gian gọi Worker để lấy tọa độ khuôn mặt.
*   **Front-end:**
    *   Cung cấp tính năng "Che khuôn mặt" trên thanh công cụ ngữ cảnh.
    *   Dựa vào tọa độ trả về từ AI, tự động áp dụng filter `blur` (làm mờ), pixelate (đóng pixel) hoặc tự động chèn một nhãn dán (Sticker/Icon/Emoji) đè lên vị trí khuôn mặt đó trên Canvas/Video.

### 4.4. Tích hợp Thư viện Stock API (Unsplash / Pexels)
*   **Back-end:** Tạo các endpoints proxy gọi đến API của Unsplash/Pexels/Pixabay để tìm kiếm hình ảnh và video stock miễn phí.
*   **Front-end:** Trong Sidebar, mở thêm Tab "Thư viện Stock", cho phép người dùng tìm kiếm theo từ khóa và kéo thả trực tiếp tài nguyên đó vào Canvas hoặc Timeline mà không cần rời khỏi ứng dụng để tải về.

### 4.5. Cơ chế Xử lý & Quản lý Tài nguyên AI chung
Vì các tính năng AI (Xóa nền, Dò tìm khuôn mặt...) tiêu tốn nhiều tài nguyên xử lý và lưu trữ, hệ thống áp dụng cơ chế chuẩn sau:
1.  **Kiểm tra Quota (Test Mode):** Tạm thời giả lập (Mock) việc kiểm tra số dư tín dụng (Credits) và dung lượng lưu trữ (Storage Quota) để đảm bảo không block luồng tính năng. Cơ chế thực tế sẽ được ráp nối khi triển khai xong Phase 5.
2.  **Chọn Thư mục đích:** Khi người dùng kích hoạt AI, hệ thống hiển thị Modal yêu cầu chọn **vị trí lưu** (Thư mục trong Media Explorer) cho kết quả đầu ra.
3.  **Tạo File Mới độc lập:** AI Worker sau khi xử lý xong sẽ **KHÔNG** ghi đè lên file gốc. Hệ thống sẽ tạo ra một bản sao (bản đã áp dụng AI) và lưu vào đúng Thư mục người dùng đã chọn.
4.  **Tránh trùng lặp tên:** Áp dụng thuật toán `resolveConflictName` (ví dụ: `Tên_File_Goc_AI_Processed (1).png`) để tránh xung đột.
5.  **Tự động thay thế Layer:** Front-end tự động ẩn/xóa Layer Media cũ đang được chọn trên Canvas/Timeline và thay thế trực tiếp bằng MediaAsset mới, giữ nguyên các thuộc tính kích thước, vị trí.
6.  **Xử lý lỗi (Fallback & Timeout):**
    *   Worker cần giới hạn thời gian chạy (Timeout). Nếu quá thời gian, báo lỗi về Backend.
    *   Giao diện người dùng phải bắt được lỗi khi Worker sập (Crashes) hoặc Timeout, hiện Toast báo lỗi "AI xử lý thất bại" và tắt loading spinner thay vì quay vòng vô tận. Có nút Retry nếu lỗi kết nối.

---

## 💎 PHASE 5: HỆ THỐNG SUBSCRIPTION, CREDITS & QUẢN LÝ LƯU TRỮ (SAAS MODEL)
*Mục tiêu: Chuyển đổi ứng dụng thành một nền tảng SaaS thực thụ với các cấp độ tài khoản (Plans), hệ thống thanh toán tín dụng (Credits) và giới hạn tài nguyên (Storage).*

### 5.1. Hệ thống Cấp độ Tài khoản (Subscription Plans)
*   **Cơ sở dữ liệu:** Bổ sung Entity `Plan` (Gói cước: Free, Pro, Premium...) và cập nhật Entity `User` để liên kết với `Plan`.
*   **Phân quyền Tính năng (Feature Gates):**
    *   Giới hạn các chức năng theo Plan (Ví dụ: `Free` chỉ được xuất video 720p, `Pro` được xuất 1080p, `Premium` được xuất 4K và dùng các tính năng AI nâng cao).
    *   Xây dựng Middleware/Interceptor ở Back-end để chặn API nếu người dùng gọi tính năng vượt quá Plan của mình.
*   **Giao diện:** Thêm trang Bảng giá (Pricing Page) và luồng nâng cấp tài khoản (Upgrade Flow). Hiển thị Badge (Pro/Premium) ở góc Avatar người dùng.

### 5.2. Hệ thống Tín dụng (Credits System)
*   **Vấn đề:** Các tính năng tốn nhiều tài nguyên máy chủ (như Render Video, Xử lý AI, Tách Nền AI) cần được kiểm soát dung lượng sử dụng.
*   **Giải pháp:** 
    *   Mỗi tài khoản được cấp một lượng `Credits` nhất định hàng tháng dựa theo Plan (ví dụ: Free: 50 credits/tháng, Pro: 500 credits/tháng).
    *   Trừ `Credits` mỗi khi người dùng sử dụng tính năng tốn phí (VD: Tách nền ảnh = 1 credit, Render 1 phút video = 5 credits).
    *   Tạo chức năng **Mua thêm Credits (Top-up)** (thông qua cổng thanh toán VNPay / Stripe / Momo) cho người dùng đã hết Credits nhưng chưa muốn nâng cấp Plan.
    *   Giao diện hiển thị trực quan số dư Credits còn lại trên Topbar.

### 5.3. Quản lý Dung lượng Lưu trữ (Storage Quota)
*   **Kiểm soát tài nguyên ổ đĩa:**
    *   Mỗi Plan sẽ có một hạn mức lưu trữ ổ đĩa (Storage Quota) riêng biệt (ví dụ: Free: 1GB, Pro: 10GB, Premium: 50GB).
    *   Tạo Service lắng nghe các thao tác Upload, Duplicate tệp tin để tính toán tổng dung lượng file của user.
    *   Nếu vượt quá dung lượng, chặn thao tác Upload mới và hiển thị cảnh báo yêu cầu Nâng cấp Plan hoặc dọn dẹp Thùng rác.
*   **Giao diện quản lý:** Bổ sung thanh biểu đồ dung lượng (Storage Progress Bar) trong giao diện Explorer hoặc trong trang Hồ sơ cá nhân (Profile) để người dùng chủ động kiểm soát bộ nhớ.

### 5.4. Chia sẻ Công khai (Public Share Link)
*   **Tính năng:** Cho phép chia sẻ project cho người khác xem mà không cần đăng nhập vào hệ thống.
*   **Back-end:**
    *   API sinh ra một URL kèm token mã hóa (ví dụ: `/share/{unique-token}`).
    *   Token có thời hạn hoặc vô thời hạn (có thể điều chỉnh).
*   **Front-end:**
    *   Trang `/share/xxx` chuyên biệt chỉ cho xem (Read-only), ẩn các thanh công cụ Edit, có nút Play cho Video.
*   **Phân quyền Plan:** Giới hạn số lượng Link Share công khai cho Free Plan, mở khóa không giới hạn cho Pro Plan.

---

## 🔮 PHASE 6: TÍCH HỢP GENERATIVE AI (SÁNG TẠO NỘI DUNG TỪ PROMPT)
*Mục tiêu: Đưa ứng dụng lên tầm cao mới bằng cách cho phép người dùng "sáng tạo từ con số 0" thông qua các công cụ Sinh Ảnh và Sinh Video (Text-to-Image, Text-to-Video, Image-to-Video) từ các Provider hàng đầu.*

> [!WARNING]
> **Điều kiện bắt buộc trước khi bắt đầu Phase 6:**
> - Hệ thống Credits (Phase 5) **phải hoàn thành và test kỹ** để có khả năng tính phí các API request.
> - Có sẵn hệ thống Rate Limiting tại AI Gateway để chống spam.
> - Cấu hình được Spend Cap (Hạn mức giới hạn chi tiêu tối đa) ở API keys bên thứ 3.

### 6.1. Kiến trúc Tích hợp AI Provider
*   **Back-end Middleware:** Xây dựng một Module AI Gateway độc lập trong Spring Boot để quản lý các API Keys và điều phối request tới các đối tác bên thứ 3 (Kling AI, Seedance, Veo, Runway, Midjourney API, OpenAI DALL-E...).
*   **Quản lý Credits:** Vì chi phí gọi các API này rất đắt đỏ, nên bắt buộc phải tích hợp chặt chẽ với hệ thống Credits (Phase 5). Ví dụ: 1 lần sinh ảnh = 2 credits, 1 giây sinh video Kling = 10 credits.
*   **Hàng đợi Asynchronous (Webhooks / Polling):** Các tác vụ sinh video thường mất vài phút. Backend cần cung cấp cơ chế lưu trạng thái `PENDING`, gửi Polling hoặc Webhook về cho Frontend khi render xong.

### 6.2. Tính năng Text-to-Image (Tạo ảnh từ văn bản)
*   **Giao diện Sidebar:** Bổ sung tab "AI Sáng tạo" trong Editor.
*   **Luồng hoạt động:** Người dùng nhập Prompt (tiếng Anh/Việt) -> Chọn tỷ lệ khung hình (16:9, 1:1, 9:16) -> Chọn Style (Cinematic, Anime, Realistic) -> Nhấn "Generate".
*   **Kết quả:** Hệ thống trừ Credits, gọi API. Sau khi có ảnh, tự động lưu vào hệ thống dưới dạng một Media Asset thuộc thư mục "AI Generated" của người dùng và cho phép kéo thả vào Canvas.

### 6.3. Tính năng Text/Image-to-Video (Tạo video bằng AI)
*   **Sức mạnh AI Video:** Hỗ trợ gọi các model tân tiến như Kling AI, Veo, Seedance để tạo ra các đoạn video ngắn (3-5 giây) có độ chân thực cao.
*   **Ứng dụng thực tế:** Người dùng có thể dùng chính bức ảnh đang chỉnh sửa trên Canvas, khoanh vùng và nhập Prompt để biến nó thành video động (Image-to-Video), sau đó chèn trực tiếp xuống Timeline để cắt ghép.
*   **Đồng bộ tài nguyên:** Video sinh ra tuân thủ nguyên tắc quản lý tài nguyên AI chung (mục 4.5), không ghi đè, tạo Media Asset mới và tự kiểm tra Storage/Credits trước khi chạy.
