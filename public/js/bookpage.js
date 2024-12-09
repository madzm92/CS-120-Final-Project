import { utilsObj } from "./utilsObj.js";
import { userData } from "./data.js";
import { components } from "./components.js";

class BookPage {
    constructor() {
        this.bookId = new URLSearchParams(window.location.search).get('id');
        this.bookData = null;
        this.isInUserLibrary = false;
        this.init();
    }

    async init() {
        try {
            // first, check library_personal
            const response = await utilsObj.fetchWithAuth(`/api/books/library`);
            if (!response) return;
            const books = await response.json();
            userData.library = books;
            
            this.bookData = books.find(book => book.book_id === parseInt(this.bookId));
            this.isInUserLibrary = !!this.bookData;

            if (this.isInUserLibrary) {
                // in library_personal, load it
                this.loadBook();
                this.loadUserReview();
                await this.loadNotes();
            } else {
                // not in library_personal, query library_general
                await this.fetchBookDetails();
                this.loadBook();
            }

            this.loadExternalReviews();
            this.setupEventListeners();
        } catch (error) {
            console.error('Error initializing book page:', error);
            this.renderErrorPage();
        }
    }

    // fetch book that is not stored in userData
    async fetchBookDetails() {
        try {
            // check library_general
            const response = await fetch(`/api/books/general/${this.bookId}`);
            if (response.ok) {
                this.bookData = await response.json();
                return;
            }
            
            // if not in db, need fetch from external api
            // const externalBook = await this.fetchFromExternalAPI();
            // if (externalBook) {
            //     this.renderExternalBookPage();
            // }

        } catch (error) {
            console.error('Error fetching book details:', error);
            this.renderErrorPage();
        }
    }


    loadBook() {
        const bookCard = document.getElementById('bookCard');
        if (!this.bookData) {
            bookCard.innerHTML = '<p>Book not found</p>';
            return;
        }

        bookCard.innerHTML = components.renderPageBook(this.bookData);
    }
    
    loadUserReview() {
        const container = document.getElementById("userReview");
        container.innerHTML = components.renderUserReview(this.bookData);
    }


    loadExternalReviews() {
        const container = document.getElementById("externalReviews");
        container.innerHTML = components.renderExternalReview(this.bookData);
    }

