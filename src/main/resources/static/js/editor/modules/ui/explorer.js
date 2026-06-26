import { explorerState } from "./explorer/state.js";
import { refreshEditorExplorer as refresh, updateProjectNameInUI } from "./explorer/api.js";
import { renderExplorerList } from "./explorer/ui.js";
import { initExplorerEventListeners } from "./explorer/events.js";
import { initStockTab } from "./explorer/stockTab.js";

// Backwards compatibility dummy functions
export function toggleFolderCollapse() {}
export function updateCaret() {}

export async function refreshEditorExplorer() {
    await refresh();
}

export function renderExplorer() {
    if (!explorerState.hasInitialized) {
        initExplorerEventListeners();
        initStockTab();
        updateProjectNameInUI();
        explorerState.hasInitialized = true;
    }
    
    renderExplorerList();
}
