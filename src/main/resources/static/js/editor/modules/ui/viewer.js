import { refs } from "../dom.js";
import { getTab, state, updateCanvasItem } from "../state.js";
import { pushState } from "../history.js";
import { renderApp } from "./index.js";
import { getFilterCSSString } from "../image-editor.js";

let isDrawing = false;
let lastX = 0;
let lastY = 0;

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
    if (tab.url) {
        const cleanUrl = tab.url.split('?')[0].toLowerCase();
        return cleanUrl.endsWith('.mp4') || cleanUrl.endsWith('.webm') || cleanUrl.endsWith('.ogg') || cleanUrl.endsWith('.mov') || cleanUrl.endsWith('.mkv');
    }
    return false;
}
function isAudioTab(tab) {
    if (!tab) return false;
    if (tab.file && tab.file.type && tab.file.type.startsWith("audio/")) {
        return true;
    }
    const name = tab.name || "";
    const dotIndex = name.lastIndexOf(".");
    if (dotIndex !== -1) {
        const ext = name.slice(dotIndex + 1).toLowerCase();
        if (["mp3", "wav", "ogg", "aac", "flac", "m4a"].includes(ext)) {
            return true;
        }
    }
    if (tab.url) {
        const cleanUrl = tab.url.split('?')[0].toLowerCase();
        return cleanUrl.endsWith('.mp3') || cleanUrl.endsWith('.wav') || cleanUrl.endsWith('.ogg') || cleanUrl.endsWith('.aac') || cleanUrl.endsWith('.flac') || cleanUrl.endsWith('.m4a');
    }
    return false;
}
export function setupPaintDrawing(canvas) {
    const getCoordinates = (e) => {
        const rect = canvas.getBoundingClientRect();
        const x = (e.clientX - rect.left) * (canvas.width / rect.width);
        const y = (e.clientY - rect.top) * (canvas.height / rect.height);
        return { x, y };
    };

    const startDrawing = (e) => {
        if (state.activeTool !== 'paint') return;
        isDrawing = true;
        
        pushState(); // Save state for undo/redo before drawing stroke
        
        const coords = getCoordinates(e);
        lastX = coords.x;
        lastY = coords.y;
        
        draw(e);
    };

    const draw = (e) => {
        if (!isDrawing || state.activeTool !== 'paint') return;
        
        const coords = getCoordinates(e);
        const ctx = canvas.getContext("2d");
        
        const colorInput = document.getElementById("brush-color");
        const sizeInput = document.getElementById("brush-size");
        const isEraser = document.getElementById("tool-eraser")?.classList.contains("active");
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(coords.x, coords.y);
        
        ctx.lineWidth = sizeInput ? parseInt(sizeInput.value) : 5;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        
        if (isEraser) {
            ctx.globalCompositeOperation = "destination-out";
            ctx.lineWidth = (sizeInput ? parseInt(sizeInput.value) : 5) * 1.5;
        } else {
            ctx.globalCompositeOperation = "source-over";
            ctx.strokeStyle = colorInput ? colorInput.value : "#6b46c1";
        }
        
        ctx.stroke();
        
        lastX = coords.x;
        lastY = coords.y;
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        isDrawing = false;
        
        state.projectConfig.paintData = canvas.toDataURL();
        
        if (window.triggerAutosave) {
            window.triggerAutosave();
        }
    };

    canvas.addEventListener("pointerdown", startDrawing);
    canvas.addEventListener("pointermove", draw);
    canvas.addEventListener("pointerup", stopDrawing);
    canvas.addEventListener("pointerleave", stopDrawing);
}

