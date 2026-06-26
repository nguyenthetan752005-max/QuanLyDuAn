import { state, updateCanvasItem } from "../../modules/state.js";
import { renderApp } from "../../modules/ui/index.js";
import { getResizeSnappingAndGuides, clearSmartGuides, drawSmartGuides } from "../../modules/snapping.js";

export function handleResizeStart(event, handle, itemEl, mouseX, mouseY, stateObj) {
    stateObj.pushState();
    const instanceId = itemEl.dataset.instanceId;
    const item = state.canvasItems.find(i => i.instanceId === instanceId);
    if (!item) return false;

    stateObj.resizingItem = instanceId;
    itemEl.classList.add("is-resizing");
    const selectionBox = stateObj.refs.canvasContainer.querySelector(`.active-selection-box[data-instance-id="${instanceId}"]`);
    if (selectionBox) {
        selectionBox.classList.add("is-resizing");
    }
    stateObj.resizeHandle = handle.dataset.handle;
    stateObj.startPos.x = mouseX;
    stateObj.startPos.y = mouseY;
    stateObj.startRect = { 
        x: item.x, 
        y: item.y, 
        w: item.width, 
        h: item.height,
        cropX: item.crop?.x || 0,
        cropY: item.crop?.y || 0,
        cropW: item.crop?.width || item.naturalWidth || item.width,
        cropH: item.crop?.height || item.naturalHeight || item.height
    };
    stateObj.setActiveInstance(instanceId);
    return true;
}

export function handleResizeMove(event, mouseX, mouseY, stateObj) {
    if (!stateObj.resizingItem) return false;

    const dx = mouseX - stateObj.startPos.x;
    const dy = mouseY - stateObj.startPos.y;
    let { x, y, w, h } = stateObj.startRect;

    const item = state.canvasItems.find(i => i.instanceId === stateObj.resizingItem);
    const isCropping = item && item.cropEnabled;

    if (isCropping) {
        return handleCropMove(dx, dy, item, stateObj);
    }

    const maintainRatio = event.shiftKey;
    const ratio = w / h;

    if (stateObj.resizeHandle.includes("e")) w += dx;
    if (stateObj.resizeHandle.includes("s")) h += dy;
    if (stateObj.resizeHandle.includes("w")) {
        w -= dx;
        x += dx;
    }
    if (stateObj.resizeHandle.includes("n")) {
        h -= dy;
        y += dy;
    }

    if (maintainRatio) {
        if (stateObj.resizeHandle === "se" || stateObj.resizeHandle === "e" || stateObj.resizeHandle === "s") {
            if (Math.abs(dx) > Math.abs(dy)) h = w / ratio;
            else w = h * ratio;
        } else if (stateObj.resizeHandle === "nw" || stateObj.resizeHandle === "w" || stateObj.resizeHandle === "n") {
            if (Math.abs(dx) > Math.abs(dy)) {
                const oldH = h;
                h = w / ratio;
                y += (oldH - h);
            } else {
                const oldW = w;
                w = h * ratio;
                x += (oldW - w);
            }
        } else if (stateObj.resizeHandle === "ne") {
            const oldH = h;
            h = w / ratio;
            y += (oldH - h);
        } else if (stateObj.resizeHandle === "sw") {
            const oldW = w;
            w = h * ratio;
            x += (oldW - w);
        }
    }

    w = Math.max(10, w);
    h = Math.max(10, h);

    const z = state.projectConfig.zoom || 1;
    const snap = getResizeSnappingAndGuides(stateObj.resizingItem, stateObj.resizeHandle, x, y, w, h, stateObj.startRect, z);
    x = snap.x;
    y = snap.y;
    w = snap.width;
    h = snap.height;

    if (snap.guides.v.length === 0 && snap.guides.h.length === 0) {
        clearSmartGuides();
    } else {
        drawSmartGuides(snap.guides);
    }

    updateCanvasItem(stateObj.resizingItem, { x, y, width: w, height: h });
    renderApp();
    return true;
}

