import { state, updateCanvasItem } from "../../modules/state.js";
import { renderApp } from "../../modules/ui/index.js";
import { getSnappingAndGuides, clearSmartGuides, drawSmartGuides } from "../../modules/snapping.js";

export function handleDragStart(event, itemEl, mouseX, mouseY, stateObj) {
    const instanceId = itemEl.dataset.instanceId;
    const item = state.canvasItems.find(i => i.instanceId === instanceId);
    if (!item) return false;

    // Handle shift click for multi-selection
    if (event.shiftKey) {
        if (!state.selectedInstanceIds) state.selectedInstanceIds = [];
        if (state.selectedInstanceIds.includes(instanceId)) {
            state.selectedInstanceIds = state.selectedInstanceIds.filter(id => id !== instanceId);
            if (state.activeInstanceId === instanceId) {
                state.activeInstanceId = state.selectedInstanceIds[state.selectedInstanceIds.length - 1] || null;
            }
        } else {
            state.selectedInstanceIds.push(instanceId);
            state.activeInstanceId = instanceId;
        }
        renderApp();
        // Prevent dragging if just shift-clicking to toggle
        return true; 
    }

    stateObj.pushState();

    // If clicking an unselected item, clear selection and select it
    if (!state.selectedInstanceIds) state.selectedInstanceIds = [];
    if (!state.selectedInstanceIds.includes(instanceId)) {
        state.selectedInstanceIds = [instanceId];
        state.activeInstanceId = instanceId;
    }

    stateObj.draggingItems = state.selectedInstanceIds.map(id => {
        const cItem = state.canvasItems.find(i => i.instanceId === id);
        return {
            id: id,
            startX: cItem ? cItem.x : 0,
            startY: cItem ? cItem.y : 0,
            offsetX: cItem ? mouseX - cItem.x : 0,
            offsetY: cItem ? mouseY - cItem.y : 0
        };
    });

    stateObj.primaryDraggingItem = instanceId;
    
    state.selectedInstanceIds.forEach(id => {
        const el = stateObj.refs.canvasContainer.querySelector(`.canvas-item[data-instance-id="${id}"]`);
        if (el) el.classList.add("is-dragging");
        const selBox = stateObj.refs.canvasContainer.querySelector(`.active-selection-box[data-instance-id="${id}"]`);
        if (selBox) selBox.classList.add("is-dragging");
    });
    
    renderApp();
    return true;
}

export function handleDragMove(event, mouseX, mouseY, stateObj) {
    if (!stateObj.draggingItems || stateObj.draggingItems.length === 0) return false;

    // We only use snapping for the primary dragging item (the one grabbed)
    const primaryInfo = stateObj.draggingItems.find(i => i.id === stateObj.primaryDraggingItem);
    if (!primaryInfo) return false;

    const pItem = state.canvasItems.find(i => i.instanceId === primaryInfo.id);
    if (!pItem) return false;

    let nx = mouseX - primaryInfo.offsetX;
    let ny = mouseY - primaryInfo.offsetY;

    // Calculate drag delta
    const z = state.projectConfig.zoom || 1;
    const snap = getSnappingAndGuides(primaryInfo.id, nx, ny, pItem.width, pItem.height, z);
    
    const dx = snap.x - primaryInfo.startX;
    const dy = snap.y - primaryInfo.startY;

    if (snap.guides.v.length === 0 && snap.guides.h.length === 0) {
        clearSmartGuides();
    } else {
        drawSmartGuides(snap.guides);
    }

    // Apply delta to all selected items
    stateObj.draggingItems.forEach(dragInfo => {
        updateCanvasItem(dragInfo.id, { 
            x: dragInfo.startX + dx, 
            y: dragInfo.startY + dy 
        });
    });

    renderApp();
    return true;
}

export function handleDragEnd(stateObj) {
    if (!stateObj.draggingItems || stateObj.draggingItems.length === 0) return false;
    
    stateObj.draggingItems.forEach(dragInfo => {
        const itemEl = stateObj.refs.canvasContainer.querySelector(`[data-instance-id="${dragInfo.id}"]`);
        if (itemEl) itemEl.classList.remove("is-dragging");
        const selectionBox = stateObj.refs.canvasContainer.querySelector(`.active-selection-box[data-instance-id="${dragInfo.id}"]`);
        if (selectionBox) selectionBox.classList.remove("is-dragging");
    });
    
    stateObj.draggingItems = null;
    stateObj.primaryDraggingItem = null;
    clearSmartGuides();
    renderApp();
    return true;
}
