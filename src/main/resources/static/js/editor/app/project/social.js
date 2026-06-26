import { showWarning } from "../../modules/notifications.js";
import { state } from "../../modules/state.js";
import { renderApp } from "../../modules/ui/index.js";
import { initProject } from "./init.js";
import { customAlert } from "../../modules/custom-dialogs.js";

export function initSocialImportDialog() {
    const btnOpen = document.getElementById("btn-import-social");
    const dialog = document.getElementById("import-social-dialog");
    const btnCancel = document.getElementById("import-social-dialog-cancel");
    const btnOk = document.getElementById("import-social-dialog-ok");
    const inputUrl = document.getElementById("import-social-url");
    const projectId = window.projectId || new URLSearchParams(window.location.search).get('projectId');

    if (!btnOpen || !dialog) return;

    btnOpen.addEventListener("click", () => {
        inputUrl.value = "";
        dialog.hidden = false;
        inputUrl.focus();
    });

    btnCancel.addEventListener("click", () => {
        dialog.hidden = true;
    });

    btnOk.addEventListener("click", async () => {
        const url = inputUrl.value.trim();
        if (!url) {
            customAlert("Nhắc nhở", "Vui lòng nhập link video.");
            return;
        }

        try {
            btnOk.disabled = true;
            btnOk.textContent = "Đang gửi...";

            const res = await fetch(`/api/projects/${projectId}/import-social`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ url })
            });

            if (!res.ok) {
                let errMsg = "Không thể gửi yêu cầu";
                try {
                    const err = await res.json();
                    errMsg = err.message || errMsg;
                } catch (jsonErr) {
                    errMsg = `Lỗi HTTP ${res.status}: ${res.statusText}`;
                }
                throw new Error(errMsg);
            }

            const data = await res.json();
            const jobId = data.id;
            
            dialog.hidden = true;
            inputUrl.value = "";
            
            showWarning("Đang tiến hành tải video ngầm. Vui lòng đợi...");

            const checkInterval = setInterval(async () => {
                try {
                    const statusRes = await fetch(`/api/jobs/${jobId}/status`);
                    if (statusRes.ok) {
                        const jobData = await statusRes.json();
                        if (jobData.status === "SUCCESS") {
                            clearInterval(checkInterval);
                            
                            const tabId = "tab_social_" + Date.now();
                            const fileName = jobData.resultFilePath.split('/').pop();
                            
                            const newTab = {
                                id: tabId,
                                name: fileName,
                                url: jobData.resultFilePath,
                                file: null
                            };
                            
                            state.tabs.push(newTab);
                            state.looseTabIds.push(tabId);
                            
                            renderApp();
                            
                            if (window.triggerAutosave) {
                                window.triggerAutosave();
                            }
                            
                            customAlert("Thành công", "Đã tải thành công video!");
                        } else if (jobData.status === "FAILED") {
                            clearInterval(checkInterval);
                            customAlert("Lỗi tải tệp", "Lỗi tải video: " + jobData.errorMessage);
                        }
                    }
                } catch (err) {
                    console.error("Lỗi khi kiểm tra trạng thái:", err);
                }
            }, 3000);

        } catch (e) {
            console.error("Social import error:", e);
            customAlert("Lỗi", "Lỗi: " + e.message);
        } finally {
            btnOk.disabled = false;
            btnOk.textContent = "Bắt đầu tải";
        }
    });
}