    async loadNotes() {
        try {
            const res = await utilsObj.fetchWithAuth(`/api/books/${this.bookId}/notes`);
            if (!res) return;
            const notes = await res.json();
            const container = document.getElementById("userNotes");
            container.innerHTML = notes.map(note => 
                components.renderNote(note)
            ).join('');
        } catch (error) {
            console.error("Error loading notes:", error)
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
        const currentReview = this.bookData.review || '';

        const { value: newReview } = await Swal.fire({
            title: 'Edit Your Review',
            input: 'textarea',
            inputLabel: 'Your Review',
            inputValue: currentReview,
            showCancelButton: true,
            inputPlaceholder: 'Write your review here...',
            confirmButtonText: 'Save',
            width: '90%',  
            padding: '2em', 
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
                this.bookData.review = newReview;
                this.loadUserReview();
                document.getElementById('editReviewBtn')?.addEventListener('click', () => {
                    this.changeReview();
                });
                Swal.fire('Success', 'Your review has been updated!', 'success');
            } catch (error) {
                console.error('Error updating review:', error);
                Swal.fire('Error', 'Failed to update review. Please try again.', 'error');
            }
        }
    }

    // show all external reviews
    async showAllReviews() {
        if (!this.bookData.reviews || this.bookData.reviews.length === 0) {
            Swal.fire('No Reviews', 'No external reviews available for this book.', 'info');
            return;
        }
    
        const reviewsHtml = this.bookData.reviews.map(reviewText => `
            <div class="review-item">
                <div class="review-content">${reviewText}</div>
            </div>
        `).join('<hr>');
    
        Swal.fire({
            title: 'All Reviews',
            html: `<div class="all-reviews-container">${reviewsHtml}</div>`,
            width: '80%',
            showCloseButton: true,
            showConfirmButton: false,
            customClass: {
                container: 'all-reviews-modal',
                htmlContainer: 'reviews-modal-content'
            }
        });
    }
    
    // add note
    async addNote() {
        const { value: formValues } = await Swal.fire({
            title: 'Add New Note',
            html: `
                <div class="edit-note-container">
                    <textarea id="swal-note-content" class="swal2-textarea" placeholder="Enter your note"></textarea>
                    <div id="ps-container" class="ps-edit-container">
                        <div class="ps-input-group">
                            <input type="text" class="swal-ps-input" placeholder="PS (optional)">
                            <button type="button" class="delete-ps-btn">×</button>
                        </div>
                    </div>
                </div>
                <button id="add-ps" type="button">Add Another PS</button>
            `,
            focusConfirm: false,
            showCancelButton: true,
            didOpen: () => {
                document.getElementById('add-ps').addEventListener('click', () => {
                    const psContainer = document.getElementById('ps-container');
                    const psGroup = document.createElement('div');
                    psGroup.className = 'ps-input-group';
                    psGroup.innerHTML = `
                        <input type="text" class="swal-ps-input" placeholder="PS">
                        <button type="button" class="delete-ps-btn">×</button>
                    `;
                    psContainer.appendChild(psGroup);
                });
            
                document.getElementById('ps-container').addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete-ps-btn')) {
                        e.target.closest('.ps-input-group').remove();
                    }
                });
            },
            preConfirm: () => {
                const content = document.getElementById('swal-note-content').value.trim();
                const psInputs = document.querySelectorAll('.swal-ps-input');
                const psArray = Array.from(psInputs)
                    .map(input => input.value.trim())
                    .filter(ps => ps);
        
                if (!content) {
                    Swal.showValidationMessage('Note content cannot be empty!');
                    return false;
                }
        
                return {
                    content: content,
                    ps: psArray
                };
            }
        });
    
        if (formValues) {
            try {
                const response = await utilsObj.fetchWithAuth(`/api/books/${this.bookId}/notes`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        content: formValues.content,
                        ps: formValues.ps
                    })
                });
                
                if (response.ok) {
                    Swal.fire('Success', 'Note added successfully!', 'success');
                    await this.loadNotes();
                }
            } catch (error) {
                console.error('Error adding note:', error);
                Swal.fire('Error', 'Failed to add note', 'error');
            }
        }
    }

    // edit note
    async editNote(noteId, currentContent, currentPs) {
        const { value: formValues } = await Swal.fire({
            title: 'Edit Note',
            html: `
                <div class="edit-note-container">
                    <textarea id="swal-note-content" class="swal2-textarea note-edit-textarea">${currentContent}</textarea>
                    <div id="ps-container" class="ps-edit-container">
                        ${currentPs.map(ps => `
                            <div class="ps-input-group">
                                <input type="text" class="swal-ps-input" value="${ps}">
                                <button type="button" class="delete-ps-btn">×</button>
                            </div>
                        `).join('')}
                    </div>
                    <button id="add-ps" type="button" class="add-ps-btn">Add Another PS</button>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            didOpen: () => {
                document.getElementById('add-ps').addEventListener('click', () => {
                    const psContainer = document.getElementById('ps-container');
                    const psGroup = document.createElement('div');
                    psGroup.className = 'ps-input-group';
                    psGroup.innerHTML = `
                        <input type="text" class="swal-ps-input" placeholder="PS">
                        <button type="button" class="delete-ps-btn">x</button>
                    `;
                    psContainer.appendChild(psGroup);
                });
            
                document.getElementById('ps-container').addEventListener('click', (e) => {
                    if (e.target.classList.contains('delete-ps-btn')) {
                        e.target.closest('.ps-input-group').remove();
                    }
                });
            },
            preConfirm: () => {
                const content = document.getElementById('swal-note-content').value.trim();
                const psInputs = document.querySelectorAll('.swal-ps-input');
                const psArray = Array.from(psInputs)
                    .map(input => input.value.trim())
                    .filter(ps => ps);
    
                if (!content) {
                    Swal.showValidationMessage('Note content cannot be empty!');
                    return false;
                }
    
                return {
                    content: content,
                    ps: psArray
                };
            }
        });
    
        if (formValues) {
            try {
                const response = await utilsObj.fetchWithAuth(
                    `/api/books/${this.bookId}/notes/${noteId}`,
                    {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(formValues)
                    }
                );
    
                if (response.ok) {
                    await this.loadNotes();
                    Swal.fire('Success', 'Note updated successfully!', 'success');
                }
            } catch (error) {
                console.error('Error updating note:', error);
                Swal.fire('Error', 'Failed to update note', 'error');
            }
        }
    }
    
    // delete note
    async deleteNote(noteId) {
        const result = await Swal.fire({
            title: 'Delete Note',
            text: 'Are you sure you want to delete this note?',
            icon: 'warning',
            showCancelButton: true,
            confirmButtonColor: '#d33',
            confirmButtonText: 'Delete'
        });
    
        if (result.isConfirmed) {
            try {
                const response = await utilsObj.fetchWithAuth(
                    `/api/books/${this.bookId}/notes/${noteId}`,
                    { method: 'DELETE' }
                );
    
                if (response.ok) {
                    await this.loadNotes();
                    Swal.fire('Deleted!', 'Your note has been deleted.', 'success');
                }
            } catch (error) {
                console.error('Error deleting note:', error);
                Swal.fire('Error', 'Failed to delete note', 'error');
            }
        }
    }

    setupEventListeners() {
        // back button nav to prev search 
        document.getElementById('backButton').addEventListener('click', (e) => {
            e.preventDefault();
            const params = new URLSearchParams(window.location.search);
            const fromSearch = params.get('from_search');
            if (fromSearch) {
                window.location.href = `/?search=${encodeURIComponent(fromSearch)}`;
            } else {
                window.location.href = '/';
            }
        });
    
        const addToLibraryBtn = document.getElementById('addToLibraryBtn');
        const changeStatus = document.getElementById('changeStatus');

        const noteToggleBtn = document.getElementById('noteToggleBtn');
        const notesSection = document.getElementById('notesSection');
        const overlay = document.getElementById('overlay');

        noteToggleBtn.style.display = 'none';

        // show all external reviews
        document.getElementById('viewAllReviews')?.addEventListener('click', () => {
            this.showAllReviews();
        });
        if (this.isInUserLibrary) {
            // Book is in the user's library
            addToLibraryBtn.style.display = 'none';
            changeStatus.style.display = 'block';

            noteToggleBtn.style.display = 'block';  
            notesSection.classList.add('active');
            overlay.classList.add('active');

            document.getElementById('readingStatus').value = this.bookData.book_status;
            document.getElementById('readingStatus')?.addEventListener('change', async (event) => {
                try {
                    await this.changeReadingStatus(event.target.value);
                } catch (error) {
                    console.error('Error changing status:', error);
                }
            });
    
            // Edit review
            document.getElementById('editReviewBtn')?.addEventListener('click', () => {
                this.changeReview();
            });
    

            // note toggle            
            noteToggleBtn?.addEventListener('click', () => {
                notesSection.classList.toggle('active');
                overlay.classList.toggle('active');
            });

            // click overlay to close notes
            overlay?.addEventListener('click', () => {
                notesSection.classList.remove('active');
                overlay.classList.remove('active');
            });

            // add note
            const addNoteBtn = document.getElementById('addNoteBtn');
            addNoteBtn.addEventListener('click', () => this.addNote());
    
            // View and edit note
            document.getElementById('userNotes').addEventListener('click', async (e) => {
                const noteCard = e.target.closest('.note-card');
                if (!noteCard) return;
    
                const noteId = noteCard.dataset.noteId;
                const content = decodeURIComponent(noteCard.dataset.noteContent);
                const ps = JSON.parse(noteCard.dataset.notePs);
    
                const result = await Swal.fire({
                    title: 'Note Options',
                    showDenyButton: true,
                    showCancelButton: true,
                    confirmButtonText: 'Edit',
                    denyButtonText: 'Delete',
                    width: '80%',
                    padding: '1em',
                    customClass: {
                        container: 'edit-note-modal-container',
                        popup: 'edit-note-modal-popup'
                    }
                });
    
                if (result.isConfirmed) {
                    await this.editNote(noteId, content, ps);
                } else if (result.isDenied) {
                    await this.deleteNote(noteId);
                }
            });
        } else {
            // Book is not in the user's library
            addToLibraryBtn.style.display = 'block';
            changeStatus.style.display = 'none';

            notesSection.style.display = "none";
            document.getElementById('addToLibraryBtn')?.addEventListener('click', () => {
                this.addToUserLibrary();
            });
        }
    
        // Show all external reviews
        document.getElementById('viewAllReviews')?.addEventListener('click', () => {
            this.showAllReviews();
        });
    }    


}

const bookPage = new BookPage();