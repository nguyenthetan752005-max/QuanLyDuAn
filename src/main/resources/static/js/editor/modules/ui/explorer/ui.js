import { explorerState } from "./state.js";
import { refreshEditorExplorer } from "./api.js";
import { openRenameDialog, openFolderDialog, openMoveDialog, openPreviewDialog } from "./modals.js";
import { state } from "../../state.js";

export function closeDropdownMenu() {
    const existing = document.querySelector('.sidebar-dropdown-menu');
    if (existing) {
        existing.remove();
    }
    explorerState.activeDropdownItemId = null;
    document.querySelectorAll('.item-actions-btn').forEach(btn => btn.classList.remove('active'));
}

export function renderExplorerList() {
    const listContainer = document.getElementById('explorer-list-sidebar');
    const loader = document.getElementById('explorer-loader-sidebar');
    const emptyState = document.getElementById('explorer-empty-sidebar');
    
    if (!listContainer) return;
    
    listContainer.innerHTML = '';
    closeDropdownMenu();
    
    const isTrash = explorerState.currentTab === 'trash';
    
    let foldersToRender = explorerState.folders;
    if (!isTrash) {
        foldersToRender = explorerState.folders.filter(f => f.parentId === explorerState.currentFolderId);
    }
    
    if (explorerState.searchQuery) {
        foldersToRender = foldersToRender.filter(f => f.name.toLowerCase().includes(explorerState.searchQuery));
    }
    
    let assetsToRender = explorerState.assets;
    if (explorerState.searchQuery) {
        assetsToRender = assetsToRender.filter(a => a.fileName.toLowerCase().includes(explorerState.searchQuery));
    }
    
    const totalCount = foldersToRender.length + assetsToRender.length;
    if (totalCount === 0) {
        if (emptyState) {
            emptyState.hidden = false;
            const titleEl = document.getElementById('explorer-empty-title-sidebar');
            const descEl = document.getElementById('explorer-empty-desc-sidebar');
            if (titleEl) titleEl.textContent = isTrash ? 'Thùng rác trống' : 'Thư mục trống';
            if (descEl) descEl.textContent = isTrash ? 'Không có tài nguyên nào trong thùng rác.' : 'Thư mục này chưa có tệp hoặc thư mục con.';
        }
        if (loader) loader.hidden = true;
        renderBreadcrumbsUI();
        return;
    }
    
    if (emptyState) emptyState.hidden = true;
    if (loader) loader.hidden = true;
    
    // 1. Render Folders
    foldersToRender.forEach(folder => {
        const itemEl = document.createElement('div');
        itemEl.className = 'explorer-list-item folder-item';
        itemEl.dataset.id = folder.id;
        
        itemEl.innerHTML = `
            <span class="item-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </span>
            <div class="item-info">
                <span class="item-name" title="${folder.name}">${folder.name}</span>
                <span class="item-meta">Thư mục</span>
            </div>
            <button class="item-actions-btn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
        `;
        
        if (!isTrash) {
            itemEl.addEventListener('dblclick', () => {
                explorerState.currentFolderId = folder.id;
                refreshEditorExplorer().then(() => renderExplorerList());
            });
        }
        
        const actionBtn = itemEl.querySelector('.item-actions-btn');
        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdownMenu(folder.id, folder.name, 'folder', actionBtn);
        });
        
        listContainer.appendChild(itemEl);
    });
    
    // 2. Render Media Assets
    assetsToRender.forEach(asset => {
        const itemEl = document.createElement('div');
        itemEl.className = 'explorer-list-item file-item';
        itemEl.dataset.id = asset.id;
        itemEl.dataset.tabActivate = asset.id;
        itemEl.dataset.filepath = asset.filePath;
        itemEl.dataset.filename = asset.fileName;
        itemEl.dataset.mediatype = asset.type;
        itemEl.draggable = true;
        
        if (asset.id === state.activeTabId) {
            itemEl.classList.add('selected');
        }
        
        const isImage = asset.type === 'IMAGE';
        const isVideo = asset.type === 'VIDEO';
        let typeIcon = '';
        if (isImage) {
            typeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
        } else if (isVideo) {
            typeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`;
        } else {
            typeIcon = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>`;
        }
        
        const sizeStr = asset.fileSizeMb ? asset.fileSizeMb.toFixed(2) + ' MB' : '--';
        
        itemEl.innerHTML = `
            <span class="item-icon">
                ${typeIcon}
            </span>
            <div class="item-info">
                <span class="item-name" title="${asset.fileName}">${asset.fileName}</span>
                <span class="item-meta">${sizeStr}</span>
            </div>
            <button class="item-actions-btn" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
            </button>
        `;
        
        const actionBtn = itemEl.querySelector('.item-actions-btn');
        actionBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDropdownMenu(asset.id, asset.fileName, 'file', actionBtn);
        });
        
        listContainer.appendChild(itemEl);
    });
    
    renderBreadcrumbsUI();
}

