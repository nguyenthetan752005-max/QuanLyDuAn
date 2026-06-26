import { state } from "../../state.js";

export function getTabsConfig(item) {
    if (item.type === 'text') {
        if (state.activeRightTab !== 'text' && state.activeRightTab !== 'arrange') {
            state.activeRightTab = 'text';
        }
    } else if (item.type === 'shape') {
        if (state.activeRightTab !== 'shape' && state.activeRightTab !== 'arrange') {
            state.activeRightTab = 'shape';
        }
    } else if (item.type === 'sticker') {
        if (state.activeRightTab !== 'sticker' && state.activeRightTab !== 'arrange') {
            state.activeRightTab = 'sticker';
        }
    } else {
        if (state.activeRightTab === 'text' || state.activeRightTab === 'shape' || state.activeRightTab === 'sticker') {
            state.activeRightTab = 'edit';
        }
        // Giữ nguyên tab transition nếu đang xem video
        if (item.type !== 'video' && state.activeRightTab === 'transition') {
            state.activeRightTab = 'edit';
        }
    }

    const tabsContainer = document.createElement('div');
    tabsContainer.className = 'right-panel-tabs';

    const createTab = (id, label, renderRightPanel) => {
        const tab = document.createElement('button');
        tab.className = `right-panel-tab-btn ${state.activeRightTab === id ? 'is-active' : ''}`;
        tab.type = 'button';
        tab.textContent = label;
        tab.addEventListener('click', () => {
            state.activeRightTab = id;
            renderRightPanel();
        });
        return tab;
    };

    return { tabsContainer, createTab };
}
