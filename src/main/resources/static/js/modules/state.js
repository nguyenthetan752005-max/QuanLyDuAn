export const state = {
    activeTabId: null,
    tabs: [],
    looseTabIds: [],
    folders: [],
    themes: ["light", "dark", "warm", "cold"]
};

export function createTabId(file) {
    return `${file.webkitRelativePath || file.name}-${file.size}`.replace(/[^a-zA-Z0-9_-]/g, "-");
}

export function getTab(tabId) {
    return state.tabs.find((tab) => tab.id === tabId) || null;
}

export function getActiveTab() {
    return getTab(state.activeTabId);
}

export function setActiveTab(tabId) {
    state.activeTabId = tabId;
}

export function ensureTab(file) {
    const tabId = createTabId(file);
    const existingTab = getTab(tabId);
    if (existingTab) {
        return existingTab;
    }

    const tab = {
        id: tabId,
        name: file.name,
        url: URL.createObjectURL(file),
        file
    };

    state.tabs.push(tab);
    return tab;
}

export function addLooseFile(file) {
    const tab = ensureTab(file);
    if (!state.looseTabIds.includes(tab.id)) {
        state.looseTabIds.push(tab.id);
    }
    return tab;
}

export function addFolderImport(folderName, files) {
    let folder = state.folders.find((item) => item.name === folderName);
    if (!folder) {
        folder = { name: folderName, tabIds: [], collapsed: false };
        state.folders.push(folder);
    }

    files.forEach((file) => {
        const tab = ensureTab(file);
        if (!folder.tabIds.includes(tab.id)) {
            folder.tabIds.push(tab.id);
        }
    });

    return folder;
}

export function removeTab(tabId) {
    const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) {
        return;
    }

    URL.revokeObjectURL(state.tabs[tabIndex].url);
    state.tabs.splice(tabIndex, 1);
    state.looseTabIds = state.looseTabIds.filter((id) => id !== tabId);
    state.folders = state.folders
        .map((folder) => ({ ...folder, tabIds: folder.tabIds.filter((id) => id !== tabId) }))
        .filter((folder) => folder.tabIds.length > 0);

    if (state.activeTabId === tabId) {
        state.activeTabId = state.tabs[tabIndex]?.id || state.tabs[tabIndex - 1]?.id || null;
    }
}

export function toggleFolder(folderName) {
    const folder = state.folders.find((item) => item.name === folderName);
    if (folder) {
        folder.collapsed = !folder.collapsed;
    }
}

export function clearWorkspace() {
    state.tabs.forEach((tab) => URL.revokeObjectURL(tab.url));
    state.tabs = [];
    state.looseTabIds = [];
    state.folders = [];
    state.activeTabId = null;
}
