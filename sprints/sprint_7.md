# 12. Sprint 7: Action Catalog & Resource Estimation (Danh mục tác vụ & Ước lượng tài nguyên)

## 12.1. Sprint Goal
Thiết lập danh mục các tác vụ xử lý hình ảnh phức tạp chạy phía máy chủ, đồng thời xây dựng bộ công cụ phân tích dự báo tài nguyên phần cứng (RAM/GPU) cần tiêu hao trước khi thực thi.

## 12.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US18** | Quản lý tác vụ | Định nghĩa cấu trúc danh mục tác vụ xử lý ảnh phía máy chủ (Action Catalog) |
| **US18** | Quản lý tác vụ | Viết API lấy danh sách tác vụ đang kích hoạt `GET /api/v1/actions` |
| **US19** | Dự báo tài nguyên | Viết dịch vụ ước tính lượng RAM cơ sở và yêu cầu GPU dựa vào loại thuật toán chọn lựa |

## 12.3. Database trong Sprint 7
Bộ sưu tập cần tạo: **action_catalogs**
```json
{
  "_id": "ObjectId",
  "actionCode": "String (Mã định danh tác vụ, ví dụ: BLUR_GAUSSIAN, DETECT_EDGE)",
  "actionName": "String (Tên hiển thị của tác vụ)",
  "type": "String (Loại tác vụ: IMAGE_FILTER, IMAGE_TRANSFORM, AI_TOOL)",
  "baseRamMb": "Double (Lượng RAM cơ sở tiêu thụ giả định, ví dụ: 256.0)",
  "requiresGpu": "Boolean (Có yêu cầu xử lý đồ họa GPU hay không)",
  "isActive": "Boolean (Trạng thái tác vụ đang bật/tắt)"
}
```

## 12.4. API trong Sprint 7
| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| **GET** | `/api/v1/actions` | Liệt kê các tác vụ hệ thống hỗ trợ để hiển thị lên thanh công cụ |
| **POST** | `/api/v1/actions` | Quản trị viên thêm tác vụ xử lý mới vào danh mục |
| **PUT** | `/api/v1/actions/{id}` | Cập nhật cấu hình tiêu hao tài nguyên của tác vụ |

## 12.5. Frontend trong Sprint 7
Trang cần làm:
* **editor.html**
  Chức năng giao diện:
  * Sidebar trái bổ sung tab "Hiệu ứng máy chủ" (Server Effects) tải danh sách tác vụ từ API.
  * Hiển thị cảnh báo tài nguyên ước tính (ví dụ: "Tác vụ cần 512MB RAM") khi di chuột qua từng hiệu ứng.

## 12.6. Increment sau Sprint 7
Sau **Sprint 7**, nhóm tạo ra **Increment** tiếp theo:
**Increment 7: System Action Catalog**
Increment này bao gồm:
* Kho tác vụ nền được lưu trữ động trong database MongoDB.
* Khả năng cập nhật linh hoạt danh sách hiệu ứng mà không cần biên dịch lại mã nguồn Backend.
* Module cảnh báo tài nguyên dự tính hoạt động độc lập hỗ trợ tối ưu tải hệ thống.

## 12.7. DoD của Sprint 7
Sprint 7 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| API trả về danh mục tác vụ hiển thị đúng trên giao diện trong vòng dưới 100ms | Có |
| Quản trị viên có thể thêm/bớt tác vụ trong danh mục qua API thành công | Có |
| Ước lượng tài nguyên cập nhật chính xác tỷ lệ thuận theo độ phân giải ảnh của dự án | Có |

## 12.8. Sprint Review Sprint 7
Trong buổi **Sprint Review**, nhóm **demo**:
* Hiển thị bảng danh mục tác vụ trong cơ sở dữ liệu.
* Di chuột qua hiệu ứng "Gaussian Blur Server-side" trên giao diện Editor, thấy hiển thị tooltip thông số RAM dự tính cần tiêu thụ là 256MB.
* Đổi kích thước Canvas lên gấp đôi, thấy tooltip tự động cập nhật lượng RAM dự tính cần dùng tăng lên thành 512MB.

**Product Owner** kiểm nghiệm tính khả thi của hệ thống dự tính hiệu năng.

## 12.9. Sprint Retrospective Sprint 7
Nhóm thảo luận:
* **Điều làm tốt**:
  * Thiết kế Action Catalog độc lập giúp dễ dàng thêm hiệu ứng chỉnh sửa ảnh mới sau này.
  * Phép tính ước lượng tài nguyên chạy thuần ở Client nên không tạo thêm gánh nặng cho CPU máy chủ.
* **Vấn đề gặp phải**:
  * Các loại ảnh khác nhau (PNG trong suốt vs JPG nén) có mức tiêu thụ bộ nhớ RAM thực tế khác nhau lúc giải nén, công thức tĩnh hiện tại chưa bao quát hết.
* **Cải tiến cho Sprint sau**:
  * Bổ sung hệ số nhân loại tệp tin (File Type Multiplier) vào công thức ước lượng tài nguyên để tăng độ chính xác.
