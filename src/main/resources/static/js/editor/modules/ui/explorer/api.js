import { explorerState } from "./state.js";
import { state } from "../../state.js";

export async function refreshEditorExplorer() {
    try {
        const isTrash = explorerState.currentTab === 'trash';
        const foldersRes = await fetch(`/api/v1/media-folders?isDeleted=${isTrash}`);
        
        let assetsUrl = '';
        if (isTrash) {
            assetsUrl = '/api/v1/media-assets?isDeleted=true';
        } else {
            assetsUrl = `/api/v1/media-assets?isDeleted=false${explorerState.currentFolderId ? '&folderId=' + explorerState.currentFolderId : '&folderId=root'}`;
        }
        const assetsRes = await fetch(assetsUrl);
        
        if (foldersRes.ok && assetsRes.ok) {
            explorerState.folders = await foldersRes.json();
            const assetsData = await assetsRes.json();
            explorerState.assets = assetsData.content ? assetsData.content : assetsData;
            
            // Sync with global state
            state.dbFolders = explorerState.folders;
            state.dbAssets = explorerState.assets;
        }
    } catch (e) {
        console.error("Lỗi khi tải danh sách Explorer từ máy chủ:", e);
    }
}

export async function updateProjectNameInUI() {
    if (!explorerState.projectId) return;
    try {
        const res = await fetch(`/api/v1/projects/${explorerState.projectId}`);
        if (res.ok) {
            const project = await res.json();
            const nameEl = document.getElementById('sidebar-project-name');
            if (nameEl && project.projectName) {
                nameEl.textContent = project.projectName;
            }
            const topbarEl = document.getElementById('project-name-display');
            if (topbarEl && project.projectName) {
                topbarEl.textContent = project.projectName;
            }
        }
    } catch (e) {
        console.error("Lỗi cập nhật tên dự án hiển thị:", e);
    }
}
