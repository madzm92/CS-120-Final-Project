class App {
    constructor() {
        this.init();
    }

    async init() {
        this.loadCurrentReading();
        this.loadLibrary();
        this.loadInfo();
        this.loadRecommendations();
        this.setupEventListeners();
    }

    loadCurrentReading() {
        const container = document.getElementById('currentReadingContainer');
        container.innerHTML = sampleData.currentReading
            .map(book => components.renderCurrentReading(book))
            .join('');
    }

    loadLibrary() {
        const container = document.getElementById('libraryContainer');
        container.innerHTML = sampleData.library
            .map(book => components.renderBookCard(book))
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