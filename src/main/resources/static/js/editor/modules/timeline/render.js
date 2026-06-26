import { customConfirm } from "../custom-dialogs.js";
import { state, updateTrackStatus, moveTrackUp, moveTrackDown } from "../state.js";
import { renderApp } from "../ui/index.js";
import { addMediaToTrack, deleteTrack } from "./tracks.js";
import { openExtractAudioDialog } from "../ui/explorer/modals.js";
import { showToast } from "../notifications.js";
import { refreshEditorExplorer } from "../ui/explorer/api.js";
import { renderExplorerList } from "../ui/explorer/ui.js";

export function renderTimeline() {
    const timelinePanel = document.getElementById("timeline-panel");
    if (!timelinePanel || state.projectType !== 'VIDEO') {
        if (timelinePanel) timelinePanel.hidden = true;
        return;
    }
    timelinePanel.hidden = false;

    if (!state.timelineData) {
        state.timelineData = {
            currentTime: 0,
            totalTime: 0.0,
            zoom: 50,
            tracks: [
                { id: 'video', name: 'Lớp Video', type: 'video' },
                { id: 'audio', name: 'Lớp Audio', type: 'audio' }
            ],
            clips: []
        };
    }

    const pxPerSecond = state.timelineData.zoom || 50;
    const totalTime = state.timelineData.totalTime ?? 0.0;
    const totalWidth = totalTime * pxPerSecond;

    // 1. Set zoom slider value
    const zoomSlider = document.getElementById("timeline-zoom-slider");
    if (zoomSlider) {
        zoomSlider.value = pxPerSecond;
    }

    // 2. Set total/current time display
    updateTimeDisplay();

    // 3. Render Ruler Canvas
    renderRuler(totalWidth, totalTime, pxPerSecond);

    // 4. Render Track Headers
    const headersContainer = document.getElementById("timeline-track-headers");
    if (headersContainer) {
        headersContainer.innerHTML = "";
        
        // Ensure active track is set if not already
        if (!state.activeTrackId && state.timelineData.tracks.length > 0) {
            state.activeTrackId = state.timelineData.tracks[0].id;
        }

        state.timelineData.tracks.forEach(track => {
            const header = document.createElement("div");
            header.className = "timeline-track-header";
            if (state.activeTrackId === track.id) {
                header.classList.add("is-active");
            }
            header.dataset.trackId = track.id;
            
            // Icon for audio vs video/image/text
            const typeIcon = track.type === 'audio' 
                ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle></svg>`
                : `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"></rect><line x1="7" y1="2" x2="7" y2="22"></line><line x1="17" y1="2" x2="17" y2="22"></line><line x1="2" y1="12" x2="22" y2="12"></line><line x1="2" y1="7" x2="7" y2="7"></line><line x1="2" y1="17" x2="7" y2="17"></line><line x1="17" y1="17" x2="22" y2="17"></line><line x1="17" y1="7" x2="22" y2="7"></line></svg>`;

            const showEye = track.type !== 'audio';
            const showMute = track.type === 'audio' || track.type === 'video';

            const eyeIcon = track.hidden
                ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>`
                : `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>`;

            const muteIcon = track.muted
                ? `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><line x1="23" y1="9" x2="17" y2="15"></line><line x1="17" y1="9" x2="23" y2="15"></line></svg>`
                : `<svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path></svg>`;

            let actionsHtml = `
                <button class="timeline-track-btn move-track-up-btn" title="Di chuyển lớp lên (Chuyển ra sau)">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="18 15 12 9 6 15"></polyline>
                    </svg>
                </button>
                <button class="timeline-track-btn move-track-down-btn" title="Di chuyển lớp xuống (Chuyển lên trước)">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="6 9 12 15 18 9"></polyline>
                    </svg>
                </button>
                <button class="timeline-track-btn delete-track-btn" title="Xóa lớp">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
                </button>
            `;

            if (showMute) {
                actionsHtml += `
                    <button class="timeline-track-btn mute-track-btn ${track.muted ? 'active' : ''}" title="${track.muted ? 'Bật âm thanh' : 'Tắt âm thanh'}">
                        ${muteIcon}
                    </button>
                `;
            }

            if (showEye) {
                actionsHtml += `
                    <button class="timeline-track-btn toggle-visibility-btn ${track.hidden ? 'active' : ''}" title="${track.hidden ? 'Hiện lớp' : 'Ẩn lớp'}">
                        ${eyeIcon}
                    </button>
                `;
            }

            header.innerHTML = `
                <span class="track-title-text" title="${track.name}">${typeIcon}${track.name}</span>
                <div class="timeline-track-header-actions">
                    ${actionsHtml}
                </div>
            `;

            // Selection event listener
            header.addEventListener("mousedown", (e) => {
                if (e.target.closest(".timeline-track-btn")) return;
                state.activeTrackId = track.id;
                renderApp();
            });

            // Move track up listener
            const moveUpBtn = header.querySelector(".move-track-up-btn");
            moveUpBtn?.addEventListener("click", (e) => {
                e.stopPropagation();
                moveTrackUp(track.id);
            });

            // Move track down listener
            const moveDownBtn = header.querySelector(".move-track-down-btn");
            moveDownBtn?.addEventListener("click", (e) => {
                e.stopPropagation();
                moveTrackDown(track.id);
            });

            // Delete track event listener
            const deleteBtn = header.querySelector(".delete-track-btn");
            deleteBtn?.addEventListener("click", async (e) => {
                e.stopPropagation();
                const confirmed = await customConfirm("Xóa Lớp", `Bạn có chắc muốn xóa lớp "${track.name}" và toàn bộ clip thuộc lớp này?`);
                if (confirmed) {
                    deleteTrack(track.id);
                }
            });

            // Toggle visibility listener
            const visibilityBtn = header.querySelector(".toggle-visibility-btn");
            visibilityBtn?.addEventListener("click", (e) => {
                e.stopPropagation();
                updateTrackStatus(track.id, { hidden: !track.hidden });
                renderApp();
            });

            // Toggle mute listener
            const muteBtn = header.querySelector(".mute-track-btn");
            muteBtn?.addEventListener("click", (e) => {
                e.stopPropagation();
                updateTrackStatus(track.id, { muted: !track.muted });
                renderApp();
            });

            headersContainer.appendChild(header);
        });
    }

    // 5. Render Lanes & Clips
    const lanesContainer = document.getElementById("timeline-lanes");
    if (lanesContainer) {
        lanesContainer.innerHTML = "";
        lanesContainer.style.width = `${totalWidth}px`;

        state.timelineData.tracks.forEach(track => {
            const lane = document.createElement("div");
            lane.className = "timeline-lane";
            if (state.activeTrackId === track.id) {
                lane.classList.add("is-active");
            }
            lane.dataset.trackId = track.id;

            // Lane selection
            lane.addEventListener("mousedown", (e) => {
                if (e.target.closest(".timeline-clip")) return; // Don't block clip clicks
                state.activeTrackId = track.id;
                renderApp();
            });

            // Drag and drop target for this lane
            lane.addEventListener("dragover", (e) => {
                e.preventDefault();
                e.dataTransfer.dropEffect = "copy";
                lane.classList.add("drag-over");
            });

            lane.addEventListener("dragleave", () => {
                lane.classList.remove("drag-over");
            });

            lane.addEventListener("drop", (e) => {
                e.preventDefault();
                lane.classList.remove("drag-over");

                const rect = lane.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const pxPerSecond = state.timelineData?.zoom || 50;
                const startOffset = x / pxPerSecond;

                // Handle local files dragged from desktop/explorer
                if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                    import("../file-actions.js").then(module => {
                        module.handleDroppedFilesOnTrack(Array.from(e.dataTransfer.files), track.id, startOffset);
                    });
                    return;
                }

                // Handle internal explorer items
                const tabId = e.dataTransfer.getData("text/plain");
                if (tabId) {
                    addMediaToTrack(tabId, track.id, startOffset);
                }
            });

            // Render clips belonging to this track
            const trackClips = state.timelineData.clips.filter(c => c.trackId === track.id);
            trackClips.forEach(clip => {
                const clipEl = document.createElement("div");
                clipEl.className = `timeline-clip type-${track.type}`;
                if ((state.selectedInstanceIds && state.selectedInstanceIds.includes(clip.id)) || state.activeInstanceId === clip.id) {
                    clipEl.classList.add("is-active");
                }
                clipEl.dataset.clipId = clip.id;
                
                const left = clip.startOffset * pxPerSecond;
                const width = clip.duration * pxPerSecond;
                clipEl.style.left = `${left}px`;
                clipEl.style.width = `${width}px`;

                let visualizerHTML = '';
                if (track.type === 'audio') {
                    visualizerHTML = `<div class="timeline-clip-waveform"></div>`;
                } else if (track.type === 'video') {
                    visualizerHTML = `<div class="timeline-clip-filmstrip"></div>`;
                }

                clipEl.innerHTML = `
                    ${visualizerHTML}
                    <div class="timeline-clip-handle left"></div>
                    <div class="timeline-clip-title">${clip.name}</div>
                    <div class="timeline-clip-handle right"></div>
                `;

                // Add selection listener
                clipEl.addEventListener("mousedown", (e) => {
                    // Prevent select action if clicking handle
                    if (e.target.classList.contains("timeline-clip-handle")) return;
                    
                    if (e.shiftKey) {
                        if (!state.selectedInstanceIds) state.selectedInstanceIds = [];
                        if (state.selectedInstanceIds.includes(clip.id)) {
                            state.selectedInstanceIds = state.selectedInstanceIds.filter(id => id !== clip.id);
                            if (state.activeInstanceId === clip.id) {
                                state.activeInstanceId = state.selectedInstanceIds[state.selectedInstanceIds.length - 1] || null;
                            }
                        } else {
                            state.selectedInstanceIds.push(clip.id);
                            state.activeInstanceId = clip.id;
                        }
                    } else {
                        if (!state.selectedInstanceIds) state.selectedInstanceIds = [];
                        if (!state.selectedInstanceIds.includes(clip.id)) {
                            state.selectedInstanceIds = [clip.id];
                        }
                        state.activeInstanceId = clip.id;
                    }
                    
                    state.activeTrackId = clip.trackId; // Automatically select containing track
                    
                    // Visually activate it immediately without rebuilding DOM (to allow dragging to start)
                    document.querySelectorAll(".timeline-clip").forEach(el => {
                        const cid = el.dataset.clipId;
                        if (state.selectedInstanceIds && state.selectedInstanceIds.includes(cid)) {
                            el.classList.add("is-active");
                        } else {
                            el.classList.remove("is-active");
                        }
                    });
                });

                clipEl.addEventListener("contextmenu", (e) => {
                    e.preventDefault();
                    if (track.type === 'video') {
                        state.activeInstanceId = clip.id;
                        state.activeTrackId = clip.trackId;
                        document.querySelectorAll(".timeline-clip").forEach(el => el.classList.remove("is-active"));
                        clipEl.classList.add("is-active");
                        
                        const canvasItem = state.canvasItems.find(i => i.instanceId === clip.id);
                        if (!canvasItem || !canvasItem.tabId) return;
                        
                        showTimelineContextMenu(e, canvasItem.tabId);
                    }
                });

                lane.appendChild(clipEl);
            });

            lanesContainer.appendChild(lane);
        });
    }

    // 6. Draw Playhead Position
    updatePlayheadUI(pxPerSecond);
}

export function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    const ms = Math.floor((seconds % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}

export function updateTimeDisplay() {
    const curTimeEl = document.getElementById("timeline-current-time");
    const totalTimeEl = document.getElementById("timeline-total-time");
    if (state.timelineData) {
        if (curTimeEl) curTimeEl.textContent = formatTime(state.timelineData.currentTime || 0);
        if (totalTimeEl) totalTimeEl.textContent = formatTime(state.timelineData.totalTime ?? 0.0);
    }
}

function renderRuler(totalWidth, totalTime, pxPerSecond) {
    const canvas = document.getElementById("timeline-ruler-canvas");
    if (!canvas) return;

    canvas.width = totalWidth;
    canvas.style.width = `${totalWidth}px`;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = "#888888";
    ctx.font = "10px monospace";
    ctx.textBaseline = "top";

    // Draw ticks
    // Determine division based on zoom level to keep ticks readable
    let step = 1; // 1 second
    if (pxPerSecond < 20) step = 5;
    else if (pxPerSecond < 40) step = 2;
    else if (pxPerSecond > 100) step = 0.5;

    for (let t = 0; t <= totalTime; t += step / 10) {
        const x = t * pxPerSecond;
        ctx.beginPath();
        ctx.moveTo(x, canvas.height);
        
        // Major ticks are integers or every 0.5s if zoomed in
        const isMajor = Number.isInteger(t) || (pxPerSecond > 120 && (t * 2) % 2 === 1);
        if (isMajor) {
            ctx.lineTo(x, canvas.height - 12);
            ctx.strokeStyle = "#555555";
            ctx.stroke();

            const minutes = Math.floor(t / 60);
            const seconds = Math.floor(t % 60);
            const label = `${minutes}:${seconds.toString().padStart(2, '0')}`;
            // Offset text slightly
            ctx.fillText(label, x + 4, 4);
        } else {
            ctx.lineTo(x, canvas.height - 6);
            ctx.strokeStyle = "#333333";
            ctx.stroke();
        }
    }
}

export function updatePlayheadUI(pxPerSecond = null) {
    const playhead = document.getElementById("timeline-playhead");
    if (!playhead || !state.timelineData) return;

    if (!pxPerSecond) pxPerSecond = state.timelineData.zoom || 50;
    const left = (state.timelineData.currentTime || 0) * pxPerSecond;
    playhead.style.left = `${left}px`;
}

function showTimelineContextMenu(e, assetId) {
    let menu = document.getElementById("timeline-context-menu");
    if (menu) menu.remove();
    
    menu = document.createElement("div");
    menu.id = "timeline-context-menu";
    menu.className = "menu-panel";
    menu.style.left = `${e.clientX}px`;
    menu.style.top = `${e.clientY}px`;
    
    const extractBtn = document.createElement("div");
    extractBtn.className = "menu-item";
    extractBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 18V5l12-2v13"></path><circle cx="6" cy="18" r="3"></circle><circle cx="18" cy="16" r="3"></circle>
        </svg>
        Trích xuất Âm thanh
    `;
    
    extractBtn.addEventListener("click", () => {
        menu.remove();
        openExtractAudioDialog(async (folderId) => {
            try {
                showToast("Đang trích xuất âm thanh...");
                const url = '/api/v1/media-assets/extract-audio';
                const formData = new FormData();
                formData.append('assetId', assetId);
                if (folderId) {
                    formData.append('folderId', folderId);
                }
                const response = await fetch(url, {
                    method: 'POST',
                    body: formData
                });
                
                if (response.ok) {
                    showToast("Trích xuất thành công!");
                    await refreshEditorExplorer();
                    renderExplorerList();
                } else {
                    const data = await response.json();
                    showToast(data.message || "Lỗi trích xuất", "error");
                }
            } catch (error) {
                console.error(error);
                showToast("Lỗi kết nối khi trích xuất âm thanh", "error");
            }
        });
    });
    
    menu.appendChild(extractBtn);
    document.body.appendChild(menu);
    menu.hidden = false;
    
    const dismiss = (evt) => {
        if (!menu.contains(evt.target)) {
            menu.remove();
            window.removeEventListener("click", dismiss);
        }
    };
    setTimeout(() => window.addEventListener("click", dismiss), 0);
}
