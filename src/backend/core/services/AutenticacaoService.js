const db = require('../../infra/db');
const bcrypt = require('bcryptjs');
const { generateToken } = require('../../infra/auth/token');

class AutenticacaoService {
  async login(email, senha) {
    // 1. Busca o usuário e a empresa vinculada
    const usuario = await db('GamUsuario')
      .where({ email })
      .first();

    if (!usuario) {
      throw new Error('Credenciais inválidas');
    }

    // 2. Valida a senha
    const senhaValida = await bcrypt.compare(senha, usuario.senha_hash);
    if (!senhaValida) {
      throw new Error('Credenciais inválidas');
    }

    // 3. Busca dados da empresa para o token/contexto
    const empresa = await db('GamEmpresa')
      .where({ id: usuario.empresa_id })
      .first();

    if (empresa.status !== 'ATIVO') {
      throw new Error('Empresa suspensa ou inativa');
    }

    // 4. Gera o Token com o empresa_id embutido
    const token = generateToken({
      id: usuario.id,
      empresa_id: usuario.empresa_id,
      perfil: usuario.perfil
    });

    return {
      usuario: {
        id: usuario.id,
        nome: usuario.nome,
        email: usuario.email,
        perfil: usuario.perfil
      },
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        logo_url: empresa.logo_url,
        cor_primaria: empresa.cor_primaria
      },
      token
    };
  }
}

module.exports = new AutenticacaoService();
