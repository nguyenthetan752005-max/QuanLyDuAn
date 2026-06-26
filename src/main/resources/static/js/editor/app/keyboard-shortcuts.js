import { state, removeFromCanvas, duplicateCanvasItem } from "../modules/state.js";
import { undoState, redoState } from "../modules/history.js";
import { setStatus } from "../modules/theme.js";
import { renderApp } from "../modules/ui/index.js";

function openShortcutsDialog() {
    const dlg = document.getElementById("shortcuts-dialog");
    if (dlg) dlg.hidden = false;
}

function closeShortcutsDialog() {
    const dlg = document.getElementById("shortcuts-dialog");
    if (dlg) dlg.hidden = true;
}

export function setupKeyboardShortcuts() {
    document.getElementById("shortcuts-action")?.addEventListener("click", openShortcutsDialog);
    document.getElementById("shortcuts-dialog-close")?.addEventListener("click", closeShortcutsDialog);

    window.addEventListener("keydown", (event) => {
        if (state.isExporting) return;

        const activeEl = document.activeElement;
        const isEditingText = activeEl && (
            activeEl.tagName === "INPUT" ||
            activeEl.tagName === "TEXTAREA" ||
            activeEl.contentEditable === "true"
        );

        // Esc always closes the shortcuts dialog (even when other dialogs are open)
        if (event.key === "Escape") {
            const dlg = document.getElementById("shortcuts-dialog");
            if (dlg && !dlg.hidden) { closeShortcutsDialog(); event.preventDefault(); return; }
        }

        // "?" toggles the shortcuts dialog (only when not typing)
        if (!isEditingText && event.key === "?") {
            event.preventDefault();
            const dlg = document.getElementById("shortcuts-dialog");
            if (dlg) dlg.hidden = !dlg.hidden;
            return;
        }

        if (isEditingText) return; // Let default input typing/deleting work

        // Skip shortcuts if any modal/dialog backdrop is currently visible
        const openDialog = document.querySelector(".dialog-backdrop:not([hidden])");
        if (openDialog) return;

        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
            event.preventDefault();
            if (event.shiftKey) { // Ctrl+Shift+Z for redo
                if (redoState()) {
                    renderApp();
                    setStatus("Redo successful");
                } else {
                    setStatus("Nothing to redo");
                }
            } else {
                if (undoState()) {
                    renderApp();
                    setStatus("Undo successful");
                } else {
                    setStatus("Nothing to undo");
                }
            }
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'y') { // Ctrl+Y for redo
            event.preventDefault();
            if (redoState()) {
                renderApp();
                setStatus("Redo successful");
            } else {
                setStatus("Nothing to redo");
            }
        } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') { // Ctrl+D duplicate
            event.preventDefault();
            if (state.selectedInstanceIds && state.selectedInstanceIds.length > 0) {
                state.selectedInstanceIds.forEach(id => duplicateCanvasItem(id));
                renderApp();
                setStatus("Đã nhân bản lớp");
            } else if (state.activeInstanceId) {
                duplicateCanvasItem(state.activeInstanceId);
                renderApp();
                setStatus("Đã nhân bản lớp");
            }
        } else if (event.key === 'Delete' || event.key === 'Backspace') {
            if (state.selectedInstanceIds && state.selectedInstanceIds.length > 0) {
                state.selectedInstanceIds.forEach(id => removeFromCanvas(id));
                state.selectedInstanceIds = [];
                renderApp();
                setStatus("Đã xóa đối tượng");
            } else if (state.activeInstanceId) {
                removeFromCanvas(state.activeInstanceId);
                renderApp();
                setStatus("Đã xóa đối tượng");
            }
        }
    });
}
