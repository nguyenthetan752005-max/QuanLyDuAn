import { refs } from "../modules/dom.js";
import { state, addTextToCanvas, addShapeToCanvas, addStickerToCanvas, clearWorkspace } from "../modules/state.js";
import { customPrompt } from "../modules/custom-dialogs.js";
import { undoState, redoState, pushState } from "../modules/history.js";
import { syncCanvasWithCurrentTime } from "../modules/timeline-player.js";
import { setStatus } from "../modules/theme.js";
import { text } from "../modules/strings.js";
import { renderApp } from "../modules/ui/index.js";
import { saveActiveTabAs } from "../modules/file-actions.js";
import { saveProjectToCloud } from "./project-actions.js";
import { openExportDialog, downloadExportedImage, updateExportInfo } from "./export-actions.js";
import { setupVersionActions } from "./version-actions.js";

// ===== Emoji picker popover for the sticker tool =====
const EMOJI_SET = [
    "❤️", "⭐", "🔥", "👍", "😂", "🎉", "🚀", "✨", "👏", "💯",
    "😍", "😎", "🥳", "😢", "😡", "🤔", "🙌", "💡", "✅", "❌",
    "⚡", "🌟", "🎯", "🎁", "📌", "🔔", "💬", "🎵", "☀️", "🌈",
    "🍀", "🌸", "🐱", "🐶", "🍕", "☕", "💎", "👑", "🏆", "📷"
];
let emojiPopoverEl = null;

function closeEmojiPicker() {
    if (emojiPopoverEl) {
        emojiPopoverEl.remove();
        emojiPopoverEl = null;
        document.removeEventListener("mousedown", onEmojiOutsideClick, true);
    }
}

function onEmojiOutsideClick(e) {
    if (emojiPopoverEl && !emojiPopoverEl.contains(e.target) && !e.target.closest("#tool-sticker-btn")) {
        closeEmojiPicker();
    }
}

