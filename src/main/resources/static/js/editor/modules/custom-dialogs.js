export function customAlert(title, message) {
    return new Promise((resolve) => {
        const backdrop = document.createElement("div");
        backdrop.className = "custom-dialog-backdrop";

        const dialogBox = document.createElement("div");
        dialogBox.className = "custom-dialog-box";

        dialogBox.innerHTML = `
            <div class="custom-dialog-header">
                <h3>${title}</h3>
            </div>
            <div class="custom-dialog-body">
                <p>${message}</p>
            </div>
            <div class="custom-dialog-actions">
                <button class="custom-dialog-btn confirm" type="button">OK</button>
            </div>
        `;

        backdrop.appendChild(dialogBox);
        document.body.appendChild(backdrop);

        const okBtn = dialogBox.querySelector(".custom-dialog-btn.confirm");
        okBtn.focus();

        const close = () => {
            backdrop.classList.add("fade-out");
            setTimeout(() => {
                backdrop.remove();
                resolve();
            }, 150);
        };

        okBtn.addEventListener("click", close);

        // Allow pressing Enter or Escape
        const keyHandler = (e) => {
            if (e.key === "Enter" || e.key === "Escape") {
                e.preventDefault();
                document.removeEventListener("keydown", keyHandler);
                close();
            }
        };
        document.addEventListener("keydown", keyHandler);
    });
}

export function customConfirm(title, message) {
    return new Promise((resolve) => {
        const backdrop = document.createElement("div");
        backdrop.className = "custom-dialog-backdrop";

        const dialogBox = document.createElement("div");
        dialogBox.className = "custom-dialog-box";

        dialogBox.innerHTML = `
            <div class="custom-dialog-header">
                <h3>${title}</h3>
            </div>
            <div class="custom-dialog-body">
                <p>${message}</p>
            </div>
            <div class="custom-dialog-actions">
                <button class="custom-dialog-btn cancel" type="button">Hủy bỏ</button>
                <button class="custom-dialog-btn confirm" type="button">Xác nhận</button>
            </div>
        `;

        backdrop.appendChild(dialogBox);
        document.body.appendChild(backdrop);

        const cancelBtn = dialogBox.querySelector(".custom-dialog-btn.cancel");
        const confirmBtn = dialogBox.querySelector(".custom-dialog-btn.confirm");
        confirmBtn.focus();

        const close = (result) => {
            backdrop.classList.add("fade-out");
            setTimeout(() => {
                backdrop.remove();
                resolve(result);
            }, 150);
        };

        confirmBtn.addEventListener("click", () => close(true));
        cancelBtn.addEventListener("click", () => close(false));

        const keyHandler = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                document.removeEventListener("keydown", keyHandler);
                close(false);
            }
        };
        document.addEventListener("keydown", keyHandler);
    });
}

export function customPrompt(title, message, defaultValue = "") {
    return new Promise((resolve) => {
        const backdrop = document.createElement("div");
        backdrop.className = "custom-dialog-backdrop";

        const dialogBox = document.createElement("div");
        dialogBox.className = "custom-dialog-box";

        dialogBox.innerHTML = `
            <div class="custom-dialog-header">
                <h3>${title}</h3>
            </div>
            <div class="custom-dialog-body">
                <p>${message}</p>
                <div class="custom-dialog-input-wrapper">
                    <input class="custom-dialog-input" type="text" value="${defaultValue}">
                </div>
            </div>
            <div class="custom-dialog-actions">
                <button class="custom-dialog-btn cancel" type="button">Hủy bỏ</button>
                <button class="custom-dialog-btn confirm" type="button">Xác nhận</button>
            </div>
        `;

        backdrop.appendChild(dialogBox);
        document.body.appendChild(backdrop);

        const cancelBtn = dialogBox.querySelector(".custom-dialog-btn.cancel");
        const confirmBtn = dialogBox.querySelector(".custom-dialog-btn.confirm");
        const input = dialogBox.querySelector(".custom-dialog-input");
        
        input.focus();
        if (defaultValue) {
            input.setSelectionRange(0, defaultValue.length);
        }

        const close = (result) => {
            backdrop.classList.add("fade-out");
            setTimeout(() => {
                backdrop.remove();
                resolve(result);
            }, 150);
        };

        confirmBtn.addEventListener("click", () => close(input.value));
        cancelBtn.addEventListener("click", () => close(null));

        const keyHandler = (e) => {
            if (e.key === "Enter") {
                e.preventDefault();
                document.removeEventListener("keydown", keyHandler);
                close(input.value);
            } else if (e.key === "Escape") {
                e.preventDefault();
                document.removeEventListener("keydown", keyHandler);
                close(null);
            }
        };
        input.addEventListener("keydown", keyHandler);
    });
}

export function customTrackChoiceDialog(title, message) {
    return new Promise((resolve) => {
        const backdrop = document.createElement("div");
        backdrop.className = "custom-dialog-backdrop";

        const dialogBox = document.createElement("div");
        dialogBox.className = "custom-dialog-box";

        dialogBox.innerHTML = `
            <div class="custom-dialog-header">
                <h3>${title}</h3>
            </div>
            <div class="custom-dialog-body">
                <p>${message}</p>
            </div>
            <div class="custom-dialog-actions">
                <button class="custom-dialog-btn cancel" type="button">Hủy bỏ</button>
                <button class="custom-dialog-btn choice-audio" type="button">Lớp Audio</button>
                <button class="custom-dialog-btn confirm choice-video" type="button">Lớp Video</button>
            </div>
        `;

        backdrop.appendChild(dialogBox);
        document.body.appendChild(backdrop);

        const cancelBtn = dialogBox.querySelector(".custom-dialog-btn.cancel");
        const audioBtn = dialogBox.querySelector(".custom-dialog-btn.choice-audio");
        const videoBtn = dialogBox.querySelector(".custom-dialog-btn.choice-video");
        
        videoBtn.focus();

        const close = (result) => {
            backdrop.classList.add("fade-out");
            setTimeout(() => {
                backdrop.remove();
                resolve(result);
            }, 150);
        };

        videoBtn.addEventListener("click", () => close('video'));
        audioBtn.addEventListener("click", () => close('audio'));
        cancelBtn.addEventListener("click", () => close(null));

        const keyHandler = (e) => {
            if (e.key === "Escape") {
                e.preventDefault();
                document.removeEventListener("keydown", keyHandler);
                close(null);
            }
        };
        document.addEventListener("keydown", keyHandler);
    });
}

