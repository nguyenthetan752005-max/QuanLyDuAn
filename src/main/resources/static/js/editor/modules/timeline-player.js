import { state } from "./state.js";

let isPlaying = false;
let animationFrameId = null;
let lastFrameTime = 0;

/**
 * Synchronize canvas items visibility based on current timeline playhead time
 */
export function syncCanvasWithCurrentTime() {
    if (!state.timelineData) return;
    const t = state.timelineData.currentTime || 0;
    const artboard = document.querySelector('.artboard');
    if (!artboard) return;

    if (!state.timelineData.clips) return;

    let selectionChanged = false;

    state.timelineData.clips.forEach(clip => {
        const itemEl = artboard.querySelector(`[data-instance-id="${clip.id}"]`);
        if (!itemEl) return;

        const track = state.timelineData.tracks.find(tr => tr.id === clip.trackId);
        const isHidden = track && track.hidden;

        const start = clip.startOffset || 0;
        const end = start + (clip.duration || 5.0);

        if (t >= start && t <= end) {
            if (isHidden) {
                itemEl.style.opacity = "0";
                itemEl.style.pointerEvents = "none";
            } else {
                itemEl.style.opacity = "";
                itemEl.style.pointerEvents = "";
            }
            
            // Sync zIndex in real time based on track order
            const trackIndex = state.timelineData.tracks.findIndex(tr => tr.id === clip.trackId);
            if (trackIndex !== -1) {
                itemEl.style.zIndex = state.timelineData.tracks.length - trackIndex;
            }
            
            // Sync media playback frame (video & audio)
            const media = itemEl.querySelector("video, audio");
            if (media) {
                // Apply track mute status
                media.muted = track ? !!track.muted : false;
 
                const relativeTime = t - start;
                const trimStart = clip.trimStart || 0;
                const targetMediaTime = relativeTime + trimStart;
                const outOfSync = Math.abs(media.currentTime - targetMediaTime);
                
                if (state.isExporting) {
                    // During export, only seek if the media is paused or if it's severely out of sync (> 1.0s)
                    if (media.paused || outOfSync > 1.0) {
                        media.currentTime = targetMediaTime;
                    }
                    if (isPlaying && media.paused) {
                        const p = media.play();
                        if (p) p.catch(() => {});
                    }
                } else {
                    // Avoid aggressive seeking during playback which stalls the decoder.
                    // When playing, only seek if out of sync by >0.5s. When paused, scrub aggressively.
                    // Never seek if the media is already seeking, or if it is hidden during active playback
                    // to prevent audio stuttering caused by browser video decoder throttling.
                    if (!media.seeking && (!isPlaying || !isHidden)) {
                        const syncThreshold = isPlaying ? 0.5 : 0.05;
                        if (outOfSync > syncThreshold) {
                            media.currentTime = targetMediaTime;
                        }
                    }
                    
                    if (isPlaying) {
                        if (media.paused) {
                            // Seek to start position once when starting playback, even if hidden
                            if (!media.seeking && outOfSync > 0.5) {
                                media.currentTime = targetMediaTime;
                            }
                            const p = media.play();
                            if (p) p.catch(() => {});
                        }
                    } else {
                        if (!media.paused) media.pause();
                    }
                }
            }
        } else {
            itemEl.style.opacity = "0";
            itemEl.style.pointerEvents = "none";
            
            const media = itemEl.querySelector("video, audio");
            
            // Pre-seek (warm up) upcoming media in the background
            const prepOffset = 1.5;
            if (media && !media.seeking && t >= start - prepOffset && t < start && !isHidden) {
                const trimStart = clip.trimStart || 0;
                const outOfSync = Math.abs(media.currentTime - trimStart);
                if (outOfSync > 0.1) {
                    media.currentTime = trimStart;
                }
            } else if (media && !media.paused) {
                // Pause media if hidden and not in pre-seek window
                media.pause();
            }
            
            // If the active item gets hidden, deselect it
            if (state.activeInstanceId === clip.id) {
                state.activeInstanceId = null;
                selectionChanged = true;
            }
        }
    });

    if (selectionChanged) {
        import("./ui/index.js").then(ui => ui.renderApp());
    }
}

/**
 * Animation frame loop to advance playhead
 */
function playbackLoop(timestamp) {
    if (!isPlaying) return;

    if (!lastFrameTime) lastFrameTime = timestamp;
    const elapsedSeconds = (timestamp - lastFrameTime) / 1000;
    lastFrameTime = timestamp;

    if (state.timelineData) {
        let newTime = (state.timelineData.currentTime || 0) + elapsedSeconds;
        const total = state.timelineData.totalTime ?? 0.0;

        if (newTime >= total) {
            newTime = total;
            pauseTimeline();
        }

        state.timelineData.currentTime = newTime;

        // Dispatch timeupdate event to let UI update
        window.dispatchEvent(new CustomEvent("timeline:timeupdate"));

        // Sync canvas visibility
        syncCanvasWithCurrentTime();
    }

    if (isPlaying) {
        animationFrameId = requestAnimationFrame(playbackLoop);
    }
}

