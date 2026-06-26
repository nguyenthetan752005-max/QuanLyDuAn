import { explorerState } from "./state.js";

export function openRenameDialog(title, defaultValue, onConfirm) {
    const dialog = document.getElementById('rename-dialog');
    const titleEl = document.getElementById('rename-dialog-title');
    const input = document.getElementById('rename-dialog-input');
    const cancelBtn = document.getElementById('rename-dialog-cancel');
    const okBtn = document.getElementById('rename-dialog-ok');
    
    if (!dialog || !input) return;
    
    titleEl.textContent = title;
    input.value = defaultValue;
    dialog.hidden = false;
    
    const cleanup = () => {
        dialog.hidden = true;
        okBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    const handleConfirm = () => {
        const val = input.value.trim();
        if (val) {
            onConfirm(val);
        }
        cleanup();
    };
    
    const handleCancel = () => {
        cleanup();
    };
    
    okBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

export function openFolderDialog(onConfirm) {
    const dialog = document.getElementById('folder-dialog');
    const input = document.getElementById('folder-dialog-input');
    const cancelBtn = document.getElementById('folder-dialog-cancel');
    const okBtn = document.getElementById('folder-dialog-ok');
    
    if (!dialog || !input) return;
    
    input.value = '';
    dialog.hidden = false;
    
    const cleanup = () => {
        dialog.hidden = true;
        okBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    const handleConfirm = () => {
        const val = input.value.trim();
        if (val) {
            onConfirm(val);
        }
        cleanup();
    };
    
    const handleCancel = () => {
        cleanup();
    };
    
    okBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

let selectedMoveFolderId = 'root';

export function openMoveDialog(itemId, itemType, onConfirm) {
    const dialog = document.getElementById('move-dialog');
    const container = document.getElementById('editor-folder-tree-selector');
    const cancelBtn = document.getElementById('move-dialog-cancel');
    const okBtn = document.getElementById('move-dialog-ok');
    
    if (!dialog || !container) return;
    
    selectedMoveFolderId = 'root';
    dialog.hidden = false;
    
    const renderTree = () => {
        container.innerHTML = '';
        
        const rootDiv = document.createElement('div');
        rootDiv.className = 'explorer-list-item selected folder-tree-item';
        rootDiv.innerHTML = `
            <span class="item-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="9" width="18" height="12" rx="2" ry="2"/><path d="M9 22V12h6v10"/></svg>
            </span>
            <span class="item-name">[Thư mục gốc]</span>
        `;
        
        rootDiv.addEventListener('click', () => {
            container.querySelectorAll('.explorer-list-item').forEach(el => el.classList.remove('selected'));
            rootDiv.classList.add('selected');
            selectedMoveFolderId = 'root';
        });
        container.appendChild(rootDiv);
        
        const buildNode = (folder, depth) => {
            if (itemType === 'folder' && folder.id === itemId) return; // cyclic check
            
            const div = document.createElement('div');
            div.className = 'explorer-list-item folder-tree-item';
            div.style.paddingLeft = `${depth * 12 + 6}px`;
            div.innerHTML = `
                <span class="item-icon folder-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </span>
                <span class="item-name">${folder.name}</span>
            `;
            
            div.addEventListener('click', () => {
                container.querySelectorAll('.explorer-list-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedMoveFolderId = folder.id;
            });
            container.appendChild(div);
            
            const children = explorerState.folders.filter(f => f.parentId === folder.id);
            children.forEach(c => buildNode(c, depth + 1));
        };
        
        const topFolders = explorerState.folders.filter(f => !f.parentId);
        topFolders.forEach(f => buildNode(f, 1));
    };
    
    renderTree();
    
    const cleanup = () => {
        dialog.hidden = true;
        okBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    const handleConfirm = () => {
        const targetFolderId = selectedMoveFolderId === 'root' ? null : selectedMoveFolderId;
        onConfirm(targetFolderId);
        cleanup();
    };
    
    const handleCancel = () => {
        cleanup();
    };
    
    okBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}

export function openPreviewDialog(asset) {
    const dialog = document.getElementById('preview-dialog');
    const body = document.getElementById('editor-preview-dialog-body');
    const pathEl = document.getElementById('editor-preview-dialog-path');
    const metaEl = document.getElementById('editor-preview-dialog-meta');
    const closeBtn = document.getElementById('preview-dialog-close');
    
    if (!dialog || !body) return;
    
    body.innerHTML = '';
    dialog.hidden = false;
    
    const isImage = asset.type === 'IMAGE';
    const isVideo = asset.type === 'VIDEO';
    const cleanPath = asset.filePath.split('/').map(encodeURIComponent).join('/');
    
    if (isImage) {
        body.innerHTML = `<img src="${cleanPath}" class="preview-media" crossorigin="anonymous">`;
    } else if (isVideo) {
        body.innerHTML = `<video src="${cleanPath}" class="preview-media" controls autoplay></video>`;
    } else {
        body.innerHTML = `
            <div class="preview-audio-container">
                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
                <div><audio src="${cleanPath}" class="preview-audio" controls autoplay></audio></div>
            </div>
        `;
    }
    
    pathEl.textContent = `Đường dẫn: ${asset.filePath}`;
    const size = asset.fileSizeMb ? asset.fileSizeMb.toFixed(2) + ' MB' : '--';
    const date = asset.uploadedAt ? new Date(asset.uploadedAt).toLocaleString('vi-VN') : '--';
    metaEl.textContent = `Dung lượng: ${size} | Ngày tải: ${date}`;
    
    const cleanup = () => {
        dialog.hidden = true;
        body.innerHTML = '';
        closeBtn.removeEventListener('click', cleanup);
    };
    
    closeBtn.addEventListener('click', cleanup);
}

let selectedExtractFolderId = 'root';

export function openExtractAudioDialog(onConfirm) {
    const dialog = document.getElementById('extract-audio-dialog');
    const container = document.getElementById('editor-extract-audio-folder-tree');
    const cancelBtn = document.getElementById('extract-audio-dialog-cancel');
    const okBtn = document.getElementById('extract-audio-dialog-ok');
    
    if (!dialog || !container) return;
    
    selectedExtractFolderId = 'root';
    dialog.hidden = false;
    
    const renderTree = () => {
        container.innerHTML = '';
        
        const rootDiv = document.createElement('div');
        rootDiv.className = 'explorer-list-item selected folder-tree-item';
        rootDiv.innerHTML = `
            <span class="item-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="9" width="18" height="12" rx="2" ry="2"/><path d="M9 22V12h6v10"/></svg>
            </span>
            <span class="item-name">[Thư mục gốc]</span>
        `;
        
        rootDiv.addEventListener('click', () => {
            container.querySelectorAll('.explorer-list-item').forEach(el => el.classList.remove('selected'));
            rootDiv.classList.add('selected');
            selectedExtractFolderId = 'root';
        });
        container.appendChild(rootDiv);
        
        const buildNode = (folder, depth) => {
            const div = document.createElement('div');
            div.className = 'explorer-list-item folder-tree-item';
            div.style.paddingLeft = `${depth * 12 + 6}px`;
            div.innerHTML = `
                <span class="item-icon folder-icon">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
                </span>
                <span class="item-name">${folder.name}</span>
            `;
            
            div.addEventListener('click', () => {
                container.querySelectorAll('.explorer-list-item').forEach(el => el.classList.remove('selected'));
                div.classList.add('selected');
                selectedExtractFolderId = folder.id;
            });
            container.appendChild(div);
            
            const children = explorerState.folders.filter(f => f.parentId === folder.id);
            children.forEach(c => buildNode(c, depth + 1));
        };
        
        const topFolders = explorerState.folders.filter(f => !f.parentId);
        topFolders.forEach(f => buildNode(f, 1));
    };
    
    renderTree();
    
    const cleanup = () => {
        dialog.hidden = true;
        okBtn.removeEventListener('click', handleConfirm);
        cancelBtn.removeEventListener('click', handleCancel);
    };
    
    const handleConfirm = () => {
        const targetFolderId = selectedExtractFolderId === 'root' ? null : selectedExtractFolderId;
        onConfirm(targetFolderId);
        cleanup();
    };
    
    const handleCancel = () => {
        cleanup();
    };
    
    okBtn.addEventListener('click', handleConfirm);
    cancelBtn.addEventListener('click', handleCancel);
}
