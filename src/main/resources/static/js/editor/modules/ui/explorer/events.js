import { explorerState } from "./state.js";
import { refreshEditorExplorer, updateProjectNameInUI } from "./api.js";
import { openRenameDialog, openFolderDialog } from "./modals.js";
import { renderExplorerList, closeDropdownMenu } from "./ui.js";

async function switchTab(tab) {
    explorerState.currentTab = tab;
    explorerState.currentFolderId = null;
    
    const tabMedia = document.getElementById('btn-exp-media-sidebar');
    const tabTrash = document.getElementById('btn-exp-trash-sidebar');
    const tabStock = document.getElementById('btn-exp-stock-sidebar');
    
    const quickActions = document.getElementById('explorer-quick-actions');
    const trashNotice = document.getElementById('trash-notice-sidebar');
    const breadcrumbs = document.getElementById('explorer-breadcrumbs-sidebar');
    const listContainer = document.querySelector('.explorer-list-container');
    const searchBox = document.querySelector('.sidebar-search-box');
    const stockContainer = document.getElementById('stock-container-sidebar');
    
    if (tabMedia) tabMedia.classList.toggle('active', tab === 'media');
    if (tabTrash) tabTrash.classList.toggle('active', tab === 'trash');
    if (tabStock) tabStock.classList.toggle('active', tab === 'stock');
    
    if (tab === 'stock') {
        if (quickActions) quickActions.style.display = 'none';
        if (trashNotice) trashNotice.hidden = true;
        if (breadcrumbs) breadcrumbs.style.display = 'none';
        if (listContainer) listContainer.style.display = 'none';
        if (searchBox) searchBox.style.display = 'none';
        if (stockContainer) stockContainer.style.display = 'flex';
    } else {
        if (stockContainer) stockContainer.style.display = 'none';
        if (listContainer) listContainer.style.display = 'block';
        if (searchBox) searchBox.style.display = 'block';
        if (breadcrumbs) breadcrumbs.style.display = 'flex';
        
        if (quickActions) quickActions.style.display = tab === 'trash' ? 'none' : 'flex';
        if (trashNotice) trashNotice.hidden = tab !== 'trash';
        
        await refreshEditorExplorer();
        renderExplorerList();
    }
}

