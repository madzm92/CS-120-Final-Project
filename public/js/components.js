export const components = {
    // main page
    renderBookCard(book) {
        return `
            <div class="book-card" data-book-id="${book.book_id}">
                <div class="book-cover">
                   <img src="${book.book_image}" alt="${book.book_title}">
                </div>
                <div class="book-info">
                    <div class="book-title">${book.book_title}</div>
                    <div class="book-author">${book.authors}</div>
                </div>
            </div>
        `;
    },
    

    renderCurrentReading(book) {
        return `
            <div class="current-reading-card" data-book-id="${book.book_id}">
                <div class="current-reading-cover">
                    <img src="${book.book_image}" alt="${book.book_title}" loading="lazy">
                </div>
                <div class="current-reading-title">${book.book_title}</div>
                <div class="current-reading-author">${book.authors}</div>
            </div>
        `;
    },
    
    // book page
    renderInfoItem(info) {
        return `
            <div class="info-item" data-type="${info.type.toLowerCase()}">
                <div class="info-title">${info.title}</div>

            </div>
        `;
    },

    renderRecommendationCard(book) {
        return `
            <div class="recommendation-card" data-book-id="${book.book_id}">
                <div class="recommendation-cover">
                    <img src="${book.book_image}" alt="${book.book_title}">
                </div>
                <div class="recommendation-info">
                    <div class="recommendation-title">${book.book_title}</div>
                    <div class="recommendation-author">${book.authors}</div>
                </div>
            </div>
        `;
    },

    renderPageBook(book){
        return `
            <div class="pagebook-card" data-book-id="${book.book_id}">
                <div class="pagebook-cover">
                   <img src="${book.book_image}" alt="${book.book_title}">
                </div>
                <div class="pagebook-title">${book.book_title}</div>
                <div class="pagebook-author">${book.authors}</div>
                <div class="pagebook-description">Summary: ${book.description || 'No description available.'}</div>
            </div>
        `
    },

    renderUserReview(book) {
        return `
            <div class="review-item">
                <div class="review-header">
                    <h2>My Review</h2>
                </div>
                <div class="review-content-user">
                ${book.review || 'You haven\'t written a review yet.'}
                    <div class="center-button-container">
                    <button id="editReviewBtn">EDIT MY REVIEW</button>
                    </div>
                </div>
            </div>
        `
    },

    renderExternalReview(book) {
        if (!book.reviews || book.reviews.length === 0) {
            return `<div class="center-button-container"><p>No external reviews available.</p></div>`;
        }
    
        return `
            <div class="review-item">
                <div class="review-header">
                    <h2>External Book Review</h2>
                </div>
                <div class="review-content">${book.reviews[0]}</div>
                ${book.reviews.length > 1 ? 
                    `<button id="viewAllReviews">View All Reviews (${book.reviews.length})</button>` 
                    : ''
                }
            </div>
        `;
    },

    renderNote(note) {
        let psSpans = '';
        if (Array.isArray(note.ps) && note.ps.length > 0) {
            psSpans = note.ps.map(ps => `<div class="note-ps">${ps}</div>`).join('');
        }
    
        return `
            <div class="note-card" data-note-id="${note.note_id}" data-note-content="${encodeURIComponent(note.note_text)}" data-note-ps='${JSON.stringify(note.ps)}'>
                <div class="note-content">${note.note_text}</div>
                ${psSpans ? `<div class="note-ps-container">${psSpans}</div>` : ''}
            </div>
        `;
    }
};