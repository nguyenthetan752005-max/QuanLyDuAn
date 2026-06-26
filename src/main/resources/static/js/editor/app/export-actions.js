import { refs } from "../modules/dom.js";
import { state } from "../modules/state.js";
import { setStatus } from "../modules/theme.js";
import { showWarning } from "../modules/notifications.js";
import { getFilterCSSString } from "../modules/image-editor.js";

let activeProcessingId = null;
let activeIntervalId = null;
let wasAutosaveEnabledBeforeExport = true;

async function prepareArtboardForExport(artboard) {
    const originalStates = [];
    const blurShapes = state.canvasItems.filter(s => s.type === 'shape' && s.backdropBlur > 0);
    
    if (blurShapes.length === 0) return originalStates;
    
    // Hide the DOM elements for these shapes
    blurShapes.forEach(shape => {
        const shapeEl = artboard.querySelector(`[data-instance-id="${shape.instanceId}"]`);
        if (shapeEl) {
            originalStates.push({ el: shapeEl, type: 'display', value: shapeEl.style.display });
            shapeEl.style.display = 'none';
        }
    });

    // For each image in the canvas, check if any blur shapes overlap it
    const images = state.canvasItems.filter(i => i.type === 'image' || i.type === 'video');
    
    for (const item of images) {
        const overlappingShapes = blurShapes.filter(shape => {
            return !(shape.x > item.x + item.width || 
                     shape.x + shape.width < item.x || 
                     shape.y > item.y + item.height || 
                     shape.y + shape.height < item.y) &&
                   (shape.zIndex || 0) > (item.zIndex || 0);
        });
        
        if (overlappingShapes.length > 0) {
            const imgEl = artboard.querySelector(`[data-instance-id="${item.instanceId}"] img, [data-instance-id="${item.instanceId}"] video`);
            if (!imgEl) continue;

            const canvas = document.createElement('canvas');
            canvas.width = item.width;
            canvas.height = item.height;
            const ctx = canvas.getContext('2d');
            
            try {
                ctx.drawImage(imgEl, 0, 0, item.width, item.height);
                
                overlappingShapes.forEach(shape => {
                    ctx.save();
                    ctx.beginPath();
                    
                    const localX = shape.x - item.x;
                    const localY = shape.y - item.y;
                    const localW = shape.width;
                    const localH = shape.height;

                    if (shape.shapeType === 'circle') {
                        ctx.ellipse(localX + localW/2, localY + localH/2, localW/2, localH/2, 0, 0, 2*Math.PI);
                    } else {
                        ctx.rect(localX, localY, localW, localH);
                    }
                    
                    ctx.clip();
                    ctx.filter = `blur(${shape.backdropBlur}px)`;
                    ctx.drawImage(imgEl, 0, 0, item.width, item.height);
                    ctx.restore();
                });
                
                const dataUrl = canvas.toDataURL('image/png');
                originalStates.push({ el: imgEl, type: 'src', value: imgEl.src });
                
                // Wrap image onload in a promise to ensure it renders before domtoimage runs
                await new Promise((resolve) => {
                    const tempImg = new Image();
                    tempImg.onload = () => {
                        imgEl.src = dataUrl;
                        resolve();
                    };
                    tempImg.onerror = resolve;
                    tempImg.src = dataUrl;
                });
            } catch (e) {
                console.error("Failed to pre-render blur for image", e);
            }
        }
    }
    return originalStates;
}

function restoreArtboardAfterExport(originalStates) {
    originalStates.forEach(s => {
        if (s.type === 'display') s.el.style.display = s.value;
        if (s.type === 'src') s.el.src = s.value;
    });
}

export function updateExportInfo() {
    if (!refs.exportScale || !refs.exportInfo) return;
    const scale = parseFloat(refs.exportScale.value) || 1;
    const w = Math.round(state.projectConfig.width * scale);
    const h = Math.round(state.projectConfig.height * scale);
    refs.exportInfo.textContent = `Kích thước xuất: ${w} x ${h} px`;
}

