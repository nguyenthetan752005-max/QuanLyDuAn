import { state, updateCanvasItem } from "../../state.js";
import { renderApp } from "../index.js";
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
