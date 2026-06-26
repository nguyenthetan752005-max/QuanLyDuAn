import { state } from './state.js';
import * as api from './api.js';
import * as ui from './ui.js';

export function openCreateModal() {
    const createProjectForm = document.getElementById('create-project-form');
    const customDimensionsGrid = document.getElementById('custom-dimensions-grid');
    const createModal = document.getElementById('create-modal');
    if (createProjectForm) createProjectForm.reset();
    if (customDimensionsGrid) customDimensionsGrid.setAttribute('hidden', '');
    if (createModal) {
        createModal.removeAttribute('hidden');
        const projNameInput = document.getElementById('project-name');
        if (projNameInput) projNameInput.focus();
    }
}

export function closeCreateModal() {
    const createModal = document.getElementById('create-modal');
    if (createModal) createModal.setAttribute('hidden', '');
}

export function openRenameModal(id, name) {
    const renameModal = document.getElementById('rename-modal');
    const idInput = document.getElementById('rename-project-id');
    const nameInput = document.getElementById('rename-project-name');
    if (idInput) idInput.value = id;
    if (nameInput) nameInput.value = name;
    if (renameModal) {
        renameModal.removeAttribute('hidden');
        if (nameInput) nameInput.focus();
    }
}

export function closeRenameModal() {
    const renameModal = document.getElementById('rename-modal');
    if (renameModal) renameModal.setAttribute('hidden', '');
}

export function openFolderModal(id = null, name = '', itemType = 'folder') {
    const folderForm = document.getElementById('folder-form');
    const folderIdInput = document.getElementById('folder-id-input');
    const folderNameInput = document.getElementById('folder-name-input');
    const folderModalTitle = document.getElementById('folder-modal-title');
    const folderModal = document.getElementById('folder-modal');
    
    if (folderForm) {
        folderForm.reset();
        folderForm.dataset.itemType = itemType;
    }
    if (folderIdInput) folderIdInput.value = id || '';
    if (folderNameInput) folderNameInput.value = name || '';
    if (folderModalTitle) {
        if (id) {
            folderModalTitle.textContent = itemType === 'folder' ? 'Đổi tên thư mục' : 'Đổi tên tệp tin';
        } else {
            folderModalTitle.textContent = 'Tạo thư mục mới';
        }
    }
    if (folderModal) {
        folderModal.removeAttribute('hidden');
        if (folderNameInput) folderNameInput.focus();
    }
}

export function closeFolderModal() {
    const folderModal = document.getElementById('folder-modal');
    if (folderModal) folderModal.setAttribute('hidden', '');
}

export function openMoveModal(itemId, type, onMovedCallback) {
    state.explorerSelectedMoveItemId = itemId;
    state.explorerSelectedMoveType = type;
    
    // Render the folder tree selector using ui module
    ui.renderFolderTreeSelector((folderId) => {
        state.selectedMoveTargetFolderId = folderId;
    });
    
    const moveModal = document.getElementById('move-modal');
    if (moveModal) moveModal.removeAttribute('hidden');
    
    // Keep reference to the callback
    state.onMovedCallback = onMovedCallback;
}

export function closeMoveModal() {
    const moveModal = document.getElementById('move-modal');
    if (moveModal) moveModal.setAttribute('hidden', '');
    state.explorerSelectedMoveItemId = null;
    state.explorerSelectedMoveType = null;
    state.onMovedCallback = null;
}

export function openSocialModal() {
    const socialForm = document.getElementById('social-form');
    const socialProgressContainer = document.getElementById('social-progress-container');
    const socialModal = document.getElementById('social-modal');
    if (socialForm) socialForm.reset();
    if (socialProgressContainer) socialProgressContainer.setAttribute('hidden', '');
    if (socialModal) {
        socialModal.removeAttribute('hidden');
        const urlInput = document.getElementById('social-url-input');
        if (urlInput) urlInput.focus();
    }
}