export async function openExportDialog() {
    const artboard = document.querySelector(".artboard");
    if (!artboard) {
        showWarning("Không tìm thấy Artboard để xuất ảnh.");
        return;
    }

    setStatus("Đang chuẩn bị ảnh xem trước...");
    
    // Set artboard style temporary for clean preview
    artboard.classList.add("is-exporting");
    
    if (refs.exportPreviewBox) {
        refs.exportPreviewBox.style.setProperty('--preview-aspect-ratio', `${state.projectConfig.width} / ${state.projectConfig.height}`);
        refs.exportPreviewBox.innerHTML = "<div class='export-preview-loading'>Đang tải ảnh xem trước...</div>";
    }
    
    if (refs.exportDialog) {
        refs.exportDialog.hidden = false;
    }
    
    if (state.projectType === 'VIDEO') {
        // Render a beautiful video player preview card from template
        if (refs.exportPreviewBox) {
            const template = document.getElementById("video-export-preview-template");
            if (template) {
                const clone = template.content.cloneNode(true);
                const totalDuration = state.timelineData ? (state.timelineData.totalTime ?? 0.0) : 0.0;
                
                const resEl = clone.querySelector(".preview-resolution");
                const durEl = clone.querySelector(".preview-duration");
                if (resEl) resEl.textContent = `${state.projectConfig.width} x ${state.projectConfig.height}`;
                if (durEl) durEl.textContent = totalDuration.toFixed(2);
                
                refs.exportPreviewBox.innerHTML = "";
                refs.exportPreviewBox.appendChild(clone);
            }
        }
        // Show video-specific options (FPS) and hide image-only options
        if (refs.exportFpsGroup) refs.exportFpsGroup.hidden = false;
        if (refs.exportQualityGroup) refs.exportQualityGroup.hidden = true;
        if (refs.exportTransparentGroup) refs.exportTransparentGroup.hidden = true;

        setStatus("Sẵn sàng xuất video.");
        artboard.classList.remove("is-exporting");
        updateExportInfo();
        return;
    }
    
    let originalStates = [];
    try {
        await new Promise(r => setTimeout(r, 100));

        if (!window.domtoimage) {
            throw new Error("Thư viện domtoimage chưa được tải. Vui lòng tải lại trang (Ctrl + F5).");
        }

        originalStates = await prepareArtboardForExport(artboard);

        const dataUrl = await window.domtoimage.toPng(artboard, {
            width: state.projectConfig.width,
            height: state.projectConfig.height,
            style: {
                transform: 'scale(1)',
                transformOrigin: 'top left',
                width: `${state.projectConfig.width}px`,
                height: `${state.projectConfig.height}px`
            }
        });
        
        if (refs.exportPreviewBox) {
            const previewImg = document.createElement("img");
            previewImg.src = dataUrl;
            previewImg.alt = "Export Preview";
            refs.exportPreviewBox.innerHTML = "";
            refs.exportPreviewBox.appendChild(previewImg);
        }
        
        setStatus("Sẵn sàng xuất ảnh.");
    } catch (error) {
        console.error("Lỗi tạo ảnh xem trước:", error);
        if (refs.exportPreviewBox) {
            refs.exportPreviewBox.style.removeProperty('--preview-aspect-ratio');
            refs.exportPreviewBox.innerHTML = `<div class='export-preview-error'>Không thể tải ảnh xem trước (${error.message || error}), bạn vẫn có thể tải xuống.</div>`;
        }
        setStatus("Sẵn sàng xuất ảnh (không có xem trước).");
    } finally {
        restoreArtboardAfterExport(originalStates);
        artboard.classList.remove("is-exporting");
    }
    
    updateExportInfo();
}

function renderFrameToCanvas(canvas, ctx, t, scale) {
    ctx.fillStyle = state.projectConfig.background || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!state.timelineData || !state.timelineData.clips) return;

    state.timelineData.clips.forEach(clip => {
        const start = clip.startOffset || 0;
        const end = start + (clip.duration || 5.0);
        if (t >= start && t <= end) {
            const item = state.canvasItems.find(i => i.instanceId === clip.id);
            if (!item) return;

            ctx.save();

            ctx.globalAlpha = (item.opacity === undefined || item.opacity === null) ? 1 : item.opacity / 100;

            const posX = item.x * scale;
            const posY = item.y * scale;
            const itemW = item.width * scale;
            const itemH = item.height * scale;

            ctx.translate(posX + itemW / 2, posY + itemH / 2);
            const rot = (item.transform && item.transform.rotate) ? item.transform.rotate : 0;
            ctx.rotate(rot * Math.PI / 180);

            if (item.type === 'text') {
                ctx.fillStyle = item.color || '#ffffff';
                const fontSize = (item.fontSize || 28) * scale;
                ctx.font = `${item.fontStyle || 'normal'} ${item.fontWeight || 'normal'} ${fontSize}px ${item.fontFamily || 'sans-serif'}`;
                ctx.textAlign = item.align || 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(item.text, 0, 0);
            } else {
                const itemEl = document.querySelector(`[data-instance-id="${item.instanceId}"]`);
                const mediaEl = itemEl ? itemEl.querySelector('img, video') : null;
                if (mediaEl) {
                    if (item.filters) {
                        ctx.filter = getFilterCSSString(item.filters, scale);
                    } else {
                        ctx.filter = 'none';
                    }
                    
                    let scaleX = item.transform ? item.transform.flipX : 1;
                    let scaleY = item.transform ? item.transform.flipY : 1;
                    ctx.scale(scaleX, scaleY);
                    
                    ctx.drawImage(mediaEl, -itemW / 2, -itemH / 2, itemW, itemH);
                }
            }
            
            ctx.restore();
        }
    });
}

