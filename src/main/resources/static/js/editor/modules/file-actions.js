import { refs } from "./dom.js";
import { addFolderImport, addLooseFile, addToCanvas, getActiveTab, ensureRemoteTab, addFolderRemoteImport, state } from "./state.js";
import { showWarning } from "./notifications.js";
import { STRINGS, text } from "./strings.js";
import { setStatus } from "./theme.js";
import { renderApp } from "./ui/index.js";

const SUPPORTED_IMAGE_EXTENSIONS = new Set(STRINGS.SUPPORTED_IMAGE_EXTENSIONS);

async function uploadAndRegisterFile(file) {
    const formData = new FormData();
    formData.append("file", file);
    const response = await fetch("/api/v1/media-assets/upload", {
        method: "POST",
        body: formData
    });
    if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
    }
    const data = await response.json();
    
    // Tự động tải lại danh sách tệp tin dùng chung để đồng bộ Sidebar Explorer
    try {
        const explorerMod = await import("./ui/explorer.js");
        await explorerMod.refreshEditorExplorer();
    } catch (e) {
        console.error("Lỗi đồng bộ Explorer sau khi upload:", e);
    }

    return ensureRemoteTab(data.id, data.fileName, data.filePath, file);
}

export async function handleFileInputChange(event) {
    try {
        await processFiles(Array.from(event.target.files || []));
    } finally {
        if (refs.fileInput) refs.fileInput.value = "";
    }
}

export async function handleDroppedFiles(files, x = 100, y = 100) {
    const { imageFiles } = partitionImageFiles(files);
    if (imageFiles.length === 0) return;

    setStatus("Đang tải tệp lên...");
    let successCount = 0;
    
    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        try {
            const tab = await uploadAndRegisterFile(file);
            addToCanvas(tab.id, x + i * 20, y + i * 20);
            successCount++;
        } catch (error) {
            console.error("Lỗi tải tệp:", error);
            showWarning(`Không thể tải lên tệp: ${file.name}`);
        }
    }

    renderApp();
    if (successCount > 0) {
        if (state.projectType === 'VIDEO') {
            setStatus(`Đã tải lên ${successCount} tệp tin`);
        } else {
            setStatus(text("STATUS_IMPORTED_FILES", { count: successCount }));
        }
    } else {
        setStatus("Tải tệp lên thất bại");
    }
}

export async function handleDroppedFilesOnTrack(files, trackId, startOffset = 0) {
    const { imageFiles } = partitionImageFiles(files);
    if (imageFiles.length === 0) return;

    setStatus("Đang tải tệp lên...");
    let successCount = 0;

    const { addMediaToTrack } = await import("./timeline.js");

    for (let i = 0; i < imageFiles.length; i++) {
        const file = imageFiles[i];
        try {
            const tab = await uploadAndRegisterFile(file);
            addMediaToTrack(tab.id, trackId, startOffset + i * 2.0);
            successCount++;
        } catch (error) {
            console.error("Lỗi tải tệp:", error);
            showWarning(`Không thể tải lên tệp: ${file.name}`);
        }
    }

    renderApp();
    if (successCount > 0) {
        setStatus(`Đã tải lên ${successCount} tệp tin lên lớp`);
    } else {
        setStatus("Tải tệp lên thất bại");
    }
}


async function processFiles(selectedFiles) {
    const { imageFiles, rejectedFiles } = partitionImageFiles(selectedFiles);

    if (rejectedFiles.length > 0) {
        showUnsupportedFilesWarning(rejectedFiles);
    }
    if (imageFiles.length === 0) return;

    setStatus("Đang tải tệp lên...");
    let successCount = 0;

    for (const file of imageFiles) {
        try {
            const tab = await uploadAndRegisterFile(file);
            if (!state.looseTabIds.includes(tab.id)) {
                state.looseTabIds.push(tab.id);
            }
            successCount++;
        } catch (error) {
            console.error("Lỗi tải tệp:", error);
            showWarning(`Không thể tải lên tệp: ${file.name}`);
        }
    }

    renderApp();
    if (successCount > 0) {
        if (state.projectType === 'VIDEO') {
            setStatus(`Đã tải lên ${successCount} tệp tin`);
        } else {
            setStatus(text("STATUS_IMPORTED_FILES", { count: successCount }));
        }
    } else {
        setStatus("Tải tệp lên thất bại");
    }
}

