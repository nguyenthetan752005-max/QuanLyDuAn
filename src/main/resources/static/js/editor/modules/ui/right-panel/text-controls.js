import { state, updateCanvasItem } from "../../state.js";
import { renderApp } from "../index.js";
import { renderViewer } from "../viewer.js";
import { createEyedropperButton } from "./helpers.js";

export function renderTextControls(item, controls) {
    // Font Family Select
    const ffWrapper = document.createElement('div');
    ffWrapper.className = 'edit-control-row';
    ffWrapper.innerHTML = `<label class="edit-control-label">Phông chữ</label>`;
    const ffSelect = document.createElement('select');
    ffSelect.className = 'edit-control-input';
    // Grouped font list — Google Fonts (preloaded in editor.html) + system fonts.
    const fontGroups = [
        {
            label: "Sans-serif (Google)", fonts: [
                { name: "Inter", value: "Inter, sans-serif" },
                { name: "Roboto", value: "Roboto, sans-serif" },
                { name: "Open Sans", value: "'Open Sans', sans-serif" },
                { name: "Lato", value: "Lato, sans-serif" },
                { name: "Poppins", value: "Poppins, sans-serif" },
                { name: "Montserrat", value: "Montserrat, sans-serif" },
                { name: "Oswald", value: "Oswald, sans-serif" },
                { name: "Bebas Neue", value: "'Bebas Neue', sans-serif" }
            ]
        },
        {
            label: "Serif (Google)", fonts: [
                { name: "Playfair Display", value: "'Playfair Display', serif" },
                { name: "Merriweather", value: "Merriweather, serif" }
            ]
        },
        {
            label: "Decorative (Google)", fonts: [
                { name: "Dancing Script", value: "'Dancing Script', cursive" },
                { name: "Pacifico", value: "Pacifico, cursive" }
            ]
        },
        {
            label: "Hệ thống", fonts: [
                { name: "Arial", value: "Arial, sans-serif" },
                { name: "Times New Roman", value: "'Times New Roman', serif" },
                { name: "Courier New", value: "'Courier New', monospace" },
                { name: "Georgia", value: "Georgia, serif" },
                { name: "Impact", value: "Impact, sans-serif" }
            ]
        }
    ];
    fontGroups.forEach(group => {
        const grp = document.createElement('optgroup');
        grp.label = group.label;
        group.fonts.forEach(f => {
            const opt = document.createElement('option');
            opt.value = f.value;
            opt.textContent = f.name;
            opt.style.fontFamily = f.value; // preview the font in the dropdown
            if (item.fontFamily === f.value) opt.selected = true;
            grp.appendChild(opt);
        });
        ffSelect.appendChild(grp);
    });
    ffSelect.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { fontFamily: e.target.value }, true);
        renderApp();
    });
    ffWrapper.appendChild(ffSelect);
    controls.appendChild(ffWrapper);

    // Font Size Slider
    const fsWrapper = document.createElement('div');
    fsWrapper.className = 'edit-control-row';
    fsWrapper.innerHTML = `<label class="edit-control-label-flex">Cỡ chữ <span>${item.fontSize || 28}px</span></label>`;
    const fsInput = document.createElement('input');
    fsInput.type = 'range';
    fsInput.min = '8';
    fsInput.max = '200';
    fsInput.value = item.fontSize || 28;
    fsInput.className = 'edit-control-range';
    fsInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        item.fontSize = val;
        renderViewer();
        fsWrapper.querySelector('span').textContent = `${val}px`;
    });
    fsInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { fontSize: Number(e.target.value) }, true);
        renderApp();
    });
    fsWrapper.appendChild(fsInput);
    controls.appendChild(fsWrapper);

    // Text Color Picker
    const colorWrapper = document.createElement('div');
    colorWrapper.className = 'edit-control-row';
    colorWrapper.innerHTML = `<label class="edit-control-label">Màu chữ</label>`;
    const colorRow = document.createElement('div');
    colorRow.className = 'color-with-picker';
    const colorInput = document.createElement('input');
    colorInput.type = 'color';
    colorInput.value = item.color || '#ffffff';
    colorInput.className = 'edit-control-color';
    colorInput.addEventListener('input', (e) => {
        item.color = e.target.value;
        renderViewer();
    });
    colorInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { color: e.target.value }, true);
        renderApp();
    });
    colorRow.appendChild(colorInput);
    colorRow.appendChild(createEyedropperButton((hex) => {
        updateCanvasItem(item.instanceId, { color: hex }, true);
        renderApp();
    }));
    colorWrapper.appendChild(colorRow);
    controls.appendChild(colorWrapper);

    // Text Styles (Bold, Italic)
    const styleWrapper = document.createElement('div');
    styleWrapper.className = 'edit-control-row';
    styleWrapper.innerHTML = `<label class="edit-control-label">Kiểu chữ</label>`;
    const styleBtnGroup = document.createElement('div');
    styleBtnGroup.className = 'edit-control-button-group';

    const isBold = item.fontWeight === 'bold';
    const btnBold = document.createElement('button');
    btnBold.type = 'button';
    btnBold.className = `dialog-button ${isBold ? 'confirm-btn' : ''}`;
    btnBold.textContent = 'Bôi đậm';
    btnBold.addEventListener('click', () => {
        const nextWeight = isBold ? 'normal' : 'bold';
        updateCanvasItem(item.instanceId, { fontWeight: nextWeight }, true);
        renderApp();
    });

    const isItalic = item.fontStyle === 'italic';
    const btnItalic = document.createElement('button');
    btnItalic.type = 'button';
    btnItalic.className = `dialog-button ${isItalic ? 'confirm-btn' : ''}`;
    btnItalic.textContent = 'Nghiêng';
    btnItalic.addEventListener('click', () => {
        const nextStyle = isItalic ? 'normal' : 'italic';
        updateCanvasItem(item.instanceId, { fontStyle: nextStyle }, true);
        renderApp();
    });

    styleBtnGroup.appendChild(btnBold);
    styleBtnGroup.appendChild(btnItalic);
    styleWrapper.appendChild(styleBtnGroup);
    controls.appendChild(styleWrapper);

    // Text Align
    const alignWrapper = document.createElement('div');
    alignWrapper.className = 'edit-control-row';
    alignWrapper.innerHTML = `<label class="edit-control-label">Căn lề</label>`;
    const alignBtnGroup = document.createElement('div');
    alignBtnGroup.className = 'edit-control-button-group';
    
    const alignments = [
        { id: 'left', label: 'Trái' },
        { id: 'center', label: 'Giữa' },
        { id: 'right', label: 'Phải' }
    ];
    
    alignments.forEach(align => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `dialog-button ${item.align === align.id ? 'confirm-btn' : ''}`;
        btn.textContent = align.label;
        btn.addEventListener('click', () => {
            updateCanvasItem(item.instanceId, { align: align.id }, true);
            renderApp();
        });
        alignBtnGroup.appendChild(btn);
    });
    alignWrapper.appendChild(alignBtnGroup);
    controls.appendChild(alignWrapper);

    // Divider
    const hrShadow = document.createElement('hr');
    hrShadow.className = 'edit-control-divider';
    controls.appendChild(hrShadow);

    // Section label
    const shadowLabel = document.createElement('label');
    shadowLabel.className = 'edit-control-label-bold';
    shadowLabel.textContent = 'Hiệu ứng đổ bóng & Viền';
    controls.appendChild(shadowLabel);

    // Shadow Color Picker
    const scWrapper = document.createElement('div');
    scWrapper.className = 'edit-control-row';
    scWrapper.innerHTML = `<label class="edit-control-label">Màu đổ bóng</label>`;
    const scInput = document.createElement('input');
    scInput.type = 'color';
    scInput.value = item.textShadowColor || '#000000';
    scInput.className = 'edit-control-color';
    scInput.addEventListener('input', (e) => {
        item.textShadowColor = e.target.value;
        renderViewer();
    });
    scInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { textShadowColor: e.target.value }, true);
        renderApp();
    });
    scWrapper.appendChild(scInput);
    controls.appendChild(scWrapper);

    // Shadow Blur Slider
    const sbWrapper = document.createElement('div');
    sbWrapper.className = 'edit-control-row';
    sbWrapper.innerHTML = `<label class="edit-control-label-flex">Độ nhòe bóng <span>${item.textShadowBlur || 0}px</span></label>`;
    const sbInput = document.createElement('input');
    sbInput.type = 'range';
    sbInput.min = '0';
    sbInput.max = '20';
    sbInput.value = item.textShadowBlur || 0;
    sbInput.className = 'edit-control-range';
    sbInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        item.textShadowBlur = val;
        renderViewer();
        sbWrapper.querySelector('span').textContent = `${val}px`;
    });
    sbInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { textShadowBlur: Number(e.target.value) }, true);
        renderApp();
    });
    sbWrapper.appendChild(sbInput);
    controls.appendChild(sbWrapper);

    // Shadow Offset Slider
    const soWrapper = document.createElement('div');
    soWrapper.className = 'edit-control-row';
    soWrapper.innerHTML = `<label class="edit-control-label-flex">Khoảng cách bóng <span>${item.textShadowOffset || 2}px</span></label>`;
    const soInput = document.createElement('input');
    soInput.type = 'range';
    soInput.min = '-15';
    soInput.max = '15';
    soInput.value = item.textShadowOffset || 2;
    soInput.className = 'edit-control-range';
    soInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        item.textShadowOffset = val;
        renderViewer();
        soWrapper.querySelector('span').textContent = `${val}px`;
    });
    soInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { textShadowOffset: Number(e.target.value) }, true);
        renderApp();
    });
    soWrapper.appendChild(soInput);
    controls.appendChild(soWrapper);

    // Outline Color Picker
    const ocWrapper = document.createElement('div');
    ocWrapper.className = 'edit-control-row';
    ocWrapper.innerHTML = `<label class="edit-control-label">Màu viền chữ</label>`;
    const ocInput = document.createElement('input');
    ocInput.type = 'color';
    ocInput.value = item.textOutlineColor || '#000000';
    ocInput.className = 'edit-control-color';
    ocInput.addEventListener('input', (e) => {
        item.textOutlineColor = e.target.value;
        renderViewer();
    });
    ocInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { textOutlineColor: e.target.value }, true);
        renderApp();
    });
    ocWrapper.appendChild(ocInput);
    controls.appendChild(ocWrapper);

    // Outline Width Slider
    const owWrapper = document.createElement('div');
    owWrapper.className = 'edit-control-row';
    owWrapper.innerHTML = `<label class="edit-control-label-flex">Độ dày viền chữ <span>${item.textOutlineWidth || 0}px</span></label>`;
    const owInput = document.createElement('input');
    owInput.type = 'range';
    owInput.min = '0';
    owInput.max = '10';
    owInput.value = item.textOutlineWidth || 0;
    owInput.className = 'edit-control-range';
    owInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        item.textOutlineWidth = val;
        renderViewer();
        owWrapper.querySelector('span').textContent = `${val}px`;
    });
    owInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { textOutlineWidth: Number(e.target.value) }, true);
        renderApp();
    });
    owWrapper.appendChild(owInput);
    controls.appendChild(owWrapper);

    // Divider
    const hrSpacing = document.createElement('hr');
    hrSpacing.className = 'edit-control-divider';
    controls.appendChild(hrSpacing);

    // Section Spacing & Highlights
    const spacingLabel = document.createElement('label');
    spacingLabel.className = 'edit-control-label-bold';
    spacingLabel.textContent = 'Khoảng cách & Nền chữ';
    controls.appendChild(spacingLabel);

    // Letter Spacing Slider
    const lsWrapper = document.createElement('div');
    lsWrapper.className = 'edit-control-row';
    lsWrapper.innerHTML = `<label class="edit-control-label-flex">Khoảng cách chữ <span>${item.letterSpacing || 0}px</span></label>`;
    const lsInput = document.createElement('input');
    lsInput.type = 'range';
    lsInput.min = '-5';
    lsInput.max = '20';
    lsInput.value = item.letterSpacing || 0;
    lsInput.className = 'edit-control-range';
    lsInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        item.letterSpacing = val;
        renderViewer();
        lsWrapper.querySelector('span').textContent = `${val}px`;
    });
    lsInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { letterSpacing: Number(e.target.value) }, true);
        renderApp();
    });
    lsWrapper.appendChild(lsInput);
    controls.appendChild(lsWrapper);

    // Line Height Slider
    const lhWrapper = document.createElement('div');
    lhWrapper.className = 'edit-control-row';
    lhWrapper.innerHTML = `<label class="edit-control-label-flex">Chiều cao dòng <span>${item.lineHeight || 1.2}</span></label>`;
    const lhInput = document.createElement('input');
    lhInput.type = 'range';
    lhInput.min = '0.8';
    lhInput.max = '3';
    lhInput.step = '0.1';
    lhInput.value = item.lineHeight || 1.2;
    lhInput.className = 'edit-control-range';
    lhInput.addEventListener('input', (e) => {
        const val = Number(e.target.value);
        item.lineHeight = val;
        renderViewer();
        lhWrapper.querySelector('span').textContent = val;
    });
    lhInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { lineHeight: Number(e.target.value) }, true);
        renderApp();
    });
    lhWrapper.appendChild(lhInput);
    controls.appendChild(lhWrapper);

    // Highlight/Background Color
    const hgWrapper = document.createElement('div');
    hgWrapper.className = 'edit-control-row';
    hgWrapper.innerHTML = `<label class="edit-control-label">Màu nền chữ (Highlight)</label>`;
    
    const hgContainer = document.createElement('div');
    hgContainer.className = 'highlight-container';

    const hgInput = document.createElement('input');
    hgInput.type = 'color';
    hgInput.value = item.highlightColor && item.highlightColor !== 'transparent' ? item.highlightColor : '#ffffff';
    hgInput.className = 'edit-control-color';
    hgInput.disabled = item.highlightColor === 'transparent';
    hgInput.addEventListener('input', (e) => {
        item.highlightColor = e.target.value;
        renderViewer();
    });
    hgInput.addEventListener('change', (e) => {
        updateCanvasItem(item.instanceId, { highlightColor: e.target.value }, true);
        renderApp();
    });

    const hgToggle = document.createElement('button');
    hgToggle.type = 'button';
    hgToggle.className = 'dialog-button highlight-toggle-btn';
    hgToggle.textContent = item.highlightColor === 'transparent' ? 'Bật nền' : 'Tắt nền';
    hgToggle.addEventListener('click', () => {
        const isTransparent = item.highlightColor === 'transparent';
        const nextColor = isTransparent ? '#6b46c1' : 'transparent';
        updateCanvasItem(item.instanceId, { highlightColor: nextColor }, true);
        renderApp();
    });

    hgContainer.appendChild(hgInput);
    hgContainer.appendChild(hgToggle);
    hgWrapper.appendChild(hgContainer);
    controls.appendChild(hgWrapper);
}
