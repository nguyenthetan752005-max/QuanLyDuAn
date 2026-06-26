import { state } from './state.js';

// Close all dropdowns
export function closeAllDropdowns() {
    document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
    state.activeDropdownCardId = null;
}

// Format time ago helper
export function formatTimeAgo(dateString) {
    if (!dateString) return 'vừa xong';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now - date) / 1000);

    if (seconds < 60) return 'vừa xong';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} phút trước`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} giờ trước`;
    
    return date.toLocaleDateString('vi-VN', {
        day: 'numeric',
        month: 'numeric',
        year: 'numeric'
    });
}

// Show/Hide loader for projects — uses skeleton cards instead of a spinner
// so users see the page shape immediately.
export function showLoader(show) {
    const projectsLoader = document.getElementById('projects-loader');
    const projectsGrid = document.getElementById('projects-grid');
    const emptyState = document.getElementById('empty-state');
    if (show) {
        // Hide the spinner element (keep for backwards compat) and inject skeletons
        projectsLoader?.setAttribute('hidden', '');
        emptyState?.setAttribute('hidden', '');
        if (projectsGrid) {
            projectsGrid.removeAttribute('hidden');
            projectsGrid.dataset.skeleton = 'true';
            projectsGrid.innerHTML = Array.from({ length: 6 }).map(() => `
                <div class="project-card-skeleton">
                    <div class="sk-thumb"></div>
                    <div class="sk-body">
                        <div class="sk-line sk-line-title"></div>
                        <div class="sk-line sk-line-meta"></div>
                    </div>
                </div>`).join('');
        }
    } else if (projectsGrid && projectsGrid.dataset.skeleton === 'true') {
        // Caller will overwrite innerHTML when rendering real data
        delete projectsGrid.dataset.skeleton;
    }
}

// Error state for projects
export function showErrorState() {
    const projectsGrid = document.getElementById('projects-grid');
    const emptyState = document.getElementById('empty-state');
    projectsGrid?.setAttribute('hidden', '');
    emptyState?.removeAttribute('hidden');
    const h3 = emptyState?.querySelector('h3');
    const p = emptyState?.querySelector('p');
    if (h3 && p) {
        h3.textContent = 'Đã xảy ra lỗi';
        p.textContent = 'Không thể kết nối với máy chủ. Vui lòng tải lại trang.';
    }
}

// Render projects list in dashboard
export function renderProjects(onRename, onDelete, onRestore, onPermanentDelete) {
    const projectsGrid = document.getElementById('projects-grid');
    const emptyState = document.getElementById('empty-state');
    
    document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
    state.activeDropdownCardId = null;
    
    let filtered = state.projects;

    if (state.currentFilter !== 'all' && state.currentFilter !== 'trash') {
        filtered = filtered.filter(p => p.projectType === state.currentFilter);
    }

    if (state.searchQuery) {
        filtered = filtered.filter(p => p.projectName.toLowerCase().includes(state.searchQuery));
    }

    filtered.sort((a, b) => new Date(b.updatedAt || b.createdAt) - new Date(a.updatedAt || a.createdAt));

    if (filtered.length === 0) {
        projectsGrid?.setAttribute('hidden', '');
        emptyState?.removeAttribute('hidden');
        const h3 = emptyState?.querySelector('h3');
        const p = emptyState?.querySelector('p');
        if (h3 && p) {
            if (state.searchQuery) {
                h3.textContent = 'Không tìm thấy kết quả';
                p.textContent = 'Vui lòng thử từ khóa tìm kiếm khác.';
            } else if (state.currentFilter === 'trash') {
                h3.textContent = 'Thùng rác trống';
                p.textContent = 'Không có dự án nào bị xóa trong thùng rác.';
            } else {
                h3.textContent = 'Chưa có dự án nào';
                p.textContent = 'Hãy bắt đầu tạo dự án chỉnh sửa hình ảnh hoặc video đầu tiên của bạn.';
            }
        }
    } else {
        emptyState?.setAttribute('hidden', '');
        projectsGrid?.removeAttribute('hidden');
        projectsGrid.innerHTML = '';
        filtered.forEach(project => {
            const card = createProjectCard(project, onRename, onDelete, onRestore, onPermanentDelete);
            projectsGrid.appendChild(card);
        });
    }
}

