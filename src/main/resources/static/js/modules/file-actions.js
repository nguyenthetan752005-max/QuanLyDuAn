import { refs } from "./dom.js";
import { addFolderImport, addLooseFile, getActiveTab, setActiveTab } from "./state.js";
import { showWarning } from "./notifications.js";
import { STRINGS, text } from "./strings.js";
import { setStatus } from "./theme.js";
import { renderApp } from "./ui.js";

const SUPPORTED_IMAGE_EXTENSIONS = new Set(STRINGS.SUPPORTED_IMAGE_EXTENSIONS);

export function handleFileInputChange(event) {
    const selectedFiles = Array.from(event.target.files);
    const { imageFiles, rejectedFiles } = partitionImageFiles(selectedFiles);

    if (rejectedFiles.length > 0) {
        showUnsupportedFilesWarning(rejectedFiles);
    }

    imageFiles.forEach((file) => {
        const tab = addLooseFile(file);
        setActiveTab(tab.id);
    });

    refs.fileInput.value = "";
    renderApp();
    if (imageFiles.length > 0) {
        setStatus(text("STATUS_IMPORTED_FILES", { count: imageFiles.length }));
    }
}

export function handleFolderInputChange(event) {
    const selectedFiles = Array.from(event.target.files);
    const { imageFiles, rejectedFiles } = partitionImageFiles(selectedFiles);
    const grouped = groupFilesByFolder(imageFiles);

    grouped.forEach((files, folderName) => {
        const folder = addFolderImport(folderName, files);
        const lastTabId = folder.tabIds[folder.tabIds.length - 1];
        setActiveTab(lastTabId);
    });

    refs.folderInput.value = "";
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
