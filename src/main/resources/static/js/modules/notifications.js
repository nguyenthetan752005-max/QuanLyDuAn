import { refs } from "./dom.js";

let lastFocused = null;

export function showWarning(message) {
    if (!refs.messageDialog || !refs.messageDialogBody) return;
    lastFocused = document.activeElement;
    refs.messageDialogBody.textContent = message;
    refs.messageDialog.hidden = false;
    refs.messageDialogOk?.focus();
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
