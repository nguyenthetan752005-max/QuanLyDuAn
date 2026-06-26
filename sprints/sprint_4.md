# 9. Sprint 4: Canvas Workspace (Không gian làm việc Canvas)

## 9.1. Sprint Goal
Thiết lập khu vực biên tập (Artboard) trực quan hỗ trợ co giãn kích thước, phối màu nền và các chức năng thu phóng tỷ lệ (Zoom) cơ bản để chuẩn bị không gian thiết kế.

## 9.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US05** | Thiết lập Artboard | Thiết kế cấu trúc lưu trữ Artboard: chiều rộng, chiều cao, màu nền mặc định trên database |
| **US05** | Giao diện Artboard | Dựng khung CSS Artboard (`.artboard-wrapper` và `.artboard`) ở vùng làm việc trung tâm |
| **US05** | API cấu hình Canvas | Viết API lưu trữ và tải cấu hình Artboard cho dự án `GET /api/v1/projects/{id}` |
| **US05** | Thu phóng Artboard | Viết logic phóng to/thu nhỏ Artboard thông qua thanh trượt điều khiển Zoom |

## 9.3. Database trong Sprint 4
Bổ sung trường `canvasData` vào bộ sưu tập: **projects**
```json
{
  "canvasData": {
    "width": "Integer (Chiều rộng Canvas, mặc định 800)",
    "height": "Integer (Chiều cao Canvas, mặc định 600)",
    "backgroundColor": "String (Mã màu HEX hoặc transparent)",
    "currentZoom": "Double (Mức zoom mặc định, ví dụ: 1.0)"
  }
}
```

## 9.4. API trong Sprint 4
| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| **GET** | `/api/v1/projects/{id}` | Lấy chi tiết thông tin dự án bao gồm cấu hình canvas |
| **PUT** | `/api/v1/projects/{id}/canvas` | Cập nhật cấu hình kích thước và màu nền của Artboard |

## 9.5. Frontend trong Sprint 4
Trang cần làm:
* **editor.html**
  Chức năng giao diện:
  * Khu vực làm việc Editor Workspace (Sidebar trái, Sidebar phải, Artboard trung tâm).
  * Panel điều chỉnh kích thước Canvas (Width/Height) và thay đổi màu nền Artboard ở Sidebar phải.
  * Bộ trượt điều chỉnh tỷ lệ Zoom (%) ở góc dưới màn hình.

## 9.6. Increment sau Sprint 4
Sau **Sprint 4**, nhóm tạo ra **Increment** tiếp theo:
**Increment 4: Canvas Editor Workspace**
Increment này bao gồm:
* Khung giao diện biên tập chuyên nghiệp có cấu trúc rõ ràng.
* Khung vẽ Artboard hoạt động đúng kích thước cấu hình từ Database.
* Khả năng thay đổi nhanh kích thước và màu sắc Artboard.

## 9.7. DoD của Sprint 4
Sprint 4 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| Artboard hiển thị đúng kích thước lưu trữ trong DB khi load dự án | Có |
| Thanh trượt Zoom co giãn kích thước Artboard mượt mà và trực quan | Có |
| Màu nền Canvas thay đổi tức thì trên màn hình khi người dùng chọn màu mới | Có |

## 9.8. Sprint Review Sprint 4
Trong buổi **Sprint Review**, nhóm **demo**:
* Mở một dự án thiết kế từ Dashboard.
* Trên màn hình làm việc, đổi màu nền Canvas từ Trắng sang Đen, thay đổi kích thước từ 800x600 thành 1920x1080.
* Sử dụng thanh trượt Zoom kéo lên 150%, thấy Artboard phóng to đúng tỉ lệ.

**Product Owner** duyệt giao diện và tính tương tác của Artboard.

## 9.9. Sprint Retrospective Sprint 4
Nhóm thảo luận:
* **Điều làm tốt**:
  * Bố cục giao diện CSS Grid và Flexbox phân chia vùng Editor rất cân đối.
  * Cấu trúc lưu trữ dữ liệu `canvasData` thiết kế tối giản, dễ mở rộng.
* **Vấn đề gặp phải**:
  * Khi phóng to/thu nhỏ Artboard bằng thanh trượt Zoom, Artboard bị lệch tâm hiển thị hoặc bị che khuất bởi các thanh cuộn.
* **Cải tiến cho Sprint sau**:
  * Bổ sung thuộc tính `transform-origin: center center` trong CSS và thiết lập cơ chế tự động căn giữa Artboard trong vùng làm việc.
