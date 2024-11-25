const jwt = require('jsonwebtoken');
const pool = require('../db/config');
// 
const auth = async (req, res, next) => {
    try {
        // extract token from header
        // Authorization: Bearer <token>
        const token = req.header('Authorization')?.replace('Bearer ', '');
        if (!token) {
            return res.status(401).json({ message: 'Authorization token required' });
        }

        // verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        } catch (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        const result = await pool.query(
            'SELECT * FROM user_info WHERE user_id = $1',
            [decoded.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ message: 'User does not exist' });
        }

        req.user = result.rows[0];
        next();
    } catch (error) {
        console.error('Authentication error:', error.message);
        res.status(500).json({ message: 'Internal server error' });
    }
};

module.exports = auth;