export function closeSocialModal() {
    const socialModal = document.getElementById('social-modal');
    if (socialModal) socialModal.setAttribute('hidden', '');
}

export function openPreviewModal(asset) {
    const previewModal = document.getElementById('preview-modal');
    const title = document.getElementById('preview-modal-title');
    const body = document.getElementById('preview-modal-body');
    const meta = document.getElementById('preview-modal-meta');

    if (!previewModal || !body) return;

    if (title) title.textContent = `Xem trước: ${asset.fileName}`;
    body.innerHTML = ''; // Clear previous content

    const isImage = asset.type === 'IMAGE';
    const isVideo = asset.type === 'VIDEO';
    const isAudio = asset.type === 'AUDIO';

    const encodedPath = asset.filePath.split('/').map(encodeURIComponent).join('/');

    if (isImage) {
        const img = document.createElement('img');
        img.src = encodedPath;
        img.style.maxWidth = '100%';
        img.style.maxHeight = '400px';
        img.style.objectFit = 'contain';
        body.appendChild(img);
    } else if (isVideo) {
        const video = document.createElement('video');
        video.src = encodedPath;
        video.controls = true;
        video.autoplay = true;
        video.style.maxWidth = '100%';
        video.style.maxHeight = '400px';
        body.appendChild(video);
    } else if (isAudio) {
        const audio = document.createElement('audio');
        audio.src = encodedPath;
        audio.controls = true;
        audio.autoplay = true;
        audio.style.width = '80%';
        body.appendChild(audio);
    } else {
        body.innerHTML = `<span style="color: var(--db-text-muted);">Không hỗ trợ xem trước định dạng này</span>`;
    }

    if (meta) {
        const sizeLabel = asset.fileSizeMb ? asset.fileSizeMb.toFixed(2) + ' MB' : '--';
        const formattedDate = ui.formatTimeAgo(asset.uploadedAt);
        meta.textContent = `Độ lớn: ${sizeLabel} | Ngày tải: ${formattedDate}`;
    }

    const pathEl = document.getElementById('preview-modal-path');
    if (pathEl) {
        const pathSegments = [];
        let tempId = asset.folderId;
        while (tempId) {
            const folder = state.explorerFolders.find(f => f.id === tempId);
            if (!folder) break;
            pathSegments.unshift(folder.name);
            tempId = folder.parentId;
        }
        const fullPathStr = ['Kho lưu trữ', ...pathSegments, asset.fileName].join(' / ');
        pathEl.textContent = `Đường dẫn: ${fullPathStr}`;
    }

    previewModal.removeAttribute('hidden');
}

export function closePreviewModal() {
    const previewModal = document.getElementById('preview-modal');
    const body = document.getElementById('preview-modal-body');
    
    if (body) {
        const media = body.querySelector('video, audio');
        if (media) {
            media.pause();
            media.src = '';
            media.load();
        }
        body.innerHTML = '';
    }
    
    if (previewModal) previewModal.setAttribute('hidden', '');
}

