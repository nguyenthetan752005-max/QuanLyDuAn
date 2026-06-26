# 15. Sprint 10: Video Timeline & Media Tracks (Dòng thời gian Video)

## 15.1. Sprint Goal
Xây dựng module dòng thời gian (Timeline) đa lớp (Multi-track) để quản lý, sắp xếp và đồng bộ các phân đoạn video, âm thanh, hình ảnh và văn bản đè (overlays) theo dòng thời gian tuyến tính trực tiếp trên trình duyệt.

## 15.2. Sprint Backlog
| ID | User Story | Task |
| :--- | :--- | :--- |
| **US25** | Giao diện Timeline | Thiết kế khu vực bảng dòng thời gian (Timeline Panel) ở đáy màn hình biên tập với các track riêng biệt |
| **US25** | Thước đo thời gian | Viết thành phần hiển thị thước đo thời gian (Time ruler) chia vạch giây và kim chỉ thời gian (Playhead) di động |
| **US26** | Đồng bộ phát lại | Phát triển bộ máy điều phối phát lại (Playback Player Engine) đồng bộ hóa sự kiện Play/Pause/Seek của các thẻ video/audio ẩn với Canvas |
| **US27** | Kéo thả phân đoạn | Lập trình các sự kiện tương tác kéo thả để di chuyển vị trí bắt đầu hoặc co giãn mép để thay đổi thời lượng hiển thị của clip trên timeline |

## 15.3. Database trong Sprint 10
Bổ sung cấu trúc `timelineData` vào tài liệu dự án trong bộ sưu tập: **projects**
```json
{
  "_id": "ObjectId",
  "userId": "String",
  "projectName": "String",
  "status": "String",
  "projectType": "String (Đổi thành VIDEO)",
  "canvasData": "Map",
  "timelineData": {
    "durationSeconds": "Double (Tổng thời lượng của toàn bộ video, ví dụ: 60.0)",
    "fps": "Integer (Khung hình trên giây, ví dụ: 30)",
    "tracks": [
      {
        "trackId": "String",
        "trackName": "String (Ví dụ: Video Track 1, Audio Track, Subtitle)",
        "trackType": "String (VIDEO, AUDIO, IMAGE, TEXT)",
        "order": "Integer (Thứ tự chồng lớp hiển thị)",
        "clips": [
          {
            "clipId": "String",
            "mediaAssetId": "String (Tham chiếu tới tệp tin trong media_assets)",
            "startOffsetSeconds": "Double (Thời gian bắt đầu phát trên timeline)",
            "durationSeconds": "Double (Thời lượng hiển thị của clip)",
            "mediaStartCutSeconds": "Double (Điểm bắt đầu cắt từ tệp nguồn gốc)",
            "playRate": "Double (Tốc độ phát lại, ví dụ: 1.0)"
          }
        ]
      }
    ]
  },
  "createdAt": "ISODate",
  "updatedAt": "ISODate"
}
```

## 15.4. API trong Sprint 10
| Method | Endpoint | Mục đích |
| :--- | :--- | :--- |
| **GET** | `/api/v1/projects/{id}/timeline` | Lấy dữ liệu cấu trúc timeline chi tiết của dự án video |
| **PUT** | `/api/v1/projects/{id}/timeline` | Lưu và cập nhật cấu trúc timeline của dự án (danh sách tracks và clips) |

## 15.5. Frontend trong Sprint 10
Trang cần làm:
* **editor.html** (Mở rộng cho dự án Video)
  Chức năng giao diện:
  * Khu vực **Timeline Panel** ở cạnh dưới màn hình làm việc:
    * Thước thời gian hiển thị giây và khung hình (format: `00:00:00`).
    * Kim thời gian màu đỏ (Playhead) hỗ trợ kéo kéo rê để thực hiện chức năng Scrubbing (xem thử nhanh qua tọa độ chuột).
    * Các đường rãnh chứa luồng (Tracks): Dòng chứa video, dòng chứa nhạc nền, dòng chứa chữ/nhãn dán.
    * Các khối hình chữ nhật đại diện cho clip, hỗ trợ giữ chuột kéo trái/phải để dịch chuyển mốc thời gian phát, hoặc kéo 2 đầu biên để xén (trim) bớt độ dài clip.
  * Thanh điều khiển phát lại (Playback controls): Nút Play/Pause, nút Stop, ô nhập mốc thời gian chỉ định.

## 15.6. Increment sau Sprint 10
Sau **Sprint 10**, nhóm tạo ra **Increment** tiếp theo:
**Increment 10: Multi-track Video Timeline Engine**
Increment này bao gồm:
* Khung lưu trữ cấu trúc timeline đa lớp linh hoạt trên cơ sở dữ liệu MongoDB.
* Giao diện dòng thời gian tương tác kéo thả mượt mà, trực quan giống như các phần mềm dựng phim chuyên nghiệp.
* Hệ thống đồng bộ phát lại tài nguyên đa phương tiện (phát video, khớp nhạc nền, hiện chữ chạy) thời gian thực trên Canvas của client.

## 15.7. DoD của Sprint 10
Sprint 10 được xem là **Done** khi:

| Tiêu chí | Đạt |
| :--- | :---: |
| Playhead di chuyển trơn tru, không giật lag (đáp ứng 60fps) khi kích hoạt chế độ phát | Có |
| Sự kiện kéo biên clip tự động cập nhật lại thời lượng hiển thị thực tế trên Canvas | Có |
| Nhạc nền (Audio Track) tự động tắt/phát trùng khớp hoàn toàn với vị trí Playhead di chuyển | Có |
| Lưu dữ liệu timeline qua API thành công với thời gian đáp ứng dưới 200ms | Có |

## 15.8. Sprint Review Sprint 10
Trong buổi **Sprint Review**, nhóm **demo**:
* Tạo một dự án biên tập video mới.
* Kéo một clip video 15 giây từ thư viện vào Track 1, tiếp tục kéo một tệp âm thanh MP3 làm nhạc nền vào Track 2.
* Rê chuột kéo ngắn clip video xuống còn 10 giây, và di chuyển tệp âm thanh bắt đầu phát từ giây thứ 5.
* Nhấn nút Play: Trình phát chạy ổn định, hình ảnh chuyển động trên Canvas và âm thanh vang lên đúng thời điểm giây thứ 5 của timeline.

**Product Owner** trực tiếp kiểm tra độ chính xác của cơ chế đồng bộ âm thanh và tính mượt mà khi thao tác kéo thả các block phân đoạn.

## 15.9. Sprint Retrospective Sprint 10
Nhóm thảo luận:
* **Điều làm tốt**:
  * Kiến trúc quản lý trạng thái tập trung (State management) giúp đồng bộ tốt các tài nguyên media khác loại cùng chạy trên một dòng thời gian.
  * Giao diện timeline thiết kế trực quan, dễ làm quen và thao tác.
* **Vấn đề gặp phải**:
  * Trình duyệt bị nghẽn (Lag/Freeze) khi tải cùng lúc 4-5 tệp video nặng độ phân giải 1080p để chạy thử thời gian thực.
* **Cải tiến cho Sprint sau**:
  * Áp dụng kỹ thuật Lazy loading và chỉ tải trước các phân đoạn video nằm trong hoặc sát vùng hiển thị của Playhead để giảm tối đa mức RAM tiêu hao ở Frontend.
