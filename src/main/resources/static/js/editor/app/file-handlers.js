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

        const dataText = event.dataTransfer.getData("text/plain");
        const isStock = event.dataTransfer.getData("application/lily-stock") === "true";

        if (isStock && dataText) {
            (async () => {
                try {
                    const response = await fetch(dataText);
                    if (!response.ok) throw new Error("Không thể tải ảnh Stock");
                    const blob = await response.blob();
                    
                    const aiManager = await import('../modules/ai/aiManager.js');
                    
                    aiManager.showSaveModal(blob, "stock_image_" + Date.now() + ".jpg", (newObjectUrl) => {
                        const img = new Image();
                        img.crossOrigin = 'anonymous';
                        img.onload = () => {
                            const id = 'stock_' + Date.now();
                            state.canvasItems.push({
                                instanceId: id,
                                type: 'image',
                                src: newObjectUrl,
                                x: x - (img.width > 300 ? 150 : Math.floor(img.width / 2)),
                                y: y - (img.height > 300 ? 150 : Math.floor(img.height / 2)),
                                width: img.width > 300 ? 300 : img.width,
                                height: img.width > 300 ? Math.floor(img.height * (300 / img.width)) : img.height,
                                naturalWidth: img.width,
                                naturalHeight: img.height,
                                rotation: 0,
                                zIndex: state.canvasItems.length
                            });
                            state.activeInstanceId = id;
                            renderApp();
                        };
                        img.src = newObjectUrl;
                    });
                } catch (err) {
                    console.error("Lỗi kéo thả Stock:", err);
                }
            })();
            return;
        }

        // Handle internal explorer items
        if (dataText) {
            addToCanvas(dataText, x - 50, y - 50);
            renderApp();
        }
    });

    // Handle click to insert stock image
    window.addEventListener('insertStockImage', async (e) => {
        const url = e.detail.url;
        try {
            // Tải ảnh về dạng Blob
            const response = await fetch(url);
            if (!response.ok) throw new Error("Không thể tải ảnh Stock");
            const blob = await response.blob();
            
            // Lấy module aiManager (vì showSaveModal đang export ở đó)
            const aiManager = await import('../modules/ai/aiManager.js');
            
            // Gọi modal lưu
            aiManager.showSaveModal(blob, "stock_image_" + Date.now() + ".jpg", (newObjectUrl) => {
                // Sau khi lưu thành công, thêm vào canvas
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.onload = () => {
                    const id = 'stock_' + Date.now();
                    state.canvasItems.push({
                        instanceId: id,
                        type: 'image',
                        src: newObjectUrl,
                        x: 100,
                        y: 100,
                        width: img.width > 300 ? 300 : img.width,
                        height: img.width > 300 ? Math.floor(img.height * (300 / img.width)) : img.height,
                        naturalWidth: img.width,
                        naturalHeight: img.height,
                        rotation: 0,
                        zIndex: state.canvasItems.length
                    });
                    state.activeInstanceId = id;
                    renderApp();
                };
                img.src = newObjectUrl;
            });
        } catch (err) {
            console.error("Lỗi thêm ảnh Stock:", err);
            alert("Lỗi tải ảnh Stock");
        }
    });
}
