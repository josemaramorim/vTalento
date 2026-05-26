const superAdminMiddleware = (req, res, next) => {
  if (req.usuario_perfil !== 'SUPER_ADMIN') {
    return res.status(403).json({ error: 'Acesso negado: privilégios de Super-Admin necessários' });
  }
  next();
};

module.exports = superAdminMiddleware;
