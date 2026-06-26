import { state } from "./store.js";
import { ensureTab } from "./tabs.js";

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

export function addFolderRemoteImport(folderName, tabs) {
    let folder = state.folders.find((item) => item.name === folderName);
    if (!folder) {
        folder = { name: folderName, tabIds: [], collapsed: false };
        state.folders.push(folder);
    }

    tabs.forEach((tab) => {
        if (!folder.tabIds.includes(tab.id)) {
            folder.tabIds.push(tab.id);
        }
    });

    return folder;
}

export function toggleFolder(folderName) {
    const folder = state.folders.find((item) => item.name === folderName);
    if (folder) {
        folder.collapsed = !folder.collapsed;
    }
}
