export function setupMenus() {
    document.querySelectorAll("[data-menu-toggle]").forEach((button) => {
        button.addEventListener("click", (event) => {
            event.stopPropagation();
            const menu = document.getElementById(button.dataset.menuToggle);
            const willOpen = menu.hidden;

            closeAllMenus();
            menu.hidden = !willOpen;
            button.setAttribute("aria-expanded", String(willOpen));
        });
    });

    document.querySelectorAll(".menu-panel").forEach((panel) => {
        panel.addEventListener("click", (event) => {
            event.stopPropagation();
            if (event.target.closest(".menu-item")) {
                closeAllMenus();
            }
        });
    });

    document.addEventListener("click", closeAllMenus);
}

function closeAllMenus() {
    document.querySelectorAll(".menu-panel").forEach((panel) => {
        panel.hidden = true;
    });
    document.querySelectorAll("[data-menu-toggle]").forEach((toggle) => {
        toggle.setAttribute("aria-expanded", "false");
    });
}
