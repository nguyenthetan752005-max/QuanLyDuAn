import { refs } from "../../modules/dom.js";
import { state, setActiveInstance } from "../../modules/state.js";
import { pushState } from "../../modules/history.js";
import { renderApp } from "../../modules/ui/index.js";
import { handlePanning, handlePanMove, handlePanEnd } from "./panning.js";
import { handleDragStart, handleDragMove, handleDragEnd } from "./dragging.js";
import { handleResizeStart, handleResizeMove, handleResizeEnd } from "./resizing.js";
import { getSnappingAndGuides, getResizeSnappingAndGuides, drawSmartGuides, clearSmartGuides } from "../../modules/snapping.js";
import { startMarquee, moveMarquee, endMarquee } from "./marquee.js";

export function setupCanvasInteractions() {
    const stateObj = {
        draggingItem: null,
        resizingItem: null,
        resizeHandle: null,
        startPos: { x: 0, y: 0 },
        startRect: { x: 0, y: 0, w: 0, h: 0 },
        offset: { x: 0, y: 0 },
        activePointerId: null,
        isPanning: false,
        isMarquee: false,
        marqueeStart: { x: 0, y: 0 },
        isSpaceDown: false,
        panStart: { x: 0, y: 0 },
        scrollStart: { left: 0, top: 0 },
        refs,
        pushState,
        setActiveInstance
    };

    window.addEventListener('keydown', (e) => {
        const isEditingText = e.target && (
            e.target.tagName === 'INPUT' ||
            e.target.tagName === 'TEXTAREA' ||
            e.target.contentEditable === 'true'
        );
        if (e.code === 'Space' && !stateObj.isSpaceDown && !isEditingText) {
            stateObj.isSpaceDown = true;
            state.isSpaceDown = true;
            refs.viewerDropZone.style.cursor = 'grab';
        }
    });

    window.addEventListener('keyup', (e) => {
        if (e.code === 'Space') {
            stateObj.isSpaceDown = false;
            state.isSpaceDown = false;
            state.hasPanned = false; // Reset panning flag on release
            if (!stateObj.isPanning) {
                refs.viewerDropZone.style.cursor = '';
            }
        }
    });

    refs.viewerDropZone.addEventListener("pointerdown", (event) => {
        const textSpan = event.target.closest(".text-content");
        if (textSpan && textSpan.contentEditable === "true") {
            return;
        }

        if (handlePanning(event, stateObj)) return;

        const handle = event.target.closest(".resize-handle");
        let itemEl = event.target.closest(".canvas-item");
        
        if (handle && !itemEl) {
            const selectionBox = event.target.closest(".active-selection-box");
            if (selectionBox) {
                const instanceId = selectionBox.dataset.instanceId;
                itemEl = refs.canvasContainer.querySelector(`.canvas-item[data-instance-id="${instanceId}"]`);
            }
        }
        
        const artboard = refs.canvasContainer.querySelector('.artboard');
        const rect = artboard ? artboard.getBoundingClientRect() : refs.canvasContainer.getBoundingClientRect();
        
        const z = state.projectConfig.zoom || 1;
        const mouseX = (event.clientX - rect.left) / z;
        const mouseY = (event.clientY - rect.top) / z;

        if (handle && itemEl) {
            if (handleResizeStart(event, handle, itemEl, mouseX, mouseY, stateObj)) return;
        } else if (itemEl) {
            if (handleDragStart(event, itemEl, mouseX, mouseY, stateObj)) return;
        } else {
            if (state.activeTool === 'select') {
                if (!event.shiftKey) {
                    setActiveInstance(null);
                    state.selectedInstanceIds = [];
                    renderApp();
                }
                startMarquee(event, mouseX, mouseY, stateObj);
            } else {
                setActiveInstance(null);
                state.selectedInstanceIds = [];
                renderApp();
            }
        }
    });

    window.addEventListener("pointermove", (event) => {
        if (handlePanMove(event, stateObj)) return;

        if (stateObj.draggingItem || (stateObj.draggingItems && stateObj.draggingItems.length > 0) || stateObj.resizingItem || stateObj.isMarquee) {
            const artboard = refs.canvasContainer.querySelector('.artboard');
            const rect = artboard ? artboard.getBoundingClientRect() : refs.canvasContainer.getBoundingClientRect();
            const z = state.projectConfig.zoom || 1;
            const mouseX = (event.clientX - rect.left) / z;
            const mouseY = (event.clientY - rect.top) / z;

            if (stateObj.draggingItem || (stateObj.draggingItems && stateObj.draggingItems.length > 0)) {
                handleDragMove(event, mouseX, mouseY, stateObj);
            } else if (stateObj.resizingItem) {
                handleResizeMove(event, mouseX, mouseY, stateObj);
            } else if (stateObj.isMarquee) {
                moveMarquee(event, mouseX, mouseY, stateObj);
            }
        }
    });

    window.addEventListener("pointerup", (event) => {
        if (handlePanEnd(event, stateObj)) return;
        
        if (stateObj.draggingItem || (stateObj.draggingItems && stateObj.draggingItems.length > 0)) {
            handleDragEnd(stateObj);
        } else if (stateObj.resizingItem) {
            handleResizeEnd(stateObj);
        } else if (stateObj.isMarquee) {
            endMarquee(event, stateObj);
        }
    });

    refs.canvasContainer.addEventListener("wheel", (event) => {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            
            // Normalize zoom steps using Math.sign to avoid sudden huge jumps
            const delta = Math.sign(event.deltaY);
            let zoom = state.projectConfig.zoom || 1;
            
            // Zoom smoothly by 5% per notch
            zoom -= delta * 0.05;
            zoom = Math.max(0.1, Math.min(zoom, 4));
            state.projectConfig.zoom = zoom;
            
            const zoomIndicator = document.getElementById("zoom-indicator");
            const zoomSlider = document.getElementById("zoom-slider");
            if (zoomIndicator) zoomIndicator.textContent = `${Math.round(zoom * 100)}%`;
            if (zoomSlider) zoomSlider.value = zoom;
            
            renderApp();
        } else if (event.shiftKey) {
            event.preventDefault();
            refs.canvasContainer.scrollLeft += event.deltaY;
        }
    }, { passive: false });
}
