import { state } from "./store.js";

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

export function ensureRemoteTab(id, name, url, file = null) {
    const existingTab = getTab(id);
    if (existingTab) {
        if (file && !existingTab.file) {
            existingTab.file = file;
            existingTab.localUrl = URL.createObjectURL(file);
        }
        return existingTab;
    }

    const tab = {
        id: id,
        name: name,
        url: url,
        file: file,
        localUrl: file ? URL.createObjectURL(file) : null
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

export function removeTab(tabId) {
    const tabIndex = state.tabs.findIndex((tab) => tab.id === tabId);
    if (tabIndex === -1) {
        return;
    }

    const tab = state.tabs[tabIndex];
    if (tab.url && tab.url.startsWith('blob:')) {
        URL.revokeObjectURL(tab.url);
    }
    if (tab.localUrl) {
        URL.revokeObjectURL(tab.localUrl);
    }

    state.tabs.splice(tabIndex, 1);
    state.looseTabIds = state.looseTabIds.filter((id) => id !== tabId);
    state.folders = state.folders
        .map((folder) => ({ ...folder, tabIds: folder.tabIds.filter((id) => id !== tabId) }))
        .filter((folder) => folder.tabIds.length > 0);

    // Dọn canvas items trỏ tới tab đã xóa
    state.canvasItems = state.canvasItems.filter(i => i.tabId !== tabId);
    if (state.activeInstanceId && !state.canvasItems.find(i => i.instanceId === state.activeInstanceId)) {
        state.activeInstanceId = null;
    }

    if (state.activeTabId === tabId) {
        state.activeTabId = state.tabs[tabIndex]?.id || state.tabs[tabIndex - 1]?.id || null;
    }
}

export function clearWorkspace() {
    state.tabs.forEach((tab) => {
        if (tab.url && tab.url.startsWith('blob:')) {
            URL.revokeObjectURL(tab.url);
        }
        if (tab.localUrl) {
            URL.revokeObjectURL(tab.localUrl);
        }
    });
    state.tabs = [];
    state.looseTabIds = [];
    state.folders = [];
    state.canvasItems = [];
    state.activeTabId = null;
    state.activeInstanceId = null;
}

export function cleanUnusedTabs() {
    const referencedTabIds = new Set((state.canvasItems || []).map(item => item.tabId).filter(Boolean));
    
    // Revoke object URLs for tabs being cleaned up
    state.tabs.forEach(tab => {
        if (!referencedTabIds.has(tab.id)) {
            if (tab.url && tab.url.startsWith('blob:')) {
                URL.revokeObjectURL(tab.url);
            }
            if (tab.localUrl) {
                URL.revokeObjectURL(tab.localUrl);
            }
        }
    });

    state.tabs = state.tabs.filter(tab => referencedTabIds.has(tab.id));
    state.looseTabIds = state.looseTabIds.filter(id => referencedTabIds.has(id));
    if (state.folders) {
        state.folders = state.folders.map(folder => ({
            ...folder,
            tabIds: (folder.tabIds || []).filter(id => referencedTabIds.has(id))
        })).filter(folder => folder.tabIds.length > 0);
    }
    if (state.activeTabId && !referencedTabIds.has(state.activeTabId)) {
        state.activeTabId = state.tabs.length > 0 ? state.tabs[0].id : null;
    }
}