export async function handleFolderInputChange(event) {
    try {
        const selectedFiles = Array.from(event.target.files || []);
        const { imageFiles, rejectedFiles } = partitionImageFiles(selectedFiles);
        
        if (imageFiles.length === 0) {
            if (selectedFiles.length > 0) {
                const formats = state.projectType === 'VIDEO'
                    ? STRINGS.SUPPORTED_IMAGE_FORMATS + ", MP4, WEBM, OGG, MOV, MKV"
                    : STRINGS.SUPPORTED_IMAGE_FORMATS;
                const warningMsg = state.projectType === 'VIDEO'
                    ? `Không tìm thấy tệp tin được hỗ trợ (Ảnh hoặc Video). Định dạng hỗ trợ: ${formats}.`
                    : text("MSG_NO_SUPPORTED_IMAGES", { formats });
                showWarning(warningMsg);
            }
            return;
        }

        setStatus("Đang tải thư mục lên...");
        const grouped = groupFilesByFolder(imageFiles);
        let successCount = 0;

        for (const [folderName, files] of grouped.entries()) {
            const uploadedTabs = [];
            for (const file of files) {
                try {
                    const tab = await uploadAndRegisterFile(file);
                    uploadedTabs.push(tab);
                    successCount++;
                } catch (error) {
                    console.error("Lỗi tải tệp:", error);
                    showWarning(`Không thể tải lên tệp: ${file.name}`);
                }
            }
            if (uploadedTabs.length > 0) {
                addFolderRemoteImport(folderName, uploadedTabs);
            }
        }

        renderApp();
        if (successCount > 0) {
            if (state.projectType === 'VIDEO') {
                setStatus(`Đã tải lên ${successCount} tệp đa phương tiện từ thư mục`);
            } else {
                setStatus(text("STATUS_IMPORTED_FOLDER_IMAGES", { count: successCount }));
            }
        } else {
            setStatus("Tải thư mục lên thất bại");
        }

        if (successCount > 0 && rejectedFiles.length > 0) {
            if (state.projectType === 'VIDEO') {
                setStatus(`Đã tải lên ${successCount} tệp, bỏ qua ${rejectedFiles.length} tệp không hỗ trợ`);
            } else {
                setStatus(text("STATUS_IMPORTED_WITH_SKIPS", {
                    count: successCount,
                    skipped: rejectedFiles.length
                }));
            }
        }
    } finally {
        if (refs.folderInput) refs.folderInput.value = "";
    }
}

export function saveActiveTabAs() {
    const activeTab = getActiveTab();
    if (!activeTab) {
        return;
    }

    downloadTab(activeTab);
    setStatus(text("STATUS_SAVED_COPY", { name: activeTab.name }));
}

function groupFilesByFolder(files) {
    const grouped = new Map();
    files.forEach((file) => {
        const relative = file.webkitRelativePath || file.name;
        const folderName = relative.includes("/") ? relative.split("/")[0] : STRINGS.DEFAULT_IMPORTED_FOLDER;
        if (!grouped.has(folderName)) {
            grouped.set(folderName, []);
        }
        grouped.get(folderName).push(file);
    });
    return grouped;
}

const SUPPORTED_VIDEO_EXTENSIONS = new Set(["mp4", "webm", "ogg", "mov", "mkv"]);

function partitionImageFiles(files) {
    return files.reduce(
        (result, file) => {
            if (isSupportedFile(file)) {
                result.imageFiles.push(file);
            } else {
                result.rejectedFiles.push(file);
            }
            return result;
        },
        { imageFiles: [], rejectedFiles: [] }
    );
}

function isSupportedFile(file) {
    const extension = getFileExtension(file.name);
    const isVideoProject = state.projectType === 'VIDEO';
    
    const isImg = SUPPORTED_IMAGE_EXTENSIONS.has(extension);
    const isVid = isVideoProject && SUPPORTED_VIDEO_EXTENSIONS.has(extension);
    
    return isImg || isVid;
}

function getFileExtension(fileName) {
    const dotIndex = fileName.lastIndexOf(".");
    if (dotIndex === -1 || dotIndex === fileName.length - 1) {
        return "";
    }
    return fileName.slice(dotIndex + 1).toLowerCase();
}

function showUnsupportedFilesWarning(rejectedFiles) {
    const names = rejectedFiles.slice(0, 5).map((file) => file.name).join(", ");
    const more = rejectedFiles.length > 5
        ? text("MSG_AND_MORE", { count: rejectedFiles.length - 5 })
        : "";
    const formats = state.projectType === 'VIDEO'
        ? STRINGS.SUPPORTED_IMAGE_FORMATS + ", MP4, WEBM, OGG, MOV, MKV"
        : STRINGS.SUPPORTED_IMAGE_FORMATS;
    showWarning(text("MSG_UNSUPPORTED_FILE_FORMAT", {
        names,
        more,
        formats: formats
    }));
}

function downloadTab(tab) {
    const link = document.createElement("a");
    link.href = tab.localUrl || tab.url;
    link.download = tab.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
}
