export const explorerState = {
    projectId: new URLSearchParams(window.location.search).get('projectId'),
    currentFolderId: null,
    currentTab: 'media', // 'media' or 'trash'
    folders: [],
    assets: [],
    searchQuery: '',
    activeDropdownItemId: null,
    hasInitialized: false
};
