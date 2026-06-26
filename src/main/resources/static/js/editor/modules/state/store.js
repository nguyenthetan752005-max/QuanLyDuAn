export const state = {
    activeTabId: null,
    tabs: [],
    looseTabIds: [],
    folders: [],
    canvasItems: [],
    activeInstanceId: null,
    selectedInstanceIds: [],
    themes: ["light", "dark", "warm", "cold"],
    lastUpdatedAt: null,
    history: [],
    redoStack: [],
    projectConfig: {
        width: 800,
        height: 600,
        background: '#ffffff',
        zoom: 1,
        paintData: null
    },
    activeRightTab: 'edit',
    activeTool: 'select',
    paintLoaded: false,
    projectType: 'IMAGE',
    timelineData: null,
    isExporting: false,
    isSpaceDown: false,
    hasPanned: false
};
