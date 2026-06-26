import { state } from "../../modules/state.js";
import { renderApp } from "../../modules/ui/index.js";

let marqueeEl = null;

export function startMarquee(event, mouseX, mouseY, stateObj) {
    stateObj.isMarquee = true;
    stateObj.marqueeStart = { x: mouseX, y: mouseY };
    
    marqueeEl = document.createElement("div");
    marqueeEl.className = "marquee-selection-box";
    marqueeEl.style.position = "absolute";
    marqueeEl.style.border = "1px solid var(--active)";
    marqueeEl.style.backgroundColor = "rgba(61, 123, 253, 0.2)";
    marqueeEl.style.pointerEvents = "none";
    marqueeEl.style.zIndex = "9999";
    
    // Append to scaler so it follows zoom naturally
    const scaler = stateObj.refs.canvasContainer.querySelector(".artboard-scaler");
    if (scaler) {
        scaler.appendChild(marqueeEl);
    }
}

export function moveMarquee(event, mouseX, mouseY, stateObj) {
    if (!stateObj.isMarquee || !marqueeEl) return;
    
    const startX = stateObj.marqueeStart.x;
    const startY = stateObj.marqueeStart.y;
    
    const x = Math.min(startX, mouseX);
    const y = Math.min(startY, mouseY);
    const width = Math.abs(mouseX - startX);
    const height = Math.abs(mouseY - startY);
    
    marqueeEl.style.left = `${x}px`;
    marqueeEl.style.top = `${y}px`;
    marqueeEl.style.width = `${width}px`;
    marqueeEl.style.height = `${height}px`;
}

export function endMarquee(event, stateObj) {
    if (!stateObj.isMarquee) return;
    stateObj.isMarquee = false;
    
    if (marqueeEl) {
        marqueeEl.remove();
        marqueeEl = null;
    }
    
    // Determine the bounding box of the marquee
    const startX = stateObj.marqueeStart.x;
    const startY = stateObj.marqueeStart.y;
    const endX = parseFloat(marqueeEl ? marqueeEl.style.left : startX) + parseFloat(marqueeEl ? marqueeEl.style.width : 0);
    const endY = parseFloat(marqueeEl ? marqueeEl.style.top : startY) + parseFloat(marqueeEl ? marqueeEl.style.height : 0);
    
    const x1 = Math.min(startX, endX);
    const y1 = Math.min(startY, endY);
    const x2 = Math.max(startX, endX);
    const y2 = Math.max(startY, endY);
    
    if (x2 - x1 < 5 && y2 - y1 < 5) return; // Too small, just a click
    
    // Find intersecting items
    const selected = [];
    state.canvasItems.forEach(item => {
        const itemX2 = item.x + item.width;
        const itemY2 = item.y + item.height;
        
        // AABB Intersection check
        if (item.x < x2 && itemX2 > x1 && item.y < y2 && itemY2 > y1) {
            selected.push(item.instanceId);
        }
    });
    
    if (selected.length > 0) {
        if (!state.selectedInstanceIds) state.selectedInstanceIds = [];
        
        // If shift key was held, toggle/add to selection
        if (event.shiftKey) {
            selected.forEach(id => {
                if (!state.selectedInstanceIds.includes(id)) {
                    state.selectedInstanceIds.push(id);
                }
            });
        } else {
            state.selectedInstanceIds = selected;
        }
        
        state.activeInstanceId = state.selectedInstanceIds[state.selectedInstanceIds.length - 1];
    } else if (!event.shiftKey) {
        state.selectedInstanceIds = [];
        state.activeInstanceId = null;
    }
    
    renderApp();
}
