import { state, setActiveInstance, removeFromCanvas, bringForward, sendBackward, updateCanvasItem, getTab } from "../../state.js";
import { renderApp } from "../index.js";
import { customPrompt } from "../../custom-dialogs.js";

const EYE_ON = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7z"/><circle cx="12" cy="12" r="3"/></svg>`;
const EYE_OFF = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-7-11-7a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 7 11 7a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>`;
const UP = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="18 15 12 9 6 15"/></svg>`;
const DOWN = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;
const TRASH = `<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>`;

function layerName(item) {
    if (item.name) return item.name;
    switch (item.type) {
        case 'text': {
            const t = (item.text || '').trim();
            return t ? `Chữ: ${t.slice(0, 18)}` : 'Chữ (trống)';
        }
        case 'shape': {
            const map = { rectangle: 'chữ nhật', circle: 'tròn', triangle: 'tam giác', line: 'đường thẳng' };
            return `Hình ${map[item.shapeType] || item.shapeType || ''}`.trim();
        }
        case 'sticker':
            return `Nhãn dán ${item.sticker || ''}`.trim();
        default: {
            const tab = item.tabId ? getTab(item.tabId) : null;
            return tab && tab.name ? tab.name : 'Ảnh / Video';
        }
    }
}

function iconBtn(html, title, onClick) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'layer-icon-btn';
    b.title = title;
    b.innerHTML = html;
    b.addEventListener('click', (e) => { e.stopPropagation(); onClick(); });
    return b;
}

export function renderLayersPanel(container) {
    const panel = document.createElement('div');
    panel.className = 'layers-panel';

    const header = document.createElement('div');
    header.className = 'layers-header';
    header.innerHTML = `<span class="panel-kicker">Lớp (${state.canvasItems.length})</span>`;
    panel.appendChild(header);

    const list = document.createElement('div');
    list.className = 'layers-list';

    if (!state.canvasItems.length) {
        const empty = document.createElement('div');
        empty.className = 'layers-empty';
        empty.textContent = 'Chưa có lớp nào trên canvas.';
        list.appendChild(empty);
    } else {
        // Top layer (highest zIndex) first
        const items = [...state.canvasItems].sort((a, b) => (b.zIndex || 0) - (a.zIndex || 0));
        items.forEach(item => {
            const row = document.createElement('div');
            row.className = 'layer-row' + (item.instanceId === state.activeInstanceId ? ' is-active' : '');

            const visBtn = iconBtn(item.hidden ? EYE_OFF : EYE_ON, item.hidden ? 'Hiện lớp' : 'Ẩn lớp', () => {
                updateCanvasItem(item.instanceId, { hidden: !item.hidden }, true);
                renderApp();
            });
            if (item.hidden) visBtn.classList.add('is-off');

            const name = document.createElement('span');
            name.className = 'layer-name';
            name.textContent = layerName(item);
            name.title = 'Bấm để chọn • Bấm đúp để đổi tên';
            name.addEventListener('dblclick', async (e) => {
                e.stopPropagation();
                const nv = await customPrompt('Đổi tên lớp', 'Nhập tên mới cho lớp:', item.name || layerName(item));
                if (nv !== null) {
                    updateCanvasItem(item.instanceId, { name: nv.trim() || null }, true);
                    renderApp();
                }
            });

            const actions = document.createElement('div');
            actions.className = 'layer-actions';
            actions.appendChild(iconBtn(UP, 'Lên trên', () => { bringForward(item.instanceId); renderApp(); }));
            actions.appendChild(iconBtn(DOWN, 'Xuống dưới', () => { sendBackward(item.instanceId); renderApp(); }));
            const delBtn = iconBtn(TRASH, 'Xóa lớp', () => {
                removeFromCanvas(item.instanceId);
                renderApp();
            });
            delBtn.classList.add('danger');
            actions.appendChild(delBtn);

            row.addEventListener('click', () => { setActiveInstance(item.instanceId); renderApp(); });

            row.appendChild(visBtn);
            row.appendChild(name);
            row.appendChild(actions);
            list.appendChild(row);
        });
    }

    panel.appendChild(list);
    container.appendChild(panel);
}
