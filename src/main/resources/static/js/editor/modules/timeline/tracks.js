import { state, addToCanvas, updateClipTiming, removeFromCanvas } from "../state.js";
import { renderApp } from "../ui/index.js";
import { pushState } from "../history.js";
import { recalculateTotalTime, resolveTrackCollisions } from "./sync.js";
import { customAlert } from "../custom-dialogs.js";

export function addNewTrack(trackName = "Lớp mới", type = "video") {
    if (!state.timelineData) return;
    const trackId = `track-${Date.now()}`;
    const newTrack = {
        id: trackId,
        name: trackName,
        type: type
    };
    
    if (type === "video") {
        const firstAudioIndex = state.timelineData.tracks.findIndex(t => t.type === "audio");
        if (firstAudioIndex !== -1) {
            state.timelineData.tracks.splice(firstAudioIndex, 0, newTrack);
        } else {
            state.timelineData.tracks.push(newTrack);
        }
    } else {
        state.timelineData.tracks.push(newTrack);
    }
    
    state.activeTrackId = trackId; // Set newly created track as active
    renderApp();
}

export function deleteTrack(trackId) {
    if (!state.timelineData) return;

    pushState(); // Save undo state

    // 1. Get clips on this track
    const clipsToRemove = state.timelineData.clips.filter(c => c.trackId === trackId);
    const clipIdsToRemove = new Set(clipsToRemove.map(c => c.id));
    
    // 2. Remove clips from timeline
    state.timelineData.clips = state.timelineData.clips.filter(c => c.trackId !== trackId);
    
    // 3. Remove corresponding canvas items
    state.canvasItems = state.canvasItems.filter(i => !clipIdsToRemove.has(i.instanceId));
    
    // 4. Remove track from tracks list
    state.timelineData.tracks = state.timelineData.tracks.filter(t => t.id !== trackId);
    
    // 5. Update activeTrackId if it was deleted
    if (state.activeTrackId === trackId) {
        state.activeTrackId = state.timelineData.tracks.length > 0 ? state.timelineData.tracks[0].id : null;
    }
    if (state.activeInstanceId && clipIdsToRemove.has(state.activeInstanceId)) {
        state.activeInstanceId = null;
    }
    
    recalculateTotalTime();
    renderApp();
}

export function addMediaToTrack(tabId, trackId, startOffset = 0) {
    const tab = state.tabs.find(t => t.id === tabId);
    if (!tab) return;

    // Validate track type compatibility (audio files only on audio tracks, image/video on video tracks)
    const targetTrack = state.timelineData && state.timelineData.tracks.find(t => t.id === trackId);
    const isAudio = (tab.file && tab.file.type && tab.file.type.startsWith("audio/")) ||
                    (tab.name || "").match(/\.(mp3|wav|ogg|aac|flac|m4a)$/i);

    if (isAudio && targetTrack && targetTrack.type !== 'audio') {
        import("../notifications.js").then(m => m.showWarning("Không thể kéo tệp âm thanh vào lớp video.")).catch(e => console.error(e));
        return;
    }
    if (!isAudio && targetTrack && targetTrack.type === 'audio') {
        import("../notifications.js").then(m => m.showWarning("Không thể kéo tệp hình ảnh/video vào lớp âm thanh.")).catch(e => console.error(e));
        return;
    }

    pushState();

    // 1. Add to canvas (this handles creating canvas element and fetching dimensions)
    const item = addToCanvas(tabId);
    if (!item) return;

    // 2. Determine duration
    let duration = 5.0;
    if (tab.videoDuration) {
        duration = tab.videoDuration;
    }

    // 3. Create timeline clip
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
    if (!state.timelineData.clips) state.timelineData.clips = [];

    // Determine compatible track based on item type and target trackId
    let finalTrackId = trackId;
    if (isAudio) {
        if (!targetTrack || targetTrack.type !== 'audio') {
            const audioTrack = state.timelineData.tracks.find(t => t.type === 'audio');
            finalTrackId = audioTrack ? audioTrack.id : 'audio';
        }
    } else {
        if (targetTrack && targetTrack.type === 'audio') {
            const videoTrack = state.timelineData.tracks.find(t => t.type === 'video');
            finalTrackId = videoTrack ? videoTrack.id : 'video';
        }
    }

    // Filter out any clip that was auto-added synchronously on Canvas state change
    state.timelineData.clips = state.timelineData.clips.filter(c => c.id !== item.instanceId);

    // Add the new clip at the drop position
    state.timelineData.clips.push({
        id: item.instanceId,
        trackId: finalTrackId,
        name: tab.name,
        startOffset: Math.max(0, startOffset),
        duration: duration,
        trimStart: 0
    });

    resolveTrackCollisions(finalTrackId, item.instanceId);
    recalculateTotalTime();
    renderApp();
}

export function splitClipAtCurrentTime(clipId) {
    if (!state.timelineData || !state.timelineData.clips) return;
    const clipIndex = state.timelineData.clips.findIndex(c => c.id === clipId);
    if (clipIndex === -1) return;
    const clip = state.timelineData.clips[clipIndex];

    const t = state.timelineData.currentTime || 0;
    const start = clip.startOffset || 0;
    const end = start + (clip.duration || 5.0);

    // Can only split if playhead is strictly inside the clip range
    if (t <= start || t >= end) {
        customAlert("Nhắc nhở", "Vui lòng di chuyển thanh thời gian (playhead màu đỏ) vào giữa đoạn clip cần cắt.");
        return;
    }

    pushState(); // Save state for undo/redo

    // 1. Calculate new durations
    const duration1 = t - start;
    const duration2 = end - t;

    // 2. Find matching canvas item
    const itemIndex = state.canvasItems.findIndex(i => i.instanceId === clip.id);
    if (itemIndex === -1) return;
    const item = state.canvasItems[itemIndex];

    // 3. Create a deep copy of the canvas item with a new instanceId
    const newInstanceId = `${item.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const newItem = JSON.parse(JSON.stringify(item));
    newItem.instanceId = newInstanceId;
    newItem.zIndex = state.canvasItems.length + 1;

    // Insert the new item into canvasItems list
    state.canvasItems.push(newItem);

    // 4. Update the first clip's duration and ensure trimStart is defined
    updateClipTiming(clip.id, { duration: duration1, trimStart: clip.trimStart || 0 });

    // 5. Create the second clip in timelineData with adjusted trimStart
    const newClip = {
        id: newInstanceId,
        trackId: clip.trackId,
        name: clip.name,
        startOffset: t,
        duration: duration2,
        trimStart: (clip.trimStart || 0) + duration1
    };
    state.timelineData.clips.push(newClip);

    renderApp();
}
