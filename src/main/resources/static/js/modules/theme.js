import { refs } from "./dom.js";
import { state } from "./state.js";
import { text } from "./strings.js";

export function setStatus(text) {
    refs.status.textContent = text;
}

export function setupThemeSwitching() {
    document.querySelectorAll("[data-theme-option]").forEach((button) => {
        button.addEventListener("click", () => {
            const theme = button.dataset.themeOption;
            if (!state.themes.includes(theme)) {
                return;
            }

            refs.body.dataset.theme = theme;
            document.querySelectorAll("[data-theme-option]").forEach((item) => {
                item.classList.toggle("is-active", item.dataset.themeOption === theme);
            });
            setStatus(text("STATUS_THEME_SWITCHED", { theme }));
        });
    });
}
