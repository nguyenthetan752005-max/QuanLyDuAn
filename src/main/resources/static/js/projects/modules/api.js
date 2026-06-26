// REST API Calls for Project and Shared Explorer Dashboard

export async function getProjects(page = 0, size = 20, search = '') {
    const params = new URLSearchParams({ page, size });
    if (search) params.append('search', search);
    const response = await fetch(`/api/v1/projects?${params.toString()}`);
    if (!response.ok) throw new Error('Không thể lấy danh sách dự án');
    return await response.json();
}

export async function postProject(payload) {
    const response = await fetch('/api/v1/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Không thể tạo dự án mới');
    return await response.json();
}

export async function putProject(id, payload) {
    const response = await fetch(`/api/v1/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Không thể đổi tên dự án');
    return await response.json();
}

export async function deleteProject(id) {
    const response = await fetch(`/api/v1/projects/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        let msg = 'Không thể xóa dự án';
        try {
            const err = await response.json();
            if (err && err.message) msg = err.message;
        } catch (e) {}
        throw new Error(msg);
    }
}

export async function getTrashSettings() {
    const response = await fetch('/api/v1/system-settings/trash_auto_delete_days');
    if (!response.ok) throw new Error('Không thể đọc cấu hình thùng rác');
    return await response.json();
}

export async function getFolders(isTrash) {
    const response = await fetch(`/api/v1/media-folders?isDeleted=${isTrash}`);
    if (!response.ok) throw new Error('Không thể lấy danh sách thư mục');
    return await response.json();
}

export async function getAssets(isTrash, folderId, page = 0, size = 50, search = '') {
    const params = new URLSearchParams({ page, size, isDeleted: isTrash });
    if (folderId) params.append('folderId', folderId);
    else if (!isTrash) params.append('folderId', 'root');
    if (search) params.append('search', search);
    
    const response = await fetch(`/api/v1/media-assets?${params.toString()}`);
    if (!response.ok) throw new Error('Không thể lấy danh sách tệp tin');
    return await response.json();
}

export async function postFolder(name, parentId) {
    const response = await fetch('/api/v1/media-folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, parentId })
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Không thể tạo thư mục');
    }
    return await response.json();
}

export async function putFolder(id, payload) {
    const response = await fetch(`/api/v1/media-folders/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) {
        const err = await response.json();
        throw new Error(err.message || 'Không thể đổi tên hoặc di chuyển thư mục');
    }
    return await response.json();
}

export async function deleteFolder(id) {
    const response = await fetch(`/api/v1/media-folders/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Không thể xóa thư mục');
}

export async function restoreFolder(id) {
    const response = await fetch(`/api/v1/media-folders/${id}/restore`, {
        method: 'PUT'
    });
    if (!response.ok) throw new Error('Không thể khôi phục thư mục');
}

export async function deleteFolderPermanently(id) {
    const response = await fetch(`/api/v1/media-folders/${id}/permanent`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Không thể xóa vĩnh viễn thư mục');
}

export async function uploadFile(file, folderId) {
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB
    const totalChunks = Math.ceil(file.size / CHUNK_SIZE);
    const identifier = file.name + '-' + Date.now();
    const contentType = file.type || 'application/octet-stream';
    const totalSize = file.size;

    for (let chunkNumber = 0; chunkNumber < totalChunks; chunkNumber++) {
        const start = chunkNumber * CHUNK_SIZE;
        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);

        const formData = new FormData();
        formData.append('file', chunk, file.name);
        formData.append('identifier', identifier);
        formData.append('chunkNumber', chunkNumber);
        formData.append('totalChunks', totalChunks);
        formData.append('fileName', file.name);
        formData.append('contentType', contentType);
        formData.append('totalSize', totalSize);
        if (folderId) {
            formData.append('folderId', folderId);
        }

        const response = await fetch('/api/v1/media-assets/upload/chunk', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            try {
                const err = await response.json();
                throw new Error(err.message || 'Lỗi khi tải tệp lên');
            } catch (e) {
                if (e.message && e.message.includes('Lỗi')) throw e;
                const text = await response.text();
                throw new Error(text || 'Lỗi khi tải tệp lên');
            }
        }

        if (chunkNumber === totalChunks - 1) {
            return await response.json();
        }
    }
}

export async function putAsset(id, payload) {
    const response = await fetch(`/api/v1/media-assets/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Không thể di chuyển hoặc cập nhật tệp tin');
    return await response.json();
}

export async function deleteAsset(id) {
    const response = await fetch(`/api/v1/media-assets/${id}`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Không thể xóa tệp tin');
}

export async function restoreAsset(id) {
    const response = await fetch(`/api/v1/media-assets/${id}/restore`, {
        method: 'PUT'
    });
    if (!response.ok) throw new Error('Không thể khôi phục tệp tin');
}

export async function deleteAssetPermanently(id) {
    const response = await fetch(`/api/v1/media-assets/${id}/permanent`, {
        method: 'DELETE'
    });
    if (!response.ok) throw new Error('Không thể xóa vĩnh viễn tệp tin');
}

export async function getAssetUsage(id) {
    const response = await fetch(`/api/v1/media-assets/${id}/usage`);
    if (!response.ok) throw new Error('Không thể kiểm tra tệp tin đang được sử dụng ở đâu');
    return await response.json();
}

export async function postSocialImport(url, folderId) {
    const response = await fetch('/api/v1/media-assets/import-social', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url, folderId })
    });
    if (!response.ok) throw new Error('Không thể gửi yêu cầu tải video');
    return await response.json();
}

export async function getJobStatus(jobId) {
    const response = await fetch(`/api/jobs/${jobId}/status`);
    if (!response.ok) throw new Error('Không thể đọc trạng thái tác vụ');
    return await response.json();
}

export async function getDeletedProjects() {
    const response = await fetch('/api/v1/projects/deleted');
    if (!response.ok) throw new Error('Không thể lấy danh sách dự án trong thùng rác');
    return await response.json();
}

export async function restoreProject(id) {
    const response = await fetch(`/api/v1/projects/${id}/restore`, {
        method: 'PUT'
    });
    if (!response.ok) throw new Error('Không thể khôi phục dự án');
}

export async function deleteProjectPermanently(id) {
    const response = await fetch(`/api/v1/projects/${id}/permanent`, {
        method: 'DELETE'
    });
    if (!response.ok) {
        let msg = 'Không thể xóa vĩnh viễn dự án';
        try {
            const err = await response.json();
            if (err && err.message) msg = err.message;
        } catch (e) {}
        throw new Error(msg);
    }
}
