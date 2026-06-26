import { state } from "./state.js";

const MAX_HISTORY = 20;

export function pushState() {
    if (state.history.length >= MAX_HISTORY) {
        state.history.shift();
    }
    // Deep copy canvasItems, store paintData and deep copy timelineData
    state.history.push({
        canvasItems: JSON.parse(JSON.stringify(state.canvasItems)),
        paintData: state.projectConfig.paintData ? JSON.parse(JSON.stringify(state.projectConfig.paintData)) : null,
        timelineData: state.timelineData ? JSON.parse(JSON.stringify(state.timelineData)) : null
    });
    
    // Clear redo stack if we had one
    state.redoStack = []; 
}

export function undoState() {
    if (state.history.length > 0) {
        // Save current state to redo stack before undoing
        if (!state.redoStack) state.redoStack = [];
        state.redoStack.push({
            canvasItems: JSON.parse(JSON.stringify(state.canvasItems)),
            paintData: state.projectConfig.paintData ? JSON.parse(JSON.stringify(state.projectConfig.paintData)) : null,
            timelineData: state.timelineData ? JSON.parse(JSON.stringify(state.timelineData)) : null
        });

        const previousState = state.history.pop();
        if (previousState) {
            state.canvasItems = JSON.parse(JSON.stringify(previousState.canvasItems));
            state.projectConfig.paintData = previousState.paintData ? JSON.parse(JSON.stringify(previousState.paintData)) : null;
            state.timelineData = previousState.timelineData ? JSON.parse(JSON.stringify(previousState.timelineData)) : null;
            state.paintLoaded = false;
        }
        
        // Ensure activeInstanceId is still valid
        if (state.activeInstanceId && !state.canvasItems.find(i => i.instanceId === state.activeInstanceId)) {
            state.activeInstanceId = null;
        }
        return true;
    }
    return false;
}

export function redoState() {
    if (state.redoStack && state.redoStack.length > 0) {
        // Save current state back to history
        state.history.push({
            canvasItems: JSON.parse(JSON.stringify(state.canvasItems)),
            paintData: state.projectConfig.paintData ? JSON.parse(JSON.stringify(state.projectConfig.paintData)) : null,
            timelineData: state.timelineData ? JSON.parse(JSON.stringify(state.timelineData)) : null
        });

        const nextState = state.redoStack.pop();
        if (nextState) {
            state.canvasItems = JSON.parse(JSON.stringify(nextState.canvasItems));
            state.projectConfig.paintData = nextState.paintData ? JSON.parse(JSON.stringify(nextState.paintData)) : null;
            state.timelineData = nextState.timelineData ? JSON.parse(JSON.stringify(nextState.timelineData)) : null;
            state.paintLoaded = false;
        }

        if (state.activeInstanceId && !state.canvasItems.find(i => i.instanceId === state.activeInstanceId)) {
            state.activeInstanceId = null;
        }
        return true;
    }
    return false;
}
