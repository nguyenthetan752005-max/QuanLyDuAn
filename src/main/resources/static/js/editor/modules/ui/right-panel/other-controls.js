import { state, updateCanvasItem } from "../../state.js";
import { renderApp } from "../index.js";
import { removeBackground, detectAndBlurFaces } from "../../ai/aiManager.js";
import { renderViewer } from "../viewer.js";
import { FILTER_CONFIG, FILTER_PRESETS, getDefaultFilters } from "../../image-editor.js";
import { refs } from "../../dom.js";
import { loadServerEffects } from "../../effects.js";
import { createSlider, createEyedropperButton } from "./helpers.js";

export function renderShapeControls(item, controls) {
    // Fill Color (+ eyedropper)
    const fillWrapper = document.createElement('div');
    fillWrapper.className = 'edit-control-row';
    fillWrapper.innerHTML = `<label class="edit-control-label">Màu hình khối</label>`;
    const fillRow = document.createElement('div');
    fillRow.className = 'color-with-picker';
    const fillInput = document.createElement('input');
    fillInput.type = 'color';
    fillInput.value = item.fillColor || '#BB86FC';
    fillInput.className = 'edit-control-color';
    fillInput.addEventListener('input', (e) => {
        item.fillColor = e.target.value;
        renderViewer();
    });
    fillInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { fillColor: e.target.value }, true);
        renderApp();
    });
    fillRow.appendChild(fillInput);
    fillRow.appendChild(createEyedropperButton((hex) => {
        updateCanvasItem(item.instanceId, { fillColor: hex }, true);
        renderApp();
    }));
    fillWrapper.appendChild(fillRow);
    controls.appendChild(fillWrapper);

    // Stroke Color
    const strokeColorWrapper = document.createElement('div');
    strokeColorWrapper.className = 'edit-control-row';
    strokeColorWrapper.innerHTML = `<label class="edit-control-label">Màu viền</label>`;
    const strokeColorInput = document.createElement('input');
    strokeColorInput.type = 'color';
    strokeColorInput.value = item.strokeColor || '#ffffff';
    strokeColorInput.className = 'edit-control-color';
    strokeColorInput.addEventListener('input', (e) => {
        item.strokeColor = e.target.value;
        renderViewer();
    });
    strokeColorInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { strokeColor: e.target.value }, true);
        renderApp();
    });
    strokeColorWrapper.appendChild(strokeColorInput);
    controls.appendChild(strokeColorWrapper);

    // Stroke Width
    const strokeWidthWrapper = document.createElement('div');
    strokeWidthWrapper.className = 'edit-control-row';
    strokeWidthWrapper.innerHTML = `<label class="edit-control-label-flex">Độ dày viền <span>${item.strokeWidth || 0}px</span></label>`;
    const strokeWidthInput = document.createElement('input');
    strokeWidthInput.type = 'range';
    strokeWidthInput.min = '0';
    strokeWidthInput.max = '20';
    strokeWidthInput.value = item.strokeWidth || 0;
    strokeWidthInput.className = 'edit-control-range';
    strokeWidthInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        item.strokeWidth = val;
        renderViewer();
        strokeWidthWrapper.querySelector('span').textContent = `${val}px`;
    });
    strokeWidthInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { strokeWidth: Number(e.target.value) }, true);
        renderApp();
    });
    strokeWidthWrapper.appendChild(strokeWidthInput);
    controls.appendChild(strokeWidthWrapper);

    // Corner radius — only meaningful for rectangles
    if (item.shapeType === 'rectangle') {
        const radiusWrapper = document.createElement('div');
        radiusWrapper.className = 'edit-control-row';
        radiusWrapper.innerHTML = `<label class="edit-control-label-flex">Bo góc <span>${item.cornerRadius || 0}px</span></label>`;
        const radiusInput = document.createElement('input');
        radiusInput.type = 'range';
        radiusInput.min = '0';
        radiusInput.max = '100';
        radiusInput.value = item.cornerRadius || 0;
        radiusInput.className = 'edit-control-range';
        radiusInput.addEventListener('input', (e) => {
            const val = Number(e.target.value);
            item.cornerRadius = val;
            renderViewer();
            radiusWrapper.querySelector('span').textContent = `${val}px`;
        });
        radiusInput.addEventListener('change', (e) => {
            updateCanvasItem(item.instanceId, { cornerRadius: Number(e.target.value) }, true);
            renderApp();
        });
        radiusWrapper.appendChild(radiusInput);
        controls.appendChild(radiusWrapper);
    }
    
    // Shape Type
    const shapeTypeWrapper = document.createElement('div');
    shapeTypeWrapper.className = 'edit-control-row';
    shapeTypeWrapper.innerHTML = `<label class="edit-control-label">Hình dạng</label>`;
    const shapeTypeSelect = document.createElement('select');
    shapeTypeSelect.className = 'edit-control-select';
    shapeTypeSelect.style.width = '100%';
    shapeTypeSelect.innerHTML = `
        <option value="rectangle" ${item.shapeType === 'rectangle' ? 'selected' : ''}>Chữ nhật</option>
        <option value="circle" ${item.shapeType === 'circle' ? 'selected' : ''}>Tròn / Ellipse</option>
    `;
    shapeTypeSelect.addEventListener('change', (e) => {
        item.shapeType = e.target.value;
        updateCanvasItem(item.instanceId, { shapeType: e.target.value }, true);
        renderApp();
    });
    shapeTypeWrapper.appendChild(shapeTypeSelect);
    controls.appendChild(shapeTypeWrapper);

    // Backdrop Blur
    const blurWrapper = document.createElement('div');
    blurWrapper.className = 'edit-control-row';
    blurWrapper.innerHTML = `<label class="edit-control-label-flex">Kính mờ (Blur) <span>${item.backdropBlur || 0}px</span></label>`;
    const blurInput = document.createElement('input');
    blurInput.type = 'range';
    blurInput.min = '0';
    blurInput.max = '100';
    blurInput.value = item.backdropBlur || 0;
    blurInput.className = 'edit-control-range';
    blurInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        item.backdropBlur = val;
        renderViewer();
        blurWrapper.querySelector('span').textContent = `${val}px`;
    });
    blurInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { backdropBlur: Number(e.target.value) }, true);
        renderApp();
    });
    blurWrapper.appendChild(blurInput);
    controls.appendChild(blurWrapper);
}

