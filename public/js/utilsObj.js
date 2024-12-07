class UtilsObj {
    constructor() {
        this.updateTokens();
    }

    updateTokens() {
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        console.log('Current tokens:', {
            accessToken: this.accessToken,
            refreshToken: this.refreshToken ? 'exists' : 'missing'
        });
    }

    async fetchWithAuth(url, options = {}) {
        console.log('Fetching:', url);
        this.updateTokens(); // 确保使用最新的 token

        if (!this.accessToken) {
            console.error('No access token available');
            window.location.href = '/login.html';
            return null;
        }

        const headers = {
            ...options.headers,
            'Authorization': `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
        };

        console.log('Request headers:', headers);

        try {
            const response = await fetch(url, {
                ...options,
                headers
            });

            console.log('Response status:', response.status);

            if (response.status === 401) {
                console.log('Token expired, attempting refresh');
                const refreshed = await this.refreshAccessToken();
                if (refreshed) {
                    console.log('Token refreshed, retrying request');
                    return this.fetchWithAuth(url, options);
                } else {
                    console.log('Token refresh failed, redirecting to login');
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
        console.log('Attempting to refresh token');
        if (!this.refreshToken) {
            console.error('No refresh token available');
            return false;
        }

        try {
            const response = await fetch('/api/token/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            });

            if (!response.ok) {
                console.error('Token refresh failed:', response.status);
                return false;
            }

            const data = await response.json();
            if (!data.accessToken) {
                console.error('No access token in refresh response');
                return false;
            }

            this.accessToken = data.accessToken;
            localStorage.setItem('accessToken', data.accessToken);
            console.log('Token refresh successful');
            return true;
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }
}

export const utilsObj = new UtilsObj();