export function renderBreadcrumbsUI() {
    const breadcrumbsContainer = document.getElementById('explorer-breadcrumbs-sidebar');
    if (!breadcrumbsContainer) return;
    breadcrumbsContainer.innerHTML = '';
    
    if (explorerState.currentTab === 'trash') {
        breadcrumbsContainer.innerHTML = `<span class="breadcrumb-item breadcrumb-item-trash">Thùng rác</span>`;
        return;
    }
    
    // Add back arrow if inside a folder
    if (explorerState.currentFolderId) {
        const backBtn = document.createElement('button');
        backBtn.className = 'explorer-back-btn';
        backBtn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
        
        const currentFolder = explorerState.folders.find(f => f.id === explorerState.currentFolderId);
        const parentId = currentFolder ? currentFolder.parentId : null;
        
        backBtn.addEventListener('click', () => {
            explorerState.currentFolderId = parentId;
            refreshEditorExplorer().then(() => renderExplorerList());
        });
        breadcrumbsContainer.appendChild(backBtn);
    }
    
    const rootSpan = document.createElement('span');
    rootSpan.className = 'breadcrumb-item';
    rootSpan.textContent = 'Gốc';
    rootSpan.addEventListener('click', () => {
        explorerState.currentFolderId = null;
        refreshEditorExplorer().then(() => renderExplorerList());
    });
    breadcrumbsContainer.appendChild(rootSpan);
    
    if (explorerState.currentFolderId) {
        const path = [];
        let tempId = explorerState.currentFolderId;
        while (tempId) {
            const f = explorerState.folders.find(folder => folder.id === tempId);
            if (!f) break;
            path.unshift(f);
            tempId = f.parentId;
        }
        
        path.forEach(f => {
            const sep = document.createElement('span');
            sep.className = 'breadcrumb-separator';
            sep.textContent = '/';
            
            const span = document.createElement('span');
            span.className = 'breadcrumb-item';
            span.textContent = f.name;
            span.addEventListener('click', () => {
                explorerState.currentFolderId = f.id;
                refreshEditorExplorer().then(() => renderExplorerList());
            });
            
            breadcrumbsContainer.append(sep, span);
        });
    }
}

