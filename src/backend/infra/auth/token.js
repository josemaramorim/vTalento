const jwt = require('jsonwebtoken');

const SECRET = process.env.JWT_SECRET || 'v-talentos-secret-key-2026';

const generateToken = (payload) => {
  return jwt.sign(payload, SECRET, { expiresIn: '8h' });
};

const verifyToken = (token) => {
  try {
    return jwt.verify(token, SECRET);
  } catch (err) {
    return null;
  }
};

module.exports = { generateToken, verifyToken };
