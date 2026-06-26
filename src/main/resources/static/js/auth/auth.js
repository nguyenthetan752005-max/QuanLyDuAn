// Global Client-Side Authentication Management for JWT

(function() {
    // 1. Guard check for protected routes: /projects and /editor
    const protectedRoutes = ['/projects', '/editor', '/explorer', '/profile', '/admin'];
    const currentPath = window.location.pathname;
    const token = localStorage.getItem('jwt_token');

    if (protectedRoutes.some(route => currentPath.startsWith(route))) {
        // Exclude specific unprotected paths under protected prefixes
        if (currentPath !== '/admin/login') {
            if (!token) {
                window.location.href = '/login';
                return;
            }
        }
    }

    // 2. Override window.fetch globally to automatically attach JWT header
    const originalFetch = window.fetch;
    window.fetch = async function(resource, init) {
        init = init || {};
        init.headers = init.headers || {};

        const token = localStorage.getItem('jwt_token');
        const urlStr = resource.toString();

        // Attach Authorization header if token exists and request is to our API
        if (token && urlStr.includes('/api/v1/')) {
            // Ensure headers is treated correctly depending on its type
            if (init.headers instanceof Headers) {
                if (!init.headers.has('Authorization')) {
                    init.headers.set('Authorization', 'Bearer ' + token);
                }
            } else if (Array.isArray(init.headers)) {
                // If it's an array of key-value pairs
                const hasAuth = init.headers.some(h => h[0].toLowerCase() === 'authorization');
                if (!hasAuth) {
                    init.headers.push(['Authorization', 'Bearer ' + token]);
                }
            } else {
                // Standard object
                if (!init.headers['Authorization']) {
                    init.headers['Authorization'] = 'Bearer ' + token;
                }
            }
        }

        let response = await originalFetch(resource, init);

        // Handle 401 Unauthorized by trying to refresh the token
        if (response.status === 401 && !urlStr.includes('/api/v1/users/login') && !urlStr.includes('/api/v1/users/refresh')) {
            try {
                const refreshResponse = await originalFetch('/api/v1/users/refresh', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                if (refreshResponse.ok) {
                    const data = await refreshResponse.json();
                    localStorage.setItem('jwt_token', data.token);

                    // Update headers for retry
                    if (init.headers instanceof Headers) {
                        init.headers.set('Authorization', 'Bearer ' + data.token);
                    } else if (Array.isArray(init.headers)) {
                        const authIdx = init.headers.findIndex(h => h[0].toLowerCase() === 'authorization');
                        if (authIdx > -1) init.headers[authIdx][1] = 'Bearer ' + data.token;
                    } else {
                        init.headers['Authorization'] = 'Bearer ' + data.token;
                    }

                    // Retry original request
                    response = await originalFetch(resource, init);
                } else {
                    throw new Error("Refresh token failed");
                }
            } catch (err) {
                localStorage.removeItem('jwt_token');
                localStorage.removeItem('user_info');
                window.location.href = '/login?expired=true';
            }
        } else if (response.status === 401 && urlStr.includes('/api/v1/users/refresh')) {
            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_info');
            window.location.href = '/login?expired=true';
        } else if (response.status === 403 && !urlStr.includes('/api/v1/users/login')) {
            if (window.location.pathname !== '/projects') {
                window.location.href = '/projects?error=forbidden';
            }
        }

        return response;
    };

    // 3. Expose auth utility functions globally
    window.AuthUtil = {
        getToken: function() {
            return localStorage.getItem('jwt_token');
        },
        getUser: function() {
            try {
                return JSON.parse(localStorage.getItem('user_info'));
            } catch (e) {
                return null;
            }
        },
        isAuthenticated: function() {
            return !!localStorage.getItem('jwt_token');
        },
        logout: function() {
            let isAdmin = false;
            try {
                const user = JSON.parse(localStorage.getItem('user_info'));
                if (user && user.role === 'ADMIN') {
                    isAdmin = true;
                }
            } catch (e) {}

            localStorage.removeItem('jwt_token');
            localStorage.removeItem('user_info');
            
            // Redirect using standard HTML logout or direct page reload/redirect
            if (isAdmin) {
                window.location.href = '/admin/login?logout=true';
            } else {
                window.location.href = '/login?logout=true';
            }
        }
    };
})();
