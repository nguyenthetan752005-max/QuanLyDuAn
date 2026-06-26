import { state } from "../../state.js";
import { renderCanvasSettings } from "./canvas-settings.js";
import { getTabsConfig } from "./tabs.js";
import { renderTextControls } from "./text-controls.js";
import { renderArrangeControls } from "./arrange-controls.js";
import { renderShapeControls, renderStickerControls, renderEditControls } from "./other-controls.js";
import { renderLayersPanel } from "./layers.js";

export function renderRightPanel() {
    const rightPanel = document.querySelector(".right-panel");
    if (!rightPanel) return;

    rightPanel.innerHTML = '';

    // Layers list is always shown at the top of the panel
    renderLayersPanel(rightPanel);

    // Everything else (canvas settings or the active item's controls) goes in the body
    const body = document.createElement('div');
    body.className = 'right-panel-body';
    rightPanel.appendChild(body);

    if (!state.activeInstanceId) {
        renderCanvasSettings(body);
        return;
    }

    const item = state.canvasItems.find(i => i.instanceId === state.activeInstanceId);
    if (!item) {
        const emptyDiv = document.createElement('div');
        emptyDiv.className = 'sidebar-empty';
        emptyDiv.textContent = 'Item not editable';
        body.appendChild(emptyDiv);
        return;
    }

    const { tabsContainer, createTab } = getTabsConfig(item);

    if (item.type === 'text') {
        tabsContainer.appendChild(createTab('text', 'Định dạng chữ', renderRightPanel));
        tabsContainer.appendChild(createTab('arrange', 'Căn chỉnh & Lớp', renderRightPanel));
    } else if (item.type === 'shape') {
        tabsContainer.appendChild(createTab('shape', 'Thiết lập hình', renderRightPanel));
        tabsContainer.appendChild(createTab('arrange', 'Căn chỉnh & Lớp', renderRightPanel));
    } else if (item.type === 'sticker') {
        tabsContainer.appendChild(createTab('sticker', 'Nhãn dán', renderRightPanel));
        tabsContainer.appendChild(createTab('arrange', 'Căn chỉnh & Lớp', renderRightPanel));
    } else {
        tabsContainer.appendChild(createTab('edit', 'Bộ lọc', renderRightPanel));
        tabsContainer.appendChild(createTab('arrange', 'Căn chỉnh & Lớp', renderRightPanel));
        if (item.type === 'video') {
            tabsContainer.appendChild(createTab('transition', 'Chuyển cảnh', renderRightPanel));
        }
    }

    body.appendChild(tabsContainer);

    const controls = document.createElement('div');
    controls.className = 'edit-controls-container';

    if (state.activeRightTab === 'text') {
        renderTextControls(item, controls);
    } else if (state.activeRightTab === 'edit') {
        renderEditControls(item, controls);
    } else if (state.activeRightTab === 'arrange') {
        renderArrangeControls(item, controls);
    } else if (state.activeRightTab === 'shape') {
        renderShapeControls(item, controls);
    } else if (state.activeRightTab === 'sticker') {
        renderStickerControls(item, controls);
    } else if (state.activeRightTab === 'transition') {
        // Will import and call renderTransitionControls
        import("./transition-controls.js").then(module => {
            module.renderTransitionControls(item, controls);
        });
    }

    body.appendChild(controls);
}