/**
 * Start timeline playback
 */
export function playTimeline() {
    if (isPlaying) return;
    isPlaying = true;
    lastFrameTime = 0;

    // Toggle button UI to Pause
    const playBtn = document.getElementById("timeline-play-btn");
    if (playBtn) {
        playBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <rect x="5" y="4" width="4" height="16" rx="1"></rect>
                <rect x="15" y="4" width="4" height="16" rx="1"></rect>
            </svg>
        `;
        playBtn.title = "Tạm dừng (Space)";
    }
    
    // Satisfy browser autoplay policies requiring synchronous user gestures.
    // Loop through all clips on the timeline and warm up their respective media elements.
    const artboard = document.querySelector('.artboard');
    if (artboard && state.timelineData) {
        const t = state.timelineData.currentTime || 0;
        state.timelineData.clips?.forEach(clip => {
            const itemEl = artboard.querySelector(`[data-instance-id="${clip.id}"]`);
            if (itemEl) {
                const media = itemEl.querySelector("video, audio");
                if (media) {
                    const start = clip.startOffset || 0;
                    const end = start + (clip.duration || 5.0);
                    if (t >= start && t <= end) {
                        if (media.paused) {
                            const p = media.play();
                            if (p) p.catch(e => console.warn("Active media autoplay blocked:", e));
                        }
                    } else {
                        // Warm up inactive/hidden media: play briefly with sound muted and then pause.
                        // This registers the user interaction gesture and unlocks asynchronous play() calls.
                        if (media.paused) {
                            const wasMuted = media.muted;
                            media.muted = true;
                            const p = media.play();
                            if (p) {
                                p.then(() => {
                                    media.pause();
                                    media.muted = wasMuted;
                                }).catch(e => {
                                    media.muted = wasMuted;
                                    console.warn("Inactive media warm-up failed:", e);
                                });
                            }
                        }
                    }
                }
            }
        });
    }

    animationFrameId = requestAnimationFrame(playbackLoop);
}

/**
 * Pause timeline playback
 */
export function pauseTimeline() {
    if (!isPlaying) return;
    isPlaying = false;
    if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
    }

    // Toggle button UI to Play
    const playBtn = document.getElementById("timeline-play-btn");
    if (playBtn) {
        playBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <polygon points="5 3 19 12 5 21 5 3"></polygon>
            </svg>
        `;
        playBtn.title = "Phát (Space)";
    }

    const artboard = document.querySelector('.artboard');
    if (artboard) {
        const mediaElements = artboard.querySelectorAll("video, audio");
        mediaElements.forEach(m => m.pause());
    }
}

/**
 * Stop timeline playback and reset to 0
 */
export function stopTimeline() {
    pauseTimeline();
    if (state.timelineData) {
        state.timelineData.currentTime = 0;
        window.dispatchEvent(new CustomEvent("timeline:timeupdate"));
        syncCanvasWithCurrentTime();
    }
}

/**
 * Toggle between Play and Pause
 */
export function togglePlayPause() {
    if (isPlaying) {
        pauseTimeline();
    } else {
        // If playhead is at the end, reset to 0 before playing
        if (state.timelineData && state.timelineData.currentTime >= state.timelineData.totalTime) {
            state.timelineData.currentTime = 0;
        }
        playTimeline();
    }
}

/**
 * Bind playback buttons click listeners and Space keyboard shortcut
 */
export function initTimelinePlayer() {
    const playBtn = document.getElementById("timeline-play-btn");
    playBtn?.addEventListener("click", () => {
        togglePlayPause();
    });

    const stopBtn = document.getElementById("timeline-stop-btn");
    stopBtn?.addEventListener("click", () => {
        stopTimeline();
    });

    // Prevent default browser scrolling on spacebar keydown
    window.addEventListener("keydown", (e) => {
        if (e.code === "Space") {
            const activeEl = document.activeElement;
            const isEditingText = activeEl && (
                activeEl.tagName === "INPUT" ||
                activeEl.tagName === "TEXTAREA" ||
                activeEl.contentEditable === "true"
            );
            if (!isEditingText && state.projectType === 'VIDEO') {
                e.preventDefault();
            }
        }
    });

    // Space key up handler: toggle play when appropriate (not editing, didn't pan)
    window.addEventListener("keyup", (e) => {
        if (e.code === "Space") {
            const activeEl = document.activeElement;
            const isEditingText = activeEl && (
                activeEl.tagName === "INPUT" ||
                activeEl.tagName === "TEXTAREA" ||
                activeEl.contentEditable === "true"
            );
            
            if (!isEditingText && state.projectType === 'VIDEO') {
                if (state.hasPanned) {
                    state.hasPanned = false; // Reset flag and skip playback toggle
                    return;
                }
                togglePlayPause();
            }
        }
    });
}
