import { state } from "./store.js";
import { getTab } from "./tabs.js";
import { pushState } from "../history.js";
import { getDefaultFilters, getDefaultTransform } from "../image-editor.js";
import { renderApp } from "../ui/index.js";

function getCorsBypassUrl(url) {
    if (!url) return url;
    if (url.startsWith('data:') || url.startsWith('blob:')) {
        return url;
    }
    
    // URL-encode path parts to handle characters like '#' and spaces in file names
    let processedUrl = url;
    if (url.startsWith('/') || !url.includes('://')) {
        processedUrl = url.split('/').map(part => {
            if (part && !/%[0-9a-fA-F]{2}/.test(part)) {
                return encodeURIComponent(part);
            }
            return part;
        }).join('/');
    }

    if (processedUrl.startsWith('http') || processedUrl.startsWith('/uploads')) {
        try {
            const urlObj = new URL(processedUrl, window.location.origin);
            urlObj.searchParams.set('cors_bypass', Date.now());
            return urlObj.toString();
        } catch (e) {
            console.error("Error formatting CORS bypass URL:", e);
            return processedUrl;
        }
    }
    return processedUrl;
}

function isVideoTab(tab) {
    if (!tab) return false;
    if (tab.file && tab.file.type && tab.file.type.startsWith("video/")) {
        return true;
    }
    const name = tab.name || "";
    const dotIndex = name.lastIndexOf(".");
    if (dotIndex !== -1) {
        const ext = name.slice(dotIndex + 1).toLowerCase();
        if (["mp4", "webm", "ogg", "mov", "mkv"].includes(ext)) {
            return true;
        }
    }
    const url = tab.localUrl || tab.url;
    if (url) {
        const cleanUrl = url.split('?')[0].toLowerCase();
        return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.ogg') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.mkv');
    }
    return false;
}

export function addTextToCanvas(textVal = "Nhấp đúp để sửa chữ", x = 150, y = 150) {
    pushState();
    const newItem = {
        instanceId: `text-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "text",
        x,
        y,
        width: 250,
        height: 80,
        zIndex: state.canvasItems.length + 1,
        text: textVal,
        color: "#ffffff",
        fontSize: 28,
        fontFamily: "Inter, sans-serif",
        fontWeight: "bold",
        fontStyle: "normal",
        align: "center",
        textShadowColor: "#000000",
        textShadowBlur: 0,
        textShadowOffset: 2,
        textOutlineColor: "#000000",
        textOutlineWidth: 0,
        letterSpacing: 0,
        lineHeight: 1.2,
        highlightColor: "transparent",
        opacity: 100,
        filters: getDefaultFilters(),
        transform: getDefaultTransform()
    };
    state.canvasItems.push(newItem);
    state.activeInstanceId = newItem.instanceId;
    return newItem;
}

export function addShapeToCanvas(shapeType = "rectangle", x = 200, y = 200) {
    pushState();
    const isLine = shapeType === "line";
    const newItem = {
        instanceId: `shape-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "shape",
        shapeType: shapeType,
        x,
        y,
        width: isLine ? 240 : 150,
        height: isLine ? 8 : 150,
        zIndex: state.canvasItems.length + 1,
        fillColor: "#BB86FC",
        strokeColor: "#ffffff",
        strokeWidth: 0,
        cornerRadius: 0,
        opacity: 100,
        filters: getDefaultFilters(),
        transform: getDefaultTransform()
    };
    state.canvasItems.push(newItem);
    state.activeInstanceId = newItem.instanceId;
    return newItem;
}

