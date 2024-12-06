import utilsObj from "./utilsObj";
import Swal from 'sweetalert2';

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
            this.loadBook();
            this.loadUserReview();
        } else {
            // not in user library, check further from library_general
            await this.fetchBookDetails();
            this.loadBook();
        }

        this.loadExternalReviews();
        this.setupEventListeners();
    }

    
    // fetch book that is not stored in userData
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

    loadBook() {
        const container = document.getElementById("bookCard");
        container.innerHTML = components.renderPageBook(this.bookData);
    }
    
    loadUserReview() {
        const container = document.getElementById("userReview");
        container.innerHTML = components.renderUserSection(this.bookData);
    }


    loadExternalReviews() {
        const container = document.getElementById("externalReviews");
        container.innerHTML = components.renderExternalReviews(this.bookData);
    }


    setupEventListeners() {
        const addToLibraryBtn = document.getElementById('addToLibraryBtn');
        const changeStatus = document.getElementById('changeStatus');
        if (this.isInUserLibrary) {
            // if book in library_user, some actions are not avaliable
            // need to modify appearance of these buttons
            addToLibraryBtn.style.display = 'none';
            changeStatus.style.display = 'block';
            
            document.getElementById('addNoteBtn')?.addEventListener('click', () => {
                this.addNote();
            });
            
            document.getElementById('readingStatus').value = this.bookData.status;// check this later
            document.getElementById('readingStatus')?.addEventListener('change', async (event) => {
                try {
                    await changeReadingStatus(event.target.value);
                } catch (error) {
                    console.error('Error changing status:', error);
                }
            });

            document.getElementById('editReviewBtn')?.addEventListener('click', () => {
                this.changeReview();
            });
        } else {
            // if not, show different actions
            addToLibraryBtn.style.display = 'block';
            changeStatus.style.display = 'none';
            document.getElementById('addToLibraryBtn')?.addEventListener('click', () => {
                this.addToUserLibrary();
            });
        }
    }

    // request for add new book to user's library
    async addToUserLibrary() {
        try {
            const response = await utilsObj.fetchWithAuth('/api/books/library', {
                method: 'POST',
                body: JSON.stringify({
                    book: this.bookData,
                })
            })
            if (!response.ok) {
                throw new Error('Failed to add book to library');
            }
            // Update local data
            userData.library.push(this.bookData);
            this.isInUserLibrary = true;
            // Reload page to show user-specific features
            window.location.reload();
        } catch (error) {
            console.error('Error adding book to library:', error);
            alert('Failed to add book to library. Please try again.');
        }
    }

    // request for change reading status
    async changeReadingStatus(newStatus) {
        try {
            const response = await utilsObj.fetchWithAuth('/api/books/status', {
                method: 'PUT',
                body: JSON.stringify({
                    bookId: this.bookId,
                    newStatus
                })
            });
            if (!response.ok) {
                throw new Error('Failed to change status.');
            }
        } catch (error) {
            console.error('Error updating status:', error);
            alert("Failed to change status. Please try again.");
        }
    }
    
    // request for change user's review on a book
    // ai generated for better appearance
    async changeReview() {
        const currentReview = this.bookData.userReview || '';

        const { value: newReview } = await Swal.fire({
            title: 'Edit Your Review',
            input: 'textarea',
            inputLabel: 'Your Review',
            inputValue: currentReview,
            showCancelButton: true,
            inputPlaceholder: 'Write your review here...',
            confirmButtonText: 'Save',
            preConfirm: (review) => {
                if (!review) {
                    Swal.showValidationMessage('Review cannot be empty!');
                }
                return review;
            }
        });

        if (newReview !== undefined) { // clicked save button
            try {
                const response = await utilsObj.fetchWithAuth('/api/books/review', {
                    method: 'PUT',
                    body: JSON.stringify({
                        bookId: this.bookId,
                        review: newReview
                    })
                });

                if (!response.ok) {
                    throw new Error('Failed to update review.');
                }

                // success then update
                this.loadUserReview();

                Swal.fire('Success', 'Your review has been updated!', 'success');
            } catch (error) {
                console.error('Error updating review:', error);
                Swal.fire('Error', 'Failed to update review. Please try again.', 'error');
            }
        }
    }
    
    // TODO: implement add note
    async addNote() {

    }
}