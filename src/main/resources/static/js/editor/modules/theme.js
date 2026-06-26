import { refs } from "./dom.js";
import { state } from "./state.js";
import { text } from "./strings.js";

const THEME_KEY = "lily-theme";

export function setStatus(t) {
    if (refs.status) {
        refs.status.textContent = t;
    }
}

export function setupThemeSwitching() {
    // Áp dụng theme đã lưu
    const saved = localStorage.getItem(THEME_KEY);
    const initial = saved && state.themes.includes(saved) ? saved : "dark";
    if (refs.body) refs.body.dataset.theme = initial;

    document.querySelectorAll("[data-theme-option]").forEach((button) => {
        const theme = button.dataset.themeOption;
        button.classList.toggle("is-active", theme === initial);

        button.addEventListener("click", () => {
            if (!state.themes.includes(theme)) return;
            if (refs.body) refs.body.dataset.theme = theme;
            localStorage.setItem(THEME_KEY, theme);

            document.querySelectorAll("[data-theme-option]").forEach((item) => {
                item.classList.toggle("is-active", item.dataset.themeOption === theme);
            });
            setStatus(text("STATUS_THEME_SWITCHED", { theme }));
        });
    });
}
