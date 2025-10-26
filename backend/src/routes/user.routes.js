const express = require('express');
const cookieParser = require('cookie-parser');
const { auth } = require('../middleware/auth');

const router = express.Router();
router.use(cookieParser());

// GET /api/me - trả về user hiện tại theo token
router.get('/me', auth, (req, res) => {
  const { userId, role, fullName } = req.user || {};
  return res.json({ userId, role, fullName });
});

module.exports = router;
