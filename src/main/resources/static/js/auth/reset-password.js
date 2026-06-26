// Client-side script for Reset Password Page

document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.querySelector('.auth-form');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirm-password');

    // Extract token from URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        showStatusMessage('Token xác thực không hợp lệ hoặc đã thiếu. Vui lòng gửi lại yêu cầu đặt lại mật khẩu.', 'error');
        if (authForm) {
            const submitBtn = authForm.querySelector('button[type="submit"]');
            if (submitBtn) submitBtn.disabled = true;
        }
    }

    if (authForm) {
        authForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!password || !confirmPassword) {
                showStatusMessage('Vui lòng nhập mật khẩu.', 'error');
                return;
            }

            if (password !== confirmPassword) {
                showStatusMessage('Mật khẩu xác nhận không khớp.', 'error');
                return;
            }

            try {
                showStatusMessage('Đang xử lý...', 'success');
                const response = await fetch('/api/v1/users/reset-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ token, newPassword: password })
                });

                if (response.ok) {
                    showStatusMessage('Đặt lại mật khẩu thành công! Đang chuyển hướng đến trang đăng nhập...', 'success');
                    setTimeout(() => {
                        window.location.href = '/login';
                    }, 1500);
                } else {
                    showStatusMessage('Token đã hết hạn hoặc không hợp lệ. Vui lòng thử lại.', 'error');
                }
            } catch (error) {
                console.error('Reset password error:', error);
                showStatusMessage('Có lỗi xảy ra khi kết nối tới máy chủ.', 'error');
            }
        });
    }

    function showStatusMessage(text, type) {
        // Remove existing messages
        const existingMsg = document.querySelector('.status-message');
        if (existingMsg) {
            existingMsg.remove();
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `status-message msg-${type}`;
        msgDiv.innerText = text;
        authForm.insertBefore(msgDiv, authForm.firstChild);
    }
});
