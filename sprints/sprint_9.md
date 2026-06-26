# 14. Sprint 9: AI Smart Editing Tools (Công cụ AI nâng cao)

## 14.1. Sprint Goal
Tích hợp các tính năng trí tuệ nhân tạo (AI) thông minh bao gồm tự động tách nền ảnh (AI Remove Background), nhận diện đặc trưng ảnh (trích xuất bảng màu, đếm số khuôn mặt) và căn chỉnh khung hình thông minh (Smart Crop) để tự động hóa các thao tác chỉnh sửa phức tạp cho người dùng.

## 14.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US22** | Tách nền AI | Tích hợp dịch vụ tách nền tự động bằng cách kết nối với thư viện xử lý ảnh hoặc API dịch vụ AI bên ngoài |
| **US22** | Tách nền AI | Viết thuật toán xử lý biên mềm mại để tránh răng cưa sau khi loại bỏ nền ảnh |
| **US23** | Cắt ảnh thông minh | Xây dựng thuật toán xác định vùng chứa chủ thể nổi bật (Saliency Detection) để đề xuất khung cắt (Smart Crop) |
| **US24** | Nhận diện đặc trưng | Lập trình module trích xuất tự động bảng màu chủ đạo (Color Palette Extraction) và nhận diện khuôn mặt cơ bản |

## 14.3. Database trong Sprint 9
Bổ sung cấu trúc `metadata` nâng cao trong bộ sưu tập: **media_assets**
```json
{
  "_id": "ObjectId",
  "userId": "String",
  "fileName": "String",
  "filePath": "String",
  "type": "String",
  "fileSizeMb": "Double",
  "metadata": {
    "width": "Integer",
    "height": "Integer",
    "format": "String",
    "dominantColors": "Array of Strings (Mã màu HEX chủ đạo, ví dụ: ['#2C3E50', '#ECF0F1'])",
    "detectedFaces": "Integer (Số lượng khuôn mặt phát hiện được)",
    "hasTransparentBackground": "Boolean (Trạng thái đã tách nền hay chưa)",
    "aiTags": "Array of Strings (Từ khóa nhãn nội dung ảnh tự động gán)"
  },
  "uploadedAt": "ISODate"
}
```

## 14.4. API trong Sprint 9
| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| **POST** | `/api/v1/media/{id}/remove-background` | Thực thi tách nền hình ảnh bằng AI và tạo tệp tin PNG trong suốt mới |
| **POST** | `/api/v1/media/{id}/smart-crop` | Tự động cắt ảnh tập trung vào khu vực chủ thể chính theo tỷ lệ khung hình yêu cầu |
| **POST** | `/api/v1/media/{id}/analyze` | Chạy tiến trình phân tích trích xuất màu chủ đạo và nhận diện đặc trưng ảnh |

## 14.5. Frontend trong Sprint 9
Trang cần làm:
* **editor.html**
  Chức năng giao diện:
  * Thanh công cụ nổi (Contextual Toolbar) xuất hiện khi click chọn một đối tượng ảnh trên Canvas, bổ sung nút "Tách nền AI" và "Smart Crop".
  * Sidebar phải hiển thị tab "Thuộc tính AI" chứa bảng mã màu HEX chủ đạo trích xuất từ ảnh, cho phép người dùng click để áp dụng làm màu nền Artboard hoặc màu chữ.
  * Hiệu ứng chờ tải (Loading Spinner) đè lên phần tử Canvas khi API AI đang thực thi.

## 14.6. Increment sau Sprint 9
Sau **Sprint 9**, nhóm tạo ra **Increment** tiếp theo:
**Increment 9: AI Smart Editing Module**
Increment này bao gồm:
* Khả năng tự động hóa việc xóa nền hình ảnh trực tiếp trên Artboard với độ chính xác cao.
* Tính năng đề xuất cắt ảnh thông minh giúp bảo toàn chủ thể quan trọng trong ảnh.
* Module phân tích dữ liệu hình ảnh trả về bảng màu HEX đồng bộ hóa tốt với các công cụ thiết kế trên UI.

## 14.7. DoD của Sprint 9
Sprint 9 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| Thời gian phản hồi API tách nền AI trung bình dưới 3 giây đối với ảnh kích thước dưới 10MB | Có |
| Đường biên của đối tượng sau khi tách nền mềm mại, không bị vỡ hoặc mất chi tiết lớn | Có |
| Trích xuất thành công tối thiểu 3 tông màu chủ đạo từ bất kỳ ảnh màu nào tải lên | Có |
| Thiết lập cơ chế tự động dọn dẹp ảnh gốc trung gian sau khi đã tạo ảnh tách nền thành công | Có |

## 14.8. Sprint Review Sprint 9
Trong buổi **Sprint Review**, nhóm **demo**:
* Tải lên một ảnh chân dung có hậu cảnh phức tạp.
* Click vào ảnh trên Canvas, chọn nút "Tách nền bằng AI". Sau khoảng 2 giây, hậu cảnh biến mất hoàn toàn và chỉ còn lại hình ảnh chân dung trong suốt.
* Bảng thuộc tính bên phải lập tức cập nhật các mã màu chủ đạo của bức chân dung đó. Nhóm click chọn màu xám xanh trong bảng màu chủ đạo để áp dụng ngay làm màu nền Artboard, tạo ra sự hài hòa màu sắc tức thì.

**Product Owner** kiểm định chất lượng tách biên AI và tính ứng dụng của bảng màu tự động.

## 14.9. Sprint Retrospective Sprint 9
Nhóm thảo luận:
* **Điều làm tốt**:
  * Luồng API xử lý bất đồng bộ giúp người dùng không cảm giác giao diện bị khóa (freeze) khi hệ thống chạy AI.
  * Tính năng trích xuất bảng màu hoạt động chính xác và cực kỳ hữu ích cho thiết kế giao diện.
* **Vấn đề gặp phải**:
  * Khi gọi API dịch vụ AI bên ngoài gặp giới hạn số lượng yêu cầu (Rate Limit) và phụ thuộc hoàn toàn vào kết nối mạng Internet của máy chủ.
* **Cải tiến cho Sprint sau**:
  * Nghiên cứu tích hợp một mô hình AI offline gọn nhẹ (như U2Net hoặc Rembg) chạy trực tiếp bằng thư viện ONNX Runtime trên máy chủ Java để hoạt động độc lập không cần Internet.
