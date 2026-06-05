require('dotenv').config();
const express = require('express');
const cors = require('cors');
const authRoutes = require('./api/routes/auth');
const adminRoutes = require('./api/routes/admin');
const premiosRoutes = require('./api/routes/premios');
const superRoutes = require('./api/routes/super');
const webhookRoutes = require('./api/routes/webhooks');

const app = express();

app.use(cors());
app.use(express.json());

// Servir arquivos estáticos do frontend em produção
const path = require('path');
app.use(express.static(path.join(__dirname, '../frontend')));

// Rotas
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', premiosRoutes);
app.use('/api/super', superRoutes);
app.use('/api/webhooks', webhookRoutes);


const PORT = process.env.PORT || 3001;

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`V-Talentos SaaS Backend running on port ${PORT}`);
  });
}

module.exports = app;