// Poll download task status
function pollDownloadTaskStatus(jobId, refreshExplorerCallback) {
    let attempts = 0;
    const maxAttempts = 180; // 3 minutes timeout
    const socialProgressFill = document.getElementById('social-progress-fill');
    const socialProgressStatus = document.getElementById('social-progress-status');
    const btnSubmitSocial = document.getElementById('btn-submit-social');

    const interval = setInterval(async () => {
        attempts++;
        if (attempts > maxAttempts) {
            clearInterval(interval);
            if (socialProgressFill) {
                socialProgressFill.style.backgroundColor = 'var(--db-danger)';
            }
            if (socialProgressStatus) {
                socialProgressStatus.textContent = 'Lỗi: Tác vụ quá thời gian chờ (Timeout).';
            }
            if (btnSubmitSocial) btnSubmitSocial.removeAttribute('disabled');
            return;
        }

        try {
            const task = await api.getJobStatus(jobId);
            
            if (task.status === 'RUNNING') {
                if (socialProgressFill) socialProgressFill.style.width = '50%';
                if (socialProgressStatus) {
                    socialProgressStatus.textContent = 'Đang tải video và bypass captcha (Kiểm tra terminal python của bạn)...';
                }
            } else if (task.status === 'SUCCESS') {
                clearInterval(interval);
                if (socialProgressFill) {
                    socialProgressFill.style.width = '100%';
                    socialProgressFill.style.backgroundColor = 'var(--db-success)';
                }
                if (socialProgressStatus) {
                    socialProgressStatus.textContent = 'Đã tải thành công và lưu vào thư mục!';
                }
                
                setTimeout(() => {
                    closeSocialModal();
                    refreshExplorerCallback();
                    if (btnSubmitSocial) btnSubmitSocial.removeAttribute('disabled');
                }, 1000);
            } else if (task.status === 'FAILED') {
                clearInterval(interval);
                if (socialProgressFill) {
                    socialProgressFill.style.width = '100%';
                    socialProgressFill.style.backgroundColor = 'var(--db-danger)';
                }
                if (socialProgressStatus) {
                    socialProgressStatus.textContent = 'Lỗi tải video: ' + (task.errorMessage || 'Lỗi không xác định.');
                }
                if (btnSubmitSocial) btnSubmitSocial.removeAttribute('disabled');
            }
        } catch (error) {
            console.error('Error polling status:', error);
        }
    }, 1500);
}

