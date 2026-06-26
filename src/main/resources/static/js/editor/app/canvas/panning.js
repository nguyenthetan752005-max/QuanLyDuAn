import { refs } from "../../modules/dom.js";
import { state } from "../../modules/state.js";

export function handlePanning(event, stateObj) {
    if (stateObj.isSpaceDown || event.button === 1) {
        event.preventDefault();
        stateObj.isPanning = true;
        stateObj.panStart.x = event.clientX;
        stateObj.panStart.y = event.clientY;
        stateObj.scrollStart.left = refs.canvasContainer.scrollLeft;
        stateObj.scrollStart.top = refs.canvasContainer.scrollTop;
        refs.viewerDropZone.style.cursor = 'grabbing';
        stateObj.activePointerId = event.pointerId;
        try { refs.viewerDropZone.setPointerCapture(event.pointerId); } catch {}
        return true; // Handled
    }
    return false;
}

export function handlePanMove(event, stateObj) {
    if (stateObj.isPanning && stateObj.activePointerId === event.pointerId) {
        const dx = event.clientX - stateObj.panStart.x;
        const dy = event.clientY - stateObj.panStart.y;
        if (Math.abs(dx) > 2 || Math.abs(dy) > 2) {
            state.hasPanned = true;
        }
        refs.canvasContainer.scrollLeft = stateObj.scrollStart.left - dx;
        refs.canvasContainer.scrollTop = stateObj.scrollStart.top - dy;
        return true;
    }
    return false;
}

export function handlePanEnd(event, stateObj) {
    if (stateObj.isPanning && stateObj.activePointerId === event.pointerId) {
        stateObj.isPanning = false;
        stateObj.activePointerId = null;
        try { refs.viewerDropZone.releasePointerCapture(event.pointerId); } catch {}
        refs.viewerDropZone.style.cursor = stateObj.isSpaceDown ? 'grab' : '';
        return true;
    }
    return false;
}