export function addStickerToCanvas(stickerVal = "❤️", x = 200, y = 200) {
    pushState();
    const newItem = {
        instanceId: `sticker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "sticker",
        x,
        y,
        width: 100,
        height: 100,
        zIndex: state.canvasItems.length + 1,
        sticker: stickerVal,
        opacity: 100,
        filters: getDefaultFilters(),
        transform: getDefaultTransform()
    };
    state.canvasItems.push(newItem);
    state.activeInstanceId = newItem.instanceId;
    return newItem;
}

export function addToCanvas(tabId, x = 100, y = 100) {
    const tab = getTab(tabId);
    if (!tab) return null;

    const newItem = {
        instanceId: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: "image",
        tabId: tab.id,
        x,
        y,
        width: 300,
        height: 200,
        scale: 1,
        zIndex: state.canvasItems.length + 1,
        userResized: false,
        cropEnabled: false,
        crop: null,
        naturalWidth: null,
        naturalHeight: null,
        opacity: 100,
        filters: getDefaultFilters(),
        transform: getDefaultTransform()
    };

    if (isVideoTab(tab)) {
        const video = document.createElement("video");
        video.preload = "metadata";
        video.onloadedmetadata = () => {
            tab.videoDuration = video.duration;
            
            const item = state.canvasItems.find(i => i.instanceId === newItem.instanceId);
            if (item) {
                item.naturalWidth = video.videoWidth;
                item.naturalHeight = video.videoHeight;
            }
            
            if (state.timelineData && state.timelineData.clips) {
                const clip = state.timelineData.clips.find(c => c.id === newItem.instanceId);
                if (clip) {
                    clip.duration = video.duration;
                    const endOffset = (clip.startOffset || 0) + clip.duration;
                    if (endOffset > state.timelineData.totalTime) {
                        state.timelineData.totalTime = endOffset;
                    }
                }
            }

            if (item && !item.userResized && item.width === 300 && item.height === 200) {
                item.width = video.videoWidth;
                item.height = video.videoHeight;
            }
            renderApp();
        };
        video.onerror = () => {};
        video.crossOrigin = "anonymous";
        video.src = tab.localUrl || getCorsBypassUrl(tab.url);
        video.load();
    } else {
        const img = new Image();
        img.crossOrigin = "anonymous";
        img.onload = () => {
            const item = state.canvasItems.find(i => i.instanceId === newItem.instanceId);
            if (item) {
                item.naturalWidth = img.width;
                item.naturalHeight = img.height;
            }
            if (item && !item.userResized && item.width === 300 && item.height === 200) {
                item.width = img.width;
                item.height = img.height;
                renderApp();
            }
        };
        img.onerror = () => {};
        img.src = tab.localUrl || getCorsBypassUrl(tab.url);
    }

    state.canvasItems.push(newItem);
    state.activeInstanceId = newItem.instanceId;
    return newItem;
}

export function duplicateCanvasItem(instanceId) {
    const item = state.canvasItems.find(i => i.instanceId === instanceId);
    if (!item) return null;
    pushState();

    const prefix = (item.type || "item");
    const newId = `${prefix}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Plain-data items → safe to deep clone via JSON (no functions/DOM refs stored)
    const clone = JSON.parse(JSON.stringify(item));
    clone.instanceId = newId;
    clone.x = (item.x || 0) + 20;
    clone.y = (item.y || 0) + 20;
    clone.zIndex = state.canvasItems.length + 1;
    state.canvasItems.push(clone);

    // If this item is bound to a timeline clip (VIDEO projects), clone the clip too
    if (state.timelineData && state.timelineData.clips) {
        const clip = state.timelineData.clips.find(c => c.id === instanceId);
        if (clip) {
            const clipClone = JSON.parse(JSON.stringify(clip));
            clipClone.id = newId;
            clipClone.startOffset = (clip.startOffset || 0) + (clip.duration || 0);
            state.timelineData.clips.push(clipClone);
            import("../timeline/sync.js").then(m => m.recalculateTotalTime()).catch(e => console.error(e));
        }
    }

    state.activeInstanceId = newId;
    return clone;
}

export function setActiveInstance(instanceId) {
    state.activeInstanceId = instanceId;
}

export function updateCanvasItem(instanceId, updates, saveToHistory = false) {
    if (saveToHistory) {
        pushState();
    }
    const item = state.canvasItems.find(i => i.instanceId === instanceId);
    if (item) {
        if ('width' in updates || 'height' in updates) {
            item.userResized = true;
        }
        
        if (updates.filters) {
            Object.assign(item.filters, updates.filters);
            delete updates.filters;
        }
        if (updates.transform) {
            Object.assign(item.transform, updates.transform);
            delete updates.transform;
        }

        Object.assign(item, updates);
    }
}

export function removeFromCanvas(instanceId) {
    pushState();
    state.canvasItems = state.canvasItems.filter(i => i.instanceId !== instanceId);
    if (state.timelineData && state.timelineData.clips) {
        state.timelineData.clips = state.timelineData.clips.filter(c => c.id !== instanceId);
        import("../timeline/sync.js").then(m => m.recalculateTotalTime()).catch(e => console.error(e));
    }
    if (state.activeInstanceId === instanceId) {
        state.activeInstanceId = null;
    }
}

export function bringToFront(instanceId) {
    const item = state.canvasItems.find(i => i.instanceId === instanceId);
    if (item) {
        const maxZ = Math.max(0, ...state.canvasItems.map(i => i.zIndex));
        item.zIndex = maxZ + 1;
    }
}

export function sendToBack(instanceId) {
    const item = state.canvasItems.find(i => i.instanceId === instanceId);
    if (item) {
        const minZ = Math.min(...state.canvasItems.map(i => i.zIndex));
        item.zIndex = minZ - 1;
    }
}

export function bringForward(instanceId) {
    const item = state.canvasItems.find(i => i.instanceId === instanceId);
    if (item) {
        let nextItem = null;
        let nextZ = Infinity;
        state.canvasItems.forEach(i => {
            if (i.zIndex > item.zIndex && i.zIndex < nextZ) {
                nextZ = i.zIndex;
                nextItem = i;
            }
        });
        if (nextItem) {
            const temp = item.zIndex;
            item.zIndex = nextItem.zIndex;
            nextItem.zIndex = temp;
        } else {
            item.zIndex += 1;
        }
    }
}

export function sendBackward(instanceId) {
    const item = state.canvasItems.find(i => i.instanceId === instanceId);
    if (item) {
        let prevItem = null;
        let prevZ = -Infinity;
        state.canvasItems.forEach(i => {
            if (i.zIndex < item.zIndex && i.zIndex > prevZ) {
                prevZ = i.zIndex;
                prevItem = i;
            }
        });
        if (prevItem) {
            const temp = item.zIndex;
            item.zIndex = prevItem.zIndex;
            prevItem.zIndex = temp;
        } else {
            item.zIndex -= 1;
        }
    }
}