export function renderStickerControls(item, controls) {
    const stickerTextWrapper = document.createElement('div');
    stickerTextWrapper.className = 'edit-control-row';
    stickerTextWrapper.innerHTML = `<label class="edit-control-label">Nhãn dán (Ký tự hoặc Emoji)</label>`;
    const stickerTextInput = document.createElement('input');
    stickerTextInput.type = 'text';
    stickerTextInput.value = item.sticker || '❤️';
    stickerTextInput.className = 'edit-control-input';
    stickerTextInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { sticker: e.target.value }, true);
        renderApp();
    });
    stickerTextWrapper.appendChild(stickerTextInput);
    controls.appendChild(stickerTextWrapper);
}

export function renderEditControls(item, controls) {
    // ----------------------------------------------------
    // AI Actions
    // ----------------------------------------------------
    if (item.type === 'image') {
        const aiLabel = document.createElement('label');
        aiLabel.className = 'edit-control-label-bold';
        aiLabel.innerHTML = '<span style="color: #BB86FC;">✨ Tác vụ AI</span>';
        controls.appendChild(aiLabel);

        const aiGrid = document.createElement('div');
        aiGrid.style.display = 'grid';
        aiGrid.style.gridTemplateColumns = '1fr 1fr';
        aiGrid.style.gap = '8px';
        aiGrid.style.marginBottom = '16px';

        const btnRemoveBg = document.createElement('button');
        btnRemoveBg.type = 'button';
        btnRemoveBg.className = 'dialog-button confirm-btn';
        btnRemoveBg.style.padding = '8px';
        btnRemoveBg.style.fontSize = '12px';
        btnRemoveBg.style.background = 'linear-gradient(45deg, #4f46e5, #9333ea)';
        btnRemoveBg.style.border = 'none';
        btnRemoveBg.innerHTML = '✨ Xóa nền';
        btnRemoveBg.addEventListener('click', () => {
            removeBackground(item);
        });

        const btnBlurFace = document.createElement('button');
        btnBlurFace.type = 'button';
        btnBlurFace.className = 'dialog-button confirm-btn';
        btnBlurFace.style.padding = '8px';
        btnBlurFace.style.fontSize = '12px';
        btnBlurFace.style.background = 'rgba(255,255,255,0.1)';
        btnBlurFace.style.border = '1px solid rgba(255,255,255,0.2)';
        btnBlurFace.innerHTML = '🕵️‍♂️ Che mặt';
        btnBlurFace.addEventListener('click', () => {
            detectAndBlurFaces(item);
        });

        aiGrid.appendChild(btnRemoveBg);
        aiGrid.appendChild(btnBlurFace);
        controls.appendChild(aiGrid);
        
        const btnApplyBlur = document.createElement('button');
        btnApplyBlur.type = 'button';
        btnApplyBlur.className = 'dialog-button confirm-btn';
        btnApplyBlur.style.padding = '8px';
        btnApplyBlur.style.fontSize = '12px';
        btnApplyBlur.style.width = '100%';
        btnApplyBlur.style.marginBottom = '16px';
        btnApplyBlur.style.background = 'rgba(255, 255, 255, 0.2)';
        btnApplyBlur.style.border = '1px solid rgba(255, 255, 255, 0.4)';
        btnApplyBlur.innerHTML = '💾 Áp dụng & Lưu ảnh che mặt';
        btnApplyBlur.addEventListener('click', () => {
            import("../../ai/aiManager.js").then(m => {
                if (m.flattenAndSaveBlur) m.flattenAndSaveBlur(item);
            });
        });
        controls.appendChild(btnApplyBlur);

        const hrAi = document.createElement('hr');
        hrAi.className = 'edit-control-divider';
        controls.appendChild(hrAi);
    }

    if (item.filters) {
        // One-click presets
        const presetLabel = document.createElement('label');
        presetLabel.className = 'edit-control-label-bold';
        presetLabel.textContent = 'Bộ lọc nhanh';
        controls.appendChild(presetLabel);

        const presetGrid = document.createElement('div');
        presetGrid.className = 'filter-preset-grid';
        FILTER_PRESETS.forEach(preset => {
            const btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'filter-preset-btn';
            btn.textContent = preset.label;
            btn.addEventListener('click', () => {
                const newFilters = getDefaultFilters();
                Object.assign(newFilters, preset.values);
                updateCanvasItem(item.instanceId, { filters: newFilters }, true);
                renderApp();
            });
            presetGrid.appendChild(btn);
        });
        controls.appendChild(presetGrid);

        const hr = document.createElement('hr');
        hr.className = 'edit-control-divider';
        controls.appendChild(hr);

        const tuneLabel = document.createElement('label');
        tuneLabel.className = 'edit-control-label-bold';
        tuneLabel.textContent = 'Tinh chỉnh thủ công';
        controls.appendChild(tuneLabel);

        FILTER_CONFIG.forEach(config => {
            controls.appendChild(createSlider(item, config, item.filters[config.id], 'filter'));
        });

        // Reset All Button
        const btnReset = document.createElement('button');
        btnReset.className = 'dialog-button edit-control-reset-btn';
        btnReset.textContent = 'Reset Bộ lọc';
        btnReset.addEventListener('click', () => {
            updateCanvasItem(state.activeInstanceId, {
                filters: getDefaultFilters()
            }, true);
            renderApp();
        });
        controls.appendChild(btnReset);
    }
}

export function renderEffectsControls(controls) {
    const effectsListContainer = document.createElement('div');
    effectsListContainer.className = 'effects-list';
    effectsListContainer.id = 'server-effects-list';
    controls.appendChild(effectsListContainer);
    
    // Dynamically assign refs and trigger load
    refs.serverEffectsList = effectsListContainer;
    loadServerEffects();
}
