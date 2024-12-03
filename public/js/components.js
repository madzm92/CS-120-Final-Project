const components = {
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

    renderInfoItem(info) {
        return `
            <div class="info-item">
                <div class="info-title">${info.title}</div>
                <div class="info-content">${info.content}</div>
            </div>
        `;
    }
};