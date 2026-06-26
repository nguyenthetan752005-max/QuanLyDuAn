# 10. Sprint 5: Canvas Manipulation (Tương tác phần tử trên Canvas)

## 10.1. Sprint Goal
Hỗ trợ người dùng kéo thả, di chuyển, co giãn kích thước, lật ảnh và quản lý thứ tự các đối tượng hình ảnh (Z-Index) trên Artboard.

## 10.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US05** | Kéo thả phần tử | Bắt các sự kiện pointer (pointerdown/move/up) để xử lý kéo thả (drag) các đối tượng ảnh trên Artboard |
| **US05** | Co giãn phần tử | Vẽ 8 điểm neo điều khiển (handles) bao quanh phần tử đang chọn để thay đổi kích thước (resize) trực quan |
| **US05** | Lật/Xoay ảnh | Thiết lập các thuộc tính lật (Flip Horizontal/Vertical) và xoay đối tượng |
| **US05** | Quản lý lớp ảnh | Lập trình tính năng quản lý thứ tự hiển thị của các lớp ảnh (Z-Index: mang lên trên cùng, xuống dưới cùng) |

## 10.3. Database trong Sprint 5
Bổ sung danh sách phần tử `canvasItems` vào tài liệu dự án trong bộ sưu tập: **projects**
```json
{
  "canvasData": {
    "width": "Integer",
    "height": "Integer",
    "backgroundColor": "String",
    "currentZoom": "Double",
    "canvasItems": [
      {
        "itemId": "String (ID phần tử tự sinh)",
        "mediaAssetId": "String (Tham chiếu tới media_assets)",
        "posX": "Double (Vị trí X trên Artboard)",
        "posY": "Double (Vị trí Y trên Artboard)",
        "width": "Double (Chiều rộng phần tử)",
        "height": "Double (Chiều cao phần tử)",
        "angle": "Double (Góc xoay phần tử, mặc định 0.0)",
        "flipX": "Boolean (Có lật ngang hay không)",
        "flipY": "Boolean (Có lật dọc hay không)",
        "zIndex": "Integer (Thứ tự hiển thị lớp)"
      }
    ]
  }
}
```

## 10.4. API trong Sprint 5
| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| **PUT** | `/api/v1/projects/{id}` | Cập nhật cấu hình dự án bao gồm toàn bộ danh sách phần tử hình ảnh trên Canvas |

## 10.5. Frontend trong Sprint 5
Trang cần làm:
* **editor.html**
  Chức năng giao diện:
  * Vẽ khung bao viền phần tử đang được chọn (Active Border) cùng 8 handle điều chỉnh kích thước.
  * Sidebar trái hiển thị danh sách các lớp ảnh (Layers list) để kéo thả đổi thứ tự.
  * Sidebar phải hiển thị thuộc tính của phần tử được chọn (X, Y, W, H, Rotation, Flip).

## 10.6. Increment sau Sprint 5
Sau **Sprint 5**, nhóm tạo ra **Increment** tiếp theo:
**Increment 5: Interactive Artboard Manipulation Engine**
Increment này bao gồm:
* Trình xử lý tương tác kéo thả và co giãn hình ảnh trực tiếp trên trình duyệt.
* Quản lý lớp ảnh (Z-Index) và đồng bộ thông tin đối tượng với cơ sở dữ liệu MongoDB.

## 10.7. DoD của Sprint 5
Sprint 5 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| Kéo thả phần tử mượt mà, không bị giật hoặc đứt quãng tương tác | Có |
| Thay đổi kích thước giữ nguyên tỉ lệ khi giữ phím Shift | Có |
| Vị trí và kích thước phần tử được lưu và khôi phục chính xác từ Database | Có |

## 10.8. Sprint Review Sprint 5
Trong buổi **Sprint Review**, nhóm **demo**:
* Chọn 1 ảnh từ thư viện, kéo vào Artboard.
* Thực hiện di chuyển ảnh bằng cách rê chuột, kéo góc để thu phóng ảnh to/nhỏ.
* Click vào nút "Lật ngang", thấy bức ảnh lật ngược chiều.
* Thêm bức ảnh thứ 2, click nút "Send to Back" để đưa bức ảnh 2 ẩn dưới bức ảnh 1.

**Product Owner** thẩm định tính mượt mà của cử chỉ kéo thả và độ chính xác của z-index.

## 10.9. Sprint Retrospective Sprint 5
Nhóm thảo luận:
* **Điều làm tốt**:
  * Các cử chỉ tương tác bằng sự kiện PointerEvent chạy nhạy bén, hoạt động tốt trên cả màn hình cảm ứng.
  * Render các lớp Z-Index chính xác theo cấu hình.
* **Vấn đề gặp phải**:
  * Việc cập nhật liên tục tọa độ phần tử lên DB mỗi khi rê chuột gây ra quá tải yêu cầu mạng.
* **Cải tiến cho Sprint sau**:
  * Tách biệt trạng thái tương tác tạm thời (Client-side state) và chỉ gửi API lưu lên DB khi người dùng thả chuột (pointerup) hoặc bấm phím tắt Lưu (Ctrl + S).