function createProjectCard(project, onRename, onDelete, onRestore, onPermanentDelete) {
    const card = document.createElement('div');
    card.className = 'project-card';
    card.dataset.id = project.id;

    const isVideo = project.projectType === 'VIDEO';
    const typeLabel = isVideo ? 'Video' : 'Ảnh';
    const badgeClass = isVideo ? 'badge-video' : 'badge-image';
    const formattedDate = formatTimeAgo(project.updatedAt || project.createdAt);

    let previewHtml = '';
    if (project.thumbnailUrl) {
        previewHtml = `<img src="${project.thumbnailUrl}" class="project-card-image" alt="${project.projectName}" crossorigin="anonymous">`;
    } else {
        const svgIcon = isVideo 
            ? `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>`
            : `<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`;
        previewHtml = `<div class="preview-placeholder-icon">${svgIcon}</div>`;
    }

    card.innerHTML = `
        <div class="project-preview ${isVideo ? 'video-project' : 'image-project'}">
            ${previewHtml}
            <span class="project-type-badge ${badgeClass}">${typeLabel}</span>
        </div>
        <div class="project-details">
            <div class="project-title-row">
                <h4 class="project-title" title="${project.projectName}">${project.projectName}</h4>
                <div class="project-card-actions">
                    <button class="btn-card-menu" type="button">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                </div>
            </div>
            <div class="project-meta-info">
                Cập nhật ${formattedDate}
            </div>
        </div>
    `;

    card.addEventListener('click', (e) => {
        if (e.target.closest('.project-card-actions') || e.target.closest('.card-dropdown-menu')) {
            return;
        }
        if (state.currentFilter === 'trash') {
            alert('Dự án này đang nằm trong thùng rác. Vui lòng khôi phục dự án trước khi mở.');
            return;
        }
        window.location.href = `/editor?projectId=${project.id}`;
    });

    const menuButton = card.querySelector('.btn-card-menu');
    menuButton.addEventListener('click', (e) => {
        e.stopPropagation();
        toggleCardDropdown(project.id, project.projectName, menuButton, onRename, onDelete, onRestore, onPermanentDelete);
    });

    return card;
}

function toggleCardDropdown(projectId, projectName, buttonEl, onRename, onDelete, onRestore, onPermanentDelete) {
    if (state.activeDropdownCardId === projectId) {
        document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
        state.activeDropdownCardId = null;
        return;
    }

    document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
    state.activeDropdownCardId = projectId;

    const dropdown = document.createElement('div');
    dropdown.className = 'card-dropdown-menu';
    
    if (state.currentFilter === 'trash') {
        dropdown.innerHTML = `
            <button class="card-dropdown-item btn-restore-project" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Khôi phục
            </button>
            <button class="card-dropdown-item danger btn-permanent-delete-project" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Xóa vĩnh viễn
            </button>
        `;
    } else {
        dropdown.innerHTML = `
            <button class="card-dropdown-item btn-rename" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Đổi tên
            </button>
            <button class="card-dropdown-item danger btn-delete" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
                Xóa dự án
            </button>
        `;
    }

    buttonEl.parentElement.appendChild(dropdown);

    if (state.currentFilter === 'trash') {
        dropdown.querySelector('.btn-restore-project').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
            state.activeDropdownCardId = null;
            onRestore(projectId, projectName);
        });

        dropdown.querySelector('.btn-permanent-delete-project').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
            state.activeDropdownCardId = null;
            onPermanentDelete(projectId, projectName);
        });
    } else {
        dropdown.querySelector('.btn-rename').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
            state.activeDropdownCardId = null;
            onRename(projectId, projectName);
        });

        dropdown.querySelector('.btn-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
            state.activeDropdownCardId = null;
            onDelete(projectId, projectName);
        });
    }
}

