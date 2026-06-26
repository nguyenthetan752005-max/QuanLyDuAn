# 7. Sprint 2: File Storage & CDN Integration (Tích hợp Cloud CDN & Lưu trữ tệp)

## 7.1. Sprint Goal
Tích hợp dịch vụ ImageKit CDN lưu trữ ảnh đám mây, nâng giới hạn dung lượng tải lên 50MB để phục vụ việc tải các tệp tin đa phương tiện chất lượng cao mà không bị quá tải bộ nhớ máy chủ.

## 7.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US03** | Tải lên tệp tin | Xây dựng dịch vụ `ImageKitStorageServiceImpl` kết nối CDN và tích hợp cơ chế tự động fallback lưu cục bộ khi mất kết nối đám mây |
| **US03** | Tải lên tệp tin | Cấu hình tham số Spring Boot nâng giới hạn tệp tải lên đạt 50MB (giúp tải các ảnh dung lượng lớn) |
| **US04** | Tải về tệp tin | Viết cơ chế cung cấp đường dẫn CDN an toàn (hoặc URL local fallback) để client tải về tài nguyên |

## 7.3. Database trong Sprint 2
Bộ sưu tập cần tạo: **media_assets**
```json
{
  "_id": "ObjectId",
  "userId": "String (ID người dùng sở hữu tệp)",
  "fileName": "String (Tên file gốc)",
  "filePath": "String (Đường dẫn CDN tuyệt đối từ ImageKit hoặc relative path cục bộ /uploads/...)",
  "type": "String (Loại tệp tin: IMAGE, AUDIO, VIDEO)",
  "fileSizeMb": "Double (Kích thước tệp tin tính bằng Megabyte)",
  "uploadedAt": "ISODate"
}
```

## 7.4. API trong Sprint 2
| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| **POST** | `/api/v1/media/upload` | Tải tệp tin đa phương tiện lên máy chủ (lưu trên ImageKit Cloud CDN hoặc thư mục Local) |

## 7.5. Frontend trong Sprint 2
Trang cần làm:
* **projects.html** hoặc panel upload trong **editor.html**
  Chức năng giao diện:
  * Khu vực kéo thả file (Drag & Drop Zone) để đăng tải trực tiếp hình ảnh/video.
  * Danh sách hiển thị các tệp đã upload kèm thanh tiến trình upload.

## 7.6. Increment sau Sprint 2
Sau **Sprint 2**, nhóm tạo ra **Increment** tiếp theo:
**Increment 2: CDN Storage Integration**
Increment này bao gồm:
* Kết nối thành công API Cloud CDN ImageKit.
* Khả năng upload file dung lượng lớn lên đến 50MB không lỗi.
* Quản lý tệp tin tập trung qua bộ sưu tập `media_assets` trong MongoDB.

## 7.7. DoD của Sprint 2
Sprint 2 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| Tải lên thành công ảnh dung lượng lớn (lên tới 50MB) không gặp lỗi OutOfMemory | Có |
| Tự động lưu trữ và tải ảnh từ URL ImageKit CDN khi cấu hình hoạt động | Có |
| Tự động chuyển vùng lưu trữ local folder khi mất kết nối CDN | Có |

## 7.8. Sprint Review Sprint 2
Trong buổi **Sprint Review**, nhóm **demo**:
* Tải lên tệp ảnh chất lượng cao 45MB từ giao diện.
* Kiểm tra tài khoản ImageKit CDN thấy ảnh đã xuất hiện trên đám mây.
* Tắt kết nối ImageKit trong cấu hình, tải lại ảnh và thấy ảnh được lưu chính xác vào thư mục cục bộ `/uploads/` của máy chủ.

**Product Owner** kiểm duyệt năng lực xử lý tệp tin lớn và độ ổn định của hệ thống lưu trữ đám mây.

## 7.9. Sprint Retrospective Sprint 2
Nhóm thảo luận:
* **Điều làm tốt**:
  * Tách biệt luồng upload Cloud/Local giúp hệ thống có khả năng dự phòng cao.
  * API upload xử lý bất đồng bộ mượt mà.
* **Vấn đề gặp phải**:
  * Ban đầu, khi lưu trữ dự án chứa link ảnh CDN mà tắt kết nối Internet thì không thể tải trước ảnh được.
* **Cải tiến cho Sprint sau**:
  * Xây dựng thêm cơ chế lưu cache ServiceWorker ở Client để lưu trữ đệm các tài nguyên đồ họa CDN ngoại tuyến.