function handleCropMove(dx, dy, item, stateObj) {
    const startRect = stateObj.startRect;
    const naturalWidth = item.naturalWidth || item.width;
    const naturalHeight = item.naturalHeight || item.height;

    // Calculate scale factor at start
    const scaleX = startRect.w / startRect.cropW;
    const scaleY = startRect.h / startRect.cropH;

    // Convert canvas deltas to natural image deltas
    const dNaturalX = dx / scaleX;
    const dNaturalY = dy / scaleY;

    let cropX = startRect.cropX;
    let cropY = startRect.cropY;
    let cropW = startRect.cropW;
    let cropH = startRect.cropH;

    let x = startRect.x;
    let y = startRect.y;
    let w = startRect.w;
    let h = startRect.h;

    const handle = stateObj.resizeHandle;

    if (handle.includes("e")) {
        cropW += dNaturalX;
        w += dx;
    }
    if (handle.includes("s")) {
        cropH += dNaturalY;
        h += dy;
    }
    if (handle.includes("w")) {
        cropW -= dNaturalX;
        cropX += dNaturalX;
        w -= dx;
        x += dx;
    }
    if (handle.includes("n")) {
        cropH -= dNaturalY;
        cropY += dNaturalY;
        h -= dy;
        y += dy;
    }

    // Apply Smart Snapping and Guides based on the container coordinates
    const z = state.projectConfig.zoom || 1;
    const snap = getResizeSnappingAndGuides(stateObj.resizingItem, handle, x, y, w, h, startRect, z);
    
    // Update coordinates from snap result
    let xSnapped = snap.x;
    let ySnapped = snap.y;
    let wSnapped = snap.width;
    let hSnapped = snap.height;

    // Convert snapped container dimensions back to natural crop coordinates
    if (handle.includes("w")) {
        cropX = startRect.cropX + (xSnapped - startRect.x) / scaleX;
        cropW = wSnapped / scaleX;
    } else if (handle.includes("e")) {
        cropW = wSnapped / scaleX;
    }

    if (handle.includes("n")) {
        cropY = startRect.cropY + (ySnapped - startRect.y) / scaleY;
        cropH = hSnapped / scaleY;
    } else if (handle.includes("s")) {
        cropH = hSnapped / scaleY;
    }

    const minSize = 10; // minimum size in natural coordinates

    // Bounds checking and container translation alignment
    if (handle.includes("w")) {
        if (cropX < 0) {
            cropX = 0;
            cropW = startRect.cropW + startRect.cropX;
        }
        const maxCropX = startRect.cropX + startRect.cropW - minSize;
        if (cropX > maxCropX) {
            cropX = maxCropX;
            cropW = minSize;
        }
        const dxClamped = cropX - startRect.cropX;
        x = startRect.x + dxClamped * scaleX;
        w = startRect.w - dxClamped * scaleX;
    } else if (handle.includes("e")) {
        if (cropX + cropW > naturalWidth) {
            cropW = naturalWidth - cropX;
        }
        if (cropW < minSize) {
            cropW = minSize;
        }
        w = startRect.w + (cropW - startRect.cropW) * scaleX;
    }

    if (handle.includes("n")) {
        if (cropY < 0) {
            cropY = 0;
            cropH = startRect.cropH + startRect.cropY;
        }
        const maxCropY = startRect.cropY + startRect.cropH - minSize;
        if (cropY > maxCropY) {
            cropY = maxCropY;
            cropH = minSize;
        }
        const dyClamped = cropY - startRect.cropY;
        y = startRect.y + dyClamped * scaleY;
        h = startRect.h - dyClamped * scaleY;
    } else if (handle.includes("s")) {
        if (cropY + cropH > naturalHeight) {
            cropH = naturalHeight - cropY;
        }
        if (cropH < minSize) {
            cropH = minSize;
        }
        h = startRect.h + (cropH - startRect.cropH) * scaleY;
    }

    // Double check overall boundary safety
    if (cropX < 0) cropX = 0;
    if (cropY < 0) cropY = 0;
    if (cropX + cropW > naturalWidth) cropW = naturalWidth - cropX;
    if (cropY + cropH > naturalHeight) cropH = naturalHeight - cropY;

    // Recalculate container bounds
    w = cropW * scaleX;
    h = cropH * scaleY;

    // Draw smart guides if any snapped guides are present
    if (snap.guides.v.length === 0 && snap.guides.h.length === 0) {
        clearSmartGuides();
    } else {
        drawSmartGuides(snap.guides);
    }

    updateCanvasItem(stateObj.resizingItem, {
        crop: { x: cropX, y: cropY, width: cropW, height: cropH },
        x: x,
        y: y,
        width: w,
        height: h
    });
    
    renderApp();
    return true;
}

export function handleResizeEnd(stateObj) {
    if (!stateObj.resizingItem) return false;
    
    const itemEl = stateObj.refs.canvasContainer.querySelector(`[data-instance-id="${stateObj.resizingItem}"]`);
    if (itemEl) itemEl.classList.remove("is-resizing");
    const selectionBox = stateObj.refs.canvasContainer.querySelector(`.active-selection-box[data-instance-id="${stateObj.resizingItem}"]`);
    if (selectionBox) selectionBox.classList.remove("is-resizing");
    
    stateObj.resizingItem = null;
    stateObj.resizeHandle = null;
    clearSmartGuides();
    renderApp();
    return true;
}
