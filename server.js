require('dotenv').config();
const pool = require("./db/config");
const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken")
const auth = require("./middleware/auth");
const app = express();
app.use(express.json()); // middleware to parse all json requests to req

// testing purpose
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
        const result = await pool.queryPromise(
            'SELECT * FROM user_info WHERE username = ?',
            [username]
        );
        if (result.length === 0) {
            return res.status(401).json({ message: 'User does not exist' })
        }
        if (await bcrypt.compare(password, result[0].password)) {
            const user = result[0]
            // create jwt access token
            const accessToken = jwt.sign(
                { user_id: user.user_id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '5h' }
            );

            const refreshToken = jwt.sign(
                { user_id: user.user_id },
                process.env.REFRESH_TOKEN_SECRET,
                { expiresIn: '7d' }
            )
            // store refresh token in database
            await pool.queryPromise(
                'INSERT INTO refresh_tokens (user_id, refresh_token, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY))',
                [user.user_id, refreshToken]
            )
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
        const result = await pool.queryPromise(
            'SELECT * FROM refresh_tokens WHERE refresh_token = ? AND user_id = ? AND expires_at > NOW()',
            [refreshToken, decoded.user_id]
        );
        if (result.length === 0) {
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
        await pool.queryPromise(
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
        const existingUser = await pool.queryPromise(
            'SELECT * FROM user_info WHERE username = ?',
            [username]
        );
        if (existingUser.length > 0) {
            return res.status(400).json({ message: 'Username already exists' });
        }
        const hashedPassword = await bcrypt.hash(password, 10)
        // Create new user
        const result = await pool.queryPromise(
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
        const result = await pool.queryPromise(
            `SELECT lg.*, lp.book_status, lp.review , a.author_name
             FROM library_general AS lg
             JOIN library_personal AS lp ON lg.book_id = lp.book_id
             JOIN authors as a ON lg.isbn = a.isbn
             WHERE lp.user_id = ?`,
            [req.user.user_id]
        );
        res.json(result)
    } catch (error) {
        console.error('Database error:', error)
        res.status(500).json({ message: 'Internal server error' })
    }
})

// fetch certain book in library_general but not in library_user
app.get('/api/books/general/:id', async (req, res) => {
    try {
        const bookId = req.params.id;
        
        const result = await pool.queryPromise(
            `SELECT lg.*, 
                    GROUP_CONCAT(a.author SEPARATOR ', ') AS authors
             FROM library_general AS lg
             JOIN authors AS a
             ON lg.isbn = a.isbn
             WHERE lg.book_id = ?
             GROUP BY lg.book_id`,
            [bookId]
        );

        if (result.length === 0) {
            return res.status(404).json({ message: 'Book not found' });
        }

        // get review
        const reviewsResult = await pool.queryPromise(
            `TBD`,
            [bookId]
        );

        const bookData = {
            ...result[0],
            reviews: reviewsResult
        };

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
        // First check if book exists in library_general
        const bookExists = await pool.query(
            'SELECT * FROM library_general WHERE book_id = $1',
            [book.id]
        );
        if (bookExists.rows.length === 0) {
            // not in library_general, then it's a external book
            // MIGHTDO: handle external book, add it to library_general
            await pool.query(
                'TBD'
            )
            // if not handle external book, do this
            res.status(404).json({ message: "Book not found in our database" });
        }

        // Add to library_personal
        // TODO: check for correctness
        await pool.query(
            'INSERT INTO library_personal (user_id, book_id, book_status) VALUES ($1, $2, $3)',
            [req.user.user_id, book.id, "plan_to_read"]
        );
        res.status(201).json({ message: 'Book added to library successfully' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
})

// change reading status of a book
app.put('api/books/status', auth, async (req, res) => {
    try {
        const { bookId, newStatus } = req.body;
        const result = await pool.query(// TODO: check for correctness
            'UPDATE library_personal SET book_status = $1 WHERE user_id = $2 AND book_id = $3 RETURNING *',
            [newStatus, req.user.user_id, bookId]
        );
        if (result.rows.length === 0) {
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
        const result = await pool.query(// TODO: check for correctness
            'UPDATE library_personal SET review = $1 WHERE user_id = $2 AND book_id = $3 RETURNING *',
            [review, req.user.user_id, bookId]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ message: 'Book not found in your library' });
        }

        res.json({ message: 'Review updated successfully' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// Search books in both library_personal and library_general
// AI generated need to check later
app.get('/api/books/search', auth, async (req, res) => {
    try {
        const searchTerm = req.query.term;
        if (!searchTerm) {
            return res.status(400).json({ message: 'Search term is required' });
        }

        // Search in user's personal library. 
        const personalResults = await pool.query(
            `SELECT lg.*, lp.book_status, lp.review
            FROM library_general lg
            JOIN library_personal lp ON lg.book_id = lp.book_id
            WHERE lp.user_id = $1 
            AND (LOWER(lg.book_title) LIKE LOWER($2) 
            OR EXISTS (
                SELECT 1 FROM authors a 
                WHERE a.isbn = lg.isbn 
                AND LOWER(a.author) LIKE LOWER($2)
                ))`,
                [req.user.user_id, `%${searchTerm}%`]
            );
            
        // Search in general library (excluding books in personal library)
        const generalResults = await pool.query(
            `SELECT lg.*, string_agg(a.author, ', ') as authors
             FROM library_general lg
             LEFT JOIN authors a ON lg.isbn = a.isbn
             WHERE lg.book_id NOT IN (
                SELECT book_id FROM library_personal WHERE user_id = $1
             )
             AND (LOWER(lg.book_title) LIKE LOWER($2)
                  OR EXISTS (
                    SELECT 1 FROM authors a 
                    WHERE a.isbn = lg.isbn 
                    AND LOWER(a.author) LIKE LOWER($2)
                  ))
             GROUP BY lg.book_id`,
            [req.user.user_id, `%${searchTerm}%`]
        );

        res.json({
            personalResults: personalResults.rows,
            generalResults: generalResults.rows
        });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});


// TODO: add a note to current book

// TODO: implement info section if info stored in db

// TODO: implement recommendation if recommendation stored in db


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

pool.query('SELECT NOW()', (err, res) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Database connected successfully');
    }
});