export function toggleDropdownMenu(itemId, itemName, itemType, buttonEl) {
    if (explorerState.activeDropdownItemId === itemId) {
        closeDropdownMenu();
        return;
    }
    
    closeDropdownMenu();
    explorerState.activeDropdownItemId = itemId;
    buttonEl.classList.add('active');
    
    const dropdown = document.createElement('div');
    dropdown.className = 'sidebar-dropdown-menu';
    
    const isTrash = explorerState.currentTab === 'trash';
    
    if (isTrash) {
        dropdown.innerHTML = `
            <button class="sidebar-dropdown-item btn-restore" type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Khôi phục
            </button>
            <button class="sidebar-dropdown-item danger btn-permanent-delete" type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Xóa vĩnh viễn
            </button>
        `;
    } else {
        dropdown.innerHTML = `
            <button class="sidebar-dropdown-item btn-rename-item" type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Đổi tên
            </button>
            ${itemType === 'file' ? `
            <button class="sidebar-dropdown-item btn-preview-item" type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
                Xem trước
            </button>` : ''}
            <button class="sidebar-dropdown-item btn-move-item" type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="10 9 15 4 20 9"/><path d="M4 20h7a4 4 0 0 0 4-4V4"/></svg>
                Di chuyển
            </button>
            <button class="sidebar-dropdown-item danger btn-delete-item" type="button">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Xóa
            </button>
        `;
    }
    
    document.body.appendChild(dropdown);
    
    // Position fixed to prevent scrollbar clipping issues in scroll containers
    const rect = buttonEl.getBoundingClientRect();
    dropdown.className = 'dropdown-menu explorer-dropdown-fixed';
    dropdown.style.top = `${rect.bottom + 4}px`;
    dropdown.style.left = `${rect.right - 130}px`;
    
    if (isTrash) {
        dropdown.querySelector('.btn-restore').addEventListener('click', async (e) => {
            e.stopPropagation();
            closeDropdownMenu();
            try {
                const url = itemType === 'folder' 
                    ? `/api/v1/media-folders/${itemId}/restore`
                    : `/api/v1/media-assets/${itemId}/restore`;
                const res = await fetch(url, { method: 'PUT' });
                if (res.ok) {
                    await refreshEditorExplorer();
                    renderExplorerList();
                } else {
                    alert('Không thể khôi phục tài nguyên.');
                }
            } catch (err) {
                console.error(err);
            }
        });
        
        dropdown.querySelector('.btn-permanent-delete').addEventListener('click', async (e) => {
            e.stopPropagation();
            closeDropdownMenu();
            if (itemType === 'file') {
                try {
                    const usageRes = await fetch(`/api/v1/media-assets/${itemId}/usage`);
                    if (usageRes.ok) {
                        const usage = await usageRes.json();
                        if (usage.length > 0) {
                            const projNames = usage.map(u => `"${u.projectName}"`).join(', ');
                            if (!confirm(`CẢNH BÁO: Tệp tin này đang được sử dụng trong các dự án: ${projNames}.\nXóa vĩnh viễn sẽ làm mất tài nguyên này trong các dự án trên và không thể khôi phục lại.\nBạn vẫn chắc chắn muốn xóa vĩnh viễn?`)) {
                                return;
                            }
                        } else {
                            if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tệp này? Thao tác này sẽ xóa tệp vật lý trên đĩa cứng và không thể khôi phục.`)) {
                                return;
                            }
                        }
                    }
                    const res = await fetch(`/api/v1/media-assets/${itemId}/permanent`, { method: 'DELETE' });
                    if (res.ok) {
                        await refreshEditorExplorer();
                        renderExplorerList();
                    } else {
                        const err = await res.json();
                        alert(err.message || 'Xóa vĩnh viễn thất bại.');
                    }
                } catch (err) {
                    console.error(err);
                }
            } else {
                if (confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn thư mục này cùng toàn bộ nội dung bên trong?`)) {
                    try {
                        const res = await fetch(`/api/v1/media-folders/${itemId}/permanent`, { method: 'DELETE' });
                        if (res.ok) {
                            await refreshEditorExplorer();
                            renderExplorerList();
                        } else {
                            const err = await res.json();
                            alert(err.message || 'Xóa vĩnh viễn thư mục thất bại.');
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        });
    } else {
        dropdown.querySelector('.btn-rename-item').addEventListener('click', (e) => {
            e.stopPropagation();
            closeDropdownMenu();
            const title = itemType === 'folder' ? 'Đổi tên thư mục' : 'Đổi tên tệp tin';
            openRenameDialog(title, itemName, async (newName) => {
                try {
                    let url = '';
                    let body = {};
                    if (itemType === 'folder') {
                        url = `/api/v1/media-folders/${itemId}`;
                        body = { name: newName, parentId: explorerState.currentFolderId };
                    } else {
                        url = `/api/v1/media-assets/${itemId}`;
                        const asset = explorerState.assets.find(a => a.id === itemId);
                        if (asset) {
                            body = {
                                userId: asset.userId,
                                fileName: newName,
                                filePath: asset.filePath,
                                type: asset.type,
                                fileSizeMb: asset.fileSizeMb,
                                metadata: asset.metadata,
                                folderId: asset.folderId
                            };
                        }
                    }
                    const res = await fetch(url, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body)
                    });
                    if (res.ok) {
                        await refreshEditorExplorer();
                        renderExplorerList();
                    } else {
                        const err = await res.json();
                        alert(err.message || 'Đổi tên thất bại.');
                    }
                } catch (err) {
                    console.error(err);
                }
            });
        });

        if (itemType === 'file') {
            dropdown.querySelector('.btn-preview-item').addEventListener('click', (e) => {
                e.stopPropagation();
                closeDropdownMenu();
                const asset = explorerState.assets.find(a => a.id === itemId);
                if (asset) {
                    openPreviewDialog(asset);
                }
            });
        }
        
        dropdown.querySelector('.btn-move-item').addEventListener('click', (e) => {
            e.stopPropagation();
            closeDropdownMenu();
            openMoveDialog(itemId, itemType, async (targetFolderId) => {
                try {
                    let url = '';
                    let payload = {};
                    if (itemType === 'folder') {
                        url = `/api/v1/media-folders/${itemId}`;
                        payload = { name: itemName, parentId: targetFolderId };
                    } else {
                        const asset = explorerState.assets.find(a => a.id === itemId);
                        url = `/api/v1/media-assets/${itemId}`;
                        payload = {
                            userId: asset ? asset.userId : null,
                            fileName: asset ? asset.fileName : null,
                            filePath: asset ? asset.filePath : null,
                            type: asset ? asset.type : null,
                            fileSizeMb: asset ? asset.fileSizeMb : null,
                            metadata: asset ? asset.metadata : null,
                            folderId: targetFolderId
                        };
                    }
                    
                    const res = await fetch(url, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(payload)
                    });
                    
                    if (res.ok) {
                        await refreshEditorExplorer();
                        renderExplorerList();
                    } else {
                        const err = await res.json();
                        alert(err.message || 'Di chuyển tài nguyên thất bại.');
                    }
                } catch (err) {
                    console.error(err);
                }
            });
        });
        
        dropdown.querySelector('.btn-delete-item').addEventListener('click', async (e) => {
            e.stopPropagation();
            closeDropdownMenu();
            if (itemType === 'file') {
                try {
                    const usageRes = await fetch(`/api/v1/media-assets/${itemId}/usage`);
                    if (usageRes.ok) {
                        const usage = await usageRes.json();
                        if (usage.length > 0) {
                            const projNames = usage.map(u => `"${u.projectName}"`).join(', ');
                            if (!confirm(`Tệp tin này đang được sử dụng trong các dự án: ${projNames}.\nNếu đưa vào thùng rác, các clip tương ứng trong các dự án đó sẽ hiển thị trạng thái offline.\nBạn có chắc chắn muốn đưa tệp tin này vào Thùng rác?`)) {
                                return;
                            }
                        } else {
                            if (!confirm(`Bạn có chắc chắn muốn đưa tệp này vào Thùng rác?`)) {
                                return;
                            }
                        }
                    }
                    const res = await fetch(`/api/v1/media-assets/${itemId}`, { method: 'DELETE' });
                    if (res.ok) {
                        await refreshEditorExplorer();
                        renderExplorerList();
                    } else {
                        const err = await res.json();
                        alert(err.message || 'Xóa tệp tin thất bại.');
                    }
                } catch (err) {
                    console.error(err);
                }
            } else {
                if (confirm(`Bạn có chắc chắn muốn đưa thư mục này cùng toàn bộ nội dung bên trong vào Thùng rác?`)) {
                    try {
                        const res = await fetch(`/api/v1/media-folders/${itemId}`, { method: 'DELETE' });
                        if (res.ok) {
                            await refreshEditorExplorer();
                            renderExplorerList();
                        } else {
                            const err = await res.json();
                            alert(err.message || 'Xóa thư mục thất bại.');
                        }
                    } catch (err) {
                        console.error(err);
                    }
                }
            }
        });
    }
}
