const pool = require("./db/config");
const bcrypt = require("bcrypt");
const express = require("express");
const jwt = require("jsonwebtoken")
require("dotenv").config();
const auth = require("./middleware/auth");
const app = express();
app.use(express.json());

// testing purpose
app.use(express.static('public'));
app.get('/', (req, res) => {
    res.sendFile('index.html', { root: './public' });
});

// user login
// verify info on server, then send access token
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query(
            'SELECT * FROM user_info WHERE username = $1',
            [username]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'User does not exist' })
        }
        if (await bcrypt.compare(password, result.rows[0].password)) {
            const user = result.rows[0]
            const accessToken = jwt.sign(
                { user_id: user.user_id },
                process.env.ACCESS_TOKEN_SECRET,
                { expiresIn: '1h' }
            )
            res.json({ 
                message: 'Login successful',
                accessToken
            })
        } else {
            res.status(401).json({ message: 'Invalid username or password' })
        }
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// user registration
app.post('/api/user/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ message: 'Username and password are required' });
    }
    try {
        const hashedPassword = await bcrypt.hash(password, 10)
        // not sure this is correct 
        const user = await pool.query(
            'INSERT INTO user_info (username, password) VALUES ($1, $2) RETURNING *',
            [username, hashedPassword]
        )
        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
})

// get user's library
app.get('/api/books/library', auth, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT lg.*, lp.book_status 
             FROM library_general lg
             JOIN library_personal lp ON lg.book_id = lp.book_id
             WHERE lp.user_id = $1`,
            [req.user.user_id]
        );
        res.json(result.rows);
    } catch (error) {
        console.error('Database error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
});

// TODO: get current reading by adding a 'last-read' field to books

// TODO: implement info section

// TODO: implement recommendation


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));