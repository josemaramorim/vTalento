require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./api/routes/auth');
const adminRoutes = require('./api/routes/admin');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);

const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`V-Talentos SaaS Backend running on port ${PORT}`);
  });
}

module.exports = app;
