const jwt = require('jsonwebtoken');
const pool = require('../db/config');

const auth = async (req, res, next) => {
    try {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];
        
        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        
        // 验证用户是否存在
        const [rows] = await pool.execute(
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


// const jwt = require('jsonwebtoken');
// const pool = require('../db/config');

// const auth = async (req, res, next) => {
//     try {
//         const accessToken = req.header('Authorization')?.replace('Bearer ', '');
//         const refreshToken = req.cookies?.refreshToken;
        
//         console.log('Received access token:', accessToken ? 'exists' : 'missing');
//         console.log('Received refresh token:', refreshToken ? 'exists' : 'missing');

//         if (!accessToken) {
//             return res.status(401).json({ 
//                 message: 'Authorization token required',
//                 redirect: '/login.html'
//             });
//         }

//         try {
//             // try validate access token
//             const decoded = jwt.verify(accessToken, process.env.ACCESS_TOKEN_SECRET);
//             if (!decoded || !decoded.user_id) {
//                 throw new Error('Invalid token payload');
//             }
            
//             const user = await validateUser(decoded.user_id);
//             req.user = user;
//             next();

//         } catch (err) {
//             // access token validation failed, try using refresh token
//             if (!refreshToken) {
//                 return res.status(401).json({ 
//                     message: 'Session expired',
//                     redirect: '/login.html'
//                 });
//             }

//             try {
//                 // validate refresh token
//                 const decoded = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
                
//                 // check if refresh token is in database
//                 const tokenExists = await pool.queryPromise(
//                     'SELECT * FROM refresh_tokens WHERE user_id = ? AND token = ?',
//                     [decoded.user_id, refreshToken]
//                 );

//                 if (!tokenExists.length) {
//                     return res.status(401).json({ 
//                         message: 'Invalid refresh token',
//                         redirect: '/login.html'
//                     });
//                 }

//                 // validate user
//                 const user = await validateUser(decoded.user_id);

//                 // generate new access token
//                 const newAccessToken = jwt.sign(
//                     { user_id: user.user_id },
//                     process.env.ACCESS_TOKEN_SECRET,
//                     { expiresIn: '2h' }
//                 );

//                 // send new access token to client
//                 res.set('New-Access-Token', newAccessToken);
                
//                 req.user = user;
//                 next();

//             } catch (refreshError) {
//                 // refresh token also expired, need to login again
//                 return res.status(401).json({ 
//                     message: 'Session expired. Please login again.',
//                     redirect: '/login.html'
//                 });
//             }
//         }
//     } catch (error) {
//         console.error('Authentication error:', error);
//         res.status(500).json({ 
//             message: 'Internal server error in authentication',
//             details: error.message 
//         });
//     }
// };

// // helper function: validate user
// async function validateUser(userId) {
//     const rows = await pool.queryPromise(
//         'SELECT user_id, username FROM user_info WHERE user_id = ?',
//         [userId]
//     );

//     if (!rows || rows.length === 0) {
//         throw new Error('User not found');
//     }

//     const user = rows[0];
//     if (!user || !user.user_id) {
//         throw new Error('Invalid user data');
//     }

//     return user;
// }

// module.exports = auth;