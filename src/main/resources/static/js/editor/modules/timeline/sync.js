import { state } from "../state.js";

export function recalculateTotalTime() {
    if (!state.timelineData) return;
    let maxEnd = 0.0;
    if (state.timelineData.clips && state.timelineData.clips.length > 0) {
        state.timelineData.clips.forEach(clip => {
            const end = (clip.startOffset || 0) + (clip.duration || 0);
            if (end > maxEnd) {
                maxEnd = end;
            }
        });
    }
    state.timelineData.totalTime = maxEnd;

    // Clamp playhead currentTime to the new total duration
    if (maxEnd === 0.0) {
        state.timelineData.currentTime = 0.0;
        window.dispatchEvent(new CustomEvent("timeline:timeupdate"));
    } else if ((state.timelineData.currentTime || 0) > maxEnd) {
        state.timelineData.currentTime = maxEnd;
        window.dispatchEvent(new CustomEvent("timeline:timeupdate"));
    }
}

export function packClipsOnTrack(trackId) {
    // No longer aggressively pack clips to allow gaps.
    // Just sort them by startOffset.
    if (!state.timelineData || !state.timelineData.clips) return;
    const trackClips = state.timelineData.clips.filter(c => c.trackId === trackId);
    if (trackClips.length === 0) return;
    trackClips.sort((a, b) => a.startOffset - b.startOffset);
}

export function closeAllTimelineGaps() {
    if (!state.timelineData || !state.timelineData.clips || state.timelineData.clips.length === 0) {
        if (state.timelineData) {
            state.timelineData.totalTime = 0.0;
            state.timelineData.currentTime = 0.0;
            window.dispatchEvent(new CustomEvent("timeline:timeupdate"));
        }
        return;
    }

    // 1. Gather all clips across all tracks and sort them by startOffset
    const clips = [...state.timelineData.clips];
    clips.sort((a, b) => a.startOffset - b.startOffset);

    // 2. Identify gaps where NO clip covers the timeline and shift all subsequent clips
    let currentEnd = 0.0;

    clips.forEach(clip => {
        const start = clip.startOffset || 0;
        const duration = clip.duration || 0;

        if (start > currentEnd) {
            const gapDuration = start - currentEnd;
            const targetStart = start;
            state.timelineData.clips.forEach(c => {
                if (c.startOffset >= targetStart) {
                    c.startOffset -= gapDuration;
                }
            });
            clip.startOffset -= gapDuration;
        }

        const end = clip.startOffset + duration;
        if (end > currentEnd) {
            currentEnd = end;
        }
    });

    state.timelineData.totalTime = currentEnd;
    
    // Clamp playhead currentTime to the new total duration
    if ((state.timelineData.currentTime || 0) > currentEnd) {
        state.timelineData.currentTime = currentEnd;
        window.dispatchEvent(new CustomEvent("timeline:timeupdate"));
    }
}

export function packAllTracks() {
    // Instead of forcing track-specific packing, close global timeline gaps
    closeAllTimelineGaps();
}

export function packAndSyncTrackDOM(trackId, draggedClipId = null, draggedClipTempOffset = null) {
    if (!state.timelineData || !state.timelineData.tracks || !state.timelineData.clips) return;
    const track = state.timelineData.tracks.find(t => t.id === trackId);
    if (!track) return;

    const trackClips = state.timelineData.clips.filter(c => c.trackId === trackId);
    if (trackClips.length === 0) return;

    const pxPerSecond = state.timelineData.zoom || 50;

    trackClips.forEach(clip => {
        let offset = clip.startOffset;
        if (clip.id === draggedClipId && draggedClipTempOffset !== null) {
            offset = draggedClipTempOffset;
        }

        // Update DOM style in real-time
        const clipEl = document.querySelector(`.timeline-clip[data-clip-id="${clip.id}"]`);
        if (clipEl) {
            clipEl.style.left = `${offset * pxPerSecond}px`;
            clipEl.style.width = `${clip.duration * pxPerSecond}px`;
        }
    });
}