// Render Breadcrumbs for Shared Explorer
export function renderBreadcrumbs(onClickNode) {
    const explorerBreadcrumbs = document.getElementById('explorer-breadcrumbs');
    if (!explorerBreadcrumbs) return;
    explorerBreadcrumbs.innerHTML = '';

    if (state.explorerCurrentTab === 'trash') {
        explorerBreadcrumbs.innerHTML = `<span class="breadcrumb-item font-semibold" style="color: var(--db-danger);">Thùng rác</span>`;
        return;
    }

    // Add back arrow button if in a subfolder
    if (state.currentFolderId) {
        const backBtn = document.createElement('button');
        backBtn.className = 'breadcrumb-back-btn';
        backBtn.style.cssText = 'background: transparent; border: none; color: var(--db-text); cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 4px; margin-right: 12px; border-radius: 4px; transition: background 0.2s;';
        backBtn.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>`;
        
        // Find parent folder ID
        const currentFolder = state.explorerFolders.find(f => f.id === state.currentFolderId);
        const parentId = currentFolder ? currentFolder.parentId : null;
        
        backBtn.addEventListener('click', () => {
            onClickNode(parentId);
        });
        
        backBtn.addEventListener('mouseenter', () => { backBtn.style.background = 'rgba(255,255,255,0.08)'; });
        backBtn.addEventListener('mouseleave', () => { backBtn.style.background = 'transparent'; });
        
        explorerBreadcrumbs.appendChild(backBtn);
    }

    const rootSpan = document.createElement('span');
    rootSpan.className = 'breadcrumb-item';
    rootSpan.textContent = 'Kho lưu trữ';
    rootSpan.addEventListener('click', () => {
        onClickNode(null);
    });
    explorerBreadcrumbs.appendChild(rootSpan);

    if (state.currentFolderId) {
        const path = [];
        let tempId = state.currentFolderId;
        while (tempId) {
            const folder = state.explorerFolders.find(f => f.id === tempId);
            if (!folder) break;
            path.unshift(folder);
            tempId = folder.parentId;
        }

        path.forEach(folder => {
            const sep = document.createElement('span');
            sep.className = 'breadcrumb-separator';
            sep.textContent = '/';
            
            const item = document.createElement('span');
            item.className = 'breadcrumb-item';
            item.textContent = folder.name;
            item.addEventListener('click', () => {
                onClickNode(folder.id);
            });
            
            explorerBreadcrumbs.append(sep, item);
        });
    }
}

// Render Explorer Grid view containing folders & files
export function renderExplorerGrid(onFolderOpen, onActionClick) {
    const explorerGrid = document.getElementById('explorer-grid');
    const explorerEmpty = document.getElementById('explorer-empty');
    if (!explorerGrid) return;
    
    explorerGrid.innerHTML = '';
    document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
    state.activeDropdownCardId = null;

    const isTrash = state.explorerCurrentTab === 'trash';
    
    let foldersToRender = state.explorerFolders;
    if (!isTrash) {
        foldersToRender = state.explorerFolders.filter(f => f.parentId === state.currentFolderId);
    }

    const totalItems = foldersToRender.length + state.explorerAssets.length;
    if (totalItems === 0) {
        explorerEmpty?.removeAttribute('hidden');
        document.getElementById('explorer-empty-title').textContent = isTrash ? 'Thùng rác trống' : 'Thư mục trống';
        document.getElementById('explorer-empty-desc').textContent = isTrash 
            ? 'Không có tệp tin hoặc thư mục nào bị xóa.' 
            : 'Tải tệp tin lên hoặc tạo thư mục mới để bắt đầu.';
        return;
    }

    explorerEmpty?.setAttribute('hidden', '');
    explorerGrid?.removeAttribute('hidden');

    // 1. Folders
    foldersToRender.forEach(folder => {
        const el = document.createElement('div');
        el.className = 'explorer-item folder-item';
        el.dataset.id = folder.id;
        
        el.innerHTML = `
            <div class="item-preview-wrapper folder-preview">
                <svg width="44" height="44" viewBox="0 0 24 24" fill="currentColor" class="folder-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
            </div>
            <div class="item-title-row">
                <h5 class="item-title-text" title="${folder.name}">${folder.name}</h5>
                <div class="explorer-item-actions">
                    <button class="btn-card-menu" type="button">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                </div>
            </div>
            <div class="item-meta-row">
                <span>Thư mục</span>
                <span>${formatTimeAgo(folder.updatedAt || folder.createdAt)}</span>
            </div>
        `;

        if (!isTrash) {
            el.addEventListener('dblclick', () => {
                onFolderOpen(folder.id);
            });
        }

        const menuBtn = el.querySelector('.btn-card-menu');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleExplorerDropdown(folder.id, folder.name, 'folder', menuBtn, onActionClick);
        });

        explorerGrid.appendChild(el);
    });

    // 2. Media Assets
    state.explorerAssets.forEach(asset => {
        const el = document.createElement('div');
        el.className = 'explorer-item file-item';
        el.dataset.id = asset.id;

        const isImage = asset.type === 'IMAGE';
        const isVideo = asset.type === 'VIDEO';
        const sizeLabel = asset.fileSizeMb ? asset.fileSizeMb.toFixed(2) + ' MB' : '--';
        const formattedDate = formatTimeAgo(asset.uploadedAt);

        let previewHtml = '';
        if (asset.thumbnailUrl) {
            previewHtml = `<img src="${asset.thumbnailUrl.split('/').map(encodeURIComponent).join('/')}" class="item-preview-image" alt="${asset.fileName}" crossorigin="anonymous" style="width:100%;height:100%;object-fit:cover;">`;
        } else if (isImage) {
            previewHtml = `<img src="${asset.filePath.split('/').map(encodeURIComponent).join('/')}" class="item-preview-image" alt="${asset.fileName}" crossorigin="anonymous">`;
        } else if (isVideo) {
            previewHtml = `
                <div class="item-preview-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
                </div>
            `;
        } else {
            previewHtml = `
                <div class="item-preview-icon">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                </div>
            `;
        }

        el.innerHTML = `
            <div class="item-preview-wrapper">
                ${previewHtml}
            </div>
            <div class="item-title-row">
                <h5 class="item-title-text" title="${asset.fileName}">${asset.fileName}</h5>
                <div class="explorer-item-actions">
                    <button class="btn-card-menu" type="button">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/></svg>
                    </button>
                </div>
            </div>
            <div class="item-meta-row">
                <span>${sizeLabel}</span>
                <span>${formattedDate}</span>
            </div>
        `;

        const menuBtn = el.querySelector('.btn-card-menu');
        menuBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleExplorerDropdown(asset.id, asset.fileName, 'file', menuBtn, onActionClick);
        });

        el.addEventListener('dblclick', (e) => {
            if (e.target.closest('.explorer-item-actions') || e.target.closest('.card-dropdown-menu')) {
                return;
            }
            onActionClick(asset.id, asset.fileName, 'file', 'preview');
        });

        explorerGrid.appendChild(el);
    });
}

function toggleExplorerDropdown(itemId, itemName, itemType, buttonEl, onActionClick) {
    if (state.activeDropdownCardId === itemId) {
        document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
        state.activeDropdownCardId = null;
        return;
    }

    document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
    state.activeDropdownCardId = itemId;

    const dropdown = document.createElement('div');
    dropdown.className = 'card-dropdown-menu';
    
    const isTrash = state.explorerCurrentTab === 'trash';

    if (isTrash) {
        dropdown.innerHTML = `
            <button class="card-dropdown-item btn-exp-restore" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                Khôi phục
            </button>
            <button class="card-dropdown-item danger btn-exp-permanent-delete" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Xóa vĩnh viễn
            </button>
        `;
    } else {
        dropdown.innerHTML = `
            <button class="card-dropdown-item btn-exp-rename" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
                Đổi tên
            </button>
            <button class="card-dropdown-item btn-exp-move" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="10 9 15 4 20 9"/><path d="M4 20h7a4 4 0 0 0 4-4V4"/></svg>
                Di chuyển
            </button>
            <button class="card-dropdown-item danger btn-exp-delete" type="button">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
                Xóa tệp tin
            </button>
        `;
    }

    buttonEl.parentElement.appendChild(dropdown);

    // Bind dropdown click handlers
    if (isTrash) {
        dropdown.querySelector('.btn-exp-restore').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
            state.activeDropdownCardId = null;
            onActionClick(itemId, itemName, itemType, 'restore');
        });

        dropdown.querySelector('.btn-exp-permanent-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
            state.activeDropdownCardId = null;
            onActionClick(itemId, itemName, itemType, 'permanent_delete');
        });
    } else {
        dropdown.querySelector('.btn-exp-rename').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
            state.activeDropdownCardId = null;
            onActionClick(itemId, itemName, itemType, 'rename');
        });

        dropdown.querySelector('.btn-exp-move').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
            state.activeDropdownCardId = null;
            onActionClick(itemId, itemName, itemType, 'move');
        });

        dropdown.querySelector('.btn-exp-delete').addEventListener('click', (e) => {
            e.stopPropagation();
            document.querySelectorAll('.card-dropdown-menu').forEach(menu => menu.remove());
            state.activeDropdownCardId = null;
            onActionClick(itemId, itemName, itemType, 'delete');
        });
    }
}

// Render Folder Tree for Moving items selector modal
export function renderFolderTreeSelector(onSelectFolder) {
    const folderTreeSelector = document.getElementById('folder-tree-selector');
    if (!folderTreeSelector) return;
    folderTreeSelector.innerHTML = '';
    
    // Add "Root" option
    const rootDiv = document.createElement('div');
    rootDiv.className = 'tree-node-item selected'; // Default selected
    rootDiv.dataset.id = 'root';
    rootDiv.innerHTML = `
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--db-text-muted);"><rect x="3" y="9" width="18" height="12" rx="2" ry="2"/><path d="M9 22V12h6v10"/></svg>
        <span style="margin-left: 6px;">[Thư mục gốc]</span>
    `;
    onSelectFolder('root');

    rootDiv.addEventListener('click', () => {
        folderTreeSelector.querySelectorAll('.tree-node-item').forEach(el => el.classList.remove('selected'));
        rootDiv.classList.add('selected');
        onSelectFolder('root');
    });

    folderTreeSelector.appendChild(rootDiv);

    // Build hierarchical tree
    const topFolders = state.explorerFolders.filter(f => !f.parentId);
    const treeContainer = document.createElement('div');
    treeContainer.className = 'tree-node-children';
    
    topFolders.forEach(folder => {
        buildFolderTreeNode(folder, treeContainer, 1, onSelectFolder);
    });

    folderTreeSelector.appendChild(treeContainer);
}

function buildFolderTreeNode(folder, parentElement, depth, onSelectFolder) {
    // Skip moving folder to prevent circular dependency
    if (state.explorerSelectedMoveType === 'folder' && folder.id === state.explorerSelectedMoveItemId) {
        return;
    }

    const div = document.createElement('div');
    div.className = 'tree-node-item';
    div.dataset.id = folder.id;
    div.style.paddingLeft = `${depth * 12}px`;
    div.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" class="folder-icon"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        <span style="margin-left: 6px;">${folder.name}</span>
    `;

    div.addEventListener('click', () => {
        const folderTreeSelector = document.getElementById('folder-tree-selector');
        folderTreeSelector.querySelectorAll('.tree-node-item').forEach(el => el.classList.remove('selected'));
        div.classList.add('selected');
        onSelectFolder(folder.id);
    });

    parentElement.appendChild(div);

    const children = state.explorerFolders.filter(f => f.parentId === folder.id);
    children.forEach(child => {
        buildFolderTreeNode(child, parentElement, depth + 1, onSelectFolder);
    });
}
