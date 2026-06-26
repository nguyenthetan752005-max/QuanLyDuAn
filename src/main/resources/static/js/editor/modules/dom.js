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
    messageDialogOk: document.getElementById("message-dialog-ok"),
    
    // Topbar dynamic items
    projectNameDisplay: document.getElementById("project-name-display"),
    cloudStatusBadge: document.getElementById("cloud-status-badge"),
    cloudStatusText: document.getElementById("cloud-status-text"),
    quickSaveBtn: document.getElementById("quick-save-btn"),
    quickExportBtn: document.getElementById("quick-export-btn"),
    
    // Export Modal items
    exportDialog: document.getElementById("export-dialog"),
    exportPreviewBox: document.getElementById("export-preview-box"),
    exportFormat: document.getElementById("export-format"),
    exportScale: document.getElementById("export-scale"),
    exportQuality: document.getElementById("export-quality"),
    exportQualityGroup: document.getElementById("export-quality-group"),
    exportQualityValue: document.getElementById("export-quality-value"),
    exportTransparent: document.getElementById("export-transparent"),
    exportTransparentGroup: document.getElementById("export-transparent-group"),
    exportFps: document.getElementById("export-fps"),
    exportFpsGroup: document.getElementById("export-fps-group"),
    exportInfo: document.getElementById("export-info"),
    exportCancelBtn: document.getElementById("export-dialog-cancel"),
    exportDownloadBtn: document.getElementById("export-dialog-download"),
    
    // Sidebar Tabs
    tabExplorerBtn: document.getElementById("tab-explorer-btn"),
    tabEffectsBtn: document.getElementById("tab-effects-btn"),
    explorerTabContent: document.getElementById("explorer-tab-content"),
    effectsTabContent: document.getElementById("effects-tab-content"),
    serverEffectsList: document.getElementById("server-effects-list")
  });
}