export function initExplorerEventListeners() {
    // 1. Rename Project
    const btnRenameProj = document.getElementById('btn-rename-project-topbar');
    const nameDisplayProj = document.getElementById('project-name-display');
    
    const triggerRename = () => {
        const currentName = nameDisplayProj ? nameDisplayProj.textContent : '';
        openRenameDialog('Đổi tên dự án', currentName, async (newName) => {
            if (!explorerState.projectId) return;
            try {
                const getRes = await fetch(`/api/v1/projects/${explorerState.projectId}`);
                if (getRes.ok) {
                    const project = await getRes.json();
                    project.projectName = newName;
                    const putRes = await fetch(`/api/v1/projects/${explorerState.projectId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(project)
                    });
                    if (putRes.ok) {
                        await updateProjectNameInUI();
                    } else {
                        alert('Không thể đổi tên dự án.');
                    }
                }
            } catch (err) {
                console.error("Lỗi khi đổi tên dự án:", err);
            }
        });
    };
    
    if (btnRenameProj) {
        btnRenameProj.addEventListener('click', triggerRename);
    }
    if (nameDisplayProj) {
        nameDisplayProj.addEventListener('click', triggerRename);
    }
    
    // 2. Search
    const searchInput = document.getElementById('explorer-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            explorerState.searchQuery = e.target.value.toLowerCase().trim();
            renderExplorerList();
        });
    }
    
    // 3. Tab switching
    const tabMedia = document.getElementById('btn-exp-media-sidebar');
    const tabTrash = document.getElementById('btn-exp-trash-sidebar');
    const tabStock = document.getElementById('btn-exp-stock-sidebar');
    
    if (tabMedia && tabTrash && tabStock) {
        tabMedia.addEventListener('click', () => switchTab('media'));
        tabTrash.addEventListener('click', () => switchTab('trash'));
        tabStock.addEventListener('click', () => switchTab('stock'));
    }
    
    // 4. Quick Actions
    const btnCreateFolder = document.getElementById('btn-create-folder-sidebar');
    if (btnCreateFolder) {
        btnCreateFolder.addEventListener('click', () => {
            openFolderDialog(async (folderName) => {
                try {
                    const res = await fetch('/api/v1/media-folders', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ name: folderName, parentId: explorerState.currentFolderId })
                    });
                    if (res.ok) {
                        await refreshEditorExplorer();
                        renderExplorerList();
                    } else {
                        const err = await res.json();
                        alert(err.message || 'Không thể tạo thư mục');
                    }
                } catch (e) {
                    console.error("Lỗi tạo thư mục:", e);
                }
            });
        });
    }
    
    const btnUpload = document.getElementById('btn-upload-file-sidebar');
    const fileInput = document.getElementById('exp-file-input-sidebar');
    if (btnUpload && fileInput) {
        btnUpload.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', async (e) => {
            const files = Array.from(e.target.files || []);
            if (files.length === 0) return;
            
            const loader = document.getElementById('explorer-loader-sidebar');
            if (loader) loader.hidden = false;
            
            for (const file of files) {
                try {
                    const formData = new FormData();
                    formData.append('file', file);
                    if (explorerState.currentFolderId) {
                        formData.append('folderId', explorerState.currentFolderId);
                    }
                    const response = await fetch('/api/v1/media-assets/upload', {
                        method: 'POST',
                        body: formData
                    });
                    if (!response.ok) {
                        const err = await response.json();
                        throw new Error(err.message || 'Tải lên thất bại');
                    }
                } catch (err) {
                    console.error("Lỗi upload tệp tin:", err);
                    alert(`Không thể tải lên tệp "${file.name}": ${err.message}`);
                }
            }
            fileInput.value = '';
            await refreshEditorExplorer();
            renderExplorerList();
        });
    }
    
    const btnSocial = document.getElementById('btn-import-social-sidebar');
    if (btnSocial) {
        btnSocial.addEventListener('click', () => {
            const dialog = document.getElementById('import-social-dialog');
            const input = document.getElementById('import-social-url');
            const cancelBtn = document.getElementById('import-social-dialog-cancel');
            const okBtn = document.getElementById('import-social-dialog-ok');
            const progressContainer = document.getElementById('import-social-progress-container');
            const progressFill = document.getElementById('import-social-progress-fill');
            const progressStatus = document.getElementById('import-social-progress-status');
            
            if (!dialog || !input) return;
            
            input.value = '';
            if (progressContainer) progressContainer.hidden = true;
            dialog.hidden = false;
            
            let isDownloading = false;
            let checkInterval = null;
            
            const cleanup = () => {
                dialog.hidden = true;
                if (checkInterval) clearInterval(checkInterval);
                okBtn.removeEventListener('click', handleDownload);
                cancelBtn.removeEventListener('click', handleCancel);
            };
            
            const handleCancel = () => {
                if (isDownloading) {
                    if (!confirm('Video đang được tải xuống. Bạn có chắc chắn muốn đóng hộp thoại? Tiến trình tải vẫn có thể tiếp tục dưới nền.')) {
                        return;
                    }
                }
                cleanup();
            };
            
            const handleDownload = async () => {
                const url = input.value.trim();
                if (!url) return;
                
                isDownloading = true;
                if (progressContainer) progressContainer.hidden = false;
                if (progressFill) progressFill.style.width = '0%';
                if (progressStatus) progressStatus.textContent = 'Đang gửi yêu cầu tải...';
                okBtn.disabled = true;
                
                try {
                    const res = await fetch('/api/v1/media-assets/import-social', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ url, folderId: explorerState.currentFolderId })
                    });
                    
                    if (res.ok) {
                        const job = await res.json();
                        const jobId = job.id;
                        
                        checkInterval = setInterval(async () => {
                            try {
                                const statusRes = await fetch(`/api/jobs/${jobId}/status`);
                                if (statusRes.ok) {
                                    const jobStatus = await statusRes.json();
                                    const progress = jobStatus.progress || 0;
                                    if (progressFill) progressFill.style.width = `${progress}%`;
                                    if (progressStatus) progressStatus.textContent = jobStatus.message || `Đang tải: ${progress}%`;
                                    
                                    if (jobStatus.status === 'SUCCESS' || jobStatus.status === 'COMPLETED') {
                                        clearInterval(checkInterval);
                                        if (progressStatus) progressStatus.textContent = 'Tải video thành công!';
                                        setTimeout(async () => {
                                            cleanup();
                                            await refreshEditorExplorer();
                                            renderExplorerList();
                                        }, 1000);
                                    } else if (jobStatus.status === 'FAILED') {
                                        clearInterval(checkInterval);
                                        okBtn.disabled = false;
                                        isDownloading = false;
                                        alert(jobStatus.errorMessage || 'Tải video thất bại. Vui lòng thử lại.');
                                    }
                                }
                            } catch (err) {
                                console.error(err);
                            }
                        }, 1000);
                    } else {
                        okBtn.disabled = false;
                        isDownloading = false;
                        alert('Không thể bắt đầu tải video.');
                    }
                } catch (err) {
                    okBtn.disabled = false;
                    isDownloading = false;
                    console.error("Lỗi gửi yêu cầu tải MXH:", err);
                    alert('Lỗi kết nối khi tải video.');
                }
            };
            
            okBtn.addEventListener('click', handleDownload);
            cancelBtn.addEventListener('click', handleCancel);
        });
    }
    
    // Close dropdown menu on click outside
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.item-actions-btn') && !e.target.closest('.sidebar-dropdown-menu')) {
            closeDropdownMenu();
        }
    });
}