export async function pollRenderStatus(processingId, btnEl, dialogEl) {
    const eventSource = new EventSource(`/api/v1/project-processings/stream/${processingId}`);
    
    eventSource.addEventListener('progress', (e) => {
        try {
            const data = JSON.parse(e.data);
            const progress = data.progress || 0;
            const status = data.status || 'RUNNING';
            
            const progressTextEl = document.getElementById("rendering-lock-progress-text");
            const progressFillEl = document.getElementById("rendering-lock-progress-fill");
            const lockOverlayEl = document.getElementById("rendering-lock-overlay");

            if (progressTextEl && progressFillEl) {
                progressTextEl.textContent = `Đang tiến hành kết xuất... (${progress}%)`;
                progressFillEl.style.width = `${progress}%`;
            }

            if (status === "RUNNING" || status === "QUEUED") {
                if (btnEl) {
                    btnEl.innerHTML = `<span class="btn-spinner"></span> Đang xử lý: ${progress}%`;
                }
            } else if (status === "SUCCESS") {
                eventSource.close();
                activeIntervalId = null;
                activeProcessingId = null;
                
                fetch(`/api/v1/project-processings/${processingId}`)
                    .then(res => res.json())
                    .then(procData => {
                        if (btnEl) {
                            btnEl.disabled = false;
                            btnEl.textContent = "Tải xuống";
                        }
                        
                        if (lockOverlayEl) {
                            lockOverlayEl.hidden = true;
                        }
                        
                        const link = document.createElement("a");
                        link.href = procData.finalExportPath;
                        const parts = procData.finalExportPath.split("/");
                        link.download = parts[parts.length - 1];
                        document.body.appendChild(link);
                        link.click();
                        link.remove();
                        
                        setStatus("Xuất video thành công!");
                        if (dialogEl) dialogEl.hidden = true;
                        
                        state.isExporting = false;
                        setTimeout(() => {
                            window.isAutosaveEnabled = true;
                        }, 500);
                    });
            } else if (status === "FAILED") {
                eventSource.close();
                activeIntervalId = null;
                activeProcessingId = null;
                
                fetch(`/api/v1/project-processings/${processingId}`)
                    .then(res => res.json())
                    .then(procData => {
                        if (btnEl) {
                            btnEl.disabled = false;
                            btnEl.textContent = "Tải xuống";
                        }
                        
                        if (lockOverlayEl) {
                            lockOverlayEl.hidden = true;
                        }
                        
                        showWarning(`Lỗi kết xuất video trên server: ${procData.errorMessage || "Không rõ nguyên nhân"}`);
                        
                        state.isExporting = false;
                        setTimeout(() => {
                            window.isAutosaveEnabled = true;
                        }, 500);
                    });
            }
        } catch (err) {
            console.error("Error parsing SSE data", err);
        }
    });

    eventSource.onerror = (e) => {
        console.error("SSE error", e);
        eventSource.close();
    };
    
    activeIntervalId = eventSource;
}

