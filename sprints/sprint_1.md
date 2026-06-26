# 6. Sprint 1: User Authentication & Management (Quản lý người dùng)

## 6.1. Sprint Goal
Xây dựng module quản lý và xác thực người dùng để đăng ký, đăng nhập tài khoản người dùng, mã hóa mật khẩu và tạo phiên làm việc bảo mật (JWT) khi sử dụng trình chỉnh sửa.

## 6.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US01** | Đăng ký tài khoản | Tạo giao diện form đăng ký tài khoản (`register.html`) |
| **US01** | Đăng ký tài khoản | Tạo API đăng ký tài khoản mới `POST /api/v1/users/register` |
| **US02** | Đăng nhập tài khoản | Tạo giao diện form đăng nhập tài khoản (`login.html`) |
| **US02** | Đăng nhập tài khoản | Tạo API đăng nhập `POST /api/v1/users/login` |
| **US01-US02** | Lưu dữ liệu tài khoản | Tạo bộ sưu tập `users` trong cơ sở dữ liệu MongoDB |

## 6.3. Database trong Sprint 1
Bộ sưu tập cần tạo: **users**
```json
{
  "_id": "ObjectId (Khóa chính tự sinh)",
  "username": "String (Tên đăng nhập, độc nhất)",
  "email": "String (Email người dùng, độc nhất)",
  "passwordHash": "String (Mật khẩu đã được mã hóa bằng BCrypt)",
  "createdAt": "ISODate (Thời gian tạo tài khoản)"
}
```

## 6.4. API trong Sprint 1
| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| **POST** | `/api/v1/users/register` | Đăng ký tài khoản người dùng mới |
| **POST** | `/api/v1/users/login` | Xác thực đăng nhập, trả về JWT token |
| **GET** | `/api/v1/users/{id}` | Lấy chi tiết thông tin người dùng |

## 6.5. Frontend trong Sprint 1
Trang cần làm:
* **login.html**
  Chức năng giao diện:
  * Form nhập Email/Username và Mật khẩu.
  * Nút Đăng nhập.
  * Liên kết chuyển hướng sang trang Đăng ký (`register.html`).
* **register.html**
  Chức năng giao diện:
  * Form nhập Username, Email, Mật khẩu và Xác nhận mật khẩu.
  * Nút Đăng ký.
  * Liên kết chuyển hướng về trang Đăng nhập (`login.html`).

## 6.6. Increment sau Sprint 1
Sau **Sprint 1**, nhóm tạo ra **Increment** đầu tiên:
**Increment 1: User Authentication & Management Module**
Increment này bao gồm:
* Database có bộ sưu tập `users`.
* Backend API quản lý và xác thực người dùng.
* Giao diện đăng ký, đăng nhập tương tác tốt.
* Người dùng có thể tạo tài khoản và đăng nhập thực tế để nhận JWT Token.
* Dữ liệu mật khẩu của người dùng được mã hóa bảo mật hoàn toàn bằng BCrypt trong MongoDB.

## 6.7. DoD của Sprint 1
Sprint 1 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| Tạo được bộ sưu tập `users` trong MongoDB | Có |
| API `POST /api/v1/users/register` chạy đúng và trả về mã 201 | Có |
| API `POST /api/v1/users/login` trả về Token JWT khi đúng thông tin | Có |
| Giao diện `login.html` hiển thị đúng chuẩn thiết kế, không lỗi CSS | Có |
| Giao diện `register.html` hiển thị đúng chuẩn thiết kế, xác thực form tốt | Có |
| Dữ liệu mật khẩu thực tế được mã hóa BCrypt khi kiểm tra trong MongoDB | Có |
| Kiểm thử đầy đủ các luồng thành công bằng Postman/trình duyệt | Có |

## 6.8. Sprint Review Sprint 1
Trong buổi **Sprint Review**, nhóm **demo**:
* Mở trang đăng ký, điền thông tin người dùng mới để tạo tài khoản thành công.
* Kiểm tra bộ sưu tập `users` trong MongoDB Compass để chứng minh mật khẩu đã được băm mã hóa.
* Thực hiện đăng nhập với thông tin vừa đăng ký để nhận mã token JWT.
* Thử nghiệm nhập sai mật khẩu hoặc trùng email đăng ký để kiểm tra phản hồi thông báo lỗi từ hệ thống.

**Product Owner** kiểm tra xem module quản lý người dùng có đáp ứng nhu cầu bảo mật và trải nghiệm ban đầu hay không.

## 6.9. Sprint Retrospective Sprint 1
Nhóm thảo luận:
* **Điều làm tốt**:
  * Kết nối cơ sở dữ liệu MongoDB từ Spring Boot hoạt động ổn định ngay từ đầu.
  * Cấu hình Spring Security kết hợp bộ lọc JWT chạy trơn tru.
  * Phối hợp đồng bộ thiết kế UI Frontend khớp với API Backend.
* **Vấn đề gặp phải**:
  * Gặp lỗi chặn CORS khi gọi API Backend ở cổng `8081` từ Frontend tĩnh, mất thời gian cấu hình CorsFilter.
  * Việc xác thực và lưu token JWT ở Client ban đầu còn lúng túng.
* **Cải tiến cho Sprint sau**:
  * Chuẩn hóa cấu hình CORS dùng chung tập trung cho toàn dự án.
  * Viết tài liệu đặc tả API đầy đủ hơn bằng Postman Collection hoặc Swagger.
  * Phân chia rõ ràng mã nguồn JavaScript thành các module riêng biệt cho từng trang.
