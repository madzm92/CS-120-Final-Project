export const components = {
    // main page
    renderBookCard(book) {// maybe make a new one for recommendations
        return `
            <div class="book-card" data-book-id="${book.book_id}">
                <div class="book-cover">
                   <img src="${book.book_image}" alt="${book.book_title}">
                </div>
                <div class="book-title">${book.book_title}</div>
                <div class="book-author">${book.authors}</div>
            </div>
        `;

    },

    renderCurrentReading(book) {
        return `
            <div class="current-reading-card" data-book-id="${book.book_id}">
                <div class="current-reading-cover">
                    <img src="${book.book_image}" alt="${book.book_title}" loading="lazy">
                </div>
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
            </div>
        `
    },

    renderUserReview(book) {
        return `
            <div class="review-item">
                <div class="review-header">
                    <h2>My review on this book.</h2>
                    <button id="editReviewBtn">EDIT MY REVIEW</button>
                </div>
                <div class="review-content-user">
                ${book.review || 'You haven\'t written a review yet.'}
                </div>
            </div>
        `
    },

    renderExternalReview(book) {
        if (!book.reviews) {
            return `<p>No external reviews available</p>`
        }
        return `
            <div class="review-item">
                <div class="review-header">
                    <h2>External Book Review</h2>
                </div>
                <div class="review-content">${book.reviews}</div>
            </div>
            `
        ).join('')
    },

    renderNote(note) {
        note.ps = JSON.parse(note.ps);
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