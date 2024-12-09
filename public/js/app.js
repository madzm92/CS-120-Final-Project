import { utilsObj } from "./utilsObj.js";
import { userData } from './data.js';
import { components } from './components.js';

export class App {
    constructor() {
        this.accessToken = localStorage.getItem('accessToken');
        this.refreshToken = localStorage.getItem('refreshToken');
        // Only initialize if we're not on login or register page
        const currentPath = window.location.pathname;
        if (currentPath !== '/login.html' && currentPath !== '/register.html') {
            this.init();
        }
    }

    async init() {
        if (!this.accessToken) {
            if ((window.location.pathname !== '/login.html') && (window.location.pathname !== '/register.html')) {
                window.location.href = '/login.html';
            }
            console.log("no accessToken")
            return;
        }
        try {
            await Promise.all([
                this.fetchUserLibrary(),
                this.fetchInfo(),
                this.fetchRecommendations()
            ]);
            this.loadLibrary();
            this.loadCurrentReading();
            this.loadInfo();
            this.loadRecommendations();
            this.setupEventListeners();
        } catch (error) {
            console.error('Initialization error:', error);
            // If there's an auth error during initialization, redirect to login
            if (error.status === 401) {
                window.location.href = '/login.html';
            }
        }
    }

    // user login
    async login(username, password) {
        try {
            console.log("Attempting login with username:", username);
            const response = await fetch('/api/user/login', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            const data = await response.json();
            
            if (!response.ok) {
                console.error("Login failed: ", data.message);
                alert(`Login failed: ${data.message}`);
                return;
            }
            
            console.log("Login successful: ", data);
            
            // save tokens to client
            this.accessToken = data.accessToken;
            this.refreshToken = data.refreshToken;
            localStorage.setItem('accessToken', this.accessToken);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            // Redirect to home page after successful login
            window.location.href = '/index.html';
        } catch (error) {
            console.error('Error during login request:', error);
            alert('An error occurred. Please try again.');
        }
    }

    // user register
    async register(username, password) {
        try {
            console.log("Attempting registration with username:", username);
            const response = await fetch('/api/user/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
    
            const data = await response.json();
            
            if (!response.ok) {
                console.error('Registration failed:', data.message);
                alert(`Registration failed: ${data.message}`);
                return;
            }
    
            console.log('Registration successful:', data);
            // After successful registration, automatically log in
            await this.login(username, password);
        } catch (error) {
            console.error('Error during registration:', error);
            alert('An error occurred during registration. Please try again.');
        }
    }
    
    // user logout
    async logout() {
        try {
            const response = await utilsObj.fetchWithAuth('/api/user/logout', {
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


    
    // fetch books in library and store in userData
    async fetchUserLibrary() {
        try {
            const response = await utilsObj.fetchWithAuth('/api/books/library');
            if (!response) return;
            const books = await response.json();
            
            if (!Array.isArray(books)) {
                console.error('Expected books to be an array but got:', typeof books);
                return;
            }
            
            userData.library = books;    
        } catch (error) {
            console.error('Error fetching library:', error);
        }
    }

    // fetch info. 
    async fetchInfo() {
        try {
            const response = await fetch('/api/info');
            if (!response.ok) {
                throw new Error('Failed to fetch info');
            }
            const info = await response.json();
            userData.info = info;
        } catch (error) {
            console.error('Error fetching info:', error);
        }
    }

    // fetch recommendations. 
    async fetchRecommendations() {
        try {
            const response = await utilsObj.fetchWithAuth('/api/books/recommendations');
            if (!response) return;
            const recommendations = await response.json();
            userData.recommendations = recommendations;
        } catch (error) {
            console.error('Error fetching recommendations:', error);
        }
    }

    // search book
    async performSearch(searchTerm) {
        if (!searchTerm.trim()) {
            return;
        }

        try {
            const response = await utilsObj.fetchWithAuth(`/api/books/search?term=${encodeURIComponent(searchTerm)}`);
            if (!response) return;
            const results = await response.json();
            sessionStorage.setItem('lastSearch', searchTerm);
            this.showSearchResults(results);
        } catch (error) {
            console.error('Search failed:', error);
        }
    }

    showSearchResults(results) {
        const contentScrollable = document.querySelector('.content-scrollable');
        const currentReading = document.querySelector('.current-reading');
        const library = document.querySelector('.library');
        
        // if already exists, remove
        const existingSearchResults = document.querySelector('.search-results');
        if (existingSearchResults) {
            existingSearchResults.remove();
        }
        
        // create search result container
        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';
        
        // add search result content
        searchResults.innerHTML = `
            <div class="section-header">
                <button class="back-to-library">BACK TO LIBRARY</button>
            </div>
            <div class="personal-results">
                <div class="section-header">
                    <div class="section-title">From Your Library</div>
                </div>
                <div class="books-grid">
                    ${results.personalResults.map(book => components.renderBookCard(book)).join('')}
                </div>
            </div>
            <div class="general-results">
                <div class="section-header">
                    <div class="section-title">More Books</div>
                </div>
                <div class="books-grid">
                    ${results.generalResults.map(book => components.renderBookCard(book)).join('')}
                </div>
            </div>
        `;
    
        // Hide the Current Reading and Library sections
        currentReading.style.display = 'none';
        library.style.display = 'none';
        
        // Add search results to the page
        contentScrollable.appendChild(searchResults);
    
        // Add a back button event listener
        searchResults.querySelector('.back-to-library').addEventListener('click', () => {
            // Remove search results
            searchResults.remove();
            
            // Redisplay the current reading and library sections
            currentReading.style.display = '';
            library.style.display = '';
        });
    }

    loadLibrary() {
        const container = document.getElementById('libraryContainer');
        container.innerHTML = userData.library
            .map(book => components.renderBookCard(book))
            .join('');
    }

    loadCurrentReading() {
        const container = document.getElementById('currentReadingContainer');
        const currentReading = userData.library.filter(book => book.book_status === 'In Progress');
        container.innerHTML = currentReading
            .map(book => components.renderCurrentReading(book))
            .join('');
    }

    loadInfo() {
        const container = document.getElementById('infoContainer');
        container.innerHTML = userData.info
            .map(info => components.renderInfoItem(info))
            .join('');
    }
    
    loadRecommendations() {
        const container = document.getElementById('recommendationsContainer');
        container.innerHTML = userData.recommendations
            .map(book => components.renderRecommendationCard(book))
            .join('');
    }

    showAllLibrary() {
        const currentReading = document.querySelector('.current-reading');
        const library = document.querySelector('.library');
        const viewAllBtn = library.querySelector('.view-all');
        currentReading.style.display = 'none';

        viewAllBtn.textContent = 'BACK';
        viewAllBtn.classList.add('back-button');
        
        viewAllBtn.removeEventListener('click', this.showAllLibrary);
        viewAllBtn.addEventListener('click', () => {
            currentReading.style.display = '';
            viewAllBtn.textContent = 'VIEW ALL';
            viewAllBtn.classList.remove('back-button');
            viewAllBtn.addEventListener('click', () => this.showAllLibrary());
        });
    }

    setupEventListeners() {
        // sidebar toggle event listener
        const menuToggle = document.querySelector('.menu-button');
        const columnRight = document.querySelector('.column-right');
        
        menuToggle?.addEventListener('click', () => {
            columnRight.classList.toggle('active');
            if (window.innerWidth <= 768) {
                document.body.style.overflow = columnRight.classList.contains('active') ? 'hidden' : 'auto';
            }
        });

        // route to book page by clicking book-card or current-reading-card or recommendation-card
        document.addEventListener('click', (e) => {
            const bookCard = e.target.closest('.book-card, .current-reading-card, .recommendation-card');
            if (bookCard) {
                const bookId = bookCard.dataset.bookId;
                window.location.href = `/book.html?id=${bookId}`;
            }
        });


        // search
        const searchInput = document.querySelector('.search-bar input');
        const searchButton = document.querySelector('.search-button');

        // keyboard press for search
        searchInput.addEventListener('keypress', (event) => {
            if (event.key === 'Enter') {
                this.performSearch(searchInput.value);
            }
        });

        // button for search
        searchButton.addEventListener('click', () => {
            this.performSearch(searchInput.value);
        });

        // viewall
        const libraryViewAll = document.querySelector('.library .view-all');
        libraryViewAll?.addEventListener('click', () => this.showAllLibrary());
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});