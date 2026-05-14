import { refs, initRefs } from "./modules/dom.js";
import { handleDroppedFiles, handleFileInputChange, handleFolderInputChange, saveActiveTabAs } from "./modules/file-actions.js";
import { setupMenus } from "./modules/menus.js";
import { setupNotifications } from "./modules/notifications.js";
import { setupSplitters } from "./modules/splitters.js";
import { state, bringToFront, clearWorkspace, removeFromCanvas, updateCanvasItem, addToCanvas, setActiveInstance } from "./modules/state.js";
import { applyStaticText, STRINGS, text } from "./modules/strings.js";
import { setStatus, setupThemeSwitching } from "./modules/theme.js";
import { renderApp, toggleFolderGroup, toggleSectionVisibility } from "./modules/ui.js";

function setupFileTriggers() {
    const triggerFileImport = () => refs.fileInput?.click();
    const triggerFolderImport = () => refs.folderInput?.click();

    if (refs.fileInput) refs.fileInput.accept = STRINGS.FILE_INPUT_ACCEPT;
    if (refs.folderInput) {
        refs.folderInput.webkitdirectory = true;
        // folder input không dùng accept
    }

    document.getElementById("import-file-action")?.addEventListener("click", triggerFileImport);
    document.getElementById("import-folder-action")?.addEventListener("click", triggerFolderImport);

    refs.fileInput?.addEventListener("change", handleFileInputChange);
    refs.folderInput?.addEventListener("change", handleFolderInputChange);
}

function setupExplorerActions() {
    refs.explorerTree.addEventListener("click", (event) => {
        const sectionToggle = event.target.closest("[data-section-toggle]");
        if (sectionToggle) {
            toggleSectionVisibility(sectionToggle.dataset.sectionToggle, sectionToggle);
            return;
        }

        const folderToggle = event.target.closest("[data-folder-toggle]");
        if (folderToggle) {
            toggleFolderGroup(folderToggle.dataset.folderToggle);
            return;
        }
    });

    refs.explorerTree.addEventListener("dragstart", (event) => {
        const treeItem = event.target.closest("[data-tab-activate]");
        if (treeItem) {
            event.dataTransfer.setData("text/plain", treeItem.dataset.tabActivate);
            event.dataTransfer.effectAllowed = "copy";
        }
    });
}

