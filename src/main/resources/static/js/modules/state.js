import { renderApp } from "./ui.js";

export const state = {
    activeTabId: null,
    tabs: [],
    looseTabIds: [],
    folders: [],
    canvasItems: [],
    activeInstanceId: null,
    themes: ["light", "dark", "warm", "cold"]
};

export function addToCanvas(tabId, x = 100, y = 100) {
    const tab = getTab(tabId);
    if (!tab) return null;

    const newItem = {
        instanceId: `img-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        tabId: tab.id,
        x,
        y,
        width: 300,
        height: 200,
        scale: 1,
        zIndex: state.canvasItems.length + 1,
        userResized: false
    };

    // Lấy kích thước gốc bất đồng bộ
    const img = new Image();
    img.onload = () => {
        const item = state.canvasItems.find(i => i.instanceId === newItem.instanceId);
        if (item && !item.userResized && item.width === 300 && item.height === 200) {
            const ratio = img.width / img.height;
            if (img.width > 400) {
                item.width = 400;
                item.height = 400 / ratio;
            } else {
                item.width = img.width;
                item.height = img.height;
            }
            renderApp();
        }
    };
    img.onerror = () => {
        // ảnh lỗi vẫn giữ kích thước mặc định
    };
    img.src = tab.url;

    state.canvasItems.push(newItem);
    state.activeInstanceId = newItem.instanceId;
    return newItem;
}

export function setActiveInstance(instanceId) {
    state.activeInstanceId = instanceId;
}

export function updateCanvasItem(instanceId, updates) {
    const item = state.canvasItems.find(i => i.instanceId === instanceId);
    if (item) {
        if ('width' in updates || 'height' in updates) {
            item.userResized = true;
        }
        Object.assign(item, updates);
    }
}

export function removeFromCanvas(instanceId) {
    state.canvasItems = state.canvasItems.filter(i => i.instanceId !== instanceId);
    if (state.activeInstanceId === instanceId) {
        state.activeInstanceId = null;
    }
}

export function bringToFront(instanceId) {
    const item = state.canvasItems.find(i => i.instanceId === instanceId);
    if (item) {
        const maxZ = Math.max(0, ...state.canvasItems.map(i => i.zIndex));
        item.zIndex = maxZ + 1;
    }
}

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

    const addedTabs = [];
    files.forEach((file) => {
        const tab = ensureTab(file);
        addedTabs.push(tab);
        if (!folder.tabIds.includes(tab.id)) {
            folder.tabIds.push(tab.id);
        }
    });

    return { folder, addedTabs };
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

    // Dọn canvas items trỏ tới tab đã xóa
    state.canvasItems = state.canvasItems.filter(i => i.tabId !== tabId);
    if (state.activeInstanceId && !state.canvasItems.find(i => i.instanceId === state.activeInstanceId)) {
        state.activeInstanceId = null;
    }

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
    state.canvasItems = [];
    state.activeTabId = null;
    state.activeInstanceId = null;
}
