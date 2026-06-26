import { refs } from "../../dom.js";
import { state } from "../../state.js";
import { renderViewer } from "../viewer.js";

export function renderCanvasSettings(rightPanel) {
    rightPanel.innerHTML = '';
    
    const header = document.createElement('div');
    header.className = 'panel-header';
    const kicker = document.createElement('span');
    kicker.className = 'panel-kicker';
    kicker.textContent = 'Canvas Settings';
    header.appendChild(kicker);
    rightPanel.appendChild(header);

    const controls = document.createElement('div');
    controls.className = 'edit-controls-container';

    const wWrapper = document.createElement('div');
    wWrapper.className = 'edit-control-row';
    wWrapper.innerHTML = `<label class="edit-control-label">Width (px)</label>`;
    const wInput = document.createElement('input');
    wInput.type = 'number';
    wInput.value = state.projectConfig.width;
    wInput.className = 'edit-control-input';
    wInput.addEventListener('change', (e) => {
        state.projectConfig.width = parseInt(e.target.value) || 800;
        import("../index.js").then(m => m.renderApp());
    });
    wWrapper.appendChild(wInput);

    const hWrapper = document.createElement('div');
    hWrapper.className = 'edit-control-row';
    hWrapper.innerHTML = `<label class="edit-control-label">Height (px)</label>`;
    const hInput = document.createElement('input');
    hInput.type = 'number';
    hInput.value = state.projectConfig.height;
    hInput.className = 'edit-control-input';
    hInput.addEventListener('change', (e) => {
        state.projectConfig.height = parseInt(e.target.value) || 600;
        import("../index.js").then(m => m.renderApp());
    });
    hWrapper.appendChild(hInput);

    const bgWrapper = document.createElement('div');
    bgWrapper.className = 'edit-control-row';
    bgWrapper.innerHTML = `<label class="edit-control-label">Background Color</label>`;
    const bgInput = document.createElement('input');
    bgInput.type = 'color';
    bgInput.value = state.projectConfig.background;
    bgInput.className = 'edit-control-color';
    bgInput.addEventListener('input', (e) => {
        state.projectConfig.background = e.target.value;
        renderViewer();
    });
    bgWrapper.appendChild(bgInput);

    const zoomWrapper = document.createElement('div');
    zoomWrapper.className = 'edit-control-zoom-wrapper';
    zoomWrapper.innerHTML = `<label class="edit-control-label-flex">Zoom <span>${Math.round(state.projectConfig.zoom * 100)}%</span></label>`;
    const zoomInput = document.createElement('input');
    zoomInput.type = 'range';
    zoomInput.min = '0.1';
    zoomInput.max = '4';
    zoomInput.step = '0.1';
    zoomInput.value = state.projectConfig.zoom;
    zoomInput.className = 'edit-control-range';
    zoomInput.addEventListener('input', (e) => {
        const z_old = state.projectConfig.zoom || 1;
        const z_new = parseFloat(e.target.value);
        
        if (z_old === z_new) return;
        
        const v_w = refs.canvasContainer.clientWidth;
        const v_h = refs.canvasContainer.clientHeight;
        
        const m_x = v_w / 2;
        const m_y = v_h / 2;
        
        const scrollLeft_old = refs.canvasContainer.scrollLeft;
        const scrollTop_old = refs.canvasContainer.scrollTop;
        
        const W_old = Math.max(v_w, state.projectConfig.width * z_old + 80);
        const H_old = Math.max(v_h, state.projectConfig.height * z_old + 80);
        
        const W_new = Math.max(v_w, state.projectConfig.width * z_new + 80);
        const H_new = Math.max(v_h, state.projectConfig.height * z_new + 80);
        
        const c_x = scrollLeft_old + m_x;
        const c_y = scrollTop_old + m_y;
        
        const c_x_new = W_new / 2 + (c_x - W_old / 2) / z_old * z_new;
        const c_y_new = H_new / 2 + (c_y - H_old / 2) / z_old * z_new;
        
        const scrollLeft_new = c_x_new - m_x;
        const scrollTop_new = c_y_new - m_y;
        
        state.projectConfig.zoom = z_new;
        zoomWrapper.querySelector('span').textContent = `${Math.round(z_new * 100)}%`;
        
        renderViewer();
        
        refs.canvasContainer.scrollLeft = scrollLeft_new;
        refs.canvasContainer.scrollTop = scrollTop_new;
    });
    zoomWrapper.appendChild(zoomInput);

    controls.appendChild(wWrapper);
    controls.appendChild(hWrapper);
    controls.appendChild(bgWrapper);
    controls.appendChild(zoomWrapper);
    rightPanel.appendChild(controls);
}
