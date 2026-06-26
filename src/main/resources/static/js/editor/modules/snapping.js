import { state } from "./state.js";

const SNAP_THRESHOLD_PX = 6;

/**
 * Calculates snapped coordinates and active guide lines when dragging an element.
 */
export function getSnappingAndGuides(activeId, x, y, w, h, z) {
    const threshold = SNAP_THRESHOLD_PX / z;

    const vTargets = [];
    const hTargets = [];

    // 1. Collect artboard alignment targets
    const artboardW = state.projectConfig.width;
    const artboardH = state.projectConfig.height;

    vTargets.push(0);
    vTargets.push(artboardW / 2);
    vTargets.push(artboardW);

    hTargets.push(0);
    hTargets.push(artboardH / 2);
    hTargets.push(artboardH);

    // 2. Collect other items alignment targets
    state.canvasItems.forEach(item => {
        if (item.instanceId === activeId) return;

        vTargets.push(item.x);
        vTargets.push(item.x + item.width / 2);
        vTargets.push(item.x + item.width);

        hTargets.push(item.y);
        hTargets.push(item.y + item.height / 2);
        hTargets.push(item.y + item.height);
    });

    let snappedX = x;
    let snappedY = y;

    let snappedVGuides = [];
    let snappedHGuides = [];

    // Find best vertical line alignment (snaps X)
    const xPositions = [
        { val: x, edge: 'left', offset: 0 },
        { val: x + w / 2, edge: 'center', offset: -w / 2 },
        { val: x + w, edge: 'right', offset: -w }
    ];

    let bestVDiff = threshold;
    let bestVSnap = null;

    for (const pos of xPositions) {
        for (const target of vTargets) {
            const diff = Math.abs(pos.val - target);
            if (diff < bestVDiff) {
                bestVDiff = diff;
                bestVSnap = { target, offset: pos.offset };
            }
        }
    }

    if (bestVSnap) {
        snappedX = bestVSnap.target + bestVSnap.offset;
        const left = snappedX;
        const center = snappedX + w / 2;
        const right = snappedX + w;

        vTargets.forEach(target => {
            if (Math.abs(left - target) < 0.1 || Math.abs(center - target) < 0.1 || Math.abs(right - target) < 0.1) {
                if (!snappedVGuides.includes(target)) {
                    snappedVGuides.push(target);
                }
            }
        });
    }

    // Find best horizontal line alignment (snaps Y)
    const yPositions = [
        { val: y, edge: 'top', offset: 0 },
        { val: y + h / 2, edge: 'center', offset: -h / 2 },
        { val: y + h, edge: 'bottom', offset: -h }
    ];

    let bestHDiff = threshold;
    let bestHSnap = null;

    for (const pos of yPositions) {
        for (const target of hTargets) {
            const diff = Math.abs(pos.val - target);
            if (diff < bestHDiff) {
                bestHDiff = diff;
                bestHSnap = { target, offset: pos.offset };
            }
        }
    }

    if (bestHSnap) {
        snappedY = bestHSnap.target + bestHSnap.offset;
        const top = snappedY;
        const center = snappedY + h / 2;
        const bottom = snappedY + h;

        hTargets.forEach(target => {
            if (Math.abs(top - target) < 0.1 || Math.abs(center - target) < 0.1 || Math.abs(bottom - target) < 0.1) {
                if (!snappedHGuides.includes(target)) {
                    snappedHGuides.push(target);
                }
            }
        });
    }

    return {
        x: snappedX,
        y: snappedY,
        guides: {
            v: snappedVGuides,
            h: snappedHGuides
        }
    };
}

/**
 * Calculates snapped dimensions and active guide lines when resizing an element.
 */
