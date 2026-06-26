import { state } from "../../state.js";
import { pushState } from "../../history.js";
import { renderApp } from "../index.js";

export function renderTransitionControls(item, container) {
    container.innerHTML = '';

    if (!item.transition) {
        item.transition = { type: 'none', duration: 1.0 };
    }

    const title = document.createElement('h3');
    title.className = 'edit-section-title';
    title.textContent = 'Hiệu ứng Chuyển cảnh (Cuối Clip)';
    container.appendChild(title);

    const typeGroup = document.createElement('div');
    typeGroup.className = 'edit-control-group';

    const typeLabel = document.createElement('label');
    typeLabel.textContent = 'Loại chuyển cảnh';
    typeGroup.appendChild(typeLabel);

    const typeSelect = document.createElement('select');
    typeSelect.className = 'edit-control-input';
    const transitions = [
        { value: 'none', label: 'Không có' },
        { value: 'fade', label: 'Mờ dần (Fade)' },
        { value: 'slideleft', label: 'Trượt sang trái' },
        { value: 'slideright', label: 'Trượt sang phải' },
        { value: 'slideup', label: 'Trượt lên' },
        { value: 'slidedown', label: 'Trượt xuống' },
        { value: 'circlecrop', label: 'Cuộn tròn (Circle Crop)' },
        { value: 'wipeleft', label: 'Quét trái (Wipe)' }
    ];

    transitions.forEach(t => {
        const option = document.createElement('option');
        option.value = t.value;
        option.textContent = t.label;
        if (item.transition.type === t.value) {
            option.selected = true;
        }
        typeSelect.appendChild(option);
    });

    typeSelect.addEventListener('change', (e) => {
        pushState();
        item.transition.type = e.target.value;
        renderApp();
    });
    typeGroup.appendChild(typeSelect);
    container.appendChild(typeGroup);

    if (item.transition.type !== 'none') {
        const durationGroup = document.createElement('div');
        durationGroup.className = 'edit-control-group';

        const durationLabel = document.createElement('label');
        durationLabel.textContent = 'Thời lượng (giây)';
        durationGroup.appendChild(durationLabel);

        const durationContainer = document.createElement('div');
        durationContainer.className = 'edit-control-value-container';

        const durationInput = document.createElement('input');
        durationInput.type = 'number';
        durationInput.step = '0.1';
        durationInput.min = '0.1';
        durationInput.max = '5.0';
        durationInput.className = 'edit-control-number-input';
        durationInput.value = item.transition.duration;

        durationInput.addEventListener('change', (e) => {
            let val = parseFloat(e.target.value);
            if (isNaN(val) || val < 0.1) val = 0.1;
            if (val > 5.0) val = 5.0;
            e.target.value = val;
            pushState();
            item.transition.duration = val;
            renderApp();
        });

        durationContainer.appendChild(durationInput);
        durationGroup.appendChild(durationContainer);
        container.appendChild(durationGroup);
        
        const note = document.createElement('p');
        note.style.fontSize = '12px';
        note.style.color = 'var(--text-muted)';
        note.style.marginTop = '8px';
        note.textContent = 'Lưu ý: Chuyển cảnh sẽ được áp dụng khi nối clip này với clip ngay phía sau nó trên Timeline.';
        container.appendChild(note);
    }
}
