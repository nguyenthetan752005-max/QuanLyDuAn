// Client-side script for Register Page

document.addEventListener('DOMContentLoaded', function() {
    const authForm = document.querySelector('.auth-form');
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');

    // Display messages based on URL query parameters (for MVC redirection flow)
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('error') === 'true') {
        const msg = urlParams.get('msg');
        if (msg) {
            const decodedMsg = decodeURIComponent(msg);
            if (decodedMsg.includes("Username already exists")) {
                showStatusMessage('Đăng ký thất bại: Tên tài khoản đã tồn tại.', 'error');
            } else if (decodedMsg.includes("Email already exists")) {
                showStatusMessage('Đăng ký thất bại: Email đã đăng ký với tài khoản khác.', 'error');
            } else {
                showStatusMessage(decodedMsg, 'error');
            }
        } else {
            showStatusMessage('Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.', 'error');
        }
    }

    if (authForm) {
        authForm.addEventListener('submit', async function(e) {
            e.preventDefault();

            const username = usernameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;

            if (!username || !email || !password) {
                showStatusMessage('Vui lòng điền đầy đủ tất cả các trường.', 'error');
                return;
            }

            try {
                const response = await fetch('/api/v1/users/register', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, email, password })
                });

                if (response.ok) {
                    showStatusMessage('Đăng ký thành công! Vui lòng kiểm tra email của bạn để kích hoạt tài khoản.', 'success');
                    setTimeout(() => {
                        window.location.href = '/login?registered=true';
                    }, 4000);
                } else {
                    try {
                        const errData = await response.json();
                        if (errData.message && errData.message.includes("Username already exists")) {
                            showStatusMessage('Đăng ký thất bại: Tên tài khoản đã tồn tại.', 'error');
                        } else if (errData.message && errData.message.includes("Email already exists")) {
                            showStatusMessage('Đăng ký thất bại: Email đã đăng ký với tài khoản khác.', 'error');
                        } else {
                            showStatusMessage(errData.message || 'Đăng ký thất bại. Vui lòng kiểm tra lại thông tin.', 'error');
                        }
                    } catch (e) {
                        showStatusMessage('Đăng ký thất bại. Tên tài khoản hoặc email đã tồn tại.', 'error');
                    }
                }
            } catch (error) {
                console.error('Registration error:', error);
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

    // Google Sign-In / Sign-Up Initialization
    if (typeof google !== 'undefined') {
        initializeGoogleSignUp();
    } else {
        window.addEventListener('load', () => {
            if (typeof google !== 'undefined') {
                initializeGoogleSignUp();
            }
        });
    }

    function initializeGoogleSignUp() {
        const client_id = window.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
        google.accounts.id.initialize({
            client_id: client_id,
            callback: handleCredentialResponse
        });
        
        const btnContainer = document.getElementById('google-signup-btn');
        if (btnContainer) {
            google.accounts.id.renderButton(
                btnContainer,
                { theme: "dark", size: "large", width: "100%", text: "signup_with" }
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
                    email: data.email
                }));

                showStatusMessage('Đăng ký và Đăng nhập thành công! Đang chuyển hướng...', 'success');
                
                setTimeout(() => {
                    window.location.href = '/projects';
                }, 800);
            } else {
                showStatusMessage('Đăng ký bằng Google thất bại.', 'error');
            }
        } catch (error) {
            console.error('Google Sign-Up error:', error);
            showStatusMessage('Có lỗi xảy ra khi kết nối tới máy chủ.', 'error');
        }
    }
});