function renderCanvasRuler(z, wrapper) {
    const topCanvas = document.getElementById("canvas-ruler-top");
    const leftCanvas = document.getElementById("canvas-ruler-left");
    if (!topCanvas || !leftCanvas) return;

    // Update dimensions to match drop zone exactly
    const rect = document.getElementById("viewer-drop-zone").getBoundingClientRect();
    topCanvas.width = rect.width - 24;
    leftCanvas.height = rect.height - 24;

    const ctxTop = topCanvas.getContext("2d");
    const ctxLeft = leftCanvas.getContext("2d");

    ctxTop.clearRect(0, 0, topCanvas.width, topCanvas.height);
    ctxLeft.clearRect(0, 0, leftCanvas.width, leftCanvas.height);

    ctxTop.fillStyle = "#a1a1aa"; // text-muted
    ctxTop.font = "10px sans-serif";
    ctxLeft.fillStyle = "#a1a1aa";
    ctxLeft.font = "10px sans-serif";
    ctxLeft.textBaseline = "middle";

    // Determine the scroll offset from the wrapper
    const scrollX = wrapper ? wrapper.scrollLeft : 0;
    const scrollY = wrapper ? wrapper.scrollTop : 0;
    
    // The artboard might be centered or offset inside the wrapper
    // We calculate the offset by looking at the artboard's bounding rect vs wrapper
    let offsetX = 0;
    let offsetY = 0;
    if (wrapper) {
        const artboard = wrapper.querySelector('.artboard');
        if (artboard) {
            const abRect = artboard.getBoundingClientRect();
            const wpRect = wrapper.getBoundingClientRect();
            offsetX = abRect.left - wpRect.left;
            offsetY = abRect.top - wpRect.top;
        }
    }

    const step = 50 * z; // 50px at 1x zoom
    
    // Draw Top Ruler
    for (let x = 0; x < topCanvas.width; x += 10) {
        const realX = (x + scrollX - offsetX) / z;
        ctxTop.beginPath();
        if (Math.abs(realX % 50) < 5) { // Major tick
            ctxTop.moveTo(x, 0);
            ctxTop.lineTo(x, 24);
            ctxTop.fillText(Math.round(realX), x + 2, 12);
        } else if (Math.abs(realX % 10) < 2) { // Minor tick
            ctxTop.moveTo(x, 16);
            ctxTop.lineTo(x, 24);
        }
        ctxTop.strokeStyle = "rgba(255,255,255,0.2)";
        ctxTop.stroke();
    }

    // Draw Left Ruler
    for (let y = 0; y < leftCanvas.height; y += 10) {
        const realY = (y + scrollY - offsetY) / z;
        ctxLeft.beginPath();
        if (Math.abs(realY % 50) < 5) { // Major tick
            ctxLeft.moveTo(0, y);
            ctxLeft.lineTo(24, y);
            
            ctxLeft.save();
            ctxLeft.translate(12, y + 2);
            ctxLeft.rotate(-Math.PI / 2);
            ctxLeft.fillText(Math.round(realY), 0, 0);
            ctxLeft.restore();
            
        } else if (Math.abs(realY % 10) < 2) { // Minor tick
            ctxLeft.moveTo(16, y);
            ctxLeft.lineTo(24, y);
        }
        ctxLeft.strokeStyle = "rgba(255,255,255,0.2)";
        ctxLeft.stroke();
    }
}

