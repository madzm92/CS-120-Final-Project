const jwt = require('jsonwebtoken');
const { queryWithRetry } = require('../db/config');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // 验证用户是否存在
        const rows = await queryWithRetry(
            'SELECT user_id FROM user_info WHERE user_id = ?',
            [decoded.user_id]
        );

        if (!rows || rows.length === 0) {
            return res.status(401).json({ message: 'User not found' });
        }

        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ message: 'Token expired' });
        }
        console.error('Auth error:', error);
        res.status(403).json({ message: 'Invalid token' });
    }
};

module.exports = auth;