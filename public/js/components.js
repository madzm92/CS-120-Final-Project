const components = {
    // main page
    renderBookCard(book) {// maybe make a new one for recommendations
        return `
            <div class="book-card" data-book-id="${book.id}">
                <div class="book-cover">
                   <img src="${book.coverUrl}" alt="${book.title}">
                </div>
                <div class="book-title">${book.title}</div>
                <div class="book-author">${book.author}</div>
            </div>
        `;

    },

    renderCurrentReading(book) {
        return `
            <div class="current-reading-card" data-book-id="${book.id}">
                <div class="current-reading-cover">
                    <img src="${book.coverUrl}" alt="${book.title}" loading="lazy">
                </div>
            </div>
        `;
    },
    
    // book page
    renderInfoItem(info) {
        return `
            <div class="info-item">
                <div class="info-title">${info.title}</div>
                <div class="info-content">${info.content}</div>
            </div>
        `;
    },

    renderPageBook(book){
        return `
            <div class="pagebook-card" data-book-id="${book.id}">
                <div class="pagebook-cover">
                   <img src="${book.coverUrl}" alt="${book.title}">
                </div>
                <div class="pagebook-title">${book.title}</div>
                <div class="pagebook-author">${book.author}</div>
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
                ${book.review}|| 'You haven\'t written a review yet.'
                </div>
            </div>
        `
    },

    renderExternalReview(book) {
        if (!book.externalReviews) {
            return `<p>No external reviews available</p>`
        }
        return book.externalReviews.map(review => 
            `
            <div class="review-item">
                <div class="review-header">
                    <h2>${review.title}</h2>
                    <div class="review-author">${review.author}</div>
                </div>
                <div class="review-content">${review.value}</div>
            </div>
            `
        ).join('')
    }
};