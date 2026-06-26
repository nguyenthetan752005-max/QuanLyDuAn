// Profile page logic — uses existing REST APIs only
document.addEventListener('DOMContentLoaded', () => {
    const user = window.AuthUtil ? AuthUtil.getUser() : null;
    if (!user || !user.id) {
        window.location.href = '/login';
        return;
    }

    const statusBox = document.getElementById('profile-status');
    const form = document.getElementById('profile-form');
    const inputUsername = document.getElementById('profile-input-username');
    const inputEmail = document.getElementById('profile-input-email');
    const inputPassword = document.getElementById('profile-input-password');
    const inputPassword2 = document.getElementById('profile-input-password2');
    const saveBtn = document.getElementById('btn-save-profile');

    function showStatus(text, type) {
        statusBox.innerHTML = '';
        const div = document.createElement('div');
        div.className = `status-message msg-${type}`;
        div.innerText = text;
        statusBox.appendChild(div);
        div.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function setInitials(name) {
        const initials = (name || 'U').trim().charAt(0).toUpperCase();
        document.getElementById('user-initials').textContent = initials;
        document.getElementById('profile-avatar').textContent = initials;
    }

    // 1. Load user info
    async function loadUser() {
        try {
            const res = await fetch(`/api/v1/users/${user.id}`);
            if (!res.ok) throw new Error();
            const data = await res.json();

            document.getElementById('profile-username').textContent = data.username;
            document.getElementById('profile-email').textContent = data.email;
            document.getElementById('username-display').textContent = data.username;
            setInitials(data.username);

            if (data.createdAt) {
                const d = new Date(data.createdAt);
                document.getElementById('profile-joined').textContent =
                    'Tham gia: ' + d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
            }

            inputUsername.value = data.username;
            inputEmail.value = data.email;
        } catch (e) {
            showStatus('Không thể tải thông tin tài khoản.', 'error');
        }
    }

    // 2. Load project stats + storage usage in parallel
    async function loadStats() {
        const setText = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        try {
            const [resProjects, resUsage] = await Promise.all([
                fetch('/api/v1/projects'),
                fetch('/api/v1/users/me/usage')
            ]);
            if (resProjects.ok) {
                const data = await resProjects.json();
                const projects = data.content ? data.content : data;
                const images = projects.filter(p => p.projectType === 'IMAGE').length;
                const videos = projects.filter(p => p.projectType === 'VIDEO').length;
                const total = data.totalElements !== undefined ? data.totalElements : projects.length;
                setText('stat-total', total);
                setText('stat-image', images);
                setText('stat-video', videos);
            }
            if (resUsage.ok) {
                const usage = await resUsage.json();
                setText('stat-assets', usage.assetCount ?? 0);
                setText('stat-storage', usage.storageMb ?? 0);
                renderQuota(usage);
            }
        } catch (e) {
            ['stat-total', 'stat-image', 'stat-video', 'stat-assets', 'stat-storage'].forEach(id => setText(id, '0'));
        }
    }

    // 2c. Activity log (C7)
    async function loadActivities() {
        const listEl = document.getElementById('activity-list');
        if (!listEl) return;
        try {
            const res = await fetch('/api/v1/users/me/activities?limit=50');
            if (!res.ok) throw new Error();
            const items = await res.json();
            if (!items.length) {
                listEl.innerHTML = '<div class="activity-empty">Chưa có hoạt động nào.</div>';
                return;
            }
            const iconFor = (action) => {
                if (action?.startsWith('PROJECT')) return '📁';
                if (action?.startsWith('ASSET')) return '📎';
                if (action === 'LOGIN') return '🔑';
                return '•';
            };
            const fmt = (iso) => {
                if (!iso) return '';
                try {
                    const d = new Date(iso);
                    const diff = Math.floor((Date.now() - d) / 60000);
                    if (diff < 1) return 'vừa xong';
                    if (diff < 60) return `${diff} phút trước`;
                    if (diff < 1440) return `${Math.floor(diff / 60)} giờ trước`;
                    return d.toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
                } catch (e) { return ''; }
            };
            listEl.innerHTML = items.map(a => `
                <div class="activity-row">
                    <span class="activity-icon">${iconFor(a.action)}</span>
                    <span class="activity-desc">${(a.description || a.action || '').replace(/</g, '&lt;')}</span>
                    <span class="activity-time">${fmt(a.createdAt)}</span>
                </div>`).join('');
        } catch (e) {
            listEl.innerHTML = '<div class="activity-empty">Không thể tải nhật ký hoạt động.</div>';
        }
    }

    // 2b. Render storage quota bar (C5)
    function renderQuota(usage) {
        const card = document.getElementById('quota-card');
        const fill = document.getElementById('quota-bar-fill');
        const txt = document.getElementById('quota-text');
        const warn = document.getElementById('quota-warn');
        if (!card || !fill || !txt) return;
        const quota = usage.quotaMb || 0;
        if (quota <= 0) { card.hidden = true; return; } // unlimited

        const used = usage.storageMb || 0;
        const pct = Math.min(100, Math.round(used / quota * 100));
        card.hidden = false;
        txt.textContent = `${used.toFixed(2)} / ${quota.toFixed(0)} MB (${pct}%)`;
        fill.style.width = `${pct}%`;
        fill.className = 'quota-bar-fill' + (pct >= 90 ? ' is-danger' : pct >= 70 ? ' is-warn' : '');
        if (pct >= 90) {
            warn.hidden = false;
            warn.textContent = 'Bạn sắp đầy dung lượng! Hãy xóa bớt tệp tin cũ để tiếp tục tải lên.';
        } else {
            warn.hidden = true;
        }
    }

    // 3. Update account
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        if (inputPassword.value !== inputPassword2.value) {
            showStatus('Mật khẩu xác nhận không khớp.', 'error');
            return;
        }

        saveBtn.disabled = true;
        try {
            const res = await fetch(`/api/v1/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    username: inputUsername.value.trim(),
                    email: inputEmail.value.trim(),
                    password: inputPassword.value
                })
            });

            if (res.ok) {
                showStatus('Cập nhật thành công! Vui lòng đăng nhập lại với thông tin mới...', 'success');
                setTimeout(() => AuthUtil.logout(), 1600);
            } else {
                let msg = 'Không thể cập nhật tài khoản.';
                try {
                    const err = await res.json();
                    if (err && err.message) msg = err.message;
                } catch (ignored) {}
                showStatus(msg, 'error');
                saveBtn.disabled = false;
            }
        } catch (err) {
            showStatus('Có lỗi xảy ra khi kết nối tới máy chủ.', 'error');
            saveBtn.disabled = false;
        }
    });

    // 4. Delete account
    document.getElementById('btn-delete-account').addEventListener('click', async () => {
        const confirmName = prompt(
            'Hành động này sẽ XÓA VĨNH VIỄN tài khoản và toàn bộ dữ liệu.\n' +
            'Nhập chính xác tên đăng nhập của bạn để xác nhận:'
        );
        if (confirmName === null) return;
        if (confirmName.trim() !== document.getElementById('profile-username').textContent) {
            showStatus('Tên đăng nhập xác nhận không khớp. Đã hủy thao tác xóa.', 'error');
            return;
        }

        try {
            const res = await fetch(`/api/v1/users/${user.id}`, { method: 'DELETE' });
            if (res.ok || res.status === 204) {
                alert('Tài khoản đã được xóa. Tạm biệt!');
                AuthUtil.logout();
            } else {
                showStatus('Không thể xóa tài khoản.', 'error');
            }
        } catch (err) {
            showStatus('Có lỗi xảy ra khi kết nối tới máy chủ.', 'error');
        }
    });

    loadUser();
    loadStats();
    loadActivities();
});
