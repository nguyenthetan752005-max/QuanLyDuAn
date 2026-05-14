import { refs } from "./modules/dom.js";
import { handleFileInputChange, handleFolderInputChange, saveActiveTabAs } from "./modules/file-actions.js";
import { setupMenus } from "./modules/menus.js";
import { setupNotifications } from "./modules/notifications.js";
import { setupSplitters } from "./modules/splitters.js";
import { clearWorkspace, setActiveTab } from "./modules/state.js";
import { applyStaticText, STRINGS, text } from "./modules/strings.js";
import { setStatus, setupThemeSwitching } from "./modules/theme.js";
import { closeTab, renderApp, toggleFolderGroup, toggleSectionVisibility } from "./modules/ui.js";

function setupFileTriggers() {
    const triggerFileImport = () => refs.fileInput.click();
    const triggerFolderImport = () => refs.folderInput.click();

    refs.fileInput.accept = STRINGS.FILE_INPUT_ACCEPT;
    refs.folderInput.accept = STRINGS.FILE_INPUT_ACCEPT;

    document.getElementById("import-file-action").addEventListener("click", triggerFileImport);
    document.getElementById("import-folder-action").addEventListener("click", triggerFolderImport);

    refs.fileInput.addEventListener("change", handleFileInputChange);
    refs.folderInput.addEventListener("change", handleFolderInputChange);
}

function setupViewerActions() {
    refs.tabStrip.addEventListener("click", (event) => {
        const closeButton = event.target.closest("[data-tab-close]");
        if (closeButton) {
            closeTab(closeButton.dataset.tabClose);
            return;
        }

        const tabButton = event.target.closest("[data-tab-activate]");
        if (tabButton) {
            setActiveTab(tabButton.dataset.tabActivate);
            renderApp();
        }
    });
}

function setupExplorerActions() {
    refs.explorerTree.addEventListener("click", (event) => {
        const sectionToggle = event.target.closest("[data-section-toggle]");
        if (sectionToggle) {
            toggleSectionVisibility(sectionToggle.dataset.sectionToggle, sectionToggle);
            return;
        }

        const folderToggle = event.target.closest("[data-folder-toggle]");
        if (folderToggle) {
            toggleFolderGroup(folderToggle.dataset.folderToggle);
            return;
        }

        const treeItem = event.target.closest("[data-tab-activate]");
        if (treeItem) {
            setActiveTab(treeItem.dataset.tabActivate);
            renderApp();
        }
    });
}

function setupToolbarActions() {
    document.getElementById("save-as-action").addEventListener("click", saveActiveTabAs);
    document.getElementById("clear-workspace-action").addEventListener("click", () => {
        clearWorkspace();
        renderApp();
        setStatus(text("STATUS_WORKSPACE_CLEARED"));
    });
}

applyStaticText();
setupMenus();
setupNotifications();
setupSplitters();
setupThemeSwitching();
setupFileTriggers();
setupViewerActions();
setupExplorerActions();
setupToolbarActions();
renderApp();
