import { refs } from "../modules/dom.js";
import { handleDroppedFiles, handleFileInputChange, handleFolderInputChange } from "../modules/file-actions.js";
import { state, addToCanvas, ensureRemoteTab } from "../modules/state.js";
import { STRINGS } from "../modules/strings.js";
import { renderApp, toggleFolderGroup, toggleSectionVisibility, toggleFolderGroupById } from "../modules/ui/index.js";

export function setupFileTriggers() {
    const triggerFileImport = () => refs.fileInput?.click();
    const triggerFolderImport = () => refs.folderInput?.click();

    const acceptStr = state.projectType === 'VIDEO'
        ? STRINGS.FILE_INPUT_ACCEPT + ",.mp4,.webm,.ogg,.mov,.mkv,video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska"
        : STRINGS.FILE_INPUT_ACCEPT;

    if (refs.fileInput) {
        refs.fileInput.accept = acceptStr;
    }
    if (refs.folderInput) {
        refs.folderInput.webkitdirectory = true;
        refs.folderInput.accept = acceptStr;
    }

    document.getElementById("import-file-action")?.addEventListener("click", triggerFileImport);
    document.getElementById("import-folder-action")?.addEventListener("click", triggerFolderImport);

    refs.fileInput?.addEventListener("change", handleFileInputChange);
    refs.folderInput?.addEventListener("change", handleFolderInputChange);
}

export function setupExplorerActions() {
    const explorerList = document.getElementById("explorer-list-sidebar");
    if (!explorerList) return;

    explorerList.addEventListener("click", (event) => {
        const item = event.target.closest("[data-tab-activate]");
        if (item && !event.target.closest('.item-actions-btn') && !event.target.closest('.sidebar-dropdown-menu')) {
            const tabId = item.dataset.tabActivate;
            state.activeTabId = tabId;
            explorerList.querySelectorAll(".explorer-list-item").forEach(el => {
                el.classList.toggle("selected", el.dataset.tabActivate === tabId);
            });
        }
    });

    // Double click to add directly to current active track at current playhead position
    explorerList.addEventListener("dblclick", (event) => {
        const item = event.target.closest("[data-tab-activate]");
        if (item && !event.target.closest('.item-actions-btn') && !event.target.closest('.sidebar-dropdown-menu')) {
            const tabId = item.dataset.tabActivate;
            const filepath = item.dataset.filepath;
            const filename = item.dataset.filename;

            // Đảm bảo tab tồn tại trong bộ nhớ trước khi nạp vào timeline
            ensureRemoteTab(tabId, filename, filepath);

            import("../modules/timeline.js").then(module => {
                let trackId = state.activeTrackId;
                if (!trackId && state.timelineData && state.timelineData.tracks.length > 0) {
                    trackId = state.timelineData.tracks[0].id;
                }
                const startOffset = state.timelineData ? (state.timelineData.currentTime || 0) : 0;
                module.addMediaToTrack(tabId, trackId, startOffset);
            });
        }
    });

    explorerList.addEventListener("dragstart", (event) => {
        const item = event.target.closest("[data-tab-activate]");
        if (item) {
            const tabId = item.dataset.tabActivate;
            const filepath = item.dataset.filepath;
            const filename = item.dataset.filename;

            // Đảm bảo tab tồn tại trong bộ nhớ trước khi kéo thả
            ensureRemoteTab(tabId, filename, filepath);

            event.dataTransfer.setData("text/plain", tabId);
            event.dataTransfer.effectAllowed = "copy";
        }
    });
}

export function setupDragAndDrop() {
    refs.viewerDropZone.addEventListener("dragover", (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = "copy";
        refs.viewerDropZone.classList.add("drag-over");
    });

    refs.viewerDropZone.addEventListener("dragleave", () => {
        refs.viewerDropZone.classList.remove("drag-over");
    });

    refs.viewerDropZone.addEventListener("drop", (event) => {
        event.preventDefault();
        refs.viewerDropZone.classList.remove("drag-over");

        const rect = refs.canvasContainer.getBoundingClientRect();
        const x = event.clientX - rect.left;
        const y = event.clientY - rect.top;

        // Handle local files
        if (event.dataTransfer.files && event.dataTransfer.files.length > 0) {
            handleDroppedFiles(Array.from(event.dataTransfer.files), x, y);
            return;
        }

        // Handle internal explorer items
        const tabId = event.dataTransfer.getData("text/plain");
        if (tabId) {
            addToCanvas(tabId, x - 50, y - 50);
            renderApp();
        }
    });
}
