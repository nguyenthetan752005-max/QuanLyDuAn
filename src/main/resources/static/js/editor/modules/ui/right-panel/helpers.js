import { updateCanvasItem } from "../../state.js";
import { renderApp } from "../index.js";
import { renderViewer } from "../viewer.js";

/**
 * Opens the native screen color picker (EyeDropper API) and returns the picked
 * hex color, or null if cancelled / unsupported.
 */
export async function pickScreenColor() {
    if (typeof window.EyeDropper === "undefined") {
        alert("Trình duyệt chưa hỗ trợ công cụ hút màu. Hãy dùng Chrome hoặc Edge phiên bản mới.");
        return null;
    }
    try {
        const result = await new window.EyeDropper().open();
        return result && result.sRGBHex ? result.sRGBHex : null;
    } catch (e) {
        return null; // user pressed Esc
    }
}

/** Small reusable eyedropper button that applies the picked color via `onPick(hex)`. */
export function createEyedropperButton(onPick) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "eyedropper-btn";
    btn.title = "Hút màu từ màn hình";
    btn.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 22 1-1h3l9-9"/><path d="M3 21v-3l9-9"/><path d="m15 6 3.4-3.4a2.1 2.1 0 1 1 3 3L18 9l.4.4a2.1 2.1 0 1 1-3 3l-3.8-3.8a2.1 2.1 0 1 1 3-3l.4.4Z"/></svg>`;
    btn.addEventListener("click", async () => {
        const hex = await pickScreenColor();
        if (hex) onPick(hex);
    });
    return btn;
}

export function createSlider(item, config, value, type) {
    const wrapper = document.createElement('div');
    wrapper.className = 'edit-control-row premium-slider-control';
    
    // Header row: Label + Reset Button
    const header = document.createElement('div');
    header.className = 'edit-control-header';
    
    const label = document.createElement('span');
    label.className = 'edit-control-title';
    label.textContent = config.label;
    
    const resetBtn = document.createElement('button');
    resetBtn.type = 'button';
    resetBtn.className = 'edit-control-reset-icon-btn';
    resetBtn.title = 'Đặt lại về mặc định / Reset to default';
    resetBtn.innerHTML = `
        <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M23 4v6h-6"></path>
            <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path>
        </svg>
    `;
    
    header.appendChild(label);
    header.appendChild(resetBtn);
    
    // Body row: Slider + Number Input
    const body = document.createElement('div');
    body.className = 'edit-control-body';
    
    const slider = document.createElement('input');
    slider.type = 'range';
    slider.min = config.min;
    slider.max = config.max;
    slider.value = value;
    slider.className = 'edit-control-range';
    slider.dataset[type] = config.id;
    
    const valContainer = document.createElement('div');
    valContainer.className = 'edit-control-value-container';
    
    const numInput = document.createElement('input');
    numInput.type = 'number';
    numInput.min = config.min;
    numInput.max = config.max;
    numInput.value = value;
    numInput.className = 'edit-control-number-input';
    
    const unit = document.createElement('span');
    unit.className = 'edit-control-unit';
    unit.textContent = config.unit;
    
    valContainer.appendChild(numInput);
    valContainer.appendChild(unit);
    
    body.appendChild(slider);
    body.appendChild(valContainer);
    
    wrapper.appendChild(header);
    wrapper.appendChild(body);
    
    // Helper function to update state and trigger rendering
    const updateVal = (val, isFinal = false) => {
        // Clamp value
        if (isNaN(val)) {
            val = config.default;
        } else {
            val = Math.max(config.min, Math.min(config.max, val));
        }
        
        slider.value = val;
        numInput.value = val;
        
        if (type === 'filter') {
            if (item.filters) item.filters[config.id] = val;
            if (isFinal) {
                updateCanvasItem(item.instanceId, { filters: { [config.id]: val } }, true);
                renderApp();
            } else {
                renderViewer();
            }
        } else if (type === 'transform') {
            if (item.transform) item.transform[config.id] = val;
            if (isFinal) {
                updateCanvasItem(item.instanceId, { transform: { [config.id]: val } }, true);
                renderApp();
            } else {
                renderViewer();
            }
        } else if (type === 'prop') {
            // Generic top-level item property (e.g. opacity)
            item[config.id] = val;
            if (isFinal) {
                updateCanvasItem(item.instanceId, { [config.id]: val }, true);
                renderApp();
            } else {
                renderViewer();
            }
        }
    };
    
    // Slider Events
    slider.addEventListener('input', (e) => {
        updateVal(Number(e.target.value), false);
    });
    
    slider.addEventListener('change', (e) => {
        updateVal(Number(e.target.value), true);
    });
    
    // Double click to reset
    slider.addEventListener('dblclick', () => {
        updateVal(config.default, true);
    });
    
    // Number Input Events
    numInput.addEventListener('input', (e) => {
        // Don't commit final yet on typing to avoid breaking UX, but update view
        const val = parseFloat(e.target.value);
        if (!isNaN(val)) {
            updateVal(val, false);
        }
    });
    
    numInput.addEventListener('change', (e) => {
        const val = parseFloat(e.target.value);
        updateVal(val, true);
    });
    
    // Reset Button Event
    resetBtn.addEventListener('click', () => {
        updateVal(config.default, true);
    });
    
    return wrapper;
}
