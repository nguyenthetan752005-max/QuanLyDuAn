import { state, updateClipTiming } from "./state.js";
import { renderApp } from "./ui/index.js";
import { pauseTimeline, syncCanvasWithCurrentTime } from "./timeline-player.js";
import { packAndSyncTrackDOM, closeAllTimelineGaps, resolveTrackCollisions } from "./timeline.js";
import { pushState } from "./history.js";

/**
 * Check if a clip is an audio clip.
 */
function isAudioClip(clip) {
    const canvasItem = state.canvasItems.find(i => i.instanceId === clip.id);
    if (canvasItem) {
        if (canvasItem.type === 'text') return false;
        const tab = canvasItem.tabId ? state.tabs.find(t => t.id === canvasItem.tabId) : null;
        if (tab) {
            const isAudio = (tab.file && tab.file.type && tab.file.type.startsWith("audio/")) ||
                            (tab.name || "").match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i);
            return !!isAudio;
        }
    }
    // Fallback: check if the clip is on an audio track
    if (state.timelineData && state.timelineData.tracks) {
        const track = state.timelineData.tracks.find(t => t.id === clip.trackId);
        if (track) {
            return track.type === 'audio';
        }
    }
    return false;
}

/**
 * Initialize drag and resize actions for timeline clips
 */
