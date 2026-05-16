const { verifyToken } = require('../auth/token');

const tenantMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({ error: 'Token não fornecido' });
  }

  const [, token] = authHeader.split(' ');

  const decoded = verifyToken(token);

  if (!decoded) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }

  // Injeta o empresa_id e dados do usuário na requisição
  // Isso garante o isolamento total nas consultas futuras
  req.empresa_id = decoded.empresa_id;
  req.usuario_id = decoded.id;
  req.usuario_perfil = decoded.perfil;

  next();
};

module.exports = tenantMiddleware;
