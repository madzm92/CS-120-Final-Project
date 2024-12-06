import utilsObj from "./utilsObj.js";

import { userData } from './data.js';

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
            console.log("username and password in app.js")
            console.log(username)
            console.log(password)
            const response = await fetch('/api/user/login', {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });
            
            if (!response.ok) {
                const err = await response.json();
                console.error("Login failed: ", err.message);
                alert(`Login failed: ${err.message}`);
                return;
            }
            
            const data = await response.json();
            console.log("Login successful: ", data);
            
            // save tokens to client
            this.accessToken = data.accessToken;
            this.refreshToken = data.refreshToken;
            localStorage.setItem('accessToken', this.accessToken);
            localStorage.setItem('refreshToken', this.refreshToken);
            
            // Redirect to home page after successful login
            window.location.href = '/';
        } catch (error) {
            console.error('Error during login request:', error);
            alert('An error occurred. Please try again.');
        }
    }

    // user register
    async register(username, password) {
        try {
            const response = await fetch('/api/user/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
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
            await this.login(username, password)
        } catch (error) {
            console.error('Error during registration:', error)
            alert('An error occurred. Please try again.')
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
            console.log("Data has been fetched");
            const books = await response.json();
            userData.library = books.map(book => ({
                id: book.book_id,
                title: book.book_title,
                author: book.author_name,
                coverUrl: book.book_image,
                status: book.book_status,
                userReview: book.review,
                // externalReviews: book.books_reviews
            }));
            console.log("Data has been set to userData.library");
        } catch (error) {
            console.error('Error fetching library:', error);
        }
    }

    // TODO: fetch info. 
    // If info is not personal, then hard coding is acceptable. Can store in database or not.
    async fetchInfo() {

    }

    // TODO: fetch recommendations. 
    // recommend books in database, or outside, or both?
    // recommendation algo is tricky, maybe use a simple approach
    async fetchRecommendations() {

    }

    // search book
    async searchBooks(searchTerm) {
        try {
            const response = await utilsObj.fetchWithAuth(`/api/books/search?term=${encodeURIComponent(searchTerm)}`);
            if (!response.ok) {
                throw new Error('Search failed');
            }
    
            const results = await response.json();
            this.showSearchResults(results);
        } catch (error) {
            console.error('Error searching books:', error);
            alert('Search failed. Please try again.');
        }
    }
    
    showSearchResults(results) {
        const mainContent = document.querySelector('.main-content');
        const searchResults = document.createElement('div');
        searchResults.className = 'search-results';
        
        // Add back button
        searchResults.innerHTML = `
            <div class="search-header">
                <button class="back-to-library">Back to Library</button>
            </div>
            <div class="personal-results">
                <h2>From Your Library</h2>
                <div class="books-grid">
                    ${results.personalResults.map(book => components.renderBookCard(book)).join('')}
                </div>
            </div>
            <div class="general-results">
                <h2>More Books</h2>
                <div class="books-grid">
                    ${results.generalResults.map(book => components.renderBookCard(book)).join('')}
                </div>
            </div>
        `;
    
        // Hide current content and show search results
        mainContent.style.display = 'none';
        mainContent.parentNode.insertBefore(searchResults, mainContent);
    
        // Add back button event listener
        searchResults.querySelector('.back-to-library').addEventListener('click', () => {
            searchResults.remove();
            mainContent.style.display = 'block';
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
        const currentReading = userData.library.filter(book => book.status === 'reading');// not sure if this is right
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
            .map(book => components.renderBookCard(book))
            .join('');
    }

    setupEventListeners() {
        // sidebar toggle event listener
        const menuToggle = document.querySelector('.menu-toggle-button');
        const columnRight = document.querySelector('.column-right');
        
        menuToggle?.addEventListener('click', () => {
            columnRight.classList.toggle('active');
            if (window.innerWidth <= 768) {
                document.body.style.overflow = columnRight.classList.contains('active') ? 'hidden' : 'auto';
            }
        });
        // go to book page by clicking book-card or current-reading-card
        document.addEventListener('click', (e) => {
            const bookCard = e.target.closest('.book-card, .current-reading-card');
            if (bookCard) {
                const bookId = bookCard.dataset.bookId;
                window.location.href = `/book.html?id=${bookId}`;
            }
        });

        // search
        const searchInput = document.querySelector('.search-bar input');
        let searchTimeout;
        
        searchInput?.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const searchTerm = e.target.value.trim();
            
            if (searchTerm.length >= 2) {
                searchTimeout = setTimeout(() => {
                    this.searchBooks(searchTerm);
                }, 300);
            }
        });

        // TODO: 
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new App();
});