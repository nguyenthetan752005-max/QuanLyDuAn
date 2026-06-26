const MIN_LEFT_WIDTH = 240;
const MAX_LEFT_WIDTH = 640;
const MIN_RIGHT_WIDTH = 260;
const MAX_RIGHT_WIDTH = 720;
const MIN_CENTER_WIDTH = 360;

export function setupSplitters() {
    const workspace = document.querySelector(".workspace");
    if (!workspace) {
        return;
    }

    document.querySelectorAll("[data-resize-handle]").forEach((handle) => {
        handle.addEventListener("pointerdown", (event) => {
            event.preventDefault();
            const side = handle.dataset.resizeHandle;
            const startX = event.clientX;
            const startLeft = getPanelWidth(workspace, "--left-panel-width", 392);
            const startRight = getPanelWidth(workspace, "--right-panel-width", 470);

            handle.classList.add("is-dragging");
            handle.setPointerCapture(event.pointerId);

            const onMove = (moveEvent) => {
                const delta = moveEvent.clientX - startX;
                const available = workspace.clientWidth - 12;
                if (side === "left") {
                    const maxLeft = Math.min(MAX_LEFT_WIDTH, available - startRight - MIN_CENTER_WIDTH);
                    setPanelWidth(workspace, "--left-panel-width", clamp(startLeft + delta, MIN_LEFT_WIDTH, maxLeft));
                    return;
                }

                const maxRight = Math.min(MAX_RIGHT_WIDTH, available - startLeft - MIN_CENTER_WIDTH);
                setPanelWidth(workspace, "--right-panel-width", clamp(startRight - delta, MIN_RIGHT_WIDTH, maxRight));
            };

            const onUp = () => {
                handle.classList.remove("is-dragging");
                handle.removeEventListener("pointermove", onMove);
                handle.removeEventListener("pointerup", onUp);
                handle.removeEventListener("pointercancel", onUp);
            };

            handle.addEventListener("pointermove", onMove);
            handle.addEventListener("pointerup", onUp);
            handle.addEventListener("pointercancel", onUp);
        });
    });
}

function getPanelWidth(element, propertyName, fallback) {
    const value = getComputedStyle(element).getPropertyValue(propertyName).trim();
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : fallback;
}

function setPanelWidth(element, propertyName, width) {
    element.style.setProperty(propertyName, `${Math.round(width)}px`);
}

function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
}
