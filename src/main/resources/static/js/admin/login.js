document.addEventListener('DOMContentLoaded', () => {
    // If already logged in as ADMIN, redirect to /admin
    const user = AuthUtil.getUser();
    if (user && user.role === 'ADMIN') {
        window.location.href = '/admin';
        return;
    } else if (user) {
        AuthUtil.logout(); // Clear user session if they are not admin but trying to access admin login
    }

    const form = document.getElementById('admin-login-form');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const usernameInput = document.getElementById('username');
        const passwordInput = document.getElementById('password');
        const submitBtn = form.querySelector('button[type="submit"]');

        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Đang đăng nhập...';
        submitBtn.disabled = true;

        try {
            const payload = {
                username: usernameInput.value.trim(),
                password: passwordInput.value
            };

            const response = await fetch('/api/v1/admin/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });

            if (response.ok) {
                const data = await response.json();
                localStorage.setItem('jwt_token', data.token);
                localStorage.setItem('user_info', JSON.stringify({
                    id: data.id,
                    username: data.username,
                    email: data.email,
                    role: data.role
                }));
                
                // Admin redirect
                window.location.href = '/admin';
            } else {
                if (response.status === 403 || response.status === 401) {
                    alert('Tên đăng nhập hoặc mật khẩu không chính xác, hoặc tài khoản không có quyền Admin!');
                } else {
                    let errorMessage = 'Đăng nhập Admin thất bại. Vui lòng kiểm tra lại.';
                    try {
                        const errorData = await response.json();
                        if (errorData && errorData.message) {
                            errorMessage = errorData.message;
                        }
                    } catch (err) {
                        // ignore parsing error
                    }
                    alert(errorMessage);
                }
            }
        } catch (error) {
            console.error('Login error:', error);
            alert('Có lỗi xảy ra khi kết nối tới máy chủ. Vui lòng thử lại sau.');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    });
});
