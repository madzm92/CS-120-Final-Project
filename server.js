require('dotenv').config();
const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken");
const auth = require("./middleware/auth");
const { queryWithRetry } = require('./db/config'); // Import query utility
const app = express();

app.use(express.json()); // Middleware to parse all JSON requests to req

// Serve static files (for testing purposes)
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

// user login, verify info on server, then send access token
app.post('/api/user/login', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    try {
        // Query user information
        const result = await queryWithRetry(
            'SELECT * FROM user_info WHERE username = ?',
            [username]
        );
        if (!result || result.length === 0) {
            return res.status(401).json({ message: 'User does not exist' });
        }

        // Verify password
        if (await bcrypt.compare(password, result[0].password)) {
            const user = result[0];
            
            // Create JWT tokens
            const accessToken = jwt.sign(
                { user_id: user.user_id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '5h' }
            );
            const refreshToken = jwt.sign(
                { user_id: user.user_id },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '7d' }
            );

            // Store refresh token in database
            await queryWithRetry(
                'INSERT INTO refresh_tokens (user_id, refresh_token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
                [user.user_id, refreshToken]
            );

            res.json({
                message: 'Login successful',
                accessToken,
                refreshToken
            });
        } else {
            return res.status(401).json({ message: 'Invalid username or password' });
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// refresh access token
app.post('/api/token/refresh', async (req, res) => {
    const { refreshToken } = req.body;
    try {
        if (refreshToken === null) return res.status(401).json({ message: 'Refresh token is required' })
        // verify refresh token
        const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);

        // check if refresh token is valid in database
        const rows = await queryWithRetry(
            'SELECT * FROM refresh_tokens WHERE refresh_token = ? AND user_id = ? AND expires_at > NOW()',
            [refreshToken, decoded.user_id]
        );
        if (!rows || rows.length === 0) {
            return res.status(403).json({ message: 'Invalid refresh token' });
        }
        // refresh access token
        const nxtAccessToken = jwt.sign(
            { user_id: decoded.user_id },
            process.env.ACCESS_TOKEN_SECRET,
            { expiresIn: '5h'}
        )
        res.json(nxtAccessToken)
    } catch (error) {
        console.error("Can't refresh access token:", error);
        res.status(403).json({ message: "Refreshing access token failed"})
    }
})

// logout, delete refresh token from db
app.post('/api/user/logout', auth, async (req, res) => {
    try {
        const refreshToken = req.body.refreshToken
        await queryWithRetry(
            'DELETE FROM refresh_tokens WHERE refresh_token = ?',
            [refreshToken]
        )
        res.json({ message: 'Logged out successfully' })
    } catch (error) {
        console.error('Logout error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

// user registration
app.post('/api/user/register', async (req, res) => {
    const { username, password } = req.body
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' })
    }
    try {
        // Check if username already exists
        const existingRows = await queryWithRetry(
            'SELECT * FROM user_info WHERE username = ?',
            [username]
        );
        if (existingRows.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        // Create new user
        const result = await queryWithRetry(
            'INSERT INTO user_info (username, password) VALUES (?, ?)',
            [username, hashedPassword]
        );
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Database error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

// get user's library
app.get('/api/books/library', auth, async (req, res) => {
    try {
        if (!req.user || !req.user.user_id) {
            console.error('User not properly authenticated');
            return res.status(401).json({ message: 'Authentication required' });
        }

        console.log('Fetching library for user:', req.user.user_id);
        
        const books = await queryWithRetry(
            `SELECT lg.*, 
                    lp.book_status, 
                    lp.review, 
                    GROUP_CONCAT(DISTINCT a.author_name SEPARATOR ', ') as authors,
                    GROUP_CONCAT(DISTINCT br.review_text) as reviews
             FROM library_general lg
             JOIN library_personal lp ON lg.book_id = lp.book_id
             LEFT JOIN authors a ON lg.isbn = a.isbn
             LEFT JOIN book_reviews br ON lg.isbn = br.isbn
             WHERE lp.user_id = ?
             GROUP BY lg.book_id`,
            [req.user.user_id]
        );
        
        // handle external reviews
        const processedBooks = books.map(book => ({
            ...book,
            reviews: book.reviews ? book.reviews.split(',') : []
        }));
        
        res.json(processedBooks);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            details: error.message 
        });
    }
});

// fetch info section
app.get('/api/info', async (req, res) => {
    try {
        const info = await queryWithRetry(
            'SELECT * FROM info ORDER BY created_at DESC LIMIT 5'
        );
        res.json(info);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// fetch recommendations based on user's library
app.get('/api/books/recommendations', auth, async (req, res) => {
    try {
        const recommendations = await queryWithRetry(
            `SELECT DISTINCT lg.*, GROUP_CONCAT(a.author_name SEPARATOR ', ') as authors
             FROM library_general lg
             LEFT JOIN authors a ON lg.isbn = a.isbn
             WHERE lg.book_id NOT IN (
                SELECT book_id FROM library_personal WHERE user_id = ?
             )
             AND (
                lg.genre IN (
                    SELECT DISTINCT lg2.genre 
                    FROM library_personal lp
                    JOIN library_general lg2 ON lp.book_id = lg2.book_id
                    WHERE lp.user_id = ?
                )
                OR
                lg.isbn IN (
                    SELECT DISTINCT lg2.isbn
                    FROM library_personal lp
                    JOIN library_general lg2 ON lp.book_id = lg2.book_id
                    JOIN authors a2 ON lg2.isbn = a2.isbn
                    WHERE lp.user_id = ?
                )
             )
             GROUP BY lg.book_id
             LIMIT 10`,
            [req.user.user_id, req.user.user_id, req.user.user_id]
        );
        res.json(recommendations);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// fetch certain book in library_general but not in library_user
app.get('/api/books/general/:id', async (req, res) => {
    try {
        const bookId = req.params.id;
        console.log('Fetching book with ID:', bookId);
        
        const rows = await queryWithRetry(
            `SELECT lg.*, 
                    GROUP_CONCAT(DISTINCT a.author_name SEPARATOR ', ') AS authors,
                    GROUP_CONCAT(DISTINCT br.review_text) AS reviews
             FROM library_general AS lg
             LEFT JOIN authors a ON lg.isbn = a.isbn
             LEFT JOIN book_reviews br ON lg.isbn = br.isbn
             WHERE lg.book_id = ?
             GROUP BY lg.book_id`,
            [bookId]
        );

        if (!rows || rows.length === 0) {
            console.log('No book found with ID:', bookId);
            return res.status(404).json({ message: 'Book not found' });
        }

        const reviewsResult = await queryWithRetry(
            `SELECT review_text as reviews
             FROM book_reviews
             WHERE isbn = ?`,
            [rows[0].isbn]
        );

        const reviews = reviewsResult.map(review => review.review_text);

        // Combine book details and reviews
        const bookData = {
            ...rows[0],
            reviews: rows[0].reviews ? rows[0].reviews.split(',') : [],
            book_status: null,  
            review: null       
        };

        console.log('Sending book data:', bookData);
        res.json(bookData);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// add a book to user library
app.post('/api/books/library', auth, async (req, res) => {
    try {
        const book = req.body.book;
        await queryWithRetry(
            'INSERT INTO library_personal (user_id, book_id, book_status) VALUES (?, ?, ?)',
            [req.user.user_id, book.book_id, "Not Started"]
        );
        res.status(201).json({ message: 'Book added to library successfully' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
})

// change reading status of a book
app.put('/api/books/status', auth, async (req, res) => {
    try {
        const { bookId, newStatus } = req.body;
        const result = await queryWithRetry(
            'UPDATE library_personal SET book_status = ? WHERE user_id = ? AND book_id = ?',
            [newStatus, req.user.user_id, bookId]
        );
        if (!result || result.affectedRows === 0) {
            return res.status(404).json({ message: 'Book not found in your library' });
        }
        res.json({ message: 'Status updated successfully' });

    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }   
    
})

// change user's review on this book
app.put('/api/books/review', auth, async (req, res) => {
    try {
        const { bookId, review } = req.body;
        const result = await queryWithRetry(
            'UPDATE library_personal SET review = ? WHERE user_id = ? AND book_id = ?',
            [review, req.user.user_id, bookId]
        );

        if (!result || result.affectedRows === 0) {
            return res.status(404).json({ message: 'Book not found in your library' });
        }

        res.json({ message: 'Review updated successfully' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Search books in both library_personal and library_general
app.get('/api/books/search', auth, async (req, res) => {
    try {
        const searchTerm = req.query.term;
        if (!searchTerm) {
            return res.status(400).json({ message: 'Search term is required' });
        }

        console.log('Searching for term:', searchTerm);

        // Search in user's personal library
        const personalResults = await queryWithRetry(
            `SELECT lg.*, lp.book_status, lp.review, GROUP_CONCAT(a.author_name SEPARATOR ', ') as authors
            FROM library_general lg
            JOIN library_personal lp ON lg.book_id = lp.book_id
            LEFT JOIN authors a ON lg.isbn = a.isbn
            WHERE lp.user_id = ? 
            AND (LOWER(lg.book_title) LIKE LOWER(?) 
            OR EXISTS (
                SELECT 1 FROM authors a2 
                WHERE a2.isbn = lg.isbn 
                AND LOWER(a2.author_name) LIKE LOWER(?)
            ))
            GROUP BY lg.book_id`,
            [req.user.user_id, `%${searchTerm}%`, `%${searchTerm}%`]
        );
            
        // Search in general library (excluding books in personal library)
        const generalResults = await queryWithRetry(
            `SELECT lg.*, GROUP_CONCAT(a.author_name SEPARATOR ', ') as authors
             FROM library_general lg
             LEFT JOIN authors a ON lg.isbn = a.isbn
             WHERE lg.book_id NOT IN (
                SELECT book_id FROM library_personal WHERE user_id = ?
             )
             AND (LOWER(lg.book_title) LIKE LOWER(?)
                  OR EXISTS (
                    SELECT 1 FROM authors a2 
                    WHERE a2.isbn = lg.isbn 
                    AND LOWER(a2.author_name) LIKE LOWER(?)
                  ))
             GROUP BY lg.book_id`,
            [req.user.user_id, `%${searchTerm}%`, `%${searchTerm}%`]
        );

        console.log('Search results:', {
            personalResults: personalResults || [],
            generalResults: generalResults || []
        });

        res.json({
            personalResults: personalResults || [],
            generalResults: generalResults || []
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// fetch notes
app.get('/api/books/:bookId/notes', auth, async (req, res) => {
    try {
        const notes = await queryWithRetry(
            `SELECT note_id, note_text, ps 
             FROM book_notes 
             WHERE book_id = ? AND user_id = ?
             ORDER BY note_id DESC`,
            [req.params.bookId, req.user.user_id]
        );

        const processedNotes = notes.map(note => {
            try {
                let psArray;
                if (typeof note.ps === 'string') {
                    psArray = note.ps ? note.ps.split(',') : [];
                } else {
                    psArray = note.ps || [];
                }
                return {
                    ...note,
                    ps: psArray
                };
            } catch (parseError) {
                console.error('Error processing note ps:', parseError);
                console.log('Raw ps value:', note.ps);
                return {
                    ...note,
                    ps: []
                };
            }
        });

        res.json(processedNotes);
    } catch (error) {
        console.error('Error fetching notes:', error);
        res.status(500).json({ message: 'Error fetching notes' });
    }
});

// Add a note to current book
app.post('/api/books/:bookId/notes', auth, async (req, res) => {
    try {
        const { content, ps } = req.body;

        if (!Array.isArray(ps)) {
            return res.status(400).json({ message: '`ps` must be an array' });
        }

        const result = await queryWithRetry(
            `INSERT INTO book_notes (book_id, user_id, note_text, ps) 
             VALUES (?, ?, ?, ?)`,
            [req.params.bookId, req.user.user_id, content, JSON.stringify(ps)]
        );

        res.json({ id: result.insertId, content, ps });
    } catch (error) {
        console.error('Error adding note:', error);
        res.status(500).json({ message: 'Error adding note' });
    }
});

// Edit note
app.put('/api/books/:bookId/notes/:noteId', auth, async (req, res) => {
    try {
        const { content, ps } = req.body;
        
        if (!Array.isArray(ps)) {
            return res.status(400).json({ message: '`ps` must be an array' });
        }

        const result = await queryWithRetry(
            `UPDATE book_notes 
             SET note_text = ?, ps = ?
             WHERE note_id = ? AND book_id = ? AND user_id = ?`,
            [content, JSON.stringify(ps), req.params.noteId, req.params.bookId, req.user.user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Note not found' });
        }

        res.json({ 
            note_id: req.params.noteId,
            note_text: content,
            ps: ps
        });
    } catch (error) {
        console.error('Error updating note:', error);
        res.status(500).json({ message: 'Error updating note' });
    }
});

// Delete note
app.delete('/api/books/:bookId/notes/:noteId', auth, async (req, res) => {
    try {
        const result = await queryWithRetry(
            `DELETE FROM book_notes 
             WHERE note_id = ? AND book_id = ? AND user_id = ?`,
            [req.params.noteId, req.params.bookId, req.user.user_id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Note not found' });
        }

        res.json({ message: 'Note deleted successfully' });
    } catch (error) {
        console.error('Error deleting note:', error);
        res.status(500).json({ message: 'Error deleting note' });
    }
});


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

async function testDbConnection() {
    try {
        const result = await queryWithRetry('SELECT NOW()');
        console.log('Database connected successfully');
    } catch (err) {
        console.error('Database connection error:', err);
    }
}

testDbConnection();