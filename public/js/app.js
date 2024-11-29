class App {
    constructor() {
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        this.init();
    }

    async init() {
        // uncomment later when login page implemented
        // if (!this.accessToken) {
        //     window.location.href = '/login.html';
        //     return;
        // }
        await Promise.all([
            this.loadLibrary(),
            this.loadCurrentReading(),
            this.loadInfo(),
            this.loadRecommendations(),
        ]);
        this.setupEventListeners()
    }
    // refresh access token with refresh token
    async refreshAccessToken() {
        try {
            const response = await fetch('/api/token/refresh', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ refreshToken: this.refreshToken })
            })

            if (!response.ok) {
                throw new Error('Refresh token failed');
            }

            const data = await response.json()
            localStorage.setItem('accessToken', data.accessToken)
            this.accessToken = data.accessToken
            return true
        } catch (error) {
            console.error('Token refresh failed:', error)
            return false
        }
    }
    
    // sending requests with authentication
    async fetchWithAuth(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.accessToken}`,
                    'Content-Type': 'application/json'
                }
            })

            if (response.status === 401) {
                // Try to refresh the token
                const refreshed = await this.refreshAccessToken()
                if (refreshed) {
                    // Retry the original request with new token
                    return this.fetchWithAuth(url, options)
                } else {
                    // Refresh failed, redirect to login
                    localStorage.removeItem('accessToken')
                    localStorage.removeItem('refreshToken')
                    window.location.href = '/login.html'
                    return null
                }
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error)
            throw error
        }
    }


    // user login
    async login() {
        try {
            // TODO: get username and password from page element
            let usn = ""
            let psw = ""
            const response = await fetch('/api/user/login', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: json.stringify({username: usn, password: psw})
            })
            if (!response.ok) {
                const err = await response.json();
                console.error("Login failed: ", err.message)
                alert(`Login failed: ${err.message}`)
                return
            }
            const data = response.json()
            console.log("Login successful: ", data)
            // save tokens to client
            localStorage.setItem('accessToken', this.accessToken)
            localStorage.setItem('refreshToken', this.refreshToken)
            // go to main page
            window.location.href = '../index.html'
        } catch (error) {
            console.error('Error during login request:', error)
            alert('An error occurred. Please try again.')
        }
    }

    // user register
    async register() {
        try {
            // TODO: get username and password from page element
            let usn = ""
            let psw = ""
            const response = await fetch('/api/user/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username: usn, password: psw })
            })
    
            if (!response.ok) {
                const err = await response.json()
                console.error('Registration failed:', err.message)
                alert(`Registration failed: ${err.message}`)
                return;
            }
    
            const data = await response.json()
            console.log('Registration successful:', data)

            // automatically login after successful registration
            await this.login()
        } catch (error) {
            console.error('Error during registration:', error)
            alert('An error occurred. Please try again.')
        }
    }
    
    // user logout
    async logout() {
        try {
            const response = await this.fetchWithAuth('/api/user/logout', {
                method: 'POST',
                body: JSON.stringify({ refreshToken: this.refreshToken })
            })
    
            if (!response.ok) {
                throw new Error('Logout failed')
            }

            // Clear tokens from localStorage
            localStorage.removeItem('accessToken')
            localStorage.removeItem('refreshToken')
            this.accessToken = null
            this.refreshToken = null
    
            // Redirect to login page
            window.location.href = '../login.html'
        } catch (error) {
            console.error('Error during logout:', error)
            alert('Logout failed. Please try again.')
        }
    }

    async loadLibrary() {
        try {
            const response = await this.fetchWithAuth('/api/books/library')
            if (!response) return
            
            const books = await response.json()
            const container = document.getElementById('libraryContainer')
            container.innerHTML = books
                .map(book => components.renderBookCard(book))
                .join('')
        } catch (error) {
            console.error('Error loading library:', error)
        }
    }


    // TODO: load current reading
    // TODO: load info
    // TODO: load recommendations

    // below is old static code
    loadCurrentReading() {
        const container = document.getElementById('currentReadingContainer');
        container.innerHTML = sampleData.currentReading
            .map(book => components.renderCurrentReading(book))
            .join('');
    }

    loadInfo() {
        const container = document.getElementById('infoContainer');
        container.innerHTML = sampleData.info
            .map(info => components.renderInfoItem(info))
            .join('');
    }
    
    loadRecommendations() {
        const container = document.getElementById('recommendationsContainer');
        container.innerHTML = sampleData.recommendations
            .map(book => components.renderBookCard(book))
            .join('');
    }

    setupEventListeners() {
        const menuToggle = document.querySelector('.menu-toggle-button');
        const columnRight = document.querySelector('.column-right');
        
        menuToggle?.addEventListener('click', () => {
            columnRight.classList.toggle('active');
            if (window.innerWidth <= 768) {
                document.body.style.overflow = columnRight.classList.contains('active') ? 'hidden' : 'auto';
            }
        });
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});