export async function downloadExportedImage() {
    const artboard = document.querySelector(".artboard");
    if (!artboard) return;
    
    const format = refs.exportFormat?.value || "png";
    const scale = parseFloat(refs.exportScale?.value) || 1;
    const quality = parseFloat(refs.exportQuality?.value || 90) / 100;
    const useTransparency = refs.exportTransparent?.checked && format === "png";
    
    if (refs.exportDownloadBtn) {
        refs.exportDownloadBtn.disabled = true;
        refs.exportDownloadBtn.innerHTML = `<span class="btn-spinner"></span> Đang chuẩn bị...`;
    }
    
    if (format === "webm" || format === "mp4") {
        const totalDuration = state.timelineData ? (state.timelineData.totalTime ?? 0.0) : 0.0;
        if (totalDuration <= 0.0) {
            showWarning("Thời lượng video phải lớn hơn 0s để xuất video.");
            if (refs.exportDownloadBtn) {
                refs.exportDownloadBtn.disabled = false;
                refs.exportDownloadBtn.textContent = "Tải xuống";
            }
            return;
        }

        wasAutosaveEnabledBeforeExport = window.isAutosaveEnabled;
        window.isAutosaveEnabled = false;
        state.isExporting = true;

        try {
            const urlParams = new URLSearchParams(window.location.search);
            const projectId = urlParams.get('projectId');

            // 1. Force save project to make sure server has the latest client changes
            const { saveProjectToCloud } = await import("./project-actions.js");
            await saveProjectToCloud();

            const fps = refs.exportFps ? refs.exportFps.value : "30";

            // 2. Trigger asynchronous server-side render
            const renderRes = await fetch(`/api/v1/video-processing/render?projectId=${projectId}&format=${format}&scale=${scale}&fps=${fps}`, {
                method: "POST"
            });
            
            if (!renderRes.ok) {
                const errText = await renderRes.text();
                throw new Error(errText || "Không thể khởi động tiến trình render trên máy chủ.");
            }
            
            const processingData = await renderRes.json();
            const processingId = processingData.id;
            activeProcessingId = processingId;
            
            setStatus("Đang xử lý kết xuất video trên server...");
            
            // 3. Start polling the render status DTO
            pollRenderStatus(processingId, refs.exportDownloadBtn, refs.exportDialog);
            
        } catch (error) {
            console.error("Lỗi khi kết xuất video:", error);
            showWarning(`Không thể xuất video: ${error.message || error}`);
            
            if (refs.exportDownloadBtn) {
                refs.exportDownloadBtn.disabled = false;
                refs.exportDownloadBtn.textContent = "Tải xuống";
            }
            
            activeProcessingId = null;
            // Restore autosave
            state.isExporting = false;
            setTimeout(() => {
                window.isAutosaveEnabled = wasAutosaveEnabledBeforeExport;
            }, 500);
        }
        return;
    }
    
    artboard.classList.add("is-exporting");
    
    const wasAutosaveEnabled = window.isAutosaveEnabled;
    window.isAutosaveEnabled = false;
    
    await new Promise(r => setTimeout(r, 120));
    
    let originalStates = [];
    try {
        originalStates = await prepareArtboardForExport(artboard);

        const options = {
            width: state.projectConfig.width * scale,
            height: state.projectConfig.height * scale,
            style: {
                transform: `scale(${scale})`,
                transformOrigin: 'top left',
                width: `${state.projectConfig.width}px`,
                height: `${state.projectConfig.height}px`
            }
        };
        
        if (useTransparency) {
            options.style.backgroundColor = 'transparent';
        } else {
            options.style.backgroundColor = state.projectConfig.background || '#ffffff';
        }
        
        if (!window.domtoimage) {
            throw new Error("Thư viện domtoimage chưa được tải. Vui lòng tải lại trang (Ctrl + F5).");
        }
        
        let dataUrl;
        if (format === "jpeg") {
            options.quality = quality;
            if (!state.projectConfig.background || state.projectConfig.background === 'transparent') {
                options.style.backgroundColor = '#ffffff';
            }
            dataUrl = await window.domtoimage.toJpeg(artboard, options);
        } else {
            dataUrl = await window.domtoimage.toPng(artboard, options);
        }
        
        const link = document.createElement("a");
        const baseName = (document.title.replace(" - Editor", "")) || "canvas-design";
        link.download = `${baseName}-${Date.now()}.${format}`;
        link.href = dataUrl;
        document.body.appendChild(link);
        link.click();
        link.remove();
        
        setStatus("Xuất ảnh thành công!");
        if (refs.exportDialog) {
            refs.exportDialog.hidden = true;
        }
    } catch (error) {
        console.error("Lỗi khi xuất thiết kế:", error);
        showWarning(`Không thể tải ảnh xuống. Chi tiết lỗi: ${error.message || error}. Hãy chắc chắn rằng bạn không tải ảnh từ máy chủ khác chưa được cấp phép CORS.`);
    } finally {
        restoreArtboardAfterExport(originalStates);
        artboard.classList.remove("is-exporting");
        if (refs.exportDownloadBtn) {
            refs.exportDownloadBtn.disabled = false;
            refs.exportDownloadBtn.textContent = "Tải xuống";
        }
        
        setTimeout(() => {
            window.isAutosaveEnabled = wasAutosaveEnabled;
        }, 500);
    }
}

export async function cancelActiveExport() {
    if (activeIntervalId) {
        clearInterval(activeIntervalId);
        activeIntervalId = null;
    }
    
    if (activeProcessingId) {
        const procId = activeProcessingId;
        activeProcessingId = null;
        
        try {
            await fetch(`/api/v1/video-processing/cancel?processingId=${procId}`, {
                method: "POST"
            });
            setStatus("Đã hủy tiến trình xuất video.");
        } catch (e) {
            console.error("Failed to call cancel API:", e);
        }
    }
    
    // Restore state
    state.isExporting = false;
    window.isAutosaveEnabled = wasAutosaveEnabledBeforeExport;
    
    if (refs.exportDownloadBtn) {
        refs.exportDownloadBtn.disabled = false;
        refs.exportDownloadBtn.textContent = "Tải xuống";
    }
}

window.addEventListener("beforeunload", () => {
    if (state.isExporting && activeProcessingId) {
        navigator.sendBeacon(`/api/v1/video-processing/cancel?processingId=${activeProcessingId}`);
    }
});
