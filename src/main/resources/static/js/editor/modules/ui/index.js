import { refs } from "../dom.js";
import { getActiveTab, getTab, removeTab, state, toggleFolder } from "../state.js";
import { STRINGS, text } from "../strings.js";
import { setStatus } from "../theme.js";
import { renderServerEffects } from "../effects.js";
import { renderTimeline, syncClipsWithCanvasItems } from "../timeline.js";
import { renderExplorer, updateCaret, toggleFolderCollapse } from "./explorer.js";
import { renderViewer } from "./viewer.js";
import { renderRightPanel } from "./right-panel/init.js";

export function renderApp() {
    if (state.projectType === 'VIDEO') {
        syncClipsWithCanvasItems();
    }

    if (refs.fileInput || refs.folderInput) {
        const acceptStr = state.projectType === 'VIDEO'
            ? STRINGS.FILE_INPUT_ACCEPT + ",.mp4,.webm,.ogg,.mov,.mkv,video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska"
            : STRINGS.FILE_INPUT_ACCEPT;
        if (refs.fileInput) refs.fileInput.accept = acceptStr;
        if (refs.folderInput) refs.folderInput.accept = acceptStr;
    }

    if (state.projectType === 'VIDEO') {
        const exportBtn = document.getElementById("quick-export-btn");
        if (exportBtn) exportBtn.textContent = "Xuất video";

        const exportMenu = document.getElementById("export-canvas-action");
        if (exportMenu) exportMenu.textContent = "Xuất video / Export";

        const exportTitle = document.getElementById("export-dialog-title");
        if (exportTitle) exportTitle.textContent = "Xuất video thiết kế";

        const formatLabel = document.querySelector('label[for="export-format"]');
        if (formatLabel) formatLabel.textContent = "Định dạng video";

        const formatSelect = document.getElementById("export-format");
        if (formatSelect && !formatSelect.dataset.customized) {
            const template = document.getElementById("video-export-options-template");
            if (template) {
                formatSelect.innerHTML = "";
                formatSelect.appendChild(template.content.cloneNode(true));
            }
            formatSelect.dataset.customized = "true";
        }
    }

    renderExplorer();
    renderViewer();
    renderRightPanel();
    updateToolbarActions();
    updateEmptyStates();
    renderServerEffects();
    renderTimeline();
    
    if (window.triggerAutosave) {
        window.triggerAutosave();
    }
}

export function closeTab(tabId) {
    removeTab(tabId);
    renderApp();
    if (state.activeTabId) {
        const active = getActiveTab();
        if (active) {
            setStatus(text("STATUS_OPENED", { name: active.name }));
        }
    } else {
        setStatus(text("STATUS_WORKSPACE_CLEARED"));
    }
}

export function toggleFolderGroup(folderName) {
    toggleFolder(folderName);
    renderApp();
}

export function toggleFolderGroupById(folderId) {
    toggleFolderCollapse(folderId);
    renderApp();
}

export function toggleSectionVisibility(sectionId, toggleButton) {
    const target = document.getElementById(sectionId);
    if (!target) return;
    const willHide = !target.hidden;
    target.hidden = willHide;
    const caret = toggleButton?.querySelector(".tree-caret");
    updateCaret(caret, willHide);
}

export function updateToolbarActions() {
    const hasItems = state.canvasItems.length > 0;
    if (refs.saveAsAction) refs.saveAsAction.disabled = !hasItems;

    const toolSelect = document.getElementById("tool-select");
    const toolPaint = document.getElementById("tool-paint");
    const paintOptionsBar = document.getElementById("paint-options-bar");

    if (state.projectType === 'VIDEO') {
        if (toolPaint) toolPaint.hidden = true;
        if (paintOptionsBar) paintOptionsBar.hidden = true;
        state.activeTool = 'select';
    } else {
        if (toolPaint) toolPaint.hidden = false;
    }

    if (toolSelect && toolPaint) {
        toolSelect.classList.toggle("active", state.activeTool === 'select');
        toolPaint.classList.toggle("active", state.activeTool === 'paint');
    }
    if (paintOptionsBar && state.projectType !== 'VIDEO') {
        paintOptionsBar.hidden = state.activeTool !== 'paint';
    }
}

export function updateEmptyStates() {
    const hasItems = state.folders.length > 0 || state.looseTabIds.length > 0;
    const hasCanvasItems = state.canvasItems.length > 0;

    if (refs.explorerEmpty) refs.explorerEmpty.hidden = hasItems;
    if (refs.dropZoneContent) {
        refs.dropZoneContent.hidden = hasCanvasItems;
        const dropTextEl = refs.dropZoneContent.querySelector('[data-i18n="LBL_DROP_HERE"]');
        if (dropTextEl) {
            dropTextEl.textContent = state.projectType === 'VIDEO' ? 'Kéo thả video hoặc hình ảnh vào đây' : 'Kéo thả ảnh vào đây';
        }
    }
    
    if (refs.canvasContainer) {
        refs.canvasContainer.hidden = !hasCanvasItems;
    }
}
