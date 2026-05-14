export const refs = {};

export function initRefs() {
  Object.assign(refs, {
    body: document.body,
    explorerTree: document.getElementById("explorer-tree"),
    folderTree: document.getElementById("folder-tree"),
    fileTree: document.getElementById("file-tree"),
    explorerEmpty: document.getElementById("explorer-empty"),
    viewerDropZone: document.getElementById("viewer-drop-zone"),
    dropZoneContent: document.getElementById("drop-zone-content"),
    canvasContainer: document.getElementById("canvas-container"),
    fileInput: document.getElementById("file-input"),
    folderInput: document.getElementById("folder-input"),
    saveAsAction: document.getElementById("save-as-action"),
    status: document.getElementById("toolbar-status"),
    messageDialog: document.getElementById("message-dialog"),
    messageDialogBody: document.getElementById("message-dialog-body"),
    messageDialogOk: document.getElementById("message-dialog-ok")
  });
}