function setupDragAndDrop() {
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

function setupCanvasInteractions() {
    let draggingItem = null;
    let resizingItem = null;
    let resizeHandle = null;
    let startPos = { x: 0, y: 0 };
    let startRect = { x: 0, y: 0, w: 0, h: 0 };
    let offset = { x: 0, y: 0 };
    let activePointerId = null;

    refs.viewerDropZone.addEventListener("pointerdown", (event) => {
        const handle = event.target.closest(".resize-handle");
        const itemEl = event.target.closest(".canvas-item");
        const rect = refs.canvasContainer.getBoundingClientRect();
        
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (handle && itemEl) {
            const instanceId = itemEl.dataset.instanceId;
            const item = state.canvasItems.find(i => i.instanceId === instanceId);
            if (!item) return;

            resizingItem = instanceId;
            resizeHandle = handle.dataset.handle;
            startPos.x = mouseX;
            startPos.y = mouseY;
            startRect = { x: item.x, y: item.y, w: item.width, h: item.height };
            
            activePointerId = event.pointerId;
            try { handle.setPointerCapture(event.pointerId); } catch {}
            event.preventDefault();
            event.stopPropagation();
            return;
        }

        if (itemEl) {
            const instanceId = itemEl.dataset.instanceId;
            const item = state.canvasItems.find(i => i.instanceId === instanceId);
            if (!item) return;

            draggingItem = instanceId;
            bringToFront(instanceId);
            setActiveInstance(instanceId);
            renderApp(); // cần để cập nhật z-index và active state

            offset.x = mouseX - item.x;
            offset.y = mouseY - item.y;
            
            activePointerId = event.pointerId;
            try { itemEl.setPointerCapture(event.pointerId); } catch {}
            itemEl.classList.add("is-dragging");
            event.preventDefault();
        } else {
            setActiveInstance(null);
            renderApp();
        }
    });

    window.addEventListener("pointermove", (event) => {
        if (!draggingItem && !resizingItem) return;
        if (activePointerId !== null && event.pointerId !== activePointerId) return;

        const rect = refs.canvasContainer.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        if (resizingItem) {
            const dx = mouseX - startPos.x;
            const dy = mouseY - startPos.y;

            let newX = startRect.x;
            let newY = startRect.y;
            let newW = startRect.w;
            let newH = startRect.h;

            if (resizeHandle.includes("e")) newW = startRect.w + dx;
            if (resizeHandle.includes("s")) newH = startRect.h + dy;
            if (resizeHandle.includes("w")) {
                newW = startRect.w - dx;
                newX = startRect.x + dx;
            }
            if (resizeHandle.includes("n")) {
                newH = startRect.h - dy;
                newY = startRect.y + dy;
            }

            // Constraints
            if (newW < 20) {
                newW = 20;
                if (resizeHandle.includes("w")) newX = startRect.x + startRect.w - 20;
            }
            if (newH < 20) {
                newH = 20;
                if (resizeHandle.includes("n")) newY = startRect.y + startRect.h - 20;
            }

            updateCanvasItem(resizingItem, { 
                x: Math.round(newX), 
                y: Math.round(newY), 
                width: Math.round(newW), 
                height: Math.round(newH) 
            });

            // Cập nhật trực tiếp DOM để tránh renderApp mỗi pixel
            const el = refs.canvasContainer.querySelector(`[data-instance-id="${resizingItem}"]`);
            if (el) {
                el.style.transform = `translate(${Math.round(newX)}px, ${Math.round(newY)}px)`;
                el.style.width = `${Math.round(newW)}px`;
                el.style.height = `${Math.round(newH)}px`;
            }
            return;
        }

        if (draggingItem) {
            const x = mouseX - offset.x;
            const y = mouseY - offset.y;
            
            updateCanvasItem(draggingItem, { 
                x: Math.round(x), 
                y: Math.round(y) 
            });

            const el = refs.canvasContainer.querySelector(`[data-instance-id="${draggingItem}"]`);
            if (el) {
                el.style.transform = `translate(${Math.round(x)}px, ${Math.round(y)}px)`;
            }
        }
    });

    const endInteraction = (event) => {
        let needsRender = false;

        if (draggingItem) {
            const el = refs.canvasContainer.querySelector(`[data-instance-id="${draggingItem}"]`);
            if (el) {
                el.classList.remove("is-dragging");
                try { el.releasePointerCapture(event.pointerId); } catch {}
            }
            draggingItem = null;
            needsRender = true;
        }
        if (resizingItem) {
            const el = refs.canvasContainer.querySelector(`[data-instance-id="${resizingItem}"]`);
            if (el) {
                const handleEl = el.querySelector(`[data-handle="${resizeHandle}"]`);
                if (handleEl) { try { handleEl.releasePointerCapture(event.pointerId); } catch {} }
            }
            resizingItem = null;
            resizeHandle = null;
            needsRender = true;
        }
        activePointerId = null;
        if (needsRender) renderApp();
    };

    window.addEventListener("pointerup", endInteraction);
    window.addEventListener("pointercancel", endInteraction);

    refs.canvasContainer.addEventListener("wheel", (event) => {
        const itemEl = event.target.closest(".canvas-item");
        if (!itemEl) return;
        
        event.preventDefault();
        const instanceId = itemEl.dataset.instanceId;
        const item = state.canvasItems.find(i => i.instanceId === instanceId);
        if (!item) return;

        const delta = event.deltaY > 0 ? 0.95 : 1.05;
        const newWidth = Math.max(20, Math.round(item.width * delta));
        const newHeight = Math.max(20, Math.round(item.height * delta));
        
        // Zoom hướng về con trỏ - tính theo canvas
        const canvasRect = refs.canvasContainer.getBoundingClientRect();
        const cx = event.clientX - canvasRect.left;
        const cy = event.clientY - canvasRect.top;
        
        const newX = Math.round(cx - (cx - item.x) * delta);
        const newY = Math.round(cy - (cy - item.y) * delta);

        updateCanvasItem(instanceId, { 
            width: newWidth, 
            height: newHeight,
            x: newX,
            y: newY
        });
        renderApp();
    }, { passive: false });

    // Xóa item bằng double-click (cân nhắc thay bằng phím Delete)
    refs.canvasContainer.addEventListener("dblclick", (event) => {
        const itemEl = event.target.closest(".canvas-item");
        if (itemEl) {
            if (confirm("Xóa item này?")) {
                removeFromCanvas(itemEl.dataset.instanceId);
                renderApp();
            }
        }
    });
}

function setupToolbarActions() {
    document.getElementById("save-as-action")?.addEventListener("click", saveActiveTabAs);
    document.getElementById("clear-workspace-action")?.addEventListener("click", () => {
        clearWorkspace();
        renderApp();
        setStatus(text("STATUS_WORKSPACE_CLEARED"));
    });
}

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
renderApp();
