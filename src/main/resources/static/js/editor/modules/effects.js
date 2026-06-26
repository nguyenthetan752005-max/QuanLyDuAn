import { state } from "./state.js";
import { refs } from "./dom.js";
import { showWarning } from "./notifications.js";
import { customConfirm } from "./custom-dialogs.js";

window.serverEffects = [];
window.serverEffectsLoading = false;
let serverEffectsFetched = false;

async function applyServerEffect(effect, estRam) {
    if (!state.activeInstanceId) {
        showWarning("Vui lòng chọn một đối tượng trên Canvas để áp dụng hiệu ứng.");
        return;
    }
    const urlParams = new URLSearchParams(window.location.search);
    const projectId = urlParams.get('projectId');
    if (!projectId) return;

    if (typeof window.setStatus === "function") {
        window.setStatus(`Đang gửi yêu cầu tạo hiệu ứng ${effect.actionName}...`);
    }

    try {
        const payload = {
            projectId: projectId,
            calculatedRamMb: estRam,
            requiresGpu: effect.requiresGpu,
            status: "RUNNING",
            processingType: "ASSET_GENERATION",
            targetItemId: state.activeInstanceId,
            progressPercent: 0
        };

        const res = await fetch("/api/v1/project-processings", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });

        if (!res.ok) throw new Error("Server từ chối yêu cầu.");
        const data = await res.json();
        
        if (typeof window.setStatus === "function") {
            window.setStatus(`Đang xử lý hiệu ứng (ID: ${data.id})... Hãy đợi quá trình hoàn tất.`);
        }
        
        // Polling loop here (Mocking server delay)
        let progress = 0;
        const pollInterval = setInterval(() => {
            progress += 20;
            if (typeof window.setStatus === "function") {
                window.setStatus(`Đang xử lý ${effect.actionName}: ${progress}%`);
            }
            if (progress >= 100) {
                clearInterval(pollInterval);
                if (typeof window.setStatus === "function") {
                    window.setStatus(`Hoàn tất! File mới đã được lưu vào thư mục dự án.`);
                }
                showWarning(`Đã tạo thành công bản sao hiệu ứng ${effect.actionName}! (Giả lập: Hãy tải lại explorer để xem file mới)`);
                // In production: fetch Explorer files again or auto-replace on Canvas
            }
        }, 1000);

    } catch (err) {
        console.error("Lỗi khi áp dụng Server Effect:", err);
        showWarning("Có lỗi xảy ra khi gọi máy chủ xử lý hiệu ứng.");
    }
}

export function calculateEstimatedRam(baseRamMb) {
    const w = state.projectConfig.width || 800;
    const h = state.projectConfig.height || 600;
    // Base reference size is 800x600.
    // If width and height are doubled (e.g. 1600x1200), area is multiplied by 4.
    // Proportional to the square root of area scaling (which is linear size scaling):
    // Math.sqrt(4) = 2. So 256MB becomes 512MB.
    const multiplier = Math.sqrt((w * h) / (480000));
    return Math.round(baseRamMb * multiplier);
}

export function setupSidebarTabs() {
    // Deprecated: Sidebar tabs moved to the Right Panel
}

export async function loadServerEffects() {
    if (serverEffectsFetched) {
        renderServerEffects();
        return;
    }

    window.serverEffectsLoading = true;
    renderServerEffects();

    try {
        const response = await fetch("/api/v1/actions");
        if (!response.ok) {
            throw new Error(`Tải danh mục thất bại: ${response.status}`);
        }
        const data = await response.json();
        window.serverEffects = data;
        serverEffectsFetched = true;
    } catch (err) {
        console.error("Lỗi khi fetch danh mục tác vụ từ API:", err);
    } finally {
        window.serverEffectsLoading = false;
        renderServerEffects();
    }
}

export function renderServerEffects() {
    if (!refs.serverEffectsList) return;

    if (window.serverEffectsLoading) {
        refs.serverEffectsList.innerHTML = `
            <div class="effects-list-message loading-effects">
                Đang tải hiệu ứng từ máy chủ...
            </div>`;
        return;
    }

    if (!window.serverEffects || window.serverEffects.length === 0) {
        refs.serverEffectsList.innerHTML = `
            <div class="effects-list-message">
                Không tìm thấy hiệu ứng máy chủ nào.
            </div>`;
        return;
    }

    refs.serverEffectsList.innerHTML = "";
    window.serverEffects.forEach(effect => {
        if (effect.active === false) return;

        const estRam = calculateEstimatedRam(effect.baseRamMb);
        const isHighResource = estRam >= 512;
        const warningClass = isHighResource ? "warning" : "";

        const card = document.createElement("div");
        card.className = "effect-card";
        card.dataset.actionCode = effect.actionCode;
        card.title = `Ước lượng: ${estRam}MB RAM ${effect.requiresGpu ? 'và GPU' : ''}`;

        card.innerHTML = `
            <div class="effect-name">
                <span>${effect.actionName}</span>
                <span class="effect-type-badge">${effect.type}</span>
            </div>
            <div class="effect-code">${effect.actionCode}</div>
            <div class="effect-resources">
                <span class="resource-item ${warningClass}">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect>
                        <rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect>
                        <line x1="6" y1="6" x2="6.01" y2="6"></line>
                        <line x1="6" y1="18" x2="6.01" y2="18"></line>
                    </svg>
                    RAM: ${estRam} MB
                </span>
                <span class="resource-item">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <polygon points="12 2 2 7 12 12 22 7 12 2"></polygon>
                        <polyline points="2 17 12 22 22 17"></polyline>
                        <polyline points="2 12 12 17 22 12"></polyline>
                    </svg>
                    GPU: ${effect.requiresGpu ? 'Có' : 'Không'}
                </span>
            </div>
        `;

        card.addEventListener("click", async () => {
            document.querySelectorAll(".effect-card").forEach(c => c.classList.remove("active"));
            card.classList.add("active");
            
            // Log target and set app status text
            const statusText = `Đã chọn: ${effect.actionName}. Ước tính tiêu thụ: ${estRam}MB RAM.`;
            if (typeof window.setStatus === "function") {
                window.setStatus(statusText);
            } else {
                const statusEl = document.getElementById("toolbar-status");
                if (statusEl) statusEl.textContent = statusText;
            }

            const confirmed = await customConfirm("Áp dụng Hiệu ứng", `Áp dụng hiệu ứng "${effect.actionName}"? Hành động này sẽ được xử lý trên máy chủ và tạo ra một file mới trong thư viện của bạn.`);
            if (confirmed) {
                applyServerEffect(effect, estRam);
            }
        });

        refs.serverEffectsList.appendChild(card);
    });
}
