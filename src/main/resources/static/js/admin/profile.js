// Admin Profile page logic
document.addEventListener('DOMContentLoaded', () => {
    const user = window.AuthUtil ? AuthUtil.getUser() : null;
    if (!user || !user.id || user.role !== 'ADMIN') {
        window.location.href = '/admin/login';
        return;
    }

    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const statusBox = document.getElementById('profile-status');

    if (user.username) {
        document.getElementById('username-display').textContent = user.username;
        document.getElementById('user-initials').textContent = user.username.charAt(0).toUpperCase();
        usernameInput.value = user.username;
        emailInput.value = user.email || '';
    }

    function showStatus(text, type) {
        statusBox.innerHTML = '';
        const div = document.createElement('div');
        div.className = `status-message msg-${type}`;
        div.innerText = text;
        statusBox.appendChild(div);
        
        setTimeout(() => {
            if (statusBox.contains(div)) statusBox.removeChild(div);
        }, 5000);
    }

    document.getElementById('profile-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-save-profile');
        const oldText = btn.textContent;
        btn.textContent = 'Đang lưu...';
        btn.disabled = true;

        try {
            const payload = {
                username: usernameInput.value.trim(),
                email: emailInput.value
            };

            const res = await fetch(`/api/v1/users/${user.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                const data = await res.json();
                // Update local storage
                user.username = data.username;
                localStorage.setItem('user_info', JSON.stringify(user));
                
                document.getElementById('username-display').textContent = user.username;
                document.getElementById('user-initials').textContent = user.username.charAt(0).toUpperCase();
                
                showStatus('Đã cập nhật thông tin thành công.', 'success');
            } else {
                let msg = 'Không thể cập nhật thông tin.';
                try { const err = await res.json(); if (err.message) msg = err.message; } catch(e){}
                showStatus(msg, 'error');
            }
        } catch (err) {
            showStatus('Lỗi kết nối.', 'error');
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    });

    document.getElementById('password-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btn-change-password');
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const oldText = btn.textContent;
        btn.textContent = 'Đang lưu...';
        btn.disabled = true;

        try {
            const payload = {
                currentPassword: currentPassword,
                newPassword: newPassword
            };

            const res = await fetch(`/api/v1/users/${user.id}/password`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (res.ok) {
                showStatus('Đã thay đổi mật khẩu thành công.', 'success');
                document.getElementById('currentPassword').value = '';
                document.getElementById('newPassword').value = '';
            } else {
                let msg = 'Không thể thay đổi mật khẩu.';
                try { const err = await res.json(); if (err.message) msg = err.message; } catch(e){}
                showStatus(msg, 'error');
            }
        } catch (err) {
            showStatus('Lỗi kết nối.', 'error');
        } finally {
            btn.textContent = oldText;
            btn.disabled = false;
        }
    });
});
