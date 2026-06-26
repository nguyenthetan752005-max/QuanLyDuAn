import { initRefs } from "../modules/dom.js";
import { setupMenus } from "../modules/menus.js";
import { setupNotifications } from "../modules/notifications.js";
import { setupSplitters } from "../modules/splitters.js";
import { setupThemeSwitching } from "../modules/theme.js";
import { setupSidebarTabs } from "../modules/effects.js";
import { initTimeline } from "../modules/timeline.js";
import { initTimelinePlayer } from "../modules/timeline-player.js";
import { initTimelineDrag } from "../modules/timeline-drag.js";
import { renderApp } from "../modules/ui/index.js";
import { applyStaticText } from "../modules/strings.js";

// Import locally split app scripts
import { setupFileTriggers, setupExplorerActions, setupDragAndDrop } from "./file-handlers.js";
import { setupCanvasInteractions } from "./canvas-interactions.js";
import { setupToolbarActions } from "./toolbar-actions.js";
import { setupKeyboardShortcuts } from "./keyboard-shortcuts.js";
import { initProject, initSocialImportDialog } from "./project-actions.js";

// Run initial configurations
initRefs();
applyStaticText();
setupMenus();
setupNotifications();
setupSplitters();
setupThemeSwitching();
setupFileTriggers();
setupExplorerActions();
setupDragAndDrop();
setupCanvasInteractions();
setupToolbarActions();
setupSidebarTabs();
setupKeyboardShortcuts();

// Initialize timeline modules
initTimeline();
initTimelinePlayer();
initTimelineDrag();

// Trigger initial rendering & project retrieval
renderApp();
initProject();
initSocialImportDialog();

// Guided Tour for Editor
if (!localStorage.getItem('has_seen_editor_tour')) {
    setTimeout(() => {
        if (typeof introJs !== 'undefined') {
            const tour = introJs();
            tour.setOptions({
                nextLabel: 'Tiếp theo',
                prevLabel: 'Quay lại',
                skipLabel: 'Bỏ qua',
                doneLabel: 'Hoàn thành',
                steps: [
                    {
                        title: 'Khu vực làm việc',
                        intro: 'Chào mừng bạn đến với giao diện chỉnh sửa (Editor). Đây là nơi bạn thỏa sức sáng tạo.'
                    },
                    {
                        element: document.querySelector('.toolbar'),
                        title: 'Thanh công cụ',
                        intro: 'Chứa các công cụ như Thêm lớp mới, Cắt ảnh, Xóa nền, và Hoàn tác.'
                    },
                    {
                        element: document.querySelector('.canvas-container'),
                        title: 'Canvas',
                        intro: 'Khung vẽ chính của bạn. Kéo thả các thành phần trên này để sắp xếp bố cục.'
                    },
                    {
                        element: document.querySelector('.right-panel'),
                        title: 'Bảng thuộc tính',
                        intro: 'Nơi bạn điều chỉnh màu sắc, độ mờ, font chữ và các thuộc tính chi tiết của đối tượng đang chọn.'
                    }
                ]
            });
            tour.start();
            tour.oncomplete(() => localStorage.setItem('has_seen_editor_tour', 'true'));
            tour.onexit(() => localStorage.setItem('has_seen_editor_tour', 'true'));
        }
    }, 1500);
}
