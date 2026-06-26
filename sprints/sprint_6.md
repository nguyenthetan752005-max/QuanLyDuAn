# 11. Sprint 6: Filters, Undo/Redo & Mouse Zooming (Bộ lọc, Lịch sử chỉnh sửa & Tối ưu hóa thu phóng)

## 11.1. Sprint Goal
Tích hợp các bộ lọc màu sắc hình ảnh, phím tắt hoàn tác/lặp lại (Undo/Redo), tối ưu hóa trải nghiệm thu phóng (Zooming) bám sát vị trí con trỏ chuột, và giải quyết triệt để lỗi bảo mật CORS khi xuất ảnh Canvas.

## 11.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US06** | Bộ lọc màu ảnh | Thiết lập các thanh trượt điều chỉnh độ sáng, độ tương phản, độ bão hòa, xoay màu và làm mờ ảnh |
| **US11** | Hoàn tác / Lặp lại | Lập trình cấu trúc dữ liệu hàng đợi (Stack) để quản lý lịch sử thao tác của người dùng và hỗ trợ Undo/Redo |
| **US12** | Xuất ảnh an toàn | Bổ sung thuộc tính `crossOrigin = "anonymous"` trên các đối tượng ảnh để tránh canvas bị nhiễm độc (tainted) khi gọi lệnh xuất PNG/JPEG |
| **US13** | Zoom chuột thông minh | Lắng nghe phím tắt `Ctrl + Cuộn chuột`, áp dụng công thức dịch chuyển scrollLeft/scrollTop để phóng to đúng điểm con trỏ chuột |

## 11.3. Database trong Sprint 6
Bổ sung các thuộc tính chỉnh sửa ảnh vào cấu trúc `canvasItems` của tài liệu dự án trong bộ sưu tập: **projects**
```json
{
  "canvasItems": [
    {
      "itemId": "String",
      "mediaAssetId": "String",
      "filters": {
        "brightness": "Double (Độ sáng, mặc định 100%)",
        "contrast": "Double (Độ tương phản, mặc định 100%)",
        "saturation": "Double (Độ bão hòa, mặc định 100%)",
        "hueRotate": "Double (Xoay màu, mặc định 0 deg)",
        "blur": "Double (Độ mờ, mặc định 0 px)"
      }
    ]
  }
}
```

## 11.4. API trong Sprint 6
Không có API mới. Sử dụng API lưu dự án hiện tại để lưu giữ cấu hình bộ lọc của các phần tử.

## 11.5. Frontend trong Sprint 6
Trang cần làm:
* **editor.html**
  Chức năng giao diện:
  * Sidebar phải hiển thị tab "Hiệu ứng & Bộ lọc" (Filters Panel) chứa các thanh trượt (slider) tương ứng.
  * Các nút bấm Undo (Hoàn tác) và Redo (Làm lại) ở góc trên thanh công cụ, hỗ trợ phím tắt `Ctrl + Z` và `Ctrl + Y`.
  * Lắng nghe sự kiện Wheel trên Artboard để phóng to/thu nhỏ bám theo tọa độ chuột.
  * Hộp thoại "Xuất bản thiết kế" cho phép tải ảnh về máy dưới dạng PNG/JPEG.

## 11.6. Increment sau Sprint 6
Sau **Sprint 6**, nhóm tạo ra **Increment** tiếp theo:
**Increment 6: Advanced Image Editor with History and Zoom**
Increment này bao gồm:
* Khả năng áp dụng bộ lọc hình ảnh phong phú, cập nhật thời gian thực trên Canvas.
* Hệ thống quản lý lịch sử thao tác (Undo/Redo) lưu tối đa 20 trạng thái chỉnh sửa gần nhất.
* Trải nghiệm phóng to/thu nhỏ bám theo chuột cực kỳ mượt mà.
* Chức năng tải ảnh về thiết bị cá nhân mà không bị dính lỗi bảo mật CORS.

## 11.7. DoD của Sprint 6
Sprint 6 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| Trạng thái Undo/Redo lưu trữ và chuyển đổi đúng cấu trúc dữ liệu Canvas | Có |
| Con trỏ chuột giữ nguyên điểm trọng tâm của ảnh khi zoom bằng nút cuộn | Có |
| Xuất canvas thành công tệp ảnh về máy, không dính lỗi bảo mật CORS `SecurityError` | Có |

## 11.8. Sprint Review Sprint 6
Trong buổi **Sprint Review**, nhóm **demo**:
* Kéo một ảnh từ thư viện, điều chỉnh thanh trượt Brightness lên 150%, Contrast lên 120%, thấy ảnh sáng rõ rệt.
* Nhấn `Ctrl + Z` 2 lần, thấy ảnh quay trở lại màu sắc ban đầu; nhấn `Ctrl + Y` để làm lại.
* Di chuyển con trỏ chuột vào một điểm cụ thể trên ảnh, giữ phím Ctrl và cuộn chuột lên, thấy màn hình phóng to chính xác tiêu điểm chuột.
* Bấm nút Xuất ảnh, lưu thành công ảnh PNG sắc nét về máy tính.

**Product Owner** duyệt cơ chế xuất ảnh và trải nghiệm tương tác thu phóng của trình soạn thảo.

## 11.9. Sprint Retrospective Sprint 6
Nhóm thảo luận:
* **Điều làm tốt**:
  * Giải quyết dứt điểm lỗi CORS của thư viện canvas bằng cách cấu hình thuộc tính ẩn danh `crossOrigin` của ảnh tải từ CDN.
  * Thuật toán Undo/Redo hoạt động ổn định và không làm chậm hiệu năng của giao diện.
* **Vấn đề gặp phải**:
  * Khi lưu trữ quá nhiều lịch sử chỉnh sửa chứa các đối tượng ảnh dạng DataURL (Base64) có thể dẫn tới tràn RAM trình duyệt.
* **Cải tiến cho Sprint sau**:
  * Chỉ lưu các thuộc tính dạng text/JSON (tọa độ, kích thước, bộ lọc) vào stack lịch sử chỉnh sửa, tuyệt đối không lưu dữ liệu nhị phân hoặc chuỗi Base64 của ảnh.
