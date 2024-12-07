const jwt = require('jsonwebtoken');
const pool = require('../db/config');

// check if user has a valid access token
const auth = async (req, res, next) => {
    try {
        // extract token from header
        const token = req.header('Authorization')?.replace('Bearer ', '');
        console.log('Received token:', token ? 'exists' : 'missing');
        
        if (!token) {
            return res.status(401).json({ message: 'Authorization token required' });
        }

        // verify token
        let decoded;
        try {
            decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
            console.log('Decoded token:', decoded);
        } catch (err) {
            console.error('Token verification error:', err.message);
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        if (!decoded || !decoded.user_id) {
            console.error('Invalid token payload:', decoded);
            return res.status(403).json({ message: 'Invalid token payload' });
        }

        const rows = await pool.queryPromise(
            'SELECT user_id, username FROM user_info WHERE user_id = ?',
            [decoded.user_id]
        );

        console.log('User query result:', rows);

        if (!rows || rows.length === 0) {
            console.error('User not found:', decoded.user_id);
            return res.status(401).json({ message: 'User does not exist' });
        }

        req.user = rows[0];
        if (!req.user || !req.user.user_id) {
            console.error('Invalid user data:', req.user);
            return res.status(500).json({ message: 'Invalid user data' });
        }

        console.log('Authenticated user:', req.user);
        next();
    } catch (error) {
        console.error('Authentication error:', error);
        res.status(500).json({ 
            message: 'Internal server error in authentication',
            details: error.message 
        });
    }
};

module.exports = auth;