// Client-side script for Login Page

document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.querySelector('.auth-form');
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // Display messages based on URL query parameters
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('registered') === 'true') {
        showStatusMessage('Đăng ký thành công! Vui lòng kiểm tra email để xác thực tài khoản.', 'success');
    } else if (urlParams.get('verified') === 'true') {
        showStatusMessage('Xác thực email thành công! Bạn hiện đã có thể đăng nhập.', 'success');
    } else if (urlParams.get('verification_error')) {
        showStatusMessage('Xác thực thất bại: ' + decodeURIComponent(urlParams.get('verification_error')), 'error');
    } else if (urlParams.get('expired') === 'true') {
        showStatusMessage('Phiên làm việc đã hết hạn. Vui lòng đăng nhập lại.', 'error');
    } else if (urlParams.get('logout') === 'true') {
        showStatusMessage('Bạn đã đăng xuất thành công.', 'success');
    }

    if (authForm) {
        authForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const password = passwordInput.value;

            if (!username || !password) {
                showStatusMessage('Vui lòng điền đầy đủ thông tin.', 'error');
                return;
            }

            try {
                const response = await fetch('/api/v1/users/login', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                if (response.ok) {
                    const data = await response.json();
                    
                    // Save JWT token and user info
                    localStorage.setItem('jwt_token', data.token);
                    localStorage.setItem('user_info', JSON.stringify({
                        id: data.id,
                        username: data.username,
                        email: data.email,
                        role: data.role
                    }));

                    showStatusMessage('Đăng nhập thành công! Đang chuyển hướng...', 'success');

                    setTimeout(() => {
                        window.location.href = '/projects';
                    }, 800);
                } else {
                    if (response.status === 403) {
                        showStatusMessage('Tài khoản Quản trị không thể đăng nhập ở đây. Vui lòng sang trang Đăng nhập Quản trị.', 'error');
                    } else {
                        try {
                            const errData = await response.json();
                            showStatusMessage(errData.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.', 'error');
                        } catch (e) {
                            showStatusMessage('Đăng nhập thất bại. Vui lòng kiểm tra lại tài khoản hoặc mật khẩu.', 'error');
                        }
                    }
                }
            } catch (error) {
                console.error('Login error:', error);
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

    // Google Sign-In Initialization
    if (typeof google !== 'undefined') {
        initializeGoogleSignIn();
    } else {
        window.addEventListener('load', () => {
            if (typeof google !== 'undefined') {
                initializeGoogleSignIn();
            }
        });
    }

    function initializeGoogleSignIn() {
        const client_id = window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
        google.accounts.id.initialize({
            client_id: client_id,
            callback: handleCredentialResponse
        });
        
        const btnContainer = document.getElementById('google-signin-btn');
        if (btnContainer) {
            google.accounts.id.renderButton(
                btnContainer,
                { theme: "dark", size: "large", width: "100%", text: "signin_with" }
            );
        }
    }

    async function handleCredentialResponse(response) {
        const idToken = response.credential;
        try {
            showStatusMessage('Đang đăng nhập bằng Google...', 'success');
            
            const apiResponse = await fetch('/api/v1/users/google-login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ idToken })
            });

            if (apiResponse.ok) {
                const data = await apiResponse.json();
                
                // Save JWT token and user info
                localStorage.setItem('jwt_token', data.token);
                localStorage.setItem('user_info', JSON.stringify({
                    id: data.id,
                    username: data.username,
                    email: data.email,
                    role: data.role
                }));

                showStatusMessage('Đăng nhập thành công! Đang chuyển hướng...', 'success');

                setTimeout(() => {
                    window.location.href = '/projects';
                }, 800);
            } else {
                if (apiResponse.status === 403) {
                    showStatusMessage('Tài khoản Quản trị không thể đăng nhập ở đây. Vui lòng sang trang Đăng nhập Quản trị.', 'error');
                } else {
                    showStatusMessage('Đăng nhập bằng Google thất bại.', 'error');
                }
            }
        } catch (error) {
            console.error('Google Sign-In error:', error);
            showStatusMessage('Có lỗi xảy ra khi kết nối tới máy chủ.', 'error');
        }
    }
});