function toggleEmojiPicker(anchor) {
    if (emojiPopoverEl) { closeEmojiPicker(); return; }

    const pop = document.createElement("div");
    pop.className = "emoji-popover";
    EMOJI_SET.forEach(em => {
        const cell = document.createElement("button");
        cell.type = "button";
        cell.className = "emoji-cell";
        cell.textContent = em;
        cell.addEventListener("click", () => {
            addStickerToCanvas(em, 150, 150);
            state.activeTool = 'select';
            renderApp();
            setStatus(`Đã thêm nhãn dán "${em}".`);
            closeEmojiPicker();
        });
        pop.appendChild(cell);
    });

    document.body.appendChild(pop);
    const r = anchor.getBoundingClientRect();
    pop.style.position = "fixed";
    pop.style.top = `${r.bottom + 6}px`;
    pop.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - 300))}px`;
    emojiPopoverEl = pop;
    setTimeout(() => document.addEventListener("mousedown", onEmojiOutsideClick, true), 0);
}

export function setupEditorToolbar() {
    const toolSelect = document.getElementById("tool-select");
    const toolText = document.getElementById("tool-text");
    const toolPaint = document.getElementById("tool-paint");
    const toolShapeRect = document.getElementById("tool-shape-rect");
    const toolShapeCircle = document.getElementById("tool-shape-circle");
    const toolShapeTriangle = document.getElementById("tool-shape-triangle");
    const toolShapeLine = document.getElementById("tool-shape-line");
    const toolStickerBtn = document.getElementById("tool-sticker-btn");
    
    const toolBrush = document.getElementById("tool-brush");
    const toolEraser = document.getElementById("tool-eraser");
    const toolClearPaint = document.getElementById("tool-clear-paint");
    const brushSize = document.getElementById("brush-size");
    const brushSizeVal = document.getElementById("brush-size-val");

    toolSelect?.addEventListener("click", () => {
        state.activeTool = 'select';
        renderApp();
    });

    toolText?.addEventListener("click", () => {
        addTextToCanvas("Nhấp đúp để sửa chữ", 150, 150);
        state.activeTool = 'select';
        renderApp();
        setStatus("Đã thêm Textbox mới. Nhấp đúp để sửa chữ.");
    });

    toolPaint?.addEventListener("click", () => {
        state.activeTool = 'paint';
        renderApp();
        setStatus("Đã bật chế độ vẽ tự do.");
    });

    toolShapeRect?.addEventListener("click", () => {
        addShapeToCanvas("rectangle", 150, 150);
        state.activeTool = 'select';
        renderApp();
        setStatus("Đã thêm Hình vuông mới.");
    });

    toolShapeCircle?.addEventListener("click", () => {
        addShapeToCanvas("circle", 150, 150);
        state.activeTool = 'select';
        renderApp();
        setStatus("Đã thêm Hình tròn mới.");
    });

    toolShapeTriangle?.addEventListener("click", () => {
        addShapeToCanvas("triangle", 150, 150);
        state.activeTool = 'select';
        renderApp();
        setStatus("Đã thêm Hình tam giác mới.");
    });

    toolShapeLine?.addEventListener("click", () => {
        addShapeToCanvas("line", 150, 200);
        state.activeTool = 'select';
        renderApp();
        setStatus("Đã thêm Đường kẻ mới.");
    });

    toolStickerBtn?.addEventListener("click", () => {
        toggleEmojiPicker(toolStickerBtn);
    });

    // Sub paint tools
    toolBrush?.addEventListener("click", () => {
        toolBrush.classList.add("active");
        toolEraser?.classList.remove("active");
        setStatus("Bật cọ vẽ thường.");
    });

    toolEraser?.addEventListener("click", () => {
        toolEraser.classList.add("active");
        toolBrush?.classList.remove("active");
        setStatus("Bật cục tẩy nét vẽ.");
    });

    toolClearPaint?.addEventListener("click", () => {
        const paintCanvas = document.querySelector(".paint-canvas");
        if (paintCanvas) {
            const ctx = paintCanvas.getContext("2d");
            ctx.clearRect(0, 0, paintCanvas.width, paintCanvas.height);
            pushState(); // Save cleared state to history
            state.projectConfig.paintData = null;
            renderApp();
            setStatus("Đã xóa toàn bộ nét vẽ.");
        }
    });

    brushSize?.addEventListener("input", (e) => {
        if (brushSizeVal) {
            brushSizeVal.textContent = `${e.target.value}px`;
        }
    });
}

export function setupToolbarActions() {
    setupEditorToolbar();
    
    // Toggle Panels
    const toggleSidebarBtn = document.getElementById("toggle-sidebar");
    const toggleRightPanelBtn = document.getElementById("toggle-right-panel");
    const sidebar = document.querySelector(".sidebar");
    const rightPanel = document.querySelector(".right-panel");

    toggleSidebarBtn?.addEventListener("click", () => {
        if (sidebar) {
            sidebar.classList.toggle("collapsed");
        }
    });

    toggleRightPanelBtn?.addEventListener("click", () => {
        if (rightPanel) {
            rightPanel.classList.toggle("collapsed");
        }
    });

    // On phones/tablets the two side panels float over the canvas; start collapsed so
    // the user sees their work first, then opens panels via the topbar toggle buttons.
    if (window.matchMedia && window.matchMedia("(max-width: 900px)").matches) {
        sidebar?.classList.add("collapsed");
        rightPanel?.classList.add("collapsed");
    }

    document.getElementById("save-as-action")?.addEventListener("click", saveActiveTabAs);
    document.getElementById("save-project-action")?.addEventListener("click", saveProjectToCloud);

    // Version history (FR07/US14)
    setupVersionActions();
    
    // Bind Undo & Redo buttons
    document.getElementById("undo-btn")?.addEventListener("click", () => {
        if (undoState()) {
            renderApp();
            syncCanvasWithCurrentTime();
            setStatus("Hoàn tác thành công / Undo successful");
        } else {
            setStatus("Không có gì để hoàn tác / Nothing to undo");
        }
    });
    
    document.getElementById("redo-btn")?.addEventListener("click", () => {
        if (redoState()) {
            renderApp();
            syncCanvasWithCurrentTime();
            setStatus("Làm lại thành công / Redo successful");
        } else {
            setStatus("Không có gì để làm lại / Nothing to redo");
        }
    });

    // Bind both export buttons to open the Export Modal
    document.getElementById("export-canvas-action")?.addEventListener("click", openExportDialog);
    refs.quickExportBtn?.addEventListener("click", openExportDialog);
    
    // Bind quick save button
    refs.quickSaveBtn?.addEventListener("click", saveProjectToCloud);
    
    // Bind Export Modal actions
    refs.exportDownloadBtn?.addEventListener("click", downloadExportedImage);
    
    // Export Modal controls
    refs.exportFormat?.addEventListener("change", () => {
        const format = refs.exportFormat.value;
        const isVideoFormat = format === "webm" || format === "mp4";
        if (isVideoFormat) {
            if (refs.exportQualityGroup) refs.exportQualityGroup.hidden = true;
            if (refs.exportTransparentGroup) refs.exportTransparentGroup.hidden = true;
            if (refs.exportFpsGroup) refs.exportFpsGroup.hidden = false;
        } else if (format === "jpeg") {
            if (refs.exportQualityGroup) refs.exportQualityGroup.hidden = false;
            if (refs.exportTransparentGroup) refs.exportTransparentGroup.hidden = true;
            if (refs.exportFpsGroup) refs.exportFpsGroup.hidden = true;
        } else {
            if (refs.exportQualityGroup) refs.exportQualityGroup.hidden = true;
            if (refs.exportTransparentGroup) refs.exportTransparentGroup.hidden = false;
            if (refs.exportFpsGroup) refs.exportFpsGroup.hidden = true;
        }
        updateExportInfo();
    });

    refs.exportScale?.addEventListener("change", updateExportInfo);

    refs.exportQuality?.addEventListener("input", () => {
        if (refs.exportQualityValue && refs.exportQuality) {
            refs.exportQualityValue.textContent = `${refs.exportQuality.value}%`;
        }
    });

    refs.exportCancelBtn?.addEventListener("click", () => {
        if (state.isExporting) {
            import("./export-actions.js").then(module => {
                module.cancelActiveExport();
            });
        }
        if (refs.exportDialog) refs.exportDialog.hidden = true;
    });

    document.querySelectorAll("[data-quality]").forEach((btn) => {
        btn.addEventListener("click", () => {
            const quality = btn.dataset.quality;
            state.previewQuality = quality;
            
            document.querySelectorAll("[data-quality]").forEach(b => b.classList.remove("is-active"));
            btn.classList.add("is-active");
            
            const qualityBtn = document.getElementById("preview-quality-btn");
            if (qualityBtn) {
                qualityBtn.textContent = btn.textContent.split(" ")[0]; // Get the first word (Cao, Trung bình, Thấp) or the value itself
            }
            
            renderApp();
            setStatus(`Chất lượng xem trước: ${quality}`);
        });
    });

    document.getElementById("clear-workspace-action")?.addEventListener("click", () => {
        clearWorkspace();
        renderApp();
        setStatus(text("STATUS_WORKSPACE_CLEARED"));
    });
}
