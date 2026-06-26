import { state } from './modules/state.js';
import * as api from './modules/api.js';
import * as ui from './modules/ui.js';
import * as modals from './modules/modals.js';
import { initNotifications } from './modules/notifications.js';

document.addEventListener('DOMContentLoaded', () => {
    initNotifications();
    // DOM Elements
    const searchInput = document.getElementById('search-input');
    const btnCreateProject = document.getElementById('btn-create-project');
    const sidebarNav = document.querySelector('.sidebar-nav');
    
    // Explorer Elements
    const btnExpMedia = document.getElementById('btn-exp-media');
    const btnExpTrash = document.getElementById('btn-exp-trash');
    const btnExpUploadFile = document.getElementById('btn-exp-upload-file');
    const expFileInput = document.getElementById('exp-file-input');

    // ==========================================================================
    // Project Dashboard Functions
    // ==========================================================================
    async function fetchProjects() {
        ui.showLoader(true);
        try {
            if (state.currentFilter === 'trash') {
                const data = await api.getDeletedProjects();
                state.projects = data.content ? data.content : data;
            } else {
                const data = await api.getProjects(0, 50, state.searchQuery);
                state.projects = data.content ? data.content : data;
            }
            
            // Set user info
            const user = window.AuthUtil?.getUser();
            if (user) {
                const usernameDisplay = document.getElementById('username-display');
                const userInitials = document.getElementById('user-initials');
                if (usernameDisplay) usernameDisplay.textContent = user.username || user.email;
                if (userInitials) userInitials.textContent = (user.username || user.email).substring(0, 1).toUpperCase();
                // Reveal admin link only for ADMIN accounts
                if ((user.role || '').toUpperCase() === 'ADMIN') {
                    const adminLink = document.getElementById('nav-admin-link');
                    if (adminLink) adminLink.hidden = false;
                }
            }
            
            renderProjectsList();
        } catch (error) {
            console.error('Error fetching projects:', error);
            ui.showErrorState();
        } finally {
            ui.showLoader(false);
        }
    }

    function renderProjectsList() {
        ui.renderProjects(
            modals.openRenameModal,
            async (id, name) => {
                if (confirm(`Bạn có chắc chắn muốn xóa dự án "${name}"? Dự án sẽ được đưa vào Thùng rác dự án.`)) {
                    try {
                        await api.deleteProject(id);
                        fetchProjects();
                    } catch (error) {
                        console.error('Error deleting project:', error);
                        alert(error.message || 'Không thể xóa dự án. Vui lòng thử lại.');
                    }
                }
            },
            async (id, name) => {
                try {
                    await api.restoreProject(id);
                    fetchProjects();
                } catch (error) {
                    console.error('Error restoring project:', error);
                    alert(error.message || 'Không thể khôi phục dự án. Vui lòng thử lại.');
                }
            },
            async (id, name) => {
                if (confirm(`CẢNH BÁO: Bạn có chắc chắn muốn xóa vĩnh viễn dự án "${name}"?\nHành động này không thể khôi phục!`)) {
                    try {
                        await api.deleteProjectPermanently(id);
                        fetchProjects();
                    } catch (error) {
                        console.error('Error hard deleting project:', error);
                        alert(error.message || 'Không thể xóa vĩnh viễn dự án. Vui lòng thử lại.');
                    }
                }
            }
        );
    }

    // ==========================================================================
    // Shared File Explorer Functions
    // ==========================================================================
    async function loadExplorer() {
        const explorerLoader = document.getElementById('explorer-loader');
        const explorerGrid = document.getElementById('explorer-grid');
        const explorerEmpty = document.getElementById('explorer-empty');

        explorerLoader?.removeAttribute('hidden');
        explorerGrid?.setAttribute('hidden', '');
        explorerEmpty?.setAttribute('hidden', '');

        try {
            const isTrash = state.explorerCurrentTab === 'trash';
            state.explorerFolders = await api.getFolders(isTrash);
            const assetsData = await api.getAssets(isTrash, state.currentFolderId);
            state.explorerAssets = assetsData.content ? assetsData.content : assetsData;

            ui.renderExplorerGrid(
                (folderId) => {
                    state.currentFolderId = folderId;
                    loadExplorer();
                },
                handleExplorerAction
            );
            
            ui.renderBreadcrumbs((folderId) => {
                state.currentFolderId = folderId;
                loadExplorer();
            });
        } catch (error) {
            console.error('Error fetching explorer resources:', error);
            if (explorerGrid) explorerGrid.innerHTML = '';
            explorerEmpty?.removeAttribute('hidden');
            
            const emptyTitle = document.getElementById('explorer-empty-title');
            const emptyDesc = document.getElementById('explorer-empty-desc');
            if (emptyTitle) emptyTitle.textContent = 'Đã xảy ra lỗi';
            if (emptyDesc) emptyDesc.textContent = 'Không thể kết nối danh sách tệp tin. Vui lòng tải lại.';
        } finally {
            explorerLoader?.setAttribute('hidden', '');
        }
    }

    async function handleExplorerAction(itemId, itemName, itemType, action) {
        if (action === 'restore') {
            try {
                if (itemType === 'folder') {
                    await api.restoreFolder(itemId);
                } else {
                    await api.restoreAsset(itemId);
                }
                loadExplorer();
            } catch (error) {
                console.error('Error restoring:', error);
                alert('Không thể khôi phục tài nguyên này. Vui lòng thử lại.');
            }
        } else if (action === 'permanent_delete') {
            if (itemType === 'file') {
                try {
                    const usage = await api.getAssetUsage(itemId);
                    if (usage.length > 0) {
                        const projNames = usage.map(u => `"${u.projectName}"`).join(', ');
                        if (!confirm(`CẢNH BÁO: Tệp tin này đang được sử dụng trong các dự án: ${projNames}.\nXóa vĩnh viễn sẽ làm mất tài nguyên này trong các dự án trên và không thể khôi phục lại.\nBạn vẫn chắc chắn muốn xóa vĩnh viễn?`)) {
                            return;
                        }
                    } else {
                        if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn tệp "${itemName}"? Thao tác này sẽ xóa tệp vật lý trên đĩa cứng và không thể khôi phục.`)) {
                            return;
                        }
                    }
                    await api.deleteAssetPermanently(itemId);
                    loadExplorer();
                } catch (error) {
                    console.error('Error permanent deleting file:', error);
                    alert('Không thể xóa vĩnh viễn. Vui lòng thử lại.');
                }
            } else {
                if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn thư mục "${itemName}" cùng toàn bộ nội dung bên trong?`)) {
                    return;
                }
                try {
                    await api.deleteFolderPermanently(itemId);
                    loadExplorer();
                } catch (error) {
                    console.error('Error permanent deleting folder:', error);
                    alert('Không thể xóa vĩnh viễn. Vui lòng thử lại.');
                }
            }
        } else if (action === 'rename') {
            modals.openFolderModal(itemId, itemName, itemType);
        } else if (action === 'preview') {
            const asset = state.explorerAssets.find(a => a.id === itemId);
            if (asset) {
                modals.openPreviewModal(asset);
            }
        } else if (action === 'move') {
            modals.openMoveModal(itemId, itemType, loadExplorer);
        } else if (action === 'delete') {
            if (itemType === 'file') {
                try {
                    const usage = await api.getAssetUsage(itemId);
                    if (usage.length > 0) {
                        const projNames = usage.map(u => `"${u.projectName}"`).join(', ');
                        if (!confirm(`Tệp tin này đang được sử dụng trong các dự án: ${projNames}.\nNếu đưa vào thùng rác, các clip tương ứng trong các dự án đó sẽ hiển thị trạng thái offline (lỗi).\nBạn có chắc chắn muốn đưa tệp tin này vào Thùng rác?`)) {
                            return;
                        }
                    } else {
                        if (!confirm(`Bạn có chắc chắn muốn đưa tệp "${itemName}" vào Thùng rác?`)) {
                            return;
                        }
                    }
                    await api.deleteAsset(itemId);
                    loadExplorer();
                } catch (error) {
                    console.error('Error soft deleting file:', error);
                    alert('Không thể thực hiện xóa. Vui lòng thử lại.');
                }
            } else {
                if (!confirm(`Bạn có chắc chắn muốn đưa thư mục "${itemName}" cùng toàn bộ nội dung bên trong vào Thùng rác?`)) {
                    return;
                }
                try {
                    await api.deleteFolder(itemId);
                    loadExplorer();
                } catch (error) {
                    console.error('Error soft deleting folder:', error);
                    alert('Không thể thực hiện xóa. Vui lòng thử lại.');
                }
            }
        }
    }

    function switchExplorerTab(tab) {
        state.explorerCurrentTab = tab;
        const trashNotice = document.getElementById('trash-notice');
        const btnExpCreateFolder = document.getElementById('btn-exp-create-folder');
        const btnExpUploadFile = document.getElementById('btn-exp-upload-file');
        const btnExpImportSocial = document.getElementById('btn-exp-import-social');

        if (btnExpMedia) btnExpMedia.classList.toggle('active', tab === 'media');
        if (btnExpTrash) btnExpTrash.classList.toggle('active', tab === 'trash');
        
        if (tab === 'trash') {
            trashNotice?.removeAttribute('hidden');
            btnExpCreateFolder?.setAttribute('hidden', '');
            btnExpUploadFile?.setAttribute('hidden', '');
            btnExpImportSocial?.setAttribute('hidden', '');
        } else {
            trashNotice?.setAttribute('hidden', '');
            btnExpCreateFolder?.removeAttribute('hidden');
            btnExpUploadFile?.removeAttribute('hidden');
            btnExpImportSocial?.removeAttribute('hidden');
        }
        
        // Reset to Root when switching tabs
        state.currentFolderId = null;
        loadExplorer();
    }

    // Get auto delete setting
    async function loadTrashSettings() {
        try {
            const setting = await api.getTrashSettings();
            const trashDaysLabel = document.getElementById('trash-days-label');
            if (trashDaysLabel) trashDaysLabel.textContent = setting.settingValue;
        } catch (error) {
            console.error('Error loading trash settings:', error);
        }
    }

    // ==========================================================================
    // Event Listeners Binding
    // ==========================================================================
    
    // Close dropdowns and modals on outer click
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.project-card-actions') && !e.target.closest('.explorer-item-actions')) {
            ui.closeAllDropdowns();
        }
        
        const createModal = document.getElementById('create-modal');
        const renameModal = document.getElementById('rename-modal');
        const folderModal = document.getElementById('folder-modal');
        const moveModal = document.getElementById('move-modal');
        const socialModal = document.getElementById('social-modal');
        const previewModal = document.getElementById('preview-modal');

        if (e.target === createModal) modals.closeCreateModal();
        if (e.target === renameModal) modals.closeRenameModal();
        if (e.target === folderModal) modals.closeFolderModal();
        if (e.target === moveModal) modals.closeMoveModal();
        if (e.target === socialModal) modals.closeSocialModal();
        if (e.target === previewModal) modals.closePreviewModal();
    });

    // Sidebar navigation filter switching
    sidebarNav?.addEventListener('click', (e) => {
        const item = e.target.closest('.nav-item');
        if (!item) return;

        document.querySelectorAll('.nav-item').forEach(el => el.classList.remove('active'));
        item.classList.add('active');

        const sectionTitle = document.getElementById('section-title');

        if (item.dataset.tab === 'explorer') {
            document.getElementById('explorer-section')?.removeAttribute('hidden');
            document.querySelector('.projects-section')?.setAttribute('hidden', '');
            btnCreateProject?.setAttribute('hidden', '');
            document.querySelector('.search-box-container')?.setAttribute('hidden', '');
            loadExplorer();
        } else if (item.dataset.tab === 'project-trash') {
            document.getElementById('explorer-section')?.setAttribute('hidden', '');
            document.querySelector('.projects-section')?.removeAttribute('hidden');
            btnCreateProject?.setAttribute('hidden', '');
            document.querySelector('.search-box-container')?.removeAttribute('hidden');
            if (sectionTitle) sectionTitle.textContent = 'Thùng rác dự án';
            state.currentFilter = 'trash';
            fetchProjects();
        } else {
            document.getElementById('explorer-section')?.setAttribute('hidden', '');
            document.querySelector('.projects-section')?.removeAttribute('hidden');
            btnCreateProject?.removeAttribute('hidden');
            document.querySelector('.search-box-container')?.removeAttribute('hidden');
            if (sectionTitle) {
                if (item.dataset.filter === 'IMAGE') {
                    sectionTitle.textContent = 'Dự án chỉnh sửa ảnh';
                } else if (item.dataset.filter === 'VIDEO') {
                    sectionTitle.textContent = 'Dự án chỉnh sửa video';
                } else {
                    sectionTitle.textContent = 'Tất cả dự án của tôi';
                }
            }
            state.currentFilter = item.dataset.filter;
            fetchProjects();
        }
    });

    // Search query for projects
    searchInput?.addEventListener('input', (e) => {
        state.searchQuery = e.target.value.toLowerCase().trim();
        renderProjectsList();
    });

    // Explorer navigation triggers
    btnExpMedia?.addEventListener('click', () => switchExplorerTab('media'));
    btnExpTrash?.addEventListener('click', () => switchExplorerTab('trash'));

    // Handle File Uploading triggers
    btnExpUploadFile?.addEventListener('click', () => expFileInput?.click());
    expFileInput?.addEventListener('change', async (e) => {
        const selectedFiles = Array.from(e.target.files || []);
        if (selectedFiles.length === 0) return;

        const explorerLoader = document.getElementById('explorer-loader');
        explorerLoader?.removeAttribute('hidden');

        for (const file of selectedFiles) {
            try {
                await api.uploadFile(file, state.currentFolderId);
            } catch (error) {
                console.error(`Upload file error ${file.name}:`, error);
            }
        }

        if (expFileInput) expFileInput.value = '';
        loadExplorer();
    });

    // Initialize Modal interactions and bindings
    modals.setupModals(fetchProjects, loadExplorer);

    // ==========================================================================
    // Entry Point Routing
    // ==========================================================================
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    const errorParam = params.get('error');

    if (errorParam === 'forbidden') {
        showForbiddenToast();
    }
    
    if (tabParam === 'explorer' || window.location.pathname.startsWith('/explorer')) {
        const item = document.querySelector('.nav-item[data-tab="explorer"]');
        if (item) {
            // Triggers visual tab switch and loads explorer
            item.click(); 
        }
    } else {
        fetchProjects();
    }

    loadTrashSettings();

    function showForbiddenToast() {
        const toast = document.createElement('div');
        toast.style.cssText = `
            position: fixed;
            top: 24px;
            right: 24px;
            background: rgba(239, 68, 68, 0.95);
            backdrop-filter: blur(8px);
            border: 1px solid rgba(255, 255, 255, 0.1);
            color: white;
            padding: 16px 24px;
            border-radius: 12px;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            gap: 12px;
            z-index: 9999;
            transform: translateY(-20px);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
            font-family: 'Outfit', sans-serif;
            font-size: 0.95rem;
            font-weight: 500;
        `;
        toast.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            <span>Bạn không có quyền truy cập vào dự án này.</span>
        `;
        document.body.appendChild(toast);
        // Animate in
        setTimeout(() => {
            toast.style.transform = 'translateY(0)';
            toast.style.opacity = '1';
        }, 100);
        // Animate out and remove
        setTimeout(() => {
            toast.style.transform = 'translateY(-20px)';
            toast.style.opacity = '0';
            setTimeout(() => {
                toast.remove();
            }, 400);
        }, 4000);

        // Clean URL to avoid message appearing again on manual refresh
        const cleanSearch = window.location.search.replace(/[?&]error=forbidden/, '').replace(/^&/, '?');
        const newUrl = window.location.pathname + cleanSearch;
        window.history.replaceState({}, document.title, newUrl);
    }

    // Guided Tour for Projects
    if (!localStorage.getItem('has_seen_projects_tour')) {
        setTimeout(() => {
            if (typeof introJs !== 'undefined') {
                const tour = introJs();
                tour.setOptions({
                    nextLabel: 'Tiếp theo',
                    prevLabel: 'Quay lại',
                    skipLabel: 'Bỏ qua',
                    doneLabel: 'Hoàn thành',
                    steps: [
                        {
                            title: 'Chào mừng!',
                            intro: 'Chào mừng bạn đến với Lily Creative. Đây là không gian quản lý dự án và tài nguyên của bạn.'
                        },
                        {
                            element: document.querySelector('.sidebar-nav'),
                            title: 'Trình quản lý',
                            intro: 'Nơi bạn chuyển đổi giữa các Dự án và Quản lý Tệp tin (Media Explorer).'
                        },
                        {
                            element: document.getElementById('btn-create-project'),
                            title: 'Tạo dự án mới',
                            intro: 'Bắt đầu thiết kế ảnh hoặc biên tập video bằng cách click vào đây.'
                        }
                    ]
                });
                tour.start();
                tour.oncomplete(() => localStorage.setItem('has_seen_projects_tour', 'true'));
                tour.onexit(() => localStorage.setItem('has_seen_projects_tour', 'true'));
            }
        }, 1000);
    }
});
