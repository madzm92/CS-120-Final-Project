class BookPage {
    constructor() {
        this.bookId = new URLSearchParams(window.location.search).get('id');
        this.bookData = null;
        this.isInUserLibrary = false;
        this.init();
    }

    async init() {
        this.bookData = userData.library.find(book => book.id === parseInt(this.bookId));
        this.isInUserLibrary = !!this.bookData;

        if (this.isInUserLibrary) {
            // book in user library, just render it
            this.renderUserBookPage();
        } else {
            // not in user library, check further from db
            await this.fetchBookDetails();
        }
        this.setupEventListeners();
    }

    async fetchBookDetails() {
        try {
            // check library_general
            const response = await fetch(`/api/books/general/${this.bookId}`);
            if (response.ok) {
                this.bookData = await response.json();
                this.renderGeneralBookPage();
                return;
            }

            // if not in db, need fetch from external api
            const externalBook = await this.fetchFromExternalAPI();
            if (externalBook) {
                this.renderExternalBookPage();
            }

        } catch (error) {
            console.error('Error fetching book details:', error);
            this.renderErrorPage();
        }
    }

    // TODO: fetch from external api
    async fetchFromExternalAPI() {

    }

    // TODO: load content to book page
    renderUserBookPage() {

    }

    renderGeneralBookPage() {
        
    }

    renderExternalBookPage() {

    }


    setupEventListeners() {
        if (this.isInUserLibrary) {
            // if book in library_user, some actions are not avaliable
            // need to modify appearance of these buttons
            document.getElementById('addNoteBtn')?.addEventListener('click', () => {
                this.addNote();
            });
            document.getElementById('changeStatusBtn')?.addEventListener('click', () => {
                this.changeReadingStatus();
            });
            document.getElementById('changeReviewBtn')?.addEventListener('click', () => {
                this.changeReview();
            });
        } else {
            // if not, show different actions
            document.getElementById('addToLibraryBtn')?.addEventListener('click', () => {
                this.addToUserLibrary();
            });
        }
    }

    // TODO: button actions for a book
    async addToUserLibrary() {

    }
    
    async addNote() {

    }

    async changeReadingStatus() {

    }

    async changeReview() {

    }

}