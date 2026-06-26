import { state, updateCanvasItem, bringForward, sendBackward, bringToFront, sendToBack, duplicateCanvasItem } from "../../state.js";
import { TRANSFORM_CONFIG, getDefaultTransform } from "../../image-editor.js";
import { renderApp } from "../index.js";
import { renderViewer } from "../viewer.js";
import { pushState } from "../../history.js";
import { createSlider } from "./helpers.js";

// Volume control bound to the timeline CLIP (US10). Only relevant for VIDEO projects
// where the item maps to an audio/video clip on the timeline.
function renderClipVolume(item, controls) {
    if (state.projectType !== 'VIDEO' || !state.timelineData || !state.timelineData.clips) return;
    const clip = state.timelineData.clips.find(c => c.id === item.instanceId);
    if (!clip) return;
    // Only media clips carry audio (text/shape/sticker do not)
    if (item.type === 'text' || item.type === 'shape' || item.type === 'sticker') return;

    if (clip.volume === undefined || clip.volume === null) clip.volume = 100;

    const wrapper = document.createElement('div');
    wrapper.className = 'edit-control-row';
    const label = document.createElement('label');
    label.className = 'edit-control-label-flex';
    label.innerHTML = `Âm lượng <span>${clip.volume}%</span>`;
    wrapper.appendChild(label);

    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = '0';
    slider.max = '200';
    slider.value = clip.volume;
    slider.className = 'edit-control-range';
    slider.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        clip.volume = val;
        label.querySelector('span').textContent = `${val}%`;
        renderViewer();
    });
    slider.addEventListener('change', (e) => {
        pushState();
        clip.volume = Number(e.target.value);
        if (window.triggerAutosave) window.triggerAutosave();
        renderApp();
    });
    wrapper.appendChild(slider);
    controls.appendChild(wrapper);

    const divider = document.createElement('hr');
    divider.className = 'edit-control-divider';
    controls.appendChild(divider);
}

const OPACITY_CONFIG = { id: 'opacity', label: 'Độ mờ (Opacity)', min: 0, max: 100, default: 100, unit: '%' };

const ALIGN_BUTTONS = [
    { id: 'left',    label: 'Trái',  axis: 'x', mode: 'start' },
    { id: 'centerX', label: 'Giữa ngang', axis: 'x', mode: 'center' },
    { id: 'right',   label: 'Phải',  axis: 'x', mode: 'end' },
    { id: 'top',     label: 'Trên',  axis: 'y', mode: 'start' },
    { id: 'centerY', label: 'Giữa dọc', axis: 'y', mode: 'center' },
    { id: 'bottom',  label: 'Dưới',  axis: 'y', mode: 'end' }
];

function alignItem(item, axis, mode) {
    const canvasW = state.projectConfig.width;
    const canvasH = state.projectConfig.height;
    const updates = {};
    if (axis === 'x') {
        if (mode === 'start') updates.x = 0;
        else if (mode === 'center') updates.x = Math.round((canvasW - item.width) / 2);
        else updates.x = Math.round(canvasW - item.width);
    } else {
        if (mode === 'start') updates.y = 0;
        else if (mode === 'center') updates.y = Math.round((canvasH - item.height) / 2);
        else updates.y = Math.round(canvasH - item.height);
    }
    updateCanvasItem(item.instanceId, updates, true);
    renderApp();
}

