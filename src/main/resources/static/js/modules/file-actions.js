import { refs } from "./dom.js";
import { addFolderImport, addLooseFile, addToCanvas, getActiveTab } from "./state.js";
import { showWarning } from "./notifications.js";
import { STRINGS, text } from "./strings.js";
import { setStatus } from "./theme.js";
import { renderApp } from "./ui.js";

const SUPPORTED_IMAGE_EXTENSIONS = new Set(STRINGS.SUPPORTED_IMAGE_EXTENSIONS);

export function handleFileInputChange(event) {
    try {
        processFiles(Array.from(event.target.files || []));
    } finally {
        if (refs.fileInput) refs.fileInput.value = "";
    }
}

export function handleDroppedFiles(files, x = 100, y = 100) {
    const { imageFiles } = partitionImageFiles(files);
    
    imageFiles.forEach((file, index) => {
        const tab = addLooseFile(file);
        addToCanvas(tab.id, x + index * 20, y + index * 20);
    });

    renderApp();
    if (imageFiles.length > 0) {
        setStatus(text("STATUS_IMPORTED_FILES", { count: imageFiles.length }));
    }
}

function processFiles(selectedFiles) {
    const { imageFiles, rejectedFiles } = partitionImageFiles(selectedFiles);

    if (rejectedFiles.length > 0) {
        showUnsupportedFilesWarning(rejectedFiles);
    }

    imageFiles.forEach((file) => {
        addLooseFile(file);
    });

    renderApp();
    if (imageFiles.length > 0) {
        setStatus(text("STATUS_IMPORTED_FILES", { count: imageFiles.length }));
    }
}

export function handleFolderInputChange(event) {
    try {
        const selectedFiles = Array.from(event.target.files || []);
        const { imageFiles, rejectedFiles } = partitionImageFiles(selectedFiles);
        const grouped = groupFilesByFolder(imageFiles);

        grouped.forEach((files, folderName) => {
            addFolderImport(folderName, files);
        });

        renderApp();
        if (imageFiles.length > 0) {
            setStatus(text("STATUS_IMPORTED_FOLDER_IMAGES", { count: imageFiles.length }));
        } else if (selectedFiles.length > 0) {
            showWarning(text("MSG_NO_SUPPORTED_IMAGES", { formats: STRINGS.SUPPORTED_IMAGE_FORMATS }));
        }

        if (imageFiles.length > 0 && rejectedFiles.length > 0) {
            setStatus(text("STATUS_IMPORTED_WITH_SKIPS", {
                count: imageFiles.length,
                skipped: rejectedFiles.length
            }));
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

function partitionImageFiles(files) {
    return files.reduce(
        (result, file) => {
            if (isSupportedImageFile(file)) {
                result.imageFiles.push(file);
            } else {
                result.rejectedFiles.push(file);
            }
            return result;
        },
        { imageFiles: [], rejectedFiles: [] }
    );
}

function isSupportedImageFile(file) {
    const extension = getFileExtension(file.name);
    if (!SUPPORTED_IMAGE_EXTENSIONS.has(extension)) {
        return false;
    }
    return file.type === "" || file.type.startsWith("image/");
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
    showWarning(text("MSG_UNSUPPORTED_FILE_FORMAT", {
        names,
        more,
        formats: STRINGS.SUPPORTED_IMAGE_FORMATS
    }));
}

function downloadTab(tab) {
    const link = document.createElement("a");
    link.href = tab.url;
    link.download = tab.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
}
