require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./api/routes/auth');

const app = express();

app.use(cors());
app.use(express.json());

// Rotas
app.use('/api/auth', authRoutes);

const PORT = process.env.PORT || 3001;

app.listen(PORT, () => {
  console.log(`V-Talentos SaaS Backend running on port ${PORT}`);
});

module.exports = app;
