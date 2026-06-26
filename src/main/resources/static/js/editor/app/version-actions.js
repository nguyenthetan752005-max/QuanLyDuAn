import { setStatus } from "../modules/theme.js";
import { showWarning } from "../modules/notifications.js";
import { customPrompt } from "../modules/custom-dialogs.js";
import { saveProjectToCloud } from "./project-actions.js";

function getProjectId() {
    return new URLSearchParams(window.location.search).get("projectId");
}

function fmtDateTime(iso) {
    if (!iso) return "";
    try {
        return new Date(iso).toLocaleString("vi-VN", {
            day: "2-digit", month: "2-digit", year: "numeric",
            hour: "2-digit", minute: "2-digit"
        });
    } catch (e) {
        return iso;
    }
}

async function loadVersionList() {
    const listEl = document.getElementById("version-list");
    const projectId = getProjectId();
    if (!listEl || !projectId) return;

    listEl.innerHTML = `<p class="version-list-msg">Đang tải...</p>`;
    try {
        const res = await fetch(`/api/v1/projects/${projectId}/versions`);
        if (!res.ok) throw new Error("load");
        const versions = await res.json();

        if (!versions.length) {
            listEl.innerHTML = `<p class="version-list-msg">Chưa có phiên bản nào được lưu.</p>`;
            return;
        }

        listEl.innerHTML = "";
        versions.forEach(v => {
            const row = document.createElement("div");
            row.className = "version-list-item";

            const info = document.createElement("div");
            info.className = "version-list-item-info";
            info.innerHTML = `<div class="version-list-item-title">${escapeHtml(v.label || "Phiên bản")}</div>
                <div class="version-list-item-date">${fmtDateTime(v.createdAt)}</div>`;

            const btn = document.createElement("button");
            btn.className = "dialog-button version-list-restore-btn";
            btn.textContent = "Khôi phục";
            btn.addEventListener("click", () => restoreVersion(v.id));

            row.appendChild(info);
            row.appendChild(btn);
            listEl.appendChild(row);
        });
    } catch (e) {
        listEl.innerHTML = `<p class="version-list-msg error">Không thể tải lịch sử phiên bản.</p>`;
    }
}

function escapeHtml(s) {
    const div = document.createElement("div");
    div.textContent = s == null ? "" : s;
    return div.innerHTML;
}

async function saveVersionSnapshot() {
    const projectId = getProjectId();
    if (!projectId) {
        showWarning("Không tìm thấy ID dự án.");
        return;
    }
    const label = await customPrompt("Lưu mốc phiên bản", "Đặt tên cho phiên bản này (tùy chọn):", "");
    // customPrompt returns null if cancelled
    if (label === null) return;

    setStatus("Đang lưu phiên bản...");
    try {
        // Make sure the server has the latest content before snapshotting
        await saveProjectToCloud();
        const res = await fetch(`/api/v1/projects/${projectId}/versions`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ label: label || "" })
        });
        if (!res.ok) throw new Error("save");
        setStatus("Đã lưu mốc phiên bản.");
        loadVersionList();
    } catch (e) {
        showWarning("Không thể lưu mốc phiên bản.");
        setStatus("Lưu phiên bản thất bại.");
    }
}

async function restoreVersion(versionId) {
    const projectId = getProjectId();
    if (!projectId) return;
    if (!confirm("Khôi phục phiên bản này sẽ ghi đè nội dung dự án hiện tại. Mọi thay đổi chưa lưu sẽ mất. Tiếp tục?")) return;

    setStatus("Đang khôi phục phiên bản...");
    try {
        const res = await fetch(`/api/v1/projects/${projectId}/versions/${versionId}/restore`, { method: "POST" });
        if (!res.ok) throw new Error("restore");
        // Reload editor to pull restored content cleanly
        window.location.reload();
    } catch (e) {
        showWarning("Không thể khôi phục phiên bản.");
        setStatus("Khôi phục thất bại.");
    }
}

export function openVersionDialog() {
    const dialog = document.getElementById("version-dialog");
    if (!dialog) return;
    dialog.hidden = false;
    loadVersionList();
}

export function setupVersionActions() {
    document.getElementById("version-history-action")?.addEventListener("click", openVersionDialog);
    document.getElementById("version-save-btn")?.addEventListener("click", saveVersionSnapshot);
    document.getElementById("version-dialog-close")?.addEventListener("click", () => {
        const dialog = document.getElementById("version-dialog");
        if (dialog) dialog.hidden = true;
    });
}
