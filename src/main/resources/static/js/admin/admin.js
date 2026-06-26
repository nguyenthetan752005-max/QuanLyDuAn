// Admin page logic — uses /api/v1/admin endpoints (admin-guarded server-side)
document.addEventListener('DOMContentLoaded', () => {
    const user = window.AuthUtil ? AuthUtil.getUser() : null;
    if (!user || !user.id || user.role !== 'ADMIN') {
        window.location.href = '/admin/login';
        return;
    }

    if (user.username) {
        document.getElementById('username-display').textContent = user.username;
        document.getElementById('user-initials').textContent = user.username.charAt(0).toUpperCase();
    }

    const deniedEl = document.getElementById('admin-denied');
    const bodyEl = document.getElementById('admin-body');
    const statusBox = document.getElementById('admin-status');
    const tbody = document.getElementById('admin-users-tbody');
    const searchInput = document.getElementById('admin-users-search');
    const roleFilter = document.getElementById('admin-users-role-filter');
    let allUsers = [];

    function showStatus(text, type) {
        statusBox.innerHTML = '';
        const div = document.createElement('div');
        div.className = `status-message msg-${type}`;
        div.innerText = text;
        statusBox.appendChild(div);
    }

    function denyAccess() {
        deniedEl.hidden = false;
        bodyEl.hidden = true;
        setTimeout(() => { window.location.href = '/admin/login'; }, 1800);
    }

    function fmtDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
        } catch (e) { return '—'; }
    }

    async function loadStats() {
        const res = await fetch('/api/v1/admin/stats');
        if (res.status === 403) { denyAccess(); return false; }
        if (!res.ok) throw new Error('stats');
        const s = await res.json();
        bodyEl.hidden = false;
        document.getElementById('st-users').textContent = s.totalUsers ?? 0;
        document.getElementById('st-projects').textContent = s.totalProjects ?? 0;
        document.getElementById('st-image').textContent = s.imageProjects ?? 0;
        document.getElementById('st-video').textContent = s.videoProjects ?? 0;
        document.getElementById('st-assets').textContent = s.totalAssets ?? 0;
        document.getElementById('st-storage').textContent = s.totalStorageMb ?? 0;
        return true;
    }

    async function loadUsers() {
        const res = await fetch('/api/v1/admin/users');
        if (res.status === 403) { denyAccess(); return; }
        if (!res.ok) throw new Error('users');
        allUsers = await res.json();
        applyFilters();
    }

    function applyFilters() {
        const q = (searchInput?.value || '').trim().toLowerCase();
        const roleQ = roleFilter?.value || 'all';
        const filtered = allUsers.filter(u => {
            const name = (u.username || '').toLowerCase();
            const mail = (u.email || '').toLowerCase();
            const role = (u.role || 'USER').toUpperCase();
            const matchText = !q || name.includes(q) || mail.includes(q);
            const matchRole = roleQ === 'all' || role === roleQ;
            return matchText && matchRole;
        });
        renderUsers(filtered);
    }

    searchInput?.addEventListener('input', applyFilters);
    roleFilter?.addEventListener('change', applyFilters);

    function renderUsers(users) {
        tbody.innerHTML = '';
        if (!users.length) {
            tbody.innerHTML = '<tr><td colspan="5" class="admin-loading">Không có người dùng nào khớp bộ lọc.</td></tr>';
            return;
        }
        users.forEach(u => {
            const tr = document.createElement('tr');
            const isAdmin = (u.role || '').toUpperCase() === 'ADMIN';
            const isSelf = u.id === user.id;

            const roleBadge = `<span class="role-badge ${isAdmin ? 'role-admin' : 'role-user'}">${isAdmin ? 'ADMIN' : 'USER'}</span>`;
            const canDelete = !isAdmin && !isSelf;
            const delBtn = `<button class="btn-delete-user" data-id="${u.id}" data-name="${(u.username || '').replace(/"/g, '&quot;')}" ${canDelete ? '' : 'disabled'}>Xóa</button>`;
            const viewBtn = `<button class="btn btn-secondary btn-view-user" data-id="${u.id}" style="padding:4px 8px;font-size:0.8rem;margin-right:6px;">Chi tiết</button>`;

            tr.innerHTML = `
                <td>${escapeHtml(u.username || '')}${isSelf ? ' <em style="color:var(--db-text-muted);font-style:normal;font-size:0.8em;">(bạn)</em>' : ''}</td>
                <td>${escapeHtml(u.email || '')}</td>
                <td>${roleBadge}</td>
                <td>${fmtDate(u.createdAt)}</td>
                <td>${viewBtn}${delBtn}</td>`;
            tbody.appendChild(tr);
        });

        tbody.querySelectorAll('.btn-delete-user').forEach(btn => {
            btn.addEventListener('click', () => deleteUser(btn.dataset.id, btn.dataset.name));
        });
        tbody.querySelectorAll('.btn-view-user').forEach(btn => {
            btn.addEventListener('click', () => viewUserDetail(btn.dataset.id));
        });
    }

    async function viewUserDetail(id) {
        const modal = document.getElementById('user-detail-modal');
        const body = document.getElementById('user-detail-body');
        modal.hidden = false;
        body.innerHTML = '<div class="admin-loading">Đang tải thông tin...</div>';

        try {
            const res = await fetch(`/api/v1/admin/users/${id}`);
            if (!res.ok) throw new Error('Failed to fetch user');
            const data = await res.json();
            
            body.innerHTML = `
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-bottom:20px;">
                    <div style="background:var(--db-sidebar);padding:15px;border-radius:8px;border:1px solid var(--db-border);">
                        <p style="margin:0 0 5px;color:var(--db-text-muted);font-size:0.85rem;">Tên hiển thị</p>
                        <h4 style="margin:0;font-size:1.1rem;color:var(--db-text);">${escapeHtml(data.username || '')}</h4>
                    </div>
                    <div style="background:var(--db-sidebar);padding:15px;border-radius:8px;border:1px solid var(--db-border);">
                        <p style="margin:0 0 5px;color:var(--db-text-muted);font-size:0.85rem;">Vai trò</p>
                        <h4 style="margin:0;font-size:1.1rem;color:var(--db-accent);">${escapeHtml(data.role || 'USER')}</h4>
                    </div>
                    <div style="background:var(--db-sidebar);padding:15px;border-radius:8px;border:1px solid var(--db-border);grid-column:1/-1;">
                        <p style="margin:0 0 5px;color:var(--db-text-muted);font-size:0.85rem;">Email đăng nhập</p>
                        <h4 style="margin:0;font-size:1rem;color:var(--db-text);">${escapeHtml(data.email || '')}</h4>
                    </div>
                </div>
                
                <h4 style="margin:0 0 10px;color:var(--db-text);">Tài nguyên sử dụng</h4>
                <table class="admin-table" style="background:var(--db-sidebar);border-radius:8px;overflow:hidden;border:1px solid var(--db-border);">
                    <tbody>
                        <tr>
                            <td style="border-bottom:1px solid var(--db-border);padding:12px;">Số dự án đã tạo:</td>
                            <td style="border-bottom:1px solid var(--db-border);padding:12px;font-weight:bold;color:var(--db-text);text-align:right;">${data.totalProjects || 0}</td>
                        </tr>
                        <tr>
                            <td style="padding:12px;">Tổng dung lượng tệp tin:</td>
                            <td style="padding:12px;font-weight:bold;color:var(--db-text);text-align:right;">${data.totalStorageMb || 0} MB</td>
                        </tr>
                        <tr>
                            <td style="padding:12px;border-top:1px solid var(--db-border);">Ngày tham gia hệ thống:</td>
                            <td style="padding:12px;border-top:1px solid var(--db-border);color:var(--db-text-muted);text-align:right;">${fmtDate(data.createdAt)}</td>
                        </tr>
                    </tbody>
                </table>
            `;
        } catch (e) {
            body.innerHTML = '<div class="admin-loading msg-error">Không thể tải thông tin chi tiết.</div>';
        }
    }

    function escapeHtml(s) {
        const div = document.createElement('div');
        div.textContent = s;
        return div.innerHTML;
    }

    async function deleteUser(id, name) {
        if (!confirm(`Xóa vĩnh viễn tài khoản "${name}"?\nToàn bộ dữ liệu của người dùng này sẽ bị xóa và không thể hoàn tác.`)) return;
        try {
            const res = await fetch(`/api/v1/admin/users/${id}`, { method: 'DELETE' });
            if (res.ok || res.status === 204) {
                showStatus(`Đã xóa tài khoản "${name}".`, 'success');
                loadUsers();
                loadStats();
            } else {
                let msg = 'Không thể xóa tài khoản.';
                try { const e = await res.json(); if (e && e.message) msg = e.message; } catch (ig) {}
                showStatus(msg, 'error');
            }
        } catch (e) {
            showStatus('Có lỗi xảy ra khi kết nối tới máy chủ.', 'error');
        }
    }

    // ===== Backup & Restore (FR08/US12/US18) =====
    const backupStatusBox = document.getElementById('backup-status');
    const fileInput = document.getElementById('backup-file-input');
    const importBtn = document.getElementById('btn-backup-import');
    const fileNameEl = document.getElementById('backup-file-name');
    let selectedBackupFile = null;

    function showBackupStatus(text, type) {
        if (!backupStatusBox) return;
        backupStatusBox.innerHTML = '';
        const div = document.createElement('div');
        div.className = `status-message msg-${type}`;
        div.innerText = text;
        backupStatusBox.appendChild(div);
    }

    document.getElementById('btn-backup-export')?.addEventListener('click', async () => {
        showBackupStatus('Đang tạo bản sao lưu...', 'success');
        try {
            const res = await fetch('/api/v1/admin/backup/export');
            if (!res.ok) throw new Error('export');
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `lily-backup-${Date.now()}.zip`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
            showBackupStatus('Đã tải bản sao lưu về máy.', 'success');
        } catch (e) {
            showBackupStatus('Không thể tạo bản sao lưu.', 'error');
        }
    });

    fileInput?.addEventListener('change', (e) => {
        selectedBackupFile = e.target.files[0] || null;
        if (selectedBackupFile) {
            fileNameEl.textContent = `Đã chọn: ${selectedBackupFile.name}`;
            importBtn.disabled = false;
        } else {
            fileNameEl.textContent = '';
            importBtn.disabled = true;
        }
    });

    importBtn?.addEventListener('click', async () => {
        if (!selectedBackupFile) return;
        if (!confirm('CẢNH BÁO: Phục hồi sẽ GHI ĐÈ toàn bộ dữ liệu hiện tại của hệ thống và không thể hoàn tác. Tiếp tục?')) return;
        showBackupStatus('Đang phục hồi dữ liệu...', 'success');
        try {
            const formData = new FormData();
            formData.append('file', selectedBackupFile);
            const res = await fetch('/api/v1/admin/backup/import', {
                method: 'POST',
                body: formData
            });
            const data = await res.json().catch(() => ({}));
            if (res.ok) {
                showBackupStatus(`${data.message || 'Phục hồi thành công.'} (${data.collections || 0} bộ sưu tập, ${data.documents || 0} bản ghi). Đang tải lại...`, 'success');
                setTimeout(() => window.location.reload(), 1800);
            } else {
                showBackupStatus(data.message || 'Phục hồi thất bại.', 'error');
            }
        } catch (e) {
            showBackupStatus('Không thể đọc hoặc gửi tệp phục hồi.', 'error');
        }
    });

    // ===== Notification Templates (0.5.3) =====
    const notifTbody = document.getElementById('admin-notifs-tbody');
    const notifModal = document.getElementById('notif-modal');
    const notifForm = document.getElementById('notif-form');
    let allTemplates = [];

    async function loadTemplates() {
        try {
            const res = await fetch('/api/v1/notification-templates');
            if (res.status === 403) return; // ignore or deny access handled elsewhere
            if (!res.ok) throw new Error('templates');
            allTemplates = await res.json();
            renderTemplates();
        } catch (e) {
            notifTbody.innerHTML = '<tr><td colspan="5" class="admin-loading msg-error">Không thể tải danh sách mẫu thông báo.</td></tr>';
        }
    }

    function renderTemplates() {
        notifTbody.innerHTML = '';
        if (!allTemplates.length) {
            notifTbody.innerHTML = '<tr><td colspan="5" class="admin-loading">Chưa có mẫu thông báo nào.</td></tr>';
            return;
        }
        allTemplates.forEach(t => {
            const tr = document.createElement('tr');
            const isActive = t.active !== false;
            const statusBadge = `<span class="role-badge ${isActive ? 'role-admin' : 'role-user'}">${isActive ? 'ACTIVE' : 'INACTIVE'}</span>`;
            
            tr.innerHTML = `
                <td><strong>${escapeHtml(t.event || '')}</strong></td>
                <td>${escapeHtml(t.channel || 'IN_APP')}</td>
                <td>${escapeHtml(t.subject || '')}</td>
                <td>${statusBadge}</td>
                <td><button class="btn btn-secondary btn-edit-notif" data-event="${t.event}">Sửa</button></td>
            `;
            notifTbody.appendChild(tr);
        });

        notifTbody.querySelectorAll('.btn-edit-notif').forEach(btn => {
            btn.addEventListener('click', () => openEditTemplate(btn.dataset.event));
        });
    }

    function openEditTemplate(event) {
        const t = allTemplates.find(x => x.event === event);
        if (!t) return;
        document.getElementById('notif-event').value = t.event;
        document.getElementById('notif-subject').value = t.subject || '';
        document.getElementById('notif-content').value = t.contentTemplate || '';
        document.getElementById('notif-active').checked = t.active !== false;
        notifModal.hidden = false;
    }

    document.getElementById('btn-save-notif')?.addEventListener('click', async () => {
        const payload = {
            event: document.getElementById('notif-event').value,
            subject: document.getElementById('notif-subject').value,
            contentTemplate: document.getElementById('notif-content').value,
            active: document.getElementById('notif-active').checked
        };
        try {
            const res = await fetch('/api/v1/notification-templates', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                notifModal.hidden = true;
                const statusBox = document.getElementById('admin-notif-status');
                statusBox.innerHTML = '<div class="status-message msg-success">Đã lưu mẫu thông báo thành công.</div>';
                setTimeout(() => statusBox.innerHTML = '', 3000);
                loadTemplates();
            } else {
                alert('Lỗi khi lưu mẫu thông báo.');
            }
        } catch (e) {
            alert('Lỗi kết nối.');
        }
    });

    document.getElementById('broadcast-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const payload = {
            userId: document.getElementById('bc-target').value,
            channel: document.getElementById('bc-channel').value,
            title: document.getElementById('bc-title').value,
            content: document.getElementById('bc-content').value,
            trigger: 'ADMIN'
        };
        
        const btn = document.getElementById('btn-send-bc');
        const oldText = btn.textContent;
        btn.textContent = 'Đang gửi...';
        btn.disabled = true;

        try {
            const res = await fetch('/api/v1/notifications', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const statusBox = document.getElementById('admin-notif-status');
            if (res.ok) {
                statusBox.innerHTML = '<div class="status-message msg-success">Đã gửi thông báo Broadcast thành công.</div>';
                document.getElementById('broadcast-form').reset();
            } else {
                statusBox.innerHTML = '<div class="status-message msg-error">Lỗi khi gửi thông báo. Bạn có quyền Admin không?</div>';
            }
            setTimeout(() => statusBox.innerHTML = '', 5000);
        } catch (err) {
            alert('Lỗi kết nối.');
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    });

    // ===== System Settings (0.5.5) =====
    const sysTbody = document.getElementById('admin-sys-tbody');
    const sysModal = document.getElementById('sys-modal');
    let allSettings = [];

    async function loadSettings() {
        try {
            const res = await fetch('/api/v1/admin/settings');
            if (res.status === 403) return;
            if (!res.ok) throw new Error('settings');
            allSettings = await res.json();
            renderSettings();
        } catch (e) {
            sysTbody.innerHTML = '<tr><td colspan="5" class="admin-loading msg-error">Không thể tải cấu hình hệ thống.</td></tr>';
        }
    }

    function renderSettings() {
        sysTbody.innerHTML = '';
        if (!allSettings.length) {
            sysTbody.innerHTML = '<tr><td colspan="5" class="admin-loading">Chưa có cấu hình nào.</td></tr>';
            return;
        }
        allSettings.forEach(s => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${escapeHtml(s.settingKey || '')}</code></td>
                <td><strong>${escapeHtml(s.displayName || s.settingKey)}</strong></td>
                <td><span style="color:var(--db-primary);font-weight:bold;">${escapeHtml(s.settingValue || '')}</span></td>
                <td><small style="color:var(--db-text-muted)">${escapeHtml(s.description || '')}</small></td>
                <td><button class="btn btn-secondary btn-edit-sys" data-key="${s.settingKey}">Sửa</button></td>
            `;
            sysTbody.appendChild(tr);
        });

        sysTbody.querySelectorAll('.btn-edit-sys').forEach(btn => {
            btn.addEventListener('click', () => {
                const key = btn.dataset.key;
                const s = allSettings.find(x => x.settingKey === key);
                if (s) {
                    document.getElementById('sys-key').value = s.settingKey;
                    document.getElementById('sys-name').value = s.displayName || s.settingKey;
                    document.getElementById('sys-value').value = s.settingValue || '';
                    sysModal.hidden = false;
                }
            });
        });
    }

    document.getElementById('btn-save-sys')?.addEventListener('click', async () => {
        const payload = {
            settingKey: document.getElementById('sys-key').value,
            settingValue: document.getElementById('sys-value').value
        };
        try {
            const res = await fetch('/api/v1/admin/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            if (res.ok) {
                sysModal.hidden = true;
                const statusBox = document.getElementById('admin-sys-status');
                statusBox.innerHTML = '<div class="status-message msg-success">Đã lưu cấu hình thành công.</div>';
                setTimeout(() => statusBox.innerHTML = '', 3000);
                loadSettings();
            } else {
                alert('Lỗi khi lưu cấu hình.');
            }
        } catch (e) {
            alert('Lỗi kết nối.');
        }
    });

    (async () => {
        try {
            const ok = await loadStats();
            if (ok) {
                await loadUsers();
                await loadTemplates();
                await loadSettings();
            }
        } catch (e) {
            showStatus('Không thể tải dữ liệu quản trị.', 'error');
        }
    })();
});
