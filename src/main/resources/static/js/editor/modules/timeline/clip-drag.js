import { state } from "../state.js";
import { renderApp } from "../ui/index.js";
import { pushState } from "../history.js";

let dragState = null;

function onMouseMove(e) {
    if (!dragState) return;

    const dx = e.clientX - dragState.startX;
    if (Math.abs(dx) < 2 && !dragState.hasMoved) return;

    dragState.hasMoved = true;
    const pxPerSecond = state.timelineData?.zoom || 50;
    const deltaTime = dx / pxPerSecond;
    let newOffset = dragState.startOffset + deltaTime;
    if (newOffset < 0) newOffset = 0;

    dragState.clip.startOffset = newOffset;
    dragState.clipEl.style.left = `${newOffset * pxPerSecond}px`;

    // Optional: detect lane hover for visual feedback
    const el = document.elementFromPoint(e.clientX, e.clientY);
    if (el) {
        const lane = el.closest(".timeline-lane");
        document.querySelectorAll(".timeline-lane").forEach(l => l.classList.remove("drag-over"));
        if (lane && lane.dataset.trackId && lane.dataset.trackId !== dragState.originalTrackId) {
            lane.classList.add("drag-over");
        }
    }
}

function onMouseUp(e) {
    if (!dragState) return;

    if (dragState.hasMoved) {
        const pxPerSecond = state.timelineData?.zoom || 50;

        // Check if dropped on a different lane
        const el = document.elementFromPoint(e.clientX, e.clientY);
        if (el) {
            const lane = el.closest(".timeline-lane");
            if (lane && lane.dataset.trackId) {
                const newTrackId = lane.dataset.trackId;
                if (newTrackId !== dragState.originalTrackId) {
                    dragState.clip.trackId = newTrackId;
                    // Recalculate offset relative to new lane
                    const rect = lane.getBoundingClientRect();
                    const x = e.clientX - rect.left;
                    dragState.clip.startOffset = Math.max(0, x / pxPerSecond);
                }
            }
        }

        document.querySelectorAll(".timeline-lane").forEach(l => l.classList.remove("drag-over"));
        pushState();
        renderApp();
    }

    dragState = null;
}

window.addEventListener("mousemove", onMouseMove);
window.addEventListener("mouseup", onMouseUp);

export function initClipDrag(clipEl, clip) {
    clipEl.addEventListener("mousedown", (e) => {
        if (e.target.classList.contains("timeline-clip-handle")) return;
        e.preventDefault();

        dragState = {
            clip,
            clipEl,
            originalTrackId: clip.trackId,
            startX: e.clientX,
            startOffset: clip.startOffset,
            hasMoved: false
        };
    });
}
