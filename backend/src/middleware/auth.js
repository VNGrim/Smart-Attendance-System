const jwt = require('jsonwebtoken');
const JWT_SECRET = process.env.JWT_SECRET || 'secret';

function auth(req, res, next) {
  let token = req.cookies?.access_token;
  if (!token && req.headers?.authorization?.startsWith('Bearer ')) {
    token = req.headers.authorization.slice(7);
  }
  if (!token) return res.status(401).json({ success: false, message: 'Unauthorized' });

  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { user_code, role, fullName }
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
}

module.exports = { auth };