export function renderArrangeControls(item, controls) {
    // Per-clip volume (VIDEO projects only) shown first when applicable
    renderClipVolume(item, controls);

    // Opacity (applies to every layer type)
    controls.appendChild(createSlider(item, OPACITY_CONFIG, item.opacity ?? 100, 'prop'));

    if (item.transform) {
        TRANSFORM_CONFIG.forEach(config => {
            controls.appendChild(createSlider(item, config, item.transform[config.id], 'transform'));
        });
    }

    // Alignment relative to the canvas
    const alignLabel = document.createElement('label');
    alignLabel.className = 'edit-control-label-bold';
    alignLabel.textContent = 'Căn chỉnh theo khung';
    controls.appendChild(alignLabel);

    const alignGrid = document.createElement('div');
    alignGrid.className = 'align-btn-grid';
    ALIGN_BUTTONS.forEach(cfg => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'dialog-button align-btn';
        btn.textContent = cfg.label;
        btn.addEventListener('click', () => alignItem(item, cfg.axis, cfg.mode));
        alignGrid.appendChild(btn);
    });
    controls.appendChild(alignGrid);

    const alignDivider = document.createElement('hr');
    alignDivider.className = 'edit-control-divider';
    controls.appendChild(alignDivider);

    if (item.type === 'image') {
        // Flip Actions
        const btnContainer = document.createElement('div');
        btnContainer.className = 'edit-control-button-group';

        const btnFlipX = document.createElement('button');
        btnFlipX.className = 'dialog-button';
        btnFlipX.textContent = 'Flip X';
        btnFlipX.addEventListener('click', () => {
            updateCanvasItem(state.activeInstanceId, { transform: { flipX: item.transform.flipX * -1 } }, true);
            renderApp();
        });

        const btnFlipY = document.createElement('button');
        btnFlipY.className = 'dialog-button';
        btnFlipY.textContent = 'Flip Y';
        btnFlipY.addEventListener('click', () => {
            updateCanvasItem(state.activeInstanceId, { transform: { flipY: item.transform.flipY * -1 } }, true);
            renderApp();
        });

        btnContainer.appendChild(btnFlipX);
        btnContainer.appendChild(btnFlipY);
        controls.appendChild(btnContainer);

        // Crop Toggle Control Button
        const cropRow = document.createElement('div');
        cropRow.className = 'edit-control-row crop-row-wrapper';
        
        const cropBtn = document.createElement('button');
        cropBtn.type = 'button';
        cropBtn.className = `dialog-button crop-btn-premium ${item.cropEnabled ? 'confirm-btn is-active-crop' : ''}`;
        
        if (item.cropEnabled) {
            cropBtn.textContent = '✔️ Đang bật chế độ Cắt (Crop Mode)';
        } else {
            cropBtn.textContent = '✂️ Bật chế độ Cắt (Crop Mode)';
        }
        
        cropBtn.addEventListener('click', () => {
            const checked = !item.cropEnabled;
            const updates = { cropEnabled: checked };
            if (checked) {
                if (!item.crop) {
                    const naturalWidth = item.naturalWidth || item.width;
                    const naturalHeight = item.naturalHeight || item.height;
                    updates.crop = {
                        x: 0,
                        y: 0,
                        width: naturalWidth,
                        height: naturalHeight
                    };
                }
            }
            updateCanvasItem(state.activeInstanceId, updates, true);
            renderApp();
        });
        
        cropRow.appendChild(cropBtn);

        if (item.crop) {
            const resetCropBtn = document.createElement('button');
            resetCropBtn.type = 'button';
            resetCropBtn.className = 'dialog-button secondary-btn';
            resetCropBtn.style.marginTop = '6px';
            resetCropBtn.style.width = '100%';
            resetCropBtn.textContent = '🔄 Khôi phục ảnh gốc';
            resetCropBtn.addEventListener('click', () => {
                const updates = {
                    cropEnabled: false,
                    crop: null
                };
                if (item.naturalWidth && item.naturalHeight) {
                    updates.width = item.naturalWidth;
                    updates.height = item.naturalHeight;
                }
                updateCanvasItem(state.activeInstanceId, updates, true);
                renderApp();
            });
            cropRow.appendChild(resetCropBtn);
        }
        
        const cropTip = document.createElement('div');
        cropTip.className = 'crop-tip';
        cropTip.textContent = 'Mẹo: Khi bật Crop, kéo các cạnh của ảnh để cắt bớt khung hình. Tắt chế độ Cắt để hoàn tất.';
        
        cropRow.appendChild(cropTip);
        controls.appendChild(cropRow);
    }

    const hr2 = document.createElement('hr');
    hr2.className = 'edit-control-divider';
    controls.appendChild(hr2);

    // Layer Controls
    const layerLabel = document.createElement('label');
    layerLabel.className = 'edit-control-label-bold';
    layerLabel.textContent = 'Sắp xếp lớp hiển thị';
    controls.appendChild(layerLabel);

    const layerBtnContainer1 = document.createElement('div');
    layerBtnContainer1.className = 'edit-control-button-group mb-half';
    
    const btnBringForward = document.createElement('button');
    btnBringForward.className = 'dialog-button';
    btnBringForward.textContent = 'Lên trên';
    btnBringForward.addEventListener('click', () => { bringForward(state.activeInstanceId); renderApp(); });
    
    const btnSendBackward = document.createElement('button');
    btnSendBackward.className = 'dialog-button';
    btnSendBackward.textContent = 'Xuống dưới';
    btnSendBackward.addEventListener('click', () => { sendBackward(state.activeInstanceId); renderApp(); });
    
    layerBtnContainer1.appendChild(btnBringForward);
    layerBtnContainer1.appendChild(btnSendBackward);

    const layerBtnContainer2 = document.createElement('div');
    layerBtnContainer2.className = 'edit-control-button-group';
    
    const btnBringFront = document.createElement('button');
    btnBringFront.className = 'dialog-button';
    btnBringFront.textContent = 'Lên đầu';
    btnBringFront.addEventListener('click', () => { bringToFront(state.activeInstanceId); renderApp(); });
    
    const btnSendBack = document.createElement('button');
    btnSendBack.className = 'dialog-button';
    btnSendBack.textContent = 'Xuống đáy';
    btnSendBack.addEventListener('click', () => { sendToBack(state.activeInstanceId); renderApp(); });
    
    layerBtnContainer2.appendChild(btnBringFront);
    layerBtnContainer2.appendChild(btnSendBack);

    controls.appendChild(layerBtnContainer1);
    controls.appendChild(layerBtnContainer2);

    // Duplicate layer
    const dupDivider = document.createElement('hr');
    dupDivider.className = 'edit-control-divider';
    controls.appendChild(dupDivider);

    const btnDuplicate = document.createElement('button');
    btnDuplicate.className = 'dialog-button';
    btnDuplicate.style.width = '100%';
    btnDuplicate.textContent = 'Nhân bản lớp (Ctrl+D)';
    btnDuplicate.addEventListener('click', () => {
        duplicateCanvasItem(item.instanceId);
        renderApp();
    });
    controls.appendChild(btnDuplicate);

    // Reset Transform Button
    const btnResetTransform = document.createElement('button');
    btnResetTransform.className = 'dialog-button edit-control-reset-btn';
    btnResetTransform.textContent = 'Reset Căn chỉnh';
    btnResetTransform.addEventListener('click', () => {
        updateCanvasItem(state.activeInstanceId, {
            transform: getDefaultTransform()
        }, true);
        renderApp();
    });
    controls.appendChild(btnResetTransform);
}
