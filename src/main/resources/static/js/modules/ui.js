import { refs } from "./dom.js";
import { getActiveTab, getTab, removeTab, state, toggleFolder } from "./state.js";
import { text } from "./strings.js";
import { setStatus } from "./theme.js";

export function renderApp() {
    renderExplorer();
    renderTabs();
    renderViewer();
    updateToolbarActions();
    updateEmptyStates();
}

export function closeTab(tabId) {
    removeTab(tabId);
    renderApp();
    if (state.activeTabId) {
        setStatus(text("STATUS_OPENED", { name: getActiveTab().name }));
    } else {
        setStatus(text("STATUS_WORKSPACE_CLEARED"));
    }
}

export function toggleFolderGroup(folderName) {
    toggleFolder(folderName);
    renderApp();
}

export function toggleSectionVisibility(sectionId, toggleButton) {
    const target = document.getElementById(sectionId);
    const willHide = !target.hidden;
    target.hidden = willHide;
    updateCaret(toggleButton.querySelector(".tree-caret"), willHide);
}

function renderExplorer() {
    refs.folderTree.innerHTML = "";
    refs.fileTree.innerHTML = "";

    state.folders.forEach((folder) => {
        const section = document.createElement("section");
        section.className = "tree-section";

        const toggle = document.createElement("button");
        toggle.type = "button";
        toggle.className = "tree-root";
        toggle.dataset.folderToggle = folder.name;
        toggle.innerHTML = `
            <span class="tree-caret ${folder.collapsed ? "is-closed" : "is-open"}" aria-hidden="true"></span>
            <span class="tree-label">${folder.name}</span>
            <span class="tree-meta">${folder.tabIds.length}</span>
        `;
        section.appendChild(toggle);

        const children = document.createElement("div");
        children.className = "tree-children";
        children.hidden = folder.collapsed;
        folder.tabIds.forEach((tabId) => {
            const tab = getTab(tabId);
            if (tab) {
                children.appendChild(createTreeItem(tab));
            }
        });
        section.appendChild(children);
        refs.folderTree.appendChild(section);
    });

    state.looseTabIds.forEach((tabId) => {
        const tab = getTab(tabId);
        if (tab) {
            refs.fileTree.appendChild(createTreeItem(tab));
        }
    });
}

function updateCaret(caret, isClosed) {
    caret.classList.toggle("is-closed", isClosed);
    caret.classList.toggle("is-open", !isClosed);
}

function createTreeItem(tab) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-item";
    button.dataset.tabActivate = tab.id;
    if (tab.id === state.activeTabId) {
        button.classList.add("is-active");
    }
    button.innerHTML = `
        <span class="tree-label">${tab.name}</span>
    `;
    return button;
}

function renderTabs() {
    refs.tabStrip.innerHTML = "";
    state.tabs.forEach((tab) => {
        const tabButton = document.createElement("button");
        tabButton.type = "button";
        tabButton.className = "tab-chip";
        tabButton.dataset.tabActivate = tab.id;
        if (tab.id === state.activeTabId) {
            tabButton.classList.add("is-active");
        }

        const title = document.createElement("span");
        title.className = "tab-title";
        title.textContent = tab.name;
        tabButton.appendChild(title);

        const closeButton = document.createElement("button");
        closeButton.type = "button";
        closeButton.className = "tab-close";
        closeButton.dataset.tabClose = tab.id;
        closeButton.textContent = text("BTN_CLOSE_TAB");
        tabButton.appendChild(closeButton);

        refs.tabStrip.appendChild(tabButton);
    });
}

function renderViewer() {
    const activeTab = getActiveTab();
    if (!activeTab) {
        refs.activeImage.removeAttribute("src");
        refs.activeImage.alt = "";
        return;
    }

    refs.activeImage.src = activeTab.url;
    refs.activeImage.alt = activeTab.name;
}

function updateToolbarActions() {
    const hasTabs = state.tabs.length > 0;
    refs.saveAsAction.disabled = !hasTabs;
}

function updateEmptyStates() {
    const hasItems = state.folders.length > 0 || state.looseTabIds.length > 0;
    const hasTabs = state.tabs.length > 0;

    refs.explorerEmpty.hidden = hasItems;
    refs.tabStrip.hidden = !hasTabs;
    refs.viewerEmpty.hidden = hasTabs;
    refs.viewerStage.hidden = !hasTabs;
}
