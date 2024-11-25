class App {
    constructor() {
        this.token = localStorage.getItem('accessToken');
        this.init();
    }

    async init() {
        // uncomment later when login page implemented
        // if (!this.token) {
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

    // sending requests with authentication
    async fetchWithAuth(url, options = {}) {
        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    ...options.headers,
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.status === 401) {
                // token is invalid, redirect to login
                localStorage.removeItem('accessToken');
                window.location.href = '/login.html';
                return null;
            }

            return response;
        } catch (error) {
            console.error('Fetch error:', error);
            throw error;
        }
    }

    async loadLibrary() {
        try {
            const response = await this.fetchWithAuth('/api/books/library');
            if (!response) return;
            
            const books = await response.json();
            const container = document.getElementById('libraryContainer');
            container.innerHTML = books
                .map(book => components.renderBookCard(book))
                .join('');
        } catch (error) {
            console.error('Error loading library:', error);
        }
    }


    // TODO: load current reading
    // TODO: load info
    // TODO: load recommendations

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