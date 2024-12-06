class utilsObj {
    constructor() {
        console.log("in utilsObj constructor")
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        console.log("set variables")
    }

    async fetchWithAuth(url, options = {}) {
        console.log("in fetchWithAuth")
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                // Try to refresh the token
                const refreshed = await this.refreshAccessToken();
                console.log("refreshAccessToken has been called")
                if (refreshed) {
                    // Retry the original request with new token
                    return this.fetchWithAuth(url, options);
                } else {
                    // Refresh failed, redirect to login
                    localStorage.removeItem('accessToken');
                    localStorage.removeItem('refreshToken');
                    window.location.href = '/login.html';
                    return null;
                }
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    async refreshAccessToken() {
        try {
            const response = await fetch('/api/token/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (!response.ok) {
                return false;
            }

            const data = await response.json();
            this.accessToken = data.accessToken;
            localStorage.setItem('accessToken', data.accessToken);
            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }
}

export default new utilsObj();