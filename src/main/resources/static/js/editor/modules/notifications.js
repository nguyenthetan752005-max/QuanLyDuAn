import { refs } from "./dom.js";

let lastFocused = null;

export function showWarning(message) {
    showToast(message, "error");
}

export function showToast(message, type = "info") {
    let container = document.getElementById("toast-container");
    if (!container) {
        container = document.createElement("div");
        container.id = "toast-container";
        container.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
        `;
        document.body.appendChild(container);
    }
    
    const toast = document.createElement("div");
    const isError = type === "error";
    toast.style.cssText = `
        background: ${isError ? "rgba(239, 68, 68, 0.95)" : "rgba(34, 197, 94, 0.95)"};
        backdrop-filter: blur(8px);
        color: white;
        padding: 14px 20px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        display: flex;
        align-items: center;
        gap: 12px;
        transform: translateX(120%);
        opacity: 0;
        transition: all 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        font-family: 'Outfit', sans-serif;
        font-size: 0.95rem;
        pointer-events: auto;
    `;
    
    const icon = isError 
        ? `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`
        : `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>`;
        
    toast.innerHTML = `${icon}<span>${message}</span>`;
    container.appendChild(toast);
    
    // Animate in
    requestAnimationFrame(() => {
        toast.style.transform = 'translateX(0)';
        toast.style.opacity = '1';
    });
    
    // Animate out
    setTimeout(() => {
        toast.style.transform = 'translateX(120%)';
        toast.style.opacity = '0';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

export function setupNotifications() {
    if (!refs.messageDialog || !refs.messageDialogOk) return;

    refs.messageDialogOk.addEventListener("click", closeDialog);
    refs.messageDialog.addEventListener("click", (event) => {
        if (event.target === refs.messageDialog) {
            closeDialog();
        }
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !refs.messageDialog.hidden) {
            closeDialog();
        }
    });
}

function closeDialog() {
    if (!refs.messageDialog) return;
    refs.messageDialog.hidden = true;
    if (lastFocused && typeof lastFocused.focus === "function") {
        try { lastFocused.focus(); } catch {}
    }
}
