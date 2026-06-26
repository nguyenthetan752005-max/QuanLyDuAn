# 16. Sprint 11: Server-side Video Rendering - FFmpeg (Biên dịch Video phía máy chủ)

## 16.1. Sprint Goal
Tích hợp và cấu hình công cụ xử lý đa phương tiện FFmpeg trên máy chủ Backend để biên dịch (render) các lớp âm thanh, hình ảnh và phân đoạn video từ cấu trúc timeline của dự án thành một tệp tin video hoàn chỉnh (định dạng MP4/WebM) chất lượng cao.

## 16.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US28** | Cấu hình FFmpeg | Thiết lập tích hợp bộ công cụ FFmpeg CLI hoặc thư viện Java wrapper (như ffmpeg-commander hoặc Jaffree) trên máy chủ |
| **US28** | Trình biên dịch lệnh | Lập trình module sinh câu lệnh FFmpeg phức tạp (`filter_complex`) tự động ghép nối các clips, tạo hiệu ứng chuyển cảnh và chèn âm thanh từ dữ liệu timeline dự án |
| **US29** | Hàng đợi render video | Xây dựng hàng đợi bất đồng bộ giới hạn tài nguyên CPU chạy tiến trình render FFmpeg ở chế độ nền nhằm bảo vệ máy chủ chính |
| **US30** | Theo dõi trạng thái | Thiết lập API Polling/Websocket thông báo tiến trình kết xuất video theo thời gian thực và dọn dẹp bộ nhớ đệm tạm thời sau khi hoàn thành |

## 16.3. Database trong Sprint 11
Sử dụng và mở rộng bộ sưu tập **project_processings** (đã tạo từ Sprint 8):
```json
{
  "_id": "ObjectId",
  "projectId": "String (ID dự án video)",
  "userId": "String (ID người dùng)",
  "type": "String (Đổi thành VIDEO)",
  "renderSettings": {
    "resolution": "String (Ví dụ: 1080p, 720p, 4K)",
    "fps": "Integer (Tốc độ khung hình: 30 hoặc 60)",
    "format": "String (Định dạng đầu ra: MP4, WEBM)",
    "bitrateKbps": "Integer (Băng thông mã hóa, ví dụ: 5000)"
  },
  "status": "String (PROCESSING, COMPLETED, FAILED)",
  "progressPercent": "Integer (Tiến độ hoàn thành từ 0 đến 100)",
  "finalExportPath": "String (Đường dẫn tải video thành phẩm trên ImageKit CDN hoặc Local Storage)",
  "errorMessage": "String (Thông tin chi tiết lỗi nếu kết xuất thất bại)",
  "createdAt": "ISODate",
  "finishedAt": "ISODate"
}
```

## 16.4. API trong Sprint 11
| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| **POST** | `/api/v1/video-processing/render` | Bắt đầu đưa dự án video vào hàng đợi xử lý để biên dịch thông qua FFmpeg |
| **GET** | `/api/v1/video-processing/status/{id}` | Lấy trạng thái tiến độ render (%) và liên kết tải tệp tin video thành phẩm |

## 16.5. Frontend trong Sprint 11
Trang cần làm:
* **editor.html**
  Chức năng giao diện:
  * Thêm nút "Xuất bản Video" (Export Video) trên thanh menu chính.
  * Hộp thoại **Export Settings Modal**:
    * Cho phép lựa chọn độ phân giải xuất ra (720p, 1080p), tốc độ khung hình (30fps, 60fps) và định dạng tệp (MP4, WebM).
    * Hiển thị ước tính kích thước tệp tin đầu ra.
    * Nút bấm hành động "Kết xuất" (Render Now).
  * Giao diện chờ hiển thị tiến trình biên dịch (Render Progress Overlay): Hiển thị thanh chạy % tiến độ cùng thông báo trạng thái sinh động.
  * Nút bấm "Tải xuống Video thành phẩm" hiển thị nổi bật sau khi trạng thái tác vụ chuyển thành `COMPLETED`.

## 16.6. Increment sau Sprint 11
Sau **Sprint 11**, nhóm tạo ra **Increment** tiếp theo:
**Increment 11: Production-ready Video Render Engine**
Increment này bao gồm:
* Trình kết xuất video FFmpeg hoạt động hoàn chỉnh ở Backend.
* Cơ chế tự động dịch mã timeline thiết kế thành các tham số biên dịch video và audio chính xác.
* Chức năng cấu hình định dạng xuất bản đa dạng và tải về tệp tin video MP4/WebM chất lượng cao tương thích tốt trên các nền tảng mạng xã hội (YouTube, TikTok).

## 16.7. DoD của Sprint 11
Sprint 11 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| Trình kết xuất sinh đúng tệp video MP4 ghép nối chuẩn xác các phân đoạn hình ảnh và âm thanh từ timeline | Có |
| Tiến trình FFmpeg chạy độc lập không gây quá tải hoặc treo ứng dụng web Spring Boot chính | Có |
| Toàn bộ tệp tin hình ảnh/âm thanh trung gian được tự động xóa sạch để tiết kiệm dung lượng đĩa của máy chủ | Có |
| Không xảy ra hiện tượng lệch pha (Sync drift) giữa âm thanh và hình ảnh trong tệp tin video đầu ra | Có |

## 16.8. Sprint Review Sprint 11
Trong buổi **Sprint Review**, nhóm **demo**:
* Mở một dự án video có thời lượng 10 giây gồm 2 video nhỏ lồng nhạc nền.
* Nhấp chọn "Xuất bản Video", đặt cấu hình 1080p, định dạng MP4 và bấm "Render Now".
* Trình diễn quá trình chạy tiến trình ở giao diện bắt đầu nhảy % tiến độ tăng dần.
* Sau khi hoàn tất, click vào nút "Tải xuống Video" tải tệp về máy tính. Mở tệp phim bằng phần mềm xem video, kiểm chứng âm thanh lồng khớp chuẩn xác theo giây và hình ảnh sắc nét.

**Product Owner** kiểm tra chất lượng tệp tin xuất bản và đánh giá hiệu năng chịu tải render của máy chủ.

## 16.9. Sprint Retrospective Sprint 11
Nhóm thảo luận:
* **Điều làm tốt**:
  * Biên dịch câu lệnh `filter_complex` của FFmpeg chạy cực kỳ chính xác đối với các thao tác cắt ghép phân đoạn phức tạp.
  * Giao diện người dùng hướng dẫn các bước xuất bản rõ ràng, dễ hiểu.
* **Vấn đề gặp phải**:
  * Tiến trình kết xuất video ngốn rất nhiều tài nguyên hệ thống (đặc biệt là CPU và RAM), nếu nhiều người dùng kết xuất đồng thời có thể dẫn tới cạn kiệt tài nguyên máy chủ.
* **Cải tiến cho Sprint sau**:
  * Nghiên cứu chuyển đổi kiến trúc sang microservices xử lý video riêng biệt, sử dụng hàng đợi thông điệp RabbitMQ để phân phối các tác vụ kết xuất sang các máy chủ Worker chuyên dụng, đảm bảo tính mở rộng cao (scalability).
