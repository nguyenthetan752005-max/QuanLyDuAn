import { refs } from "../../modules/dom.js";
import { setStatus } from "../../modules/theme.js";
import { showWarning } from "../../modules/notifications.js";
import { state } from "../../modules/state.js";
import { cleanUnusedTabs } from "../../modules/state/tabs.js";

export let autosaveTimeout = null;

export function setAutosaveTimeout(val) {
    autosaveTimeout = val;
}

export function updateSaveStatus(status) {
    const badge = refs.cloudStatusBadge;
    const textEl = refs.cloudStatusText;
    if (!badge || !textEl) return;
    
    badge.className = "cloud-status-badge"; // reset classes
    
    switch (status) {
        case "saved":
            badge.classList.add("saved");
            textEl.textContent = "Đã lưu đám mây";
            break;
        case "saving":
            badge.classList.add("saving");
            textEl.textContent = "Đang lưu...";
            break;
        case "loading":
            badge.classList.add("saving");
            textEl.textContent = "Đang tải...";
            break;
        case "error":
            badge.classList.add("error");
            textEl.textContent = "Lỗi lưu trữ";
            break;
        default:
            textEl.textContent = status;
    }
}

export async function saveProjectToCloud() {
    // Clean up unused tabs from state before saving
    cleanUnusedTabs();

    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    if (!projectId) {
        showWarning("Không tìm thấy ID dự án. Vui lòng quay lại trang quản lý dự án.");
        return;
    }

    setStatus("Đang lưu dự án...");
    updateSaveStatus("saving");
    try {
        const getResponse = await fetch(`/api/v1/projects/${projectId}?_t=${Date.now()}`);
        if (getResponse.status === 404) {
            showWarning("Dự án này đã bị xóa hoặc không tồn tại. Tắt tự động lưu.");
            updateSaveStatus("error");
            window.isAutosaveEnabled = false;
            return;
        }
        if (!getResponse.ok) {
            throw new Error(`Failed to load project details: ${getResponse.statusText}`);
        }
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

        if (putResponse.status === 404) {
            showWarning("Dự án này đã bị xóa hoặc không tồn tại. Tắt tự động lưu.");
            updateSaveStatus("error");
            window.isAutosaveEnabled = false;
            return;
        }
        if (putResponse.status === 409) {
            showWarning("Dự án đã được cập nhật ở một tab hoặc thiết bị khác. Vui lòng tải lại.");
            updateSaveStatus("error");
            window.isAutosaveEnabled = false;
            if (confirm("Cảnh báo: Dự án này đã được chỉnh sửa và lưu ở một tab hoặc thiết bị khác.\nBạn có muốn tải lại trang và nhận thay đổi mới nhất?")) {
                window.location.reload();
            }
            return;
        }
        if (!putResponse.ok) {
            throw new Error(`Failed to save project: ${putResponse.statusText}`);
        }

        const updatedProject = await putResponse.json();
        state.lastUpdatedAt = updatedProject.updatedAt;
        
        setStatus("Lưu dự án thành công!");
        updateSaveStatus("saved");
    } catch (error) {
        console.error("Lỗi khi lưu dự án:", error);
        setStatus("Lưu dự án thất bại");
        updateSaveStatus("error");
        showWarning("Không thể lưu dự án lên máy chủ.");
    }
}
