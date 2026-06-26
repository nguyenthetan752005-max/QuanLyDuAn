// Client-side script for Forgot Password Page

document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.querySelector('.auth-form');
    const emailInput = document.getElementById('email');

    if (authForm) {
        authForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const email = emailInput.value.trim();

            if (!email) {
                showStatusMessage('Vui lòng nhập địa chỉ email.', 'error');
                return;
            }

            try {
                showStatusMessage('Đang xử lý...', 'success');
                const response = await fetch('/api/v1/users/forgot-password', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email })
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    let htmlMessage = `Liên kết đặt lại mật khẩu đã được gửi! Vui lòng kiểm tra nhật ký máy chủ (console log).`;
                    if (data.resetLink) {
                        htmlMessage += `<br><br><a href="${data.resetLink}">NHẤP VÀO ĐÂY ĐỂ ĐẶT LẠI MẬT KHẨU (TEST)</a>`;
                    }
                    showStatusMessageWithHtml(htmlMessage, 'success');
                } else {
                    showStatusMessage('Yêu cầu thất bại. Vui lòng kiểm tra email đã đăng ký.', 'error');
                }
            } catch (error) {
                console.error('Forgot password error:', error);
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

    function showStatusMessageWithHtml(html, type) {
        // Remove existing messages
        const existingMsg = document.querySelector('.status-message');
        if (existingMsg) {
            existingMsg.remove();
        }

        const msgDiv = document.createElement('div');
        msgDiv.className = `status-message msg-${type}`;
        msgDiv.innerHTML = html;
        authForm.insertBefore(msgDiv, authForm.firstChild);
    }
});
