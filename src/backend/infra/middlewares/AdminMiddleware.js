const adminMiddleware = (req, res, next) => {
  // O TenantMiddleware deve ter rodado antes deste middleware, injetando req.usuario_perfil
  if (!req.usuario_perfil) {
    return res.status(500).json({ error: 'Erro de contexto interno' });
  }

  const perfisPermitidos = ['ADMIN_EMPRESA', 'SUPER_ADMIN'];

  if (!perfisPermitidos.includes(req.usuario_perfil)) {
    return res.status(403).json({ error: 'Acesso negado: privilégios insuficientes' });
  }

  next();
};

module.exports = adminMiddleware;
