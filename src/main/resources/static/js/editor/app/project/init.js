import { state, clearWorkspace, ensureRemoteTab, cleanUnusedTabs } from "../../modules/state.js";
import { refs } from "../../modules/dom.js";
import { setStatus } from "../../modules/theme.js";
import { showWarning } from "../../modules/notifications.js";
import { renderApp } from "../../modules/ui/index.js";
import { STRINGS } from "../../modules/strings.js";
import { updateSaveStatus, autosaveTimeout, setAutosaveTimeout } from "./save.js";

export function triggerAutosave() {
    if (!window.isAutosaveEnabled) return;

    // Clean up unused tabs from state before saving
    cleanUnusedTabs();

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    if (!projectId) return;

    updateSaveStatus("pending");

    clearTimeout(autosaveTimeout);
    setAutosaveTimeout(setTimeout(async () => {
        try {
            updateSaveStatus("saving");
            
            const getResponse = await fetch(`/api/v1/projects/${projectId}?_t=${Date.now()}`);
            if (!getResponse.ok) throw new Error("Load failed");
            const currentProject = await getResponse.json();

            // Optimistic lock check (tab conflict check)
            const localTime = state.lastUpdatedAt ? new Date(state.lastUpdatedAt).getTime() : 0;
            const remoteTime = currentProject.updatedAt ? new Date(currentProject.updatedAt).getTime() : 0;
            if (localTime && remoteTime && Math.abs(localTime - remoteTime) > 1000) {
                window.isAutosaveEnabled = false;
                updateSaveStatus("error");
                const overwrite = confirm("Cảnh báo: Dự án này đã được chỉnh sửa và lưu ở một tab hoặc thiết bị khác. Bạn có muốn GHI ĐÈ lên các thay đổi đó không?\n\n(Bấm 'Cancel' để tải lại trang và nhận thay đổi mới nhất)");
                if (overwrite) {
                    window.isAutosaveEnabled = true;
                    state.lastUpdatedAt = currentProject.updatedAt;
                } else {
                    window.location.reload();
                    return;
                }
            }

            const canvasData = {
                projectConfig: state.projectConfig,
                canvasItems: state.canvasItems,
                tabs: state.tabs.map(tab => ({
                    id: tab.id,
                    name: tab.name,
                    url: tab.url
                })),
                looseTabIds: state.looseTabIds,
                folders: state.folders,
                activeTabId: state.activeTabId
            };

            const payload = {
                projectName: currentProject.projectName,
                projectType: currentProject.projectType,
                status: currentProject.status,
                canvasData: canvasData,
                timelineData: state.timelineData || {},
                thumbnailUrl: currentProject.thumbnailUrl,
                updatedAt: state.lastUpdatedAt
            };

            const putResponse = await fetch(`/api/v1/projects/${projectId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (putResponse.status === 409) {
                updateSaveStatus("error");
                window.isAutosaveEnabled = false;
                if (confirm("Cảnh báo: Dự án đã được cập nhật ở thiết bị khác.\nBạn có muốn tải lại trang và nhận thay đổi mới nhất?")) {
                    window.location.reload();
                }
                return;
            }
            if (!putResponse.ok) throw new Error("Save failed");
            const updatedProject = await putResponse.json();
            state.lastUpdatedAt = updatedProject.updatedAt;
            
            updateSaveStatus("saved");
        } catch (error) {
            console.error("Tự động lưu thất bại:", error);
            updateSaveStatus("error");
        }
    }, 1500));
}

// Bind to window so other modules can trigger it
window.triggerAutosave = triggerAutosave;
window.isAutosaveEnabled = false;

export async function initProject(forceReload = false) {
    window.isAutosaveEnabled = false;
    updateSaveStatus("loading");
    let isRendering = false;

    try {
        const explorerMod = await import("../../modules/ui/explorer.js");
        await explorerMod.refreshEditorExplorer();
    } catch (e) {
        console.error("Lỗi khi tải dữ liệu Shared Explorer:", e);
    }

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    if (!projectId) {
        window.isAutosaveEnabled = true;
        updateSaveStatus("saved");
        return;
    }

    setStatus("Đang tải dự án...");
    try {
        const response = await fetch(`/api/v1/projects/${projectId}?_t=${Date.now()}`);
        if (response.status === 404) {
            showWarning("Dự án này đã bị xóa hoặc không tồn tại. Đang chuyển hướng...");
            setTimeout(() => {
                window.location.href = "/projects";
            }, 2000);
            return;
        }
        if (!response.ok) {
            throw new Error(`Failed to fetch project: ${response.statusText}`);
        }
        const project = await response.json();
        state.lastUpdatedAt = project.updatedAt;
        
        state.projectType = project.projectType || 'IMAGE';
        state.timelineData = project.timelineData || null;

        if (refs.fileInput || refs.folderInput) {
            const acceptStr = state.projectType === 'VIDEO'
                ? STRINGS.FILE_INPUT_ACCEPT + ",.mp4,.webm,.ogg,.mov,.mkv,video/mp4,video/webm,video/ogg,video/quicktime,video/x-matroska"
                : STRINGS.FILE_INPUT_ACCEPT;
            if (refs.fileInput) refs.fileInput.accept = acceptStr;
            if (refs.folderInput) refs.folderInput.accept = acceptStr;
        }

        if (state.projectType === 'VIDEO') {
            if (!state.timelineData) {
                state.timelineData = {
                    currentTime: 0,
                    totalTime: 0.0,
                    zoom: 50,
                    tracks: [
                        { id: 'video', name: 'Lớp Video', type: 'video' },
                        { id: 'audio', name: 'Lớp Audio', type: 'audio' }
                    ],
                    clips: []
                };
            }
        }

        if (refs.projectNameDisplay) {
            refs.projectNameDisplay.textContent = project.projectName || "Dự án mới";
        }

        const canvasData = project.canvasData;
        if (canvasData) {
            clearWorkspace();
            
            if (canvasData.projectConfig) {
                state.projectConfig = { ...state.projectConfig, ...canvasData.projectConfig };
            }
            
            if (canvasData.tabs && Array.isArray(canvasData.tabs)) {
                canvasData.tabs.forEach(t => ensureRemoteTab(t.id, t.name, t.url));
            }
            
            state.looseTabIds = canvasData.looseTabIds || [];
            state.folders = canvasData.folders || [];
            
            state.canvasItems = (canvasData.canvasItems || []).map(item => {
                if (item.type === 'text') {
                    if (!item.textShadowColor) item.textShadowColor = '#000000';
                    if (item.textShadowBlur === undefined) item.textShadowBlur = 0;
                    if (item.textShadowOffset === undefined) item.textShadowOffset = 2;
                    if (!item.textOutlineColor) item.textOutlineColor = '#000000';
                    if (item.textOutlineWidth === undefined) item.textOutlineWidth = 0;
                    if (item.letterSpacing === undefined) item.letterSpacing = 0;
                    if (item.lineHeight === undefined) item.lineHeight = 1.2;
                    if (!item.highlightColor) item.highlightColor = 'transparent';
                }
                return item;
            });
            
            state.activeTabId = canvasData.activeTabId || null;
            state.activeInstanceId = null;
        }
        
        renderApp();
        setStatus("Tải dự án thành công!");
        updateSaveStatus("saved");
        
        if (project.rendering && project.activeProcessingId) {
            isRendering = true;
            window.isAutosaveEnabled = false;
            state.isExporting = true;
            
            const overlay = document.getElementById("rendering-lock-overlay");
            if (overlay) {
                overlay.hidden = false;
            }
            
            import("../export-actions.js").then(module => {
                module.pollRenderStatus(project.activeProcessingId, null, null);
            }).catch(err => {
                console.error("Failed to load export actions module for polling", err);
            });
        } else {
            if (forceReload && window.triggerAutosave) {
                window.triggerAutosave();
            }
        }
    } catch (error) {
        console.error("Lỗi khi tải dự án:", error);
        setStatus("Lỗi khi tải dự án từ máy chủ");
        updateSaveStatus("error");
        showWarning("Không thể tải dữ liệu dự án.");
    } finally {
        setTimeout(() => {
            if (!isRendering) {
                window.isAutosaveEnabled = true;
            }
        }, 500);
    }
}
