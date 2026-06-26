# 13. Sprint 8: Server-side Image Processing Queue (Hàng đợi xử lý ảnh phía máy chủ)

## 13.1. Sprint Goal
Phát triển hệ thống hàng đợi xử lý hình ảnh bất đồng bộ ở phía máy chủ để thực hiện kết xuất các thiết kế độ phân giải cao mà không gây nghẽn luồng xử lý Web chính.

## 13.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US20** | Hàng đợi xử lý ảnh | Cấu hình luồng làm việc ThreadPool và cơ chế quản lý hàng đợi (BlockingQueue) trong Spring Boot |
| **US20** | Kết xuất bất đồng bộ | Viết luồng công việc xử lý lưu ảnh thành phẩm về đĩa cứng hoặc tải lên Cloud CDN |
| **US21** | Polling trạng thái | Viết API cập nhật tiến độ phần trăm xử lý tác vụ `GET /api/v1/processing/status/{id}` |

## 13.3. Database trong Sprint 8
Bộ sưu tập cần tạo: **project_processings**
```json
{
  "_id": "ObjectId",
  "projectId": "String (ID dự án đang xử lý)",
  "userId": "String (ID người dùng yêu cầu xử lý)",
  "calculatedRamMb": "Double (Lượng RAM tiêu tốn thực tế)",
  "requiresGpu": "Boolean",
  "status": "String (Trạng thái: PROCESSING, COMPLETED, FAILED)",
  "progressPercent": "Integer (Tiến độ xử lý, chạy từ 0 đến 100)",
  "finalExportPath": "String (Đường dẫn tải về ảnh thành phẩm chất lượng cao)",
  "errorMessage": "String (Nội dung lỗi nếu xử lý thất bại)"
}
```

## 13.4. API trong Sprint 8
| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| **POST** | `/api/v1/processing/execute` | Đưa dự án thiết kế vào hàng đợi chờ kết xuất chất lượng cao |
| **GET** | `/api/v1/processing/status/{id}` | Kiểm tra trạng thái tiến trình xử lý của tác vụ |

## 13.5. Frontend trong Sprint 8
Trang cần làm:
* **editor.html**
  Chức năng giao diện:
  * Nút bấm "Kết xuất chất lượng cao (Server Render)".
  * Panel góc dưới hiển thị tiến trình (Progress Bar %) chạy tăng dần từ 0% đến 100%.
  * Thông báo Popup chứa đường dẫn tải tệp tin khi trạng thái chuyển sang `COMPLETED`.

## 13.6. Increment sau Sprint 8
Sau **Sprint 8**, nhóm tạo ra **Increment** tiếp theo:
**Increment 8: Background Image Processing Engine**
Increment này bao gồm:
* Khả năng chạy kết xuất đa luồng đồng thời phía máy chủ.
* Giao diện theo dõi tiến độ xử lý tác vụ bất đồng bộ tiện lợi.
* Máy chủ được bảo vệ an toàn khỏi các nguy cơ treo/quá tải nhờ hàng đợi BlockingQueue tự động giới hạn luồng.

## 13.7. DoD của Sprint 8
Sprint 8 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| Gửi yêu cầu render không gây treo luồng điều hướng web chính của Tomcat | Có |
| Thanh tiến trình ở Frontend cập nhật liên tục thông qua Polling AJAX cứ mỗi 1 giây | Có |
| Tệp tin xuất bản chất lượng cao được lưu thành công trên máy chủ/ImageKit | Có |
| Giải phóng tài nguyên Thread chính xác sau khi hoàn thành nhiệm vụ | Có |

## 13.8. Sprint Review Sprint 8
Trong buổi **Sprint Review**, nhóm **demo**:
* Bấm nút "Server Render" để yêu cầu xử lý một dự án ảnh độ phân giải siêu cao (4K).
* Trình diễn thanh tiến trình ở góc màn hình bắt đầu đếm từ 0%, 20%, 50%... đến 100%.
* Sau khi hoàn thành, click vào nút "Tải ảnh" hiển thị trên màn hình để lưu bức ảnh 4K về máy tính cá nhân.

**Product Owner** kiểm định chất lượng tệp ảnh xuất ra và độ ổn định của hàng đợi.

## 13.9. Sprint Retrospective Sprint 8
Nhóm thảo luận:
* **Điều làm tốt**:
  * Mô hình bất đồng bộ (Asynchronous task execution) giúp duy trì phản hồi của giao diện web cực kỳ linh hoạt.
  * API trạng thái cập nhật chính xác phần trăm tiến trình.
* **Vấn đề gặp phải**:
  * Khi dùng cơ chế Polling (cứ 1 giây gọi API một lần) tạo ra quá nhiều yêu cầu HTTP không cần thiết lên máy chủ.
* **Cải tiến cho Sprint sau**:
  * Xem xét thay thế cơ chế Polling HTTP bằng kết nối hai chiều WebSocket hoặc Server-Sent Events (SSE) để cập nhật tiến độ thời gian thực hiệu quả hơn.
