export const STRINGS = {
    APP_NAME: "Lily Image Editor",

    MENU_FILE: "File",
    MENU_IMPORT_FOLDER: "Import Folder",
    MENU_IMPORT_FILE: "Import File",
    MENU_SAVE_AS: "Save As...",
    MENU_CLEAR_WORKSPACE: "Clear Workspace",

    THEME_LABEL: "Theme",
    THEME_DARK: "Dark",
    THEME_LIGHT: "Light",
    THEME_WARM: "Warm",
    THEME_COLD: "Cold",

    LBL_EXPLORER: "EXPLORER",
    LBL_NO_OPENED_FOLDER: "No opened folder.",
    LBL_NO_IMAGE: "No image loaded",
    LBL_RIGHT_PANEL: "Properties panel",

    BTN_OK: "OK",
    BTN_CLOSE_TAB: "x",

    STATUS_READY: "Ready",
    STATUS_WORKSPACE_CLEARED: "Workspace cleared",
    STATUS_OPENED: "Opened {name}",
    STATUS_THEME_SWITCHED: "Theme switched to {theme}",
    STATUS_IMPORTED_FILES: "Imported {count} file(s)",
    STATUS_IMPORTED_FOLDER_IMAGES: "Imported {count} image(s) from folder",
    STATUS_IMPORTED_WITH_SKIPS: "Imported {count} image(s), skipped {skipped} unsupported file(s)",
    STATUS_SAVED_COPY: "Saved copy of {name}",

    DEFAULT_IMPORTED_FOLDER: "Imported Folder",
    SUPPORTED_IMAGE_FORMATS: "JPG, JPEG, PNG, WEBP, BMP, GIF",
    SUPPORTED_IMAGE_EXTENSIONS: ["jpg", "jpeg", "png", "webp", "bmp", "gif"],
    FILE_INPUT_ACCEPT: ".jpg,.jpeg,.png,.webp,.bmp,.gif,image/jpeg,image/png,image/webp,image/bmp,image/gif",

    MSG_NO_SUPPORTED_IMAGES: "No supported image files were found. Supported formats: {formats}.",
    MSG_UNSUPPORTED_FILE_FORMAT: "Unsupported file format: {names}{more}.\nSupported formats: {formats}.",
    MSG_AND_MORE: " and {count} more"
};

export function text(key, values = {}) {
    const template = STRINGS[key] ?? key;
    return Object.entries(values).reduce(
        (result, [name, value]) => result.replaceAll(`{${name}}`, String(value)),
        template
    );
}

export function applyStaticText(root = document) {
    document.title = text("APP_NAME");

    root.querySelectorAll("[data-i18n]").forEach((element) => {
        element.textContent = text(element.dataset.i18n);
    });

    root.querySelectorAll("[data-i18n-aria-label]").forEach((element) => {
        element.setAttribute("aria-label", text(element.dataset.i18nAriaLabel));
    });

    root.querySelectorAll("[data-i18n-aria-label-by]").forEach((element) => {
        element.setAttribute("aria-label", text(element.dataset.i18nAriaLabelBy));
    });

    root.querySelectorAll("[data-i18n-title]").forEach((element) => {
        element.setAttribute("title", text(element.dataset.i18nTitle));
    });
}
