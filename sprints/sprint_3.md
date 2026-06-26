# 8. Sprint 3: Project Management & Dashboard UI (Quản lý dự án)

## 8.1. Sprint Goal
Xây dựng màn hình Dashboard quản lý các dự án thiết kế của từng người dùng, hỗ trợ tạo mới, đổi tên, xem danh sách và xóa dự án trên giao diện trực quan.

## 8.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US02** | Tạo mới dự án | Thiết kế nút và Form nhập tên tạo dự án mới trên giao diện Dashboard |
| **US02** | Tạo mới dự án | Viết API lưu dự án mới vào cơ sở dữ liệu `POST /api/v1/projects` |
| **US02** | Xem danh sách dự án | Viết API lấy danh sách dự án của người dùng hiện tại `GET /api/v1/projects` |
| **US02** | Xem danh sách dự án | Thiết kế giao diện lưới (Grid) hiển thị các card dự án kèm hình thu nhỏ (thumbnail) |
| **US02** | Đổi tên dự án | Thiết kế Modal đổi tên dự án và API cập nhật `PUT /api/v1/projects/{id}` |
| **US02** | Xóa dự án | Thiết kế Modal xác nhận xóa dự án và API xóa `DELETE /api/v1/projects/{id}` |

## 8.3. Database trong Sprint 3
Bộ sưu tập cần tạo: **projects**
```json
{
  "_id": "ObjectId (Khóa chính tự sinh)",
  "userId": "String (ID người dùng sở hữu dự án)",
  "projectName": "String (Tên dự án)",
  "status": "String (Trạng thái dự án: ACTIVE, ARCHIVED, DELETED)",
  "projectType": "String (Loại dự án: IMAGE, VIDEO)",
  "canvasData": "Map (Dữ liệu lưu cấu hình khung vẽ canvas, mặc định rỗng)",
  "thumbnailUrl": "String (Đường dẫn hình ảnh xem trước của dự án)",
  "createdAt": "ISODate (Thời gian tạo dự án)",
  "updatedAt": "ISODate (Thời gian cập nhật dự án)"
}
```

## 8.4. API trong Sprint 3
| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| **GET** | `/api/v1/projects` | Lấy danh sách toàn bộ dự án của người dùng hiện hành |
| **POST** | `/api/v1/projects` | Tạo một thực thể dự án trống mới |
| **PUT** | `/api/v1/projects/{id}` | Cập nhật thông tin dự án (đổi tên, trạng thái) |
| **DELETE** | `/api/v1/projects/{id}` | Xóa vĩnh viễn dự án khỏi cơ sở dữ liệu |

## 8.5. Frontend trong Sprint 3
Trang cần làm:
* **projects.html** (Dashboard)
  Chức năng giao diện:
  * Khung lưới hiển thị danh sách dự án trực quan (dạng card).
  * Modal nhập tên để tạo dự án mới.
  * Modal xác nhận đổi tên dự án.
  * Modal xác nhận xóa dự án.
  * Nút chuyển đổi nhanh chế độ tối/sáng (Dark/Light mode).

## 8.6. Increment sau Sprint 3
Sau **Sprint 3**, nhóm tạo ra **Increment** tiếp theo:
**Increment 3: Project Dashboard Module**
Increment này bao gồm:
* Bộ sưu tập `projects` trên MongoDB được cấu hình hoàn chỉnh.
* Hệ thống RESTful API hỗ trợ đầy đủ các thao tác CRUD dự án.
* Giao diện Dashboard hiển thị sinh động danh sách dự án thực tế của người dùng.
* Người dùng có thể quản trị dự án cá nhân (tạo mới, đổi tên và xóa dự án) trực tiếp trên trình duyệt.

## 8.7. DoD của Sprint 3
Sprint 3 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| Kết nối thành công API CRUD dự án từ Frontend | Có |
| Giải quyết dứt điểm lỗi đơ modal (ẩn backdrop bằng `[hidden] { display: none !important; }`) | Có |
| Danh sách dự án tự động làm mới tức thì sau khi thêm/sửa/xóa mà không cần reload trang | Có |
| Hiển thị ảnh đại diện dự án (thumbnail) chính xác từ dữ liệu DB | Có |

## 8.8. Sprint Review Sprint 3
Trong buổi **Sprint Review**, nhóm **demo**:
* Mở màn hình Dashboard và tạo một dự án mới mang tên "Thiết kế Poster Sale Off".
* Bấm nút "Đổi tên" trên card dự án vừa tạo, đổi tên thành "Thiết kế Poster Summer Sale".
* Bấm nút "Xóa dự án", xác nhận và thấy card dự án lập tức biến mất khỏi lưới hiển thị mà không tải lại trang.

**Product Owner** kiểm tra xem các tính năng quản lý dự án có đáp ứng nhu cầu trải nghiệm ban đầu hay không.

## 8.9. Sprint Retrospective Sprint 3
Nhóm thảo luận:
* **Điều làm tốt**:
  * Giao diện Grid CSS hiển thị responsive, trực quan và hiện đại.
  * API CRUD dự án hoạt động ổn định và xử lý dữ liệu nhanh chóng.
* **Vấn đề gặp phải**:
  * Gặp lỗi đơ màn hình sau khi tắt modal tạo/rename dự án do lớp backdrop phủ mờ không được ẩn đúng cách.
* **Cải tiến cho Sprint sau**:
  * Định nghĩa lớp CSS `[hidden] { display: none !important; }` toàn cục để khắc phục hoàn toàn lỗi ẩn hiện giao diện.