export function renderViewer() {
    let artboardWrapper = refs.canvasContainer.querySelector('.artboard-wrapper');
    let artboardScaler = refs.canvasContainer.querySelector('.artboard-scaler');
    let artboard = refs.canvasContainer.querySelector('.artboard');
    
    if (!artboardWrapper) {
        artboardWrapper = document.createElement("div");
        artboardWrapper.className = "artboard-wrapper";
        
        artboardScaler = document.createElement("div");
        artboardScaler.className = "artboard-scaler";
        
        artboard = document.createElement("div");
        artboard.className = "artboard";
        
        artboardScaler.appendChild(artboard);
        artboardWrapper.appendChild(artboardScaler);
        refs.canvasContainer.appendChild(artboardWrapper);
    }
    
    const z = state.projectConfig.zoom || 1;

    // Use wrapper size to force scrollbars for the scaled artboard
    artboardWrapper.style.transform = '';
    artboardWrapper.style.width = `max(100%, ${state.projectConfig.width * z + 80}px)`;
    artboardWrapper.style.height = `max(100%, ${state.projectConfig.height * z + 80}px)`;
    
    // Position scaler as relative and size it to the scaled dimensions
    artboardScaler.style.width = `${state.projectConfig.width * z}px`;
    artboardScaler.style.height = `${state.projectConfig.height * z}px`;
    
    // Scale artboard inside the scaler from top left
    artboard.style.width = `${state.projectConfig.width}px`;
    artboard.style.height = `${state.projectConfig.height}px`;
    artboard.style.backgroundColor = state.projectConfig.background;
    artboard.style.transform = `scale(${z})`;
    artboard.style.setProperty('--zoom', z);

    // Ensure guides container exists
    let guidesContainer = artboard.querySelector(".smart-guides-container");
    if (!guidesContainer) {
        guidesContainer = document.createElement("div");
        guidesContainer.className = "smart-guides-container";
        artboard.appendChild(guidesContainer);
    }

    // Xóa các phần tử không còn trong state
    const currentInstanceIds = new Set(state.canvasItems.map(item => item.instanceId));
    const renderedItems = artboard.querySelectorAll(".canvas-item");
    renderedItems.forEach(el => {
        if (!currentInstanceIds.has(el.dataset.instanceId)) {
            el.remove();
        }
    });

    // Render hoặc cập nhật
    state.canvasItems.forEach(item => {
        let el = artboard.querySelector(`[data-instance-id="${item.instanceId}"]`);
        if (!el) {
            el = document.createElement("div");
            el.className = "canvas-item";
            el.dataset.instanceId = item.instanceId;



            if (item.type === 'text') {
                const textSpan = document.createElement("div");
                textSpan.className = "text-content";
                textSpan.style.pointerEvents = "none";
                textSpan.contentEditable = "false";
                el.appendChild(textSpan);

                el.addEventListener("dblclick", (e) => {
                    textSpan.contentEditable = "true";
                    textSpan.style.pointerEvents = "auto";
                    textSpan.style.userSelect = "text";
                    textSpan.focus();
                    setTimeout(() => {
                        document.execCommand('selectAll', false, null);
                    }, 0);
                    e.stopPropagation();
                });
                textSpan.addEventListener("blur", () => {
                    textSpan.contentEditable = "false";
                    textSpan.style.pointerEvents = "none";
                    textSpan.style.userSelect = "none";
                    if (item.text !== textSpan.textContent) {
                        updateCanvasItem(item.instanceId, { text: textSpan.textContent }, true);
                        renderApp();
                    }
                });
                textSpan.addEventListener("keydown", (e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                        textSpan.blur();
                    }
                });
            } else if (item.type === 'shape') {
                const shapeDiv = document.createElement("div");
                shapeDiv.className = "shape-content";
                el.appendChild(shapeDiv);
            } else if (item.type === 'sticker') {
                const stickerDiv = document.createElement("div");
                stickerDiv.className = "sticker-content";
                el.appendChild(stickerDiv);
            } else {
                const tab = getTab(item.tabId);
                if (!tab) return;

                const isVideo = isVideoTab(tab);
                const isAudio = isAudioTab(tab);
                if (isVideo) {
                    const videoWrapper = document.createElement("div");
                    videoWrapper.className = "image-wrapper video-wrapper";

                    const video = document.createElement("video");
                    video.preload = "auto";
                    video.crossOrigin = "anonymous";
                    video.src = tab.localUrl || getCorsBypassUrl(tab.url);
                    video.muted = false;
                    video.loop = true;
                    video.playsInline = true;
                    video.draggable = false;
                    videoWrapper.appendChild(video);
                    el.appendChild(videoWrapper);
                    video.load();
                } else if (isAudio) {
                    const audioWrapper = document.createElement("div");
                    audioWrapper.className = "audio-wrapper";

                    const audio = document.createElement("audio");
                    audio.preload = "auto";
                    audio.crossOrigin = "anonymous";
                    audio.src = tab.localUrl || getCorsBypassUrl(tab.url);
                    audio.muted = false;
                    audio.loop = true;
                    audioWrapper.appendChild(audio);
                    el.appendChild(audioWrapper);
                    audio.load();
                } else {
                    const imgWrapper = document.createElement("div");
                    imgWrapper.className = "image-wrapper";

                    const img = document.createElement("img");
                    img.crossOrigin = "anonymous";
                    img.src = tab.localUrl || getCorsBypassUrl(tab.url);
                    img.alt = tab.name;
                    img.draggable = false;
                    imgWrapper.appendChild(img);
                    el.appendChild(imgWrapper);
                }
            }



            artboard.appendChild(el);
        }

        el.classList.toggle("is-active", item.instanceId === state.activeInstanceId);

        // Hide item if timeline says it is out of range or track is hidden
        let isHiddenByTimeline = false;
        if (state.projectType === 'VIDEO' && state.timelineData && state.timelineData.clips) {
            const clip = state.timelineData.clips.find(c => c.id === item.instanceId);
            if (clip) {
                const t = state.timelineData.currentTime || 0;
                const start = clip.startOffset || 0;
                const end = start + (clip.duration || 5.0);
                const track = state.timelineData.tracks.find(tr => tr.id === clip.trackId);
                if (t < start || t > end || (track && track.hidden)) {
                    isHiddenByTimeline = true;
                }
            }
        }

        const itemTab = item.tabId ? getTab(item.tabId) : null;
        const isAudio = itemTab ? isAudioTab(itemTab) : false;

        const layerOpacity = (item.opacity === undefined || item.opacity === null) ? 1 : item.opacity / 100;
        if (isHiddenByTimeline) {
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
            if (state.activeInstanceId === item.instanceId) {
                state.activeInstanceId = null;
            }
        } else if (item.hidden) {
            // Manually hidden via the Layers panel (stays selectable from the panel)
            el.style.opacity = "0";
            el.style.pointerEvents = "none";
        } else {
            el.style.opacity = String(layerOpacity);
            el.style.pointerEvents = "";
        }

        // Dùng transform để đồng bộ với app.js
        // Compute zIndex dynamically from timeline track order if video project
        let zIndex = item.zIndex;
        if (state.projectType === 'VIDEO' && state.timelineData && state.timelineData.tracks && state.timelineData.clips) {
            const clip = state.timelineData.clips.find(c => c.id === item.instanceId);
            if (clip) {
                const trackIndex = state.timelineData.tracks.findIndex(t => t.id === clip.trackId);
                if (trackIndex !== -1) {
                    zIndex = state.timelineData.tracks.length - trackIndex;
                }
            }
        }

        if (isAudio) {
            el.classList.add("canvas-item-audio");
        } else {
            el.classList.remove("canvas-item-audio");
            el.style.width = `${item.width}px`;
            el.style.height = `${item.height}px`;
            el.style.zIndex = zIndex;
            el.style.left = "";
            el.style.top = "";
            const rot = (item.transform && item.transform.rotate) ? item.transform.rotate : 0;
            el.style.transform = `translate(${item.x}px, ${item.y}px) rotate(${rot}deg)`;
        }
        


        // Apply filters/transforms based on type
        if (item.type === 'text') {
            const textSpan = el.querySelector(".text-content");
            if (textSpan) {
                if (textSpan.contentEditable !== "true") {
                    textSpan.textContent = item.text;
                }
                textSpan.style.color = item.color || "#ffffff";
                textSpan.style.fontSize = `${item.fontSize || 28}px`;
                textSpan.style.fontFamily = item.fontFamily || "sans-serif";
                textSpan.style.fontWeight = item.fontWeight || "normal";
                textSpan.style.fontStyle = item.fontStyle || "normal";
                textSpan.style.textAlign = item.align || "center";
                
                // Shadow
                const shadowBlur = item.textShadowBlur || 0;
                const shadowOffset = item.textShadowOffset || 2;
                const shadowColor = item.textShadowColor || "#000000";
                textSpan.style.textShadow = shadowBlur > 0 ? `${shadowOffset}px ${shadowOffset}px ${shadowBlur}px ${shadowColor}` : "none";
                
                // Outline (Stroke)
                const outlineWidth = item.textOutlineWidth || 0;
                const outlineColor = item.textOutlineColor || "#000000";
                textSpan.style.webkitTextStroke = outlineWidth > 0 ? `${outlineWidth}px ${outlineColor}` : "";
                
                // Letter spacing and Line height
                textSpan.style.letterSpacing = `${item.letterSpacing || 0}px`;
                textSpan.style.lineHeight = item.lineHeight || 1.2;
                
                // Background Highlight
                const bgColor = item.highlightColor || "transparent";
                textSpan.style.backgroundColor = bgColor;
                if (bgColor !== "transparent") {
                    textSpan.style.padding = "4px 8px";
                    textSpan.style.borderRadius = "4px";
                } else {
                    textSpan.style.padding = "";
                    textSpan.style.borderRadius = "";
                }
            }
        } else if (item.type === 'shape') {
            const shapeDiv = el.querySelector(".shape-content");
            if (shapeDiv) {
                shapeDiv.style.backgroundColor = item.fillColor || "#BB86FC";
                if (item.shapeType === 'triangle') {
                    shapeDiv.style.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)';
                    shapeDiv.style.border = 'none';
                    shapeDiv.style.borderRadius = '0px';
                } else {
                    shapeDiv.style.clipPath = '';
                    shapeDiv.style.border = `${item.strokeWidth || 0}px solid ${item.strokeColor || "#ffffff"}`;
                    if (item.shapeType === 'circle') {
                        shapeDiv.style.borderRadius = "50%";
                    } else {
                        shapeDiv.style.borderRadius = `${item.cornerRadius || 0}px`;
                    }
                }
            }
        } else if (item.type === 'sticker') {
            const stickerDiv = el.querySelector(".sticker-content");
            if (stickerDiv) {
                stickerDiv.textContent = item.sticker || "❤️";
                stickerDiv.style.fontSize = `${item.height * 0.8}px`;
            }
        } else {
            const imgEl = el.querySelector("img, video");
            if (imgEl && item.filters && item.transform) {
                imgEl.style.filter = getFilterCSSString(item.filters);
                imgEl.style.transform = `scaleX(${item.transform.flipX}) scaleY(${item.transform.flipY})`;
                
                if (item.crop) {
                    const scaleX = item.width / item.crop.width;
                    const scaleY = item.height / item.crop.height;
                    imgEl.style.position = 'absolute';
                    imgEl.style.width = `${(item.naturalWidth || item.width) * scaleX}px`;
                    imgEl.style.height = `${(item.naturalHeight || item.height) * scaleY}px`;
                    imgEl.style.left = `${-item.crop.x * scaleX}px`;
                    imgEl.style.top = `${-item.crop.y * scaleY}px`;
                    imgEl.style.maxWidth = 'none';
                    imgEl.style.maxHeight = 'none';
                    imgEl.style.objectFit = 'fill';
                } else {
                    imgEl.style.position = '';
                    imgEl.style.left = '';
                    imgEl.style.top = '';
                    imgEl.style.width = '100%';
                    imgEl.style.height = '100%';
                    imgEl.style.objectFit = 'fill';
                }
            }
        }

        // Sync preview media volume with the clip's volume (US10)
        const volMedia = el.querySelector("video, audio");
        if (volMedia && state.projectType === 'VIDEO' && state.timelineData && state.timelineData.clips) {
            const vclip = state.timelineData.clips.find(c => c.id === item.instanceId);
            if (vclip && vclip.volume !== undefined && vclip.volume !== null) {
                volMedia.volume = Math.max(0, Math.min(1, vclip.volume / 100));
            }
        }
    });

    // Render active selection box in the overlay
    let selectionOverlay = artboardScaler.querySelector(".artboard-selection-overlay");
    if (!selectionOverlay) {
        selectionOverlay = document.createElement("div");
        selectionOverlay.className = "artboard-selection-overlay";
        artboardScaler.appendChild(selectionOverlay);
    }
    
    // Sync size and zoom transform to match the artboard exactly
    selectionOverlay.style.width = `${state.projectConfig.width}px`;
    selectionOverlay.style.height = `${state.projectConfig.height}px`;
    selectionOverlay.style.transform = `scale(${z})`;
    selectionOverlay.style.setProperty('--zoom', z);
    
    // Clear selection overlay first
    selectionOverlay.innerHTML = "";
    
    if (!state.selectedInstanceIds) {
        state.selectedInstanceIds = state.activeInstanceId ? [state.activeInstanceId] : [];
    }
    
    state.selectedInstanceIds.forEach(instanceId => {
        const activeItem = state.canvasItems.find(i => i.instanceId === instanceId);
        if (activeItem) {
        const activeTab = activeItem.tabId ? getTab(activeItem.tabId) : null;
        const isActiveAudio = activeTab ? isAudioTab(activeTab) : false;

        let isHiddenByTimeline = false;
        if (state.projectType === 'VIDEO' && state.timelineData && state.timelineData.clips) {
            const clip = state.timelineData.clips.find(c => c.id === activeItem.instanceId);
            if (clip) {
                const t = state.timelineData.currentTime || 0;
                const start = clip.startOffset || 0;
                const end = start + (clip.duration || 5.0);
                if (t < start || t > end) {
                    isHiddenByTimeline = true;
                }
            }
        }

        if (!isHiddenByTimeline && !isActiveAudio && !activeItem.hidden) {
            const selectionBox = document.createElement("div");
            selectionBox.className = "active-selection-box";
            if (activeItem.cropEnabled) {
                selectionBox.classList.add("is-cropping");
            }
            selectionBox.dataset.instanceId = activeItem.instanceId;
            selectionBox.style.width = `${activeItem.width}px`;
            selectionBox.style.height = `${activeItem.height}px`;
            const rot = (activeItem.transform && activeItem.transform.rotate) ? activeItem.transform.rotate : 0;
            selectionBox.style.transform = `translate(${activeItem.x}px, ${activeItem.y}px) rotate(${rot}deg)`;
            
            if (activeItem.cropEnabled) {
                selectionBox.style.outline = "2px dashed #f59e0b";
            } else {
                selectionBox.style.outline = "2px solid var(--active)";
            }
            
            ["nw","ne","sw","se","n","s","e","w"].forEach(pos => {
                const h = document.createElement("div");
                h.className = `resize-handle ${pos}`;
                h.dataset.handle = pos;
                selectionBox.appendChild(h);
            });

            const sizeBadge = document.createElement("div");
            sizeBadge.className = "canvas-item-size-badge";
            sizeBadge.textContent = `${Math.round(activeItem.width)} × ${Math.round(activeItem.height)}`;
            selectionBox.appendChild(sizeBadge);
            
            selectionOverlay.appendChild(selectionBox);
        }
        }
    });

    // Render paint canvas
    let paintCanvas = artboard.querySelector(".paint-canvas");
    if (!paintCanvas) {
        paintCanvas = document.createElement("canvas");
        paintCanvas.className = "paint-canvas";
        paintCanvas.width = state.projectConfig.width;
        paintCanvas.height = state.projectConfig.height;
        artboard.appendChild(paintCanvas);
        setupPaintDrawing(paintCanvas);
    }
    
    // Sync size if changed
    if (paintCanvas.width !== state.projectConfig.width || paintCanvas.height !== state.projectConfig.height) {
        paintCanvas.width = state.projectConfig.width;
        paintCanvas.height = state.projectConfig.height;
        state.paintLoaded = false; // force reload
    }
    
    paintCanvas.style.pointerEvents = state.activeTool === 'paint' ? 'auto' : 'none';
    
    if (state.projectConfig.paintData && !state.paintLoaded) {
        state.paintLoaded = true;
        const img = new Image();
        img.onload = () => {
            const ctx = paintCanvas.getContext("2d");
            ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
            ctx.drawImage(img, 0, 0, paintCanvas.width, paintCanvas.height);
        };
        img.src = state.projectConfig.paintData;
    } else if (!state.projectConfig.paintData) {
        const ctx = paintCanvas.getContext("2d");
        ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
    }

    // Dynamic import to sync media current time with timeline head immediately after rendering
    import("../timeline-player.js").then(m => m.syncCanvasWithCurrentTime()).catch(err => console.error("Error syncing timeline canvas:", err));
    
    // Render the Ruler
    renderCanvasRuler(z, artboardWrapper);
    
    // Re-render ruler on scroll
    artboardWrapper.onscroll = () => renderCanvasRuler(z, artboardWrapper);
}


