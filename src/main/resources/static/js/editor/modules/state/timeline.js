import { state } from "./store.js";
import { renderApp } from "../ui/index.js";
import { pushState } from "../history.js";

function syncZIndexWithTracks() {
    if (!state.timelineData || !state.timelineData.tracks || !state.canvasItems) return;
    let z = 1;
    // Iterate from bottom track to top track so top track gets highest zIndex
    for (let i = state.timelineData.tracks.length - 1; i >= 0; i--) {
        const track = state.timelineData.tracks[i];
        const clips = state.timelineData.clips.filter(c => c.trackId === track.id);
        clips.forEach(clip => {
            const item = state.canvasItems.find(ci => ci.instanceId === clip.id);
            if (item) item.zIndex = z++;
        });
    }
}

export function updateClipTiming(clipId, updates) {
    if (!state.timelineData || !state.timelineData.clips) return;
    const clip = state.timelineData.clips.find(c => c.id === clipId);
    if (clip) {
        if ('startOffset' in updates) {
            clip.startOffset = Math.max(0, updates.startOffset);
        }
        if ('duration' in updates) {
            clip.duration = Math.max(0.2, updates.duration);
        }
        if ('trimStart' in updates) {
            clip.trimStart = Math.max(0, updates.trimStart);
        }
        if ('trackId' in updates) {
            clip.trackId = updates.trackId;
        }
    }
}

export function updateTrackStatus(trackId, updates) {
    if (!state.timelineData || !state.timelineData.tracks) return;
    const track = state.timelineData.tracks.find(t => t.id === trackId);
    if (track) {
        if ('hidden' in updates) track.hidden = !!updates.hidden;
        if ('muted' in updates) track.muted = !!updates.muted;
    }
}

export function moveTrackUp(trackId) {
    if (!state.timelineData || !state.timelineData.tracks) return;
    const index = state.timelineData.tracks.findIndex(t => t.id === trackId);
    if (index > 0) {
        const currentTrack = state.timelineData.tracks[index];
        const upperTrack = state.timelineData.tracks[index - 1];
        if (currentTrack.type === upperTrack.type) {
            pushState();
            state.timelineData.tracks[index] = upperTrack;
            state.timelineData.tracks[index - 1] = currentTrack;
            syncZIndexWithTracks();
            renderApp();
        }
    }
}

export function moveTrackDown(trackId) {
    if (!state.timelineData || !state.timelineData.tracks) return;
    const index = state.timelineData.tracks.findIndex(t => t.id === trackId);
    if (index !== -1 && index < state.timelineData.tracks.length - 1) {
        const currentTrack = state.timelineData.tracks[index];
        const lowerTrack = state.timelineData.tracks[index + 1];
        if (currentTrack.type === lowerTrack.type) {
            pushState();
            state.timelineData.tracks[index] = lowerTrack;
            state.timelineData.tracks[index + 1] = currentTrack;
            syncZIndexWithTracks();
            renderApp();
        }
    }
}
