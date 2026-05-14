import { refs } from "./dom.js";
import { getActiveTab, getTab, removeTab, state, toggleFolder } from "./state.js";
import { text } from "./strings.js";
import { setStatus } from "./theme.js";

export function renderApp() {
    renderExplorer();
    renderViewer();
    updateToolbarActions();
    updateEmptyStates();
}

export function closeTab(tabId) {
    removeTab(tabId);
    renderApp();
    if (state.activeTabId) {
        const active = getActiveTab();
        if (active) {
            setStatus(text("STATUS_OPENED", { name: active.name }));
        }
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
    if (!target) return;
    const willHide = !target.hidden;
    target.hidden = willHide;
    const caret = toggleButton?.querySelector(".tree-caret");
    updateCaret(caret, willHide);
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

        const caret = document.createElement("span");
        caret.className = `tree-caret ${folder.collapsed ? "is-closed" : "is-open"}`;
        caret.setAttribute("aria-hidden", "true");

        const label = document.createElement("span");
        label.className = "tree-label";
        label.textContent = folder.name;

        const meta = document.createElement("span");
        meta.className = "tree-meta";
        meta.textContent = String(folder.tabIds.length);

        toggle.append(caret, label, meta);
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
    if (!caret) return;
    caret.classList.toggle("is-closed", isClosed);
    caret.classList.toggle("is-open", !isClosed);
}

function createTreeItem(tab) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tree-item";
    button.dataset.tabActivate = tab.id;
    button.draggable = true;
    if (tab.id === state.activeTabId) {
        button.classList.add("is-active");
    }
    const label = document.createElement("span");
    label.className = "tree-label";
    label.textContent = tab.name;
    button.appendChild(label);
    return button;
}

function renderViewer() {
    // Xóa các phần tử không còn trong state
    const currentInstanceIds = new Set(state.canvasItems.map(item => item.instanceId));
    const renderedItems = refs.canvasContainer.querySelectorAll(".canvas-item");
    renderedItems.forEach(el => {
        if (!currentInstanceIds.has(el.dataset.instanceId)) {
            el.remove();
        }
    });

    // Render hoặc cập nhật
    state.canvasItems.forEach(item => {
        let el = refs.canvasContainer.querySelector(`[data-instance-id="${item.instanceId}"]`);
        if (!el) {
            const tab = getTab(item.tabId);
            if (!tab) return;

            el = document.createElement("div");
            el.className = "canvas-item";
            el.dataset.instanceId = item.instanceId;

            const img = document.createElement("img");
            img.src = tab.url;
            img.alt = tab.name;
            img.draggable = false;
            el.appendChild(img);

            // Tạo các handle resize
            ["nw","ne","sw","se","n","s","e","w"].forEach(pos => {
                const h = document.createElement("div");
                h.className = `resize-handle ${pos}`;
                h.dataset.handle = pos;
                el.appendChild(h);
            });

            refs.canvasContainer.appendChild(el);
        }

        el.classList.toggle("is-active", item.instanceId === state.activeInstanceId);

        // Dùng transform để đồng bộ với app.js
        el.style.width = `${item.width}px`;
        el.style.height = `${item.height}px`;
        el.style.transform = `translate(${item.x}px, ${item.y}px)`;
        el.style.zIndex = item.zIndex;
        // Xóa left/top cũ nếu có từ phiên bản trước
        el.style.left = "";
        el.style.top = "";
    });
}

function updateToolbarActions() {
    const hasItems = state.canvasItems.length > 0;
    if (refs.saveAsAction) refs.saveAsAction.disabled = !hasItems;
}

function updateEmptyStates() {
    const hasItems = state.folders.length > 0 || state.looseTabIds.length > 0;
    const hasCanvasItems = state.canvasItems.length > 0;

    if (refs.explorerEmpty) refs.explorerEmpty.hidden = hasItems;
    if (refs.dropZoneContent) refs.dropZoneContent.hidden = hasCanvasItems;
}
