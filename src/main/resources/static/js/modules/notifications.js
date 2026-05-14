import { refs } from "./dom.js";

export function showWarning(message) {
    refs.messageDialogBody.textContent = message;
    refs.messageDialog.hidden = false;
    refs.messageDialogOk.focus();
}

export function setupNotifications() {
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
    refs.messageDialog.hidden = true;
}
