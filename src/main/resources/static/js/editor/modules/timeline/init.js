import { state, removeFromCanvas } from "../state.js";
import { renderApp } from "../ui/index.js";
import { pushState } from "../history.js";
import { updatePlayheadUI, updateTimeDisplay, renderTimeline } from "./render.js";
import { addNewTrack, splitClipAtCurrentTime } from "./tracks.js";

import { customConfirm, customPrompt, customAlert, customTrackChoiceDialog } from "../custom-dialogs.js";

export function initTimeline() {
    // Listen for custom timeupdate events to update playhead
    window.addEventListener("timeline:timeupdate", () => {
        const pxPerSecond = state.timelineData?.zoom || 50;
        updatePlayheadUI(pxPerSecond);
        updateTimeDisplay();
    });

    const zoomSlider = document.getElementById("timeline-zoom-slider");
    zoomSlider?.addEventListener("input", (e) => {
        if (state.timelineData) {
            state.timelineData.zoom = parseFloat(e.target.value);
            renderTimeline();
        }
    });

    const addTrackBtn = document.getElementById("timeline-add-track-btn");
    addTrackBtn?.addEventListener("click", async () => {
        const type = await customTrackChoiceDialog("Tạo Lớp Mới", "Chọn loại lớp bạn muốn thêm vào timeline:");
        if (!type) return; // Hủy bỏ
        
        const defaultName = type === "video" ? "Lớp Video mới" : "Lớp Audio mới";
        const name = await customPrompt("Đặt Tên Lớp", `Nhập tên cho ${type === "video" ? "Lớp Video" : "Lớp Audio"}:`, defaultName);
        if (name) {
            addNewTrack(name, type);
        }
    });

    const splitBtn = document.getElementById("timeline-split-btn");
    splitBtn?.addEventListener("click", async () => {
        if (state.activeInstanceId) {
            splitClipAtCurrentTime(state.activeInstanceId);
        } else {
            await customAlert("Nhắc nhở", "Vui lòng chọn một đoạn clip trên timeline để cắt.");
        }
    });

    const deleteClipBtn = document.getElementById("timeline-delete-clip-btn");
    deleteClipBtn?.addEventListener("click", async () => {
        if (state.selectedInstanceIds && state.selectedInstanceIds.length > 0) {
            const confirmed = await customConfirm("Xóa Clip", `Bạn có chắc muốn xóa ${state.selectedInstanceIds.length} đoạn clip này?`);
            if (confirmed) {
                pushState();
                state.selectedInstanceIds.forEach(id => removeFromCanvas(id));
                state.selectedInstanceIds = [];
                renderApp();
            }
        } else if (state.activeInstanceId) {
            const confirmed = await customConfirm("Xóa Clip", "Bạn có chắc muốn xóa đoạn clip này?");
            if (confirmed) {
                pushState();
                removeFromCanvas(state.activeInstanceId);
                renderApp();
            }
        } else {
            await customAlert("Nhắc nhở", "Vui lòng chọn một đoạn clip trên timeline để xóa.");
        }
    });

    // Support clicking/scrubbing playhead directly on ruler or playhead handle
    const ruler = document.getElementById("timeline-ruler");
    const container = document.getElementById("timeline-scroll-container");
    const playheadHandle = document.querySelector(".timeline-playhead-handle");
    if (ruler && container) {
        let isScrubbing = false;

        const scrub = (e) => {
            if (!state.timelineData) return;
            const rect = ruler.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const pxPerSecond = state.timelineData.zoom || 50;
            let time = x / pxPerSecond;
            // Bound checks
            time = Math.max(0, Math.min(state.timelineData.totalTime, time));
            
            // Snap playhead to clip boundaries
            const snapTargets = [0.0];
            if (state.timelineData.clips) {
                state.timelineData.clips.forEach(c => {
                    snapTargets.push(c.startOffset || 0);
                    snapTargets.push((c.startOffset || 0) + (c.duration || 0));
                });
            }
            const uniqueSnapTargets = [...new Set(snapTargets)];
            const snapThreshold = 8 / pxPerSecond; // 8px threshold
            for (const target of uniqueSnapTargets) {
                if (Math.abs(time - target) < snapThreshold) {
                    time = target;
                    break;
                }
            }
            
            state.timelineData.currentTime = time;
            updatePlayheadUI(pxPerSecond);
            updateTimeDisplay();
            
            // Sync canvas item display immediately
            import("../timeline-player.js").then(module => {
                module.syncCanvasWithCurrentTime();
            });
        };

        const onMouseDown = (e) => {
            isScrubbing = true;
            scrub(e);
            e.stopPropagation();
        };

        ruler.addEventListener("mousedown", onMouseDown);
        if (playheadHandle) {
            playheadHandle.addEventListener("mousedown", onMouseDown);
        }

        window.addEventListener("mousemove", (e) => {
            if (isScrubbing) scrub(e);
        });

        window.addEventListener("mouseup", () => {
            isScrubbing = false;
        });

        // Ctrl + Scroll on Timeline for Zoom
        const timelinePanel = document.getElementById("timeline-panel");
        if (timelinePanel) {
            timelinePanel.addEventListener("wheel", (e) => {
                if (e.ctrlKey) {
                    e.preventDefault();
                    // Determine zoom direction
                    const zoomFactor = e.deltaY > 0 ? -5 : 5;
                    if (state.timelineData) {
                        let newZoom = (state.timelineData.zoom || 50) + zoomFactor;
                        newZoom = Math.max(10, Math.min(newZoom, 500)); // Min 10px/s, Max 500px/s
                        state.timelineData.zoom = newZoom;
                        
                        // Update slider UI
                        const zoomSlider = document.getElementById("timeline-zoom-slider");
                        if (zoomSlider) zoomSlider.value = newZoom;
                        
                        // Re-render
                        renderTimeline();
                    }
                }
            }, { passive: false });
        }
    }
}