// Setup and bind all modal triggers and form submits
export function setupModals(refreshProjectsCallback, refreshExplorerCallback) {
    const canvasPreset = document.getElementById('canvas-preset');
    const customDimensionsGrid = document.getElementById('custom-dimensions-grid');
    
    // Canvas preset change
    canvasPreset?.addEventListener('change', (e) => {
        if (e.target.value === 'custom') {
            customDimensionsGrid?.removeAttribute('hidden');
        } else {
            customDimensionsGrid?.setAttribute('hidden', '');
        }
    });

    // Close buttons binding
    const btnCreateProject = document.getElementById('btn-create-project');
    const btnEmptyCreate = document.querySelector('.btn-empty-create');
    const btnCloseModal = document.getElementById('btn-close-modal');
    const btnCancelCreate = document.getElementById('btn-cancel-create');
    
    btnCreateProject?.addEventListener('click', openCreateModal);
    btnEmptyCreate?.addEventListener('click', openCreateModal);
    btnCloseModal?.addEventListener('click', closeCreateModal);
    btnCancelCreate?.addEventListener('click', closeCreateModal);

    // Explorer triggers binding
    const btnExpCreateFolder = document.getElementById('btn-exp-create-folder');
    const btnExpImportSocial = document.getElementById('btn-exp-import-social');
    btnExpCreateFolder?.addEventListener('click', () => openFolderModal());
    btnExpImportSocial?.addEventListener('click', openSocialModal);

    const btnCloseRename = document.getElementById('btn-close-rename');
    const btnCancelRename = document.getElementById('btn-cancel-rename');
    btnCloseRename?.addEventListener('click', closeRenameModal);
    btnCancelRename?.addEventListener('click', closeRenameModal);

    const btnCloseFolder = document.getElementById('btn-close-folder');
    const btnCancelFolder = document.getElementById('btn-cancel-folder');
    btnCloseFolder?.addEventListener('click', closeFolderModal);
    btnCancelFolder?.addEventListener('click', closeFolderModal);

    const btnCloseMove = document.getElementById('btn-close-move');
    const btnCancelMove = document.getElementById('btn-cancel-move');
    btnCloseMove?.addEventListener('click', closeMoveModal);
    btnCancelMove?.addEventListener('click', closeMoveModal);

    const btnCloseSocial = document.getElementById('btn-close-social');
    const btnCancelSocial = document.getElementById('btn-cancel-social');
    btnCloseSocial?.addEventListener('click', closeSocialModal);
    btnCancelSocial?.addEventListener('click', closeSocialModal);

    const btnClosePreview = document.getElementById('btn-close-preview');
    const btnCancelPreview = document.getElementById('btn-cancel-preview');
    btnClosePreview?.addEventListener('click', closePreviewModal);
    btnCancelPreview?.addEventListener('click', closePreviewModal);

    // Template gallery (A10) — click a card to pre-fill preset, type, and background
    const templateGrid = document.getElementById('template-grid');
    const createProjectFormForTpl = document.getElementById('create-project-form');
    templateGrid?.addEventListener('click', (ev) => {
        const card = ev.target.closest('.template-card');
        if (!card) return;
        const preset = card.dataset.preset;
        const type = card.dataset.type;
        const bg = card.dataset.bg || '#ffffff';

        // Pick the matching preset option (or fall back to custom + write dimensions)
        const presetOption = Array.from(canvasPreset.options).find(o => o.value === preset);
        if (presetOption) {
            canvasPreset.value = preset;
            document.getElementById('custom-dimensions-grid')?.setAttribute('hidden', '');
        } else {
            canvasPreset.value = 'custom';
            const [w, h] = preset.split('x');
            document.getElementById('canvas-width').value = w;
            document.getElementById('canvas-height').value = h;
            document.getElementById('custom-dimensions-grid')?.removeAttribute('hidden');
        }

        const radio = document.querySelector(`input[name="project-type"][value="${type}"]`);
        if (radio) radio.checked = true;

        if (createProjectFormForTpl) createProjectFormForTpl.dataset.background = bg;

        // Visual highlight
        templateGrid.querySelectorAll('.template-card.is-selected').forEach(c => c.classList.remove('is-selected'));
        card.classList.add('is-selected');
    });

    // Form submits binding
    const createProjectForm = document.getElementById('create-project-form');
    createProjectForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const projectName = document.getElementById('project-name').value;
        const projectType = document.querySelector('input[name="project-type"]:checked').value;
        const preset = canvasPreset.value;
        const background = createProjectForm.dataset.background || '#ffffff';

        let width = 800;
        let height = 600;

        if (preset === 'custom') {
            width = parseInt(document.getElementById('canvas-width').value) || 800;
            height = parseInt(document.getElementById('canvas-height').value) || 600;
        } else {
            const dims = preset.split('x');
            width = parseInt(dims[0]);
            height = parseInt(dims[1]);
        }

        const canvasData = {
            projectConfig: { width, height, background, zoom: 1 },
            canvasItems: [],
            tabs: [],
            looseTabIds: [],
            folders: []
        };

        const payload = {
            projectName: projectName,
            projectType: projectType,
            status: 'DRAFT',
            canvasData: canvasData
        };

        try {
            const newProject = await api.postProject(payload);
            window.location.href = `/editor?projectId=${newProject.id}`;
        } catch (error) {
            console.error('Error creating project:', error);
            alert('Không thể tạo dự án mới. Vui lòng thử lại.');
        }
    });

    const renameProjectForm = document.getElementById('rename-project-form');
    renameProjectForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('rename-project-id').value;
        const newName = document.getElementById('rename-project-name').value;

        const currentProject = state.projects.find(p => p.id === id);
        if (!currentProject) return;

        const payload = {
            projectName: newName,
            projectType: currentProject.projectType,
            status: currentProject.status,
            canvasData: currentProject.canvasData,
            thumbnailUrl: currentProject.thumbnailUrl
        };

        try {
            await api.putProject(id, payload);
            closeRenameModal();
            refreshProjectsCallback();
        } catch (error) {
            console.error('Error renaming project:', error);
            alert('Không thể đổi tên dự án. Vui lòng thử lại.');
        }
    });

    const folderForm = document.getElementById('folder-form');
    folderForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const folderIdInput = document.getElementById('folder-id-input');
        const folderNameInput = document.getElementById('folder-name-input');
        const itemType = folderForm.dataset.itemType || 'folder';
        
        const id = folderIdInput.value;
        const name = folderNameInput.value.trim();
        
        if (!name) return;

        try {
            if (id) {
                if (itemType === 'folder') {
                    await api.putFolder(id, { name: name });
                } else {
                    const asset = state.explorerAssets.find(a => a.id === id);
                    if (asset) {
                        const payload = {
                            userId: asset.userId,
                            fileName: name,
                            filePath: asset.filePath,
                            type: asset.type,
                            fileSizeMb: asset.fileSizeMb,
                            metadata: asset.metadata,
                            folderId: asset.folderId
                        };
                        await api.putAsset(id, payload);
                    }
                }
            } else {
                await api.postFolder(name, state.currentFolderId);
            }
            closeFolderModal();
            refreshExplorerCallback();
        } catch (error) {
            console.error('Error saving folder/file:', error);
            alert(error.message || 'Lỗi lưu tài nguyên. Vui lòng kiểm tra lại.');
        }
    });

    const btnConfirmMove = document.getElementById('btn-confirm-move');
    btnConfirmMove?.addEventListener('click', async () => {
        if (!state.explorerSelectedMoveItemId) return;
        
        let targetId = state.selectedMoveTargetFolderId;
        if (targetId === 'root') targetId = null;

        try {
            const id = state.explorerSelectedMoveItemId;
            if (state.explorerSelectedMoveType === 'folder') {
                await api.putFolder(id, { parentId: targetId });
            } else {
                const asset = state.explorerAssets.find(a => a.id === id);
                if (asset) {
                    await api.putAsset(id, {
                        userId: asset.userId,
                        fileName: asset.fileName,
                        filePath: asset.filePath,
                        type: asset.type,
                        fileSizeMb: asset.fileSizeMb,
                        metadata: asset.metadata,
                        folderId: targetId
                    });
                } else {
                    await api.putAsset(id, { folderId: targetId });
                }
            }

            closeMoveModal();
            if (state.onMovedCallback) {
                state.onMovedCallback();
            } else {
                refreshExplorerCallback();
            }
        } catch (error) {
            console.error('Error moving item:', error);
            alert(error.message || 'Không thể di chuyển thư mục/tệp tin. Hãy đảm bảo không tạo quan hệ đệ quy vòng tròn.');
        }
    });

    const socialForm = document.getElementById('social-form');
    socialForm?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const urlInput = document.getElementById('social-url-input');
        const btnSubmitSocial = document.getElementById('btn-submit-social');
        const socialProgressContainer = document.getElementById('social-progress-container');
        const socialProgressFill = document.getElementById('social-progress-fill');
        const socialProgressStatus = document.getElementById('social-progress-status');

        const urlVal = urlInput.value.trim();
        if (!urlVal) return;

        if (socialProgressContainer) socialProgressContainer.removeAttribute('hidden');
        if (socialProgressFill) {
            socialProgressFill.style.width = '10%';
            socialProgressFill.style.backgroundColor = 'var(--db-primary)';
        }
        if (socialProgressStatus) socialProgressStatus.textContent = 'Đang gửi yêu cầu tải xuống...';
        
        btnSubmitSocial?.setAttribute('disabled', 'disabled');

        try {
            const task = await api.postSocialImport(urlVal, state.currentFolderId);
            pollDownloadTaskStatus(task.id, refreshExplorerCallback);
        } catch (error) {
            console.error('Error importing social video:', error);
            if (socialProgressFill) {
                socialProgressFill.style.width = '100%';
                socialProgressFill.style.backgroundColor = 'var(--db-danger)';
            }
            if (socialProgressStatus) {
                socialProgressStatus.textContent = 'Tải thất bại: ' + error.message;
            }
            btnSubmitSocial?.removeAttribute('disabled');
        }
    });
}