export function getResizeSnappingAndGuides(activeId, handle, newX, newY, newW, newH, startRect, z) {
    const threshold = SNAP_THRESHOLD_PX / z;
    const isCorner = ["nw", "ne", "sw", "se"].includes(handle);
    const ratio = startRect.w / startRect.h;

    const vTargets = [];
    const hTargets = [];

    // Canvas targets
    const artboardW = state.projectConfig.width;
    const artboardH = state.projectConfig.height;
    vTargets.push(0, artboardW / 2, artboardW);
    hTargets.push(0, artboardH / 2, artboardH);

    // Other items
    state.canvasItems.forEach(item => {
        if (item.instanceId === activeId) return;
        vTargets.push(item.x, item.x + item.width / 2, item.x + item.width);
        hTargets.push(item.y, item.y + item.height / 2, item.y + item.height);
    });

    let snappedX = newX;
    let snappedY = newY;
    let snappedW = newW;
    let snappedH = newH;

    let snappedVGuides = [];
    let snappedHGuides = [];

    function checkVSnap(proposedX, proposedW, side) {
        const edgeVal = side === 'left' ? proposedX : proposedX + proposedW;
        let bestTarget = null;
        let bestDiff = threshold;

        for (const target of vTargets) {
            const diff = Math.abs(edgeVal - target);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestTarget = target;
            }
        }
        return bestTarget;
    }

    function checkHSnap(proposedY, proposedH, side) {
        const edgeVal = side === 'top' ? proposedY : proposedY + proposedH;
        let bestTarget = null;
        let bestDiff = threshold;

        for (const target of hTargets) {
            const diff = Math.abs(edgeVal - target);
            if (diff < bestDiff) {
                bestDiff = diff;
                bestTarget = target;
            }
        }
        return bestTarget;
    }

    if (isCorner) {
        let vSnapTarget = null;
        let hSnapTarget = null;

        if (handle.includes('w')) {
            vSnapTarget = checkVSnap(newX, newW, 'left');
        } else if (handle.includes('e')) {
            vSnapTarget = checkVSnap(newX, newW, 'right');
        }

        if (handle.includes('n')) {
            hSnapTarget = checkHSnap(newY, newH, 'top');
        } else if (handle.includes('s')) {
            hSnapTarget = checkHSnap(newY, newH, 'bottom');
        }

        let useVSnap = false;
        let useHSnap = false;

        if (vSnapTarget !== null && hSnapTarget !== null) {
            const vEdge = handle.includes('w') ? newX : newX + newW;
            const hEdge = handle.includes('n') ? newY : newY + newH;
            const vDiff = Math.abs(vEdge - vSnapTarget);
            const hDiff = Math.abs(hEdge - hSnapTarget);
            if (vDiff < hDiff) {
                useVSnap = true;
            } else {
                useHSnap = true;
            }
        } else if (vSnapTarget !== null) {
            useVSnap = true;
        } else if (hSnapTarget !== null) {
            useHSnap = true;
        }

        if (useVSnap) {
            if (handle.includes('e')) {
                snappedW = vSnapTarget - newX;
                snappedH = snappedW / ratio;
            } else {
                const deltaX = vSnapTarget - newX;
                snappedW = newW - deltaX;
                snappedH = snappedW / ratio;
                snappedX = vSnapTarget;
            }

            if (handle.includes('n')) {
                snappedY = startRect.y + (startRect.h - snappedH);
            }

            snappedVGuides.push(vSnapTarget);
        } else if (useHSnap) {
            if (handle.includes('s')) {
                snappedH = hSnapTarget - newY;
                snappedW = snappedH * ratio;
            } else {
                const deltaY = hSnapTarget - newY;
                snappedH = newH - deltaY;
                snappedW = snappedH * ratio;
                snappedY = hSnapTarget;
            }

            if (handle.includes('w')) {
                snappedX = startRect.x + (startRect.w - snappedW);
            }

            snappedHGuides.push(hSnapTarget);
        }
    } else {
        if (handle.includes('e')) {
            const vTarget = checkVSnap(newX, newW, 'right');
            if (vTarget !== null) {
                snappedW = vTarget - newX;
                snappedVGuides.push(vTarget);
            }
        }
        if (handle.includes('w')) {
            const vTarget = checkVSnap(newX, newW, 'left');
            if (vTarget !== null) {
                const deltaX = vTarget - newX;
                snappedW = newW - deltaX;
                snappedX = vTarget;
                snappedVGuides.push(vTarget);
            }
        }
        if (handle.includes('s')) {
            const hTarget = checkHSnap(newY, newH, 'bottom');
            if (hTarget !== null) {
                snappedH = hTarget - newY;
                snappedHGuides.push(hTarget);
            }
        }
        if (handle.includes('n')) {
            const hTarget = checkHSnap(newY, newH, 'top');
            if (hTarget !== null) {
                const deltaY = hTarget - newY;
                snappedH = newH - deltaY;
                snappedY = hTarget;
                snappedHGuides.push(hTarget);
            }
        }
    }

    return {
        x: snappedX,
        y: snappedY,
        width: snappedW,
        height: snappedH,
        guides: {
            v: snappedVGuides,
            h: snappedHGuides
        }
    };
}

/**
 * Draws guide lines inside the smart-guides-container element.
 */
export function drawSmartGuides(guides) {
    const artboard = document.querySelector(".artboard");
    if (!artboard) return;

    let guidesContainer = artboard.querySelector(".smart-guides-container");
    if (!guidesContainer) {
        guidesContainer = document.createElement("div");
        guidesContainer.className = "smart-guides-container";
        artboard.appendChild(guidesContainer);
    }

    guidesContainer.innerHTML = "";

    // Draw vertical guides
    if (guides.v && guides.v.length > 0) {
        guides.v.forEach(x => {
            const line = document.createElement("div");
            line.className = "smart-guide-line vertical";
            line.style.left = `${x}px`;
            guidesContainer.appendChild(line);
        });
    }

    // Draw horizontal guides
    if (guides.h && guides.h.length > 0) {
        guides.h.forEach(y => {
            const line = document.createElement("div");
            line.className = "smart-guide-line horizontal";
            line.style.top = `${y}px`;
            guidesContainer.appendChild(line);
        });
    }
}

/**
 * Clears guide lines.
 */
export function clearSmartGuides() {
    const container = document.querySelector(".smart-guides-container");
    if (container) {
        container.innerHTML = "";
    }
}