export function initTimelineDrag() {
    const lanes = document.getElementById("timeline-lanes");
    if (!lanes) return;

    lanes.addEventListener("mousedown", (e) => {
        const handle = e.target.closest(".timeline-clip-handle");
        const clipEl = e.target.closest(".timeline-clip");
        if (!clipEl || !state.timelineData) return;

        const clipId = clipEl.dataset.clipId;
        const clip = state.timelineData.clips.find(c => c.id === clipId);
        if (!clip) return;

        e.preventDefault();
        e.stopPropagation();

        // Highlight active clip
        state.activeInstanceId = clip.id;
        state.activeTrackId = clip.trackId;
        document.querySelectorAll(".timeline-clip").forEach(el => el.classList.remove("is-active"));
        clipEl.classList.add("is-active");

        const pxPerSecond = state.timelineData.zoom || 50;
        const startX = e.clientX;
        const startY = e.clientY;
        const startOffset = clip.startOffset || 0;
        const startDuration = clip.duration || 5.0;
        const startTrimStart = clip.trimStart || 0;

        const originalTrackId = clip.trackId;
        const originalStartOffset = clip.startOffset;
        const originalDuration = clip.duration;
        const originalTrimStart = clip.trimStart;

        let mode = "drag";
        if (handle) {
            if (handle.classList.contains("left")) {
                mode = "resize-left";
            } else if (handle.classList.contains("right")) {
                mode = "resize-right";
            }
        }

        const scrollContainer = document.getElementById("timeline-scroll-container");
        const startScrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
        let startScrollLeftMutable = startScrollLeft;

        let hasMoved = false;
        let autoScrollSpeed = 0;
        let autoScrollId = null;
        let lastMoveEvent = null;

        function startAutoScroll() {
            if (autoScrollId) return;
            autoScrollId = requestAnimationFrame(function scrollLoop() {
                if (!autoScrollSpeed || !scrollContainer) {
                    autoScrollId = null;
                    return;
                }
                scrollContainer.scrollLeft += autoScrollSpeed;
                updatePosition(lastMoveEvent);
                autoScrollId = requestAnimationFrame(scrollLoop);
            });
        }

        const updatePosition = (moveEvt) => {
            if (!moveEvt) return;

            if (!state.timelineData || !state.timelineData.clips) return;
            const clipExists = state.timelineData.clips.some(c => c.id === clip.id);
            if (!clipExists) {
                autoScrollSpeed = 0;
                if (autoScrollId) {
                    cancelAnimationFrame(autoScrollId);
                    autoScrollId = null;
                }
                clipEl.classList.remove("is-dragging");
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
                window.removeEventListener("contextmenu", handleCancel);
                window.removeEventListener("blur", handleCancel);
                const snapGuide = document.getElementById("timeline-snap-guide");
                if (snapGuide) snapGuide.hidden = true;
                renderApp();
                return;
            }

            const currentScrollLeft = scrollContainer ? scrollContainer.scrollLeft : 0;
            const deltaX = moveEvt.clientX - startX + (currentScrollLeft - startScrollLeftMutable);
            const deltaTime = deltaX / pxPerSecond;

            // Collect snap targets: 0, playhead, and edges of other clips
            const snapTargets = [0.0];
            if (state.timelineData.currentTime !== undefined) {
                snapTargets.push(state.timelineData.currentTime);
            }
            state.timelineData.clips.forEach(c => {
                if (c.id !== clip.id) {
                    snapTargets.push(c.startOffset || 0);
                    snapTargets.push((c.startOffset || 0) + (c.duration || 0));
                }
            });
            const uniqueSnapTargets = [...new Set(snapTargets)].sort((a, b) => a - b);

            if (mode === "drag") {
                let newOffset = startOffset + deltaTime;
                newOffset = Math.max(0, newOffset);

                // Track dragging (vertical lane switching)
                let targetTrack = clip.trackId;
                const hoveredLaneEl = document.elementFromPoint(moveEvt.clientX, moveEvt.clientY)?.closest(".timeline-lane");
                if (hoveredLaneEl) {
                    const laneTrackId = hoveredLaneEl.dataset.trackId;
                    const track = state.timelineData.tracks.find(t => t.id === laneTrackId);
                    if (track) {
                        const isAudio = isAudioClip(clip);
                        const isTrackCompatible = isAudio ? (track.type === 'audio') : (track.type === 'video');
                        if (isTrackCompatible) {
                            targetTrack = track.id;
                        }
                    }
                }

                // If track changed, sync DOMs
                if (clip.trackId !== targetTrack) {
                    const oldTrackId = clip.trackId;
                    updateClipTiming(clip.id, { trackId: targetTrack });
                    state.activeTrackId = targetTrack;

                    const targetLaneEl = lanes.querySelector(`.timeline-lane[data-track-id="${targetTrack}"]`);
                    if (targetLaneEl && clipEl.parentElement !== targetLaneEl) {
                        targetLaneEl.appendChild(clipEl);

                        lanes.querySelectorAll(".timeline-lane").forEach(l => l.classList.remove("is-active"));
                        targetLaneEl.classList.add("is-active");

                        const headersContainer = document.getElementById("timeline-track-headers");
                        if (headersContainer) {
                            headersContainer.querySelectorAll(".timeline-track-header").forEach(h => {
                                h.classList.toggle("is-active", h.dataset.trackId === targetTrack);
                            });
                        }
                    }

                    packAndSyncTrackDOM(oldTrackId);
                    packAndSyncTrackDOM(targetTrack);
                }

                // Get other clips on target track
                let trackClips = state.timelineData.clips
                    .filter(c => c.trackId === targetTrack && c.id !== clip.id)
                    .sort((a, b) => a.startOffset - b.startOffset);

                // Swap logic using unconstrained center
                let swapped = false;
                const clipCenter = newOffset + clip.duration / 2;
                const leftNeighbor = [...trackClips].reverse().find(c => c.startOffset <= clip.startOffset);
                const rightNeighbor = trackClips.find(c => c.startOffset >= clip.startOffset);

                if (leftNeighbor) {
                    const leftCenter = leftNeighbor.startOffset + leftNeighbor.duration / 2;
                    if (clipCenter < leftCenter) {
                        const oldLeftStart = leftNeighbor.startOffset;
                        leftNeighbor.startOffset = oldLeftStart + clip.duration;
                        clip.startOffset = oldLeftStart;

                        // Update closure
                        startOffset = clip.startOffset;
                        startX = moveEvt.clientX;
                        startScrollLeftMutable = currentScrollLeft;
                        swapped = true;
                    }
                }
                if (!swapped && rightNeighbor) {
                    const rightCenter = rightNeighbor.startOffset + rightNeighbor.duration / 2;
                    if (clipCenter > rightCenter) {
                        const oldClipStart = clip.startOffset;
                        const oldRightStart = rightNeighbor.startOffset;
                        rightNeighbor.startOffset = oldClipStart;
                        clip.startOffset = oldClipStart + rightNeighbor.duration;

                        // Update closure
                        startOffset = clip.startOffset;
                        startX = moveEvt.clientX;
                        startScrollLeftMutable = currentScrollLeft;
                        swapped = true;
                    }
                }

                if (swapped) {
                    // Re-sort track clips since offsets changed
                    trackClips = state.timelineData.clips
                        .filter(c => c.trackId === targetTrack && c.id !== clip.id)
                        .sort((a, b) => a.startOffset - b.startOffset);
                    newOffset = clip.startOffset;
                } else {
                    // Overlap prevention on target track
                    const leftClip = [...trackClips].reverse().find(c => c.startOffset <= newOffset);
                    const rightClip = trackClips.find(c => c.startOffset >= newOffset);

                    if (leftClip) {
                        newOffset = Math.max(newOffset, leftClip.startOffset + leftClip.duration);
                    }
                    if (rightClip) {
                        newOffset = Math.min(newOffset, rightClip.startOffset - clip.duration);
                    }
                }

                newOffset = Math.max(0, newOffset);

                // Snap (only if not swapped)
                let snappedTime = null;
                if (!swapped) {
                    const snapThreshold = 10 / pxPerSecond;
                    let snapped = false;
                    for (const target of uniqueSnapTargets) {
                        if (Math.abs(newOffset - target) < snapThreshold) {
                            const tempOffset = target;
                            const leftClip = [...trackClips].reverse().find(c => c.startOffset <= tempOffset);
                            const rightClip = trackClips.find(c => c.startOffset >= tempOffset);
                            const fits = (!leftClip || leftClip.startOffset + leftClip.duration <= tempOffset) &&
                                         (!rightClip || tempOffset + clip.duration <= rightClip.startOffset);
                            if (fits) {
                                newOffset = tempOffset;
                                snappedTime = target;
                                snapped = true;
                                break;
                            }
                        }
                    }
                    if (!snapped) {
                        for (const target of uniqueSnapTargets) {
                            if (Math.abs((newOffset + clip.duration) - target) < snapThreshold) {
                                const tempOffset = target - clip.duration;
                                if (tempOffset >= 0) {
                                    const leftClip = [...trackClips].reverse().find(c => c.startOffset <= tempOffset);
                                    const rightClip = trackClips.find(c => c.startOffset >= tempOffset);
                                    const fits = (!leftClip || leftClip.startOffset + leftClip.duration <= tempOffset) &&
                                                 (!rightClip || tempOffset + clip.duration <= rightClip.startOffset);
                                    if (fits) {
                                        newOffset = tempOffset;
                                        snappedTime = target;
                                        break;
                                    }
                                }
                            }
                        }
                    }
                }

                updateClipTiming(clip.id, { startOffset: newOffset });
                packAndSyncTrackDOM(targetTrack, clip.id, newOffset);

                // Update Snap Guide Line
                const snapGuide = document.getElementById("timeline-snap-guide");
                if (snapGuide) {
                    if (snappedTime !== null) {
                        snapGuide.hidden = false;
                        snapGuide.style.left = `${snappedTime * pxPerSecond}px`;
                    } else {
                        snapGuide.hidden = true;
                    }
                }

                // Expand totalTime if dragged past it
                const end = clip.startOffset + clip.duration;
                if (end > state.timelineData.totalTime) {
                    state.timelineData.totalTime = end;
                }

            } else if (mode === "resize-left") {
                let newOffset = startOffset + deltaTime;
                newOffset = Math.max(0, newOffset);

                const trackClips = state.timelineData.clips
                    .filter(c => c.trackId === clip.trackId && c.id !== clip.id)
                    .sort((a, b) => a.startOffset - b.startOffset);
                const leftClip = [...trackClips].reverse().find(c => c.startOffset <= startOffset);

                if (leftClip) {
                    newOffset = Math.max(newOffset, leftClip.startOffset + leftClip.duration);
                }

                // Trim limit and minimum duration of 0.2s
                const maxOffset = startOffset + startDuration - 0.2;
                newOffset = Math.min(newOffset, maxOffset);

                let actualDelta = newOffset - startOffset;
                if (startTrimStart + actualDelta < 0) {
                    newOffset = startOffset - startTrimStart;
                    actualDelta = -startTrimStart;
                }

                // Snap left edge
                let snappedTime = null;
                const snapThreshold = 10 / pxPerSecond;
                for (const target of uniqueSnapTargets) {
                    if (Math.abs(newOffset - target) < snapThreshold) {
                        const tempOffset = target;
                        const leftFit = !leftClip || (leftClip.startOffset + leftClip.duration <= tempOffset);
                        const durationFit = (startOffset + startDuration) - tempOffset >= 0.2;
                        const trimStartFit = startTrimStart + (tempOffset - startOffset) >= 0;
                        if (leftFit && durationFit && trimStartFit) {
                            newOffset = tempOffset;
                            actualDelta = newOffset - startOffset;
                            snappedTime = target;
                            break;
                        }
                    }
                }

                updateClipTiming(clip.id, {
                    startOffset: newOffset,
                    trimStart: startTrimStart + actualDelta,
                    duration: startDuration - actualDelta
                });

                packAndSyncTrackDOM(clip.trackId);

                const snapGuide = document.getElementById("timeline-snap-guide");
                if (snapGuide) {
                    if (snappedTime !== null) {
                        snapGuide.hidden = false;
                        snapGuide.style.left = `${snappedTime * pxPerSecond}px`;
                    } else {
                        snapGuide.hidden = true;
                    }
                }

            } else if (mode === "resize-right") {
                let newDuration = startDuration + deltaTime;
                newDuration = Math.max(0.2, newDuration);

                // Original source duration limits
                const canvasItem = state.canvasItems.find(i => i.instanceId === clip.id);
                let maxDuration = Infinity;
                if (canvasItem && canvasItem.tabId) {
                    const tab = state.tabs.find(t => t.id === canvasItem.tabId);
                    if (tab && tab.videoDuration) {
                        maxDuration = tab.videoDuration - (clip.trimStart || 0);
                    }
                }
                newDuration = Math.min(newDuration, maxDuration);

                // Right neighbor limits
                const trackClips = state.timelineData.clips
                    .filter(c => c.trackId === clip.trackId && c.id !== clip.id)
                    .sort((a, b) => a.startOffset - b.startOffset);
                const rightClip = trackClips.find(c => c.startOffset >= startOffset + startDuration);
                if (rightClip) {
                    newDuration = Math.min(newDuration, rightClip.startOffset - startOffset);
                }

                let newEnd = startOffset + newDuration;

                // Snap right edge
                let snappedTime = null;
                const snapThreshold = 10 / pxPerSecond;
                for (const target of uniqueSnapTargets) {
                    if (Math.abs(newEnd - target) < snapThreshold) {
                        const tempDuration = target - startOffset;
                        const rightFit = !rightClip || (startOffset + tempDuration <= rightClip.startOffset);
                        const durationFit = tempDuration >= 0.2;
                        const sourceFit = tempDuration <= maxDuration;
                        if (rightFit && durationFit && sourceFit) {
                            newDuration = tempDuration;
                            newEnd = target;
                            snappedTime = target;
                            break;
                        }
                    }
                }

                updateClipTiming(clip.id, { duration: newDuration });
                packAndSyncTrackDOM(clip.trackId);

                const snapGuide = document.getElementById("timeline-snap-guide");
                if (snapGuide) {
                    if (snappedTime !== null) {
                        snapGuide.hidden = false;
                        snapGuide.style.left = `${snappedTime * pxPerSecond}px`;
                    } else {
                        snapGuide.hidden = true;
                    }
                }

                // Expand totalTime if resized past it
                const end = clip.startOffset + clip.duration;
                if (end > state.timelineData.totalTime) {
                    state.timelineData.totalTime = end;
                }
            }

            // Sync visible canvas items immediately in real time
            syncCanvasWithCurrentTime();
        };

        const handleMouseMove = (moveEvt) => {
            lastMoveEvent = moveEvt;

            if (!hasMoved) {
                const dist = Math.sqrt(Math.pow(moveEvt.clientX - startX, 2) + Math.pow(moveEvt.clientY - startY, 2));
                if (dist > 4) {
                    pushState(); // Save state BEFORE we start modifying offsets
                    hasMoved = true;
                    pauseTimeline();
                    clipEl.classList.add("is-dragging");
                } else {
                    return;
                }
            }

            // Auto-scroll logic
            if (scrollContainer) {
                const rect = scrollContainer.getBoundingClientRect();
                const edgeSize = 40;
                if (moveEvt.clientX < rect.left + edgeSize) {
                    autoScrollSpeed = -8;
                    startAutoScroll();
                } else if (moveEvt.clientX > rect.right - edgeSize) {
                    autoScrollSpeed = 8;
                    startAutoScroll();
                } else {
                    autoScrollSpeed = 0;
                }
            }

            updatePosition(moveEvt);
        };

        const handleMouseUp = (upEvt) => {
            autoScrollSpeed = 0;
            if (autoScrollId) {
                cancelAnimationFrame(autoScrollId);
                autoScrollId = null;
            }

            let reverted = false;
            if (mode === "drag" && hasMoved) {
                const finalLaneEl = document.elementFromPoint(upEvt.clientX, upEvt.clientY)?.closest(".timeline-lane");
                if (!finalLaneEl) {
                    reverted = true;
                } else {
                    const targetTrack = state.timelineData.tracks.find(t => t.id === finalLaneEl.dataset.trackId);
                    if (!targetTrack) {
                        reverted = true;
                    } else {
                        const isAudio = isAudioClip(clip);
                        const isTrackCompatible = isAudio ? (targetTrack.type === 'audio') : (targetTrack.type === 'video');
                        if (!isTrackCompatible) {
                            reverted = true;
                        }
                    }
                }
            }

            if (reverted && mode === "drag") {
                clip.trackId = originalTrackId;
                clip.startOffset = originalStartOffset;

                // Move back DOM element
                const origLaneEl = lanes.querySelector(`.timeline-lane[data-track-id="${originalTrackId}"]`);
                if (origLaneEl && clipEl.parentElement !== origLaneEl) {
                    origLaneEl.appendChild(clipEl);
                }
            }

            clipEl.classList.remove("is-dragging");
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("contextmenu", handleCancel);
            window.removeEventListener("blur", handleCancel);

            const snapGuide = document.getElementById("timeline-snap-guide");
            if (snapGuide) snapGuide.hidden = true;

            if (hasMoved) {
                const targetTrackId = clip.trackId;
                resolveTrackCollisions(targetTrackId, clip.id);
                packAndSyncTrackDOM(targetTrackId);
                if (originalTrackId !== targetTrackId) {
                    resolveTrackCollisions(originalTrackId);
                    packAndSyncTrackDOM(originalTrackId);
                }
                closeAllTimelineGaps();
            }

            renderApp();
        };

        const handleCancel = () => {
            autoScrollSpeed = 0;
            if (autoScrollId) {
                cancelAnimationFrame(autoScrollId);
                autoScrollId = null;
            }

            clip.trackId = originalTrackId;
            clip.startOffset = originalStartOffset;
            clip.duration = originalDuration;
            clip.trimStart = originalTrimStart;

            const origLaneEl = lanes.querySelector(`.timeline-lane[data-track-id="${originalTrackId}"]`);
            if (origLaneEl && clipEl.parentElement !== origLaneEl) {
                origLaneEl.appendChild(clipEl);
            }

            clipEl.classList.remove("is-dragging");
            window.removeEventListener("mousemove", handleMouseMove);
            window.removeEventListener("mouseup", handleMouseUp);
            window.removeEventListener("contextmenu", handleCancel);
            window.removeEventListener("blur", handleCancel);

            const snapGuide = document.getElementById("timeline-snap-guide");
            if (snapGuide) snapGuide.hidden = true;

            renderApp();
        };

        window.addEventListener("mousemove", handleMouseMove);
        window.addEventListener("mouseup", handleMouseUp);
        window.addEventListener("contextmenu", handleCancel);
        window.addEventListener("blur", handleCancel);
    });
}