export function syncClipsWithCanvasItems() {
    if (!state.timelineData) return;
    if (!state.timelineData.clips) state.timelineData.clips = [];

    const currentItemIds = new Set(state.canvasItems.map(i => i.instanceId));

    // 1. Remove clips that no longer have a corresponding canvas item
    state.timelineData.clips = state.timelineData.clips.filter(clip => currentItemIds.has(clip.id));

    // 2. Add clips for canvas items that don't have one yet
    state.canvasItems.forEach(item => {
        const hasClip = state.timelineData.clips.some(c => c.id === item.instanceId);
        if (!hasClip) {
            let trackId = state.activeTrackId;
            let name = item.type === 'text' ? (item.text || 'Văn bản') : 'Hình ảnh';
            let duration = 5.0;
            
            const tab = item.tabId ? state.tabs.find(t => t.id === item.tabId) : null;
            const isAudio = (tab && tab.file && tab.file.type && tab.file.type.startsWith("audio/")) ||
                            (tab && (tab.name || "").match(/\\.(mp3|wav|ogg|aac|flac|m4a)$/i));

            if (tab) {
                name = tab.name;
                if (tab.videoDuration) {
                    duration = tab.videoDuration;
                }
            }

            // Determine compatible track based on item type
            let activeTrack = state.timelineData.tracks.find(t => t.id === trackId);
            if (state.timelineData.tracks.length === 0) {
                const type = isAudio ? 'audio' : 'video';
                const defaultName = type === 'audio' ? 'Lớp Audio mới' : 'Lớp Video mới';
                const newTrackId = `track-${Date.now()}`;
                state.timelineData.tracks.push({
                    id: newTrackId,
                    name: defaultName,
                    type: type
                });
                trackId = newTrackId;
                state.activeTrackId = newTrackId;
            } else if (isAudio) {
                if (!activeTrack || activeTrack.type !== 'audio') {
                    const audioTrack = state.timelineData.tracks.find(t => t.type === 'audio' || t.id === 'audio');
                    trackId = audioTrack ? audioTrack.id : 'audio';
                }
            } else {
                // Both video/image and text go to visual (video) tracks
                if (!activeTrack || activeTrack.type !== 'video') {
                    const videoTrack = state.timelineData.tracks.find(t => t.type === 'video' || t.id === 'video');
                    trackId = videoTrack ? videoTrack.id : 'video';
                }
            }

            // Calculate startOffset (append adjacent to last clip if playhead is before the end)
            let startOffset = state.timelineData.currentTime || 0;
            const existingTrackClips = state.timelineData.clips.filter(c => c.trackId === trackId);
            if (existingTrackClips.length > 0) {
                let maxEnd = 0;
                existingTrackClips.forEach(c => {
                    const end = (c.startOffset || 0) + (c.duration || 0);
                    if (end > maxEnd) maxEnd = end;
                });
                if (startOffset < maxEnd) {
                    startOffset = maxEnd;
                }
            }

            state.timelineData.clips.push({
                id: item.instanceId,
                trackId: trackId,
                name: name,
                startOffset: startOffset,
                duration: duration,
                trimStart: 0
            });
        }
    });

    // 3. Update clip names for text items
    state.timelineData.clips.forEach(clip => {
        const item = state.canvasItems.find(i => i.instanceId === clip.id);
        if (item && item.type === 'text') {
            clip.name = item.text || 'Văn bản';
        }
    });

    // 4. Recalculate total time dynamically based on the current clips
    recalculateTotalTime();
}

export function resolveTrackCollisions(trackId, modifiedClipId) {
    if (!state.timelineData || !state.timelineData.clips) return;
    const trackClips = state.timelineData.clips
        .filter(c => c.trackId === trackId)
        .sort((a, b) => a.startOffset - b.startOffset);
    
    if (trackClips.length <= 1) return;
    
    for (let i = 1; i < trackClips.length; i++) {
        const prev = trackClips[i-1];
        const curr = trackClips[i];
        if (curr.startOffset < prev.startOffset + prev.duration) {
            curr.startOffset = prev.startOffset + prev.duration;
        }
    }
}

