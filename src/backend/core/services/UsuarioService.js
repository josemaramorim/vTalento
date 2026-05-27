const db = require('../../infra/db');
const bcrypt = require('bcryptjs');

class UsuarioService {
  // Tarefa 12.1 — FASE 5 — Listar corretores/usuários da empresa de forma paginada e com filtros
  async listAllUsuariosAdmin({ empresa_id, page = 1, limit = 10, busca }) {
    const limitSanitizado = [10, 50, 100].includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;
    const paginaSanitizada = Math.max(1, parseInt(page, 10) || 1);
    const offset = (paginaSanitizada - 1) * limitSanitizado;

    let query = db('GamUsuario')
      .where('empresa_id', empresa_id);

    if (busca) {
      const termo = `%${busca}%`;
      query = query.where(function() {
        this.where('nome', 'LIKE', termo)
            .orWhere('email', 'LIKE', termo)
            .orWhere('cpf', 'LIKE', termo);
      });
    }

    // Conta total de registros para paginação
    const [{ total }] = await query.clone().count('id as total');
    const totalRegistros = parseInt(total, 10);
    const totalPages = Math.ceil(totalRegistros / limitSanitizado);

    // Busca os registros selecionados com limitação
    const data = await query
      .select('id', 'nome', 'email', 'cpf', 'perfil', 'saldo_disponivel', 'saldo_a_receber', 'tema_preferido', 'created_at')
      .orderBy('nome', 'asc')
      .limit(limitSanitizado)
      .offset(offset);

    return {
      data,
      meta: {
        total: totalRegistros,
        page: paginaSanitizada,
        totalPages,
        limit: limitSanitizado
      }
    };
  }

  // Tarefa 12.2 — FASE 5 — Cadastrar novo corretor no tenant
  async createUsuarioAdmin({ empresa_id, nome, email, senha, cpf }) {
    if (!nome || !email || !senha) {
      throw new Error('Nome, e-mail e senha são obrigatórios.');
    }

    // Valida unicidade global do e-mail
    const emailExistente = await db('GamUsuario').where({ email }).first();
    if (emailExistente) {
      throw new Error('E-mail já cadastrado no sistema.');
    }

    // Verifica limite de corretores da empresa com base no plano
    const empresa = await db('GamEmpresa').where({ id: empresa_id }).first();
    if (empresa) {
      const [{ total }] = await db('GamUsuario').where({ empresa_id }).count('id as total');
      if (empresa.limite_corretores && parseInt(total, 10) >= empresa.limite_corretores) {
        throw new Error(`Limite de usuários do seu plano atingido (${empresa.limite_corretores}). Faça um upgrade.`);
      }
    }

    // Gera hash criptografado da senha
    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    const novoUsuario = {
      id: db.fn.uuid ? db.fn.uuid() : require('crypto').randomUUID(),
      empresa_id,
      nome,
      email,
      senha_hash,
      cpf: cpf || null,
      perfil: 'CORRETOR',
      saldo_disponivel: 0,
      saldo_a_receber: 0,
      tema_preferido: 'dark',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    await db('GamUsuario').insert(novoUsuario);

    // Retorna sem o hash da senha
    const { senha_hash: _, ...retorno } = novoUsuario;
    return retorno;
  }

  // Tarefa 12.3 — FASE 5 — Editar dados de um usuário pelo Admin
  async updateUsuarioAdmin({ empresa_id, id, nome, email, cpf, senha }) {
    const usuario = await db('GamUsuario').where({ id, empresa_id }).first();
    if (!usuario) {
      throw new Error('Usuário não encontrado.');
    }

    // Se o e-mail mudou, valida unicidade global
    if (email && email !== usuario.email) {
      const emailExistente = await db('GamUsuario').where({ email }).first();
      if (emailExistente) {
        throw new Error('E-mail já cadastrado por outro usuário.');
      }
    }

    const updates = {
      nome: nome || usuario.nome,
      email: email || usuario.email,
      cpf: cpf !== undefined ? cpf : usuario.cpf,
      updated_at: db.fn.now()
    };

    // Se uma nova senha foi fornecida, hash e inclui no update
    if (senha && senha.length >= 6) {
      const salt = await bcrypt.genSalt(10);
      updates.senha_hash = await bcrypt.hash(senha, salt);
    }

    await db('GamUsuario').where({ id, empresa_id }).update(updates);

    // Re-fetch to avoid returning raw db.fn.now() Timeout objects that break JSON serialization
    const atualizado = await db('GamUsuario')
      .where({ id, empresa_id })
      .select('id', 'nome', 'email', 'cpf', 'perfil', 'saldo_disponivel', 'saldo_a_receber', 'created_at', 'updated_at')
      .first();

    return atualizado;
  }

  // Tarefa 12.4 — FASE 5 — Atualizar dados próprios (Corretor ou Admin)
  async updateOwnProfile({ usuario_id, nome, email, cpf, senha_atual, nova_senha }) {
    const usuario = await db('GamUsuario').where({ id: usuario_id }).first();
    if (!usuario) {
      throw new Error('Usuário não encontrado.');
    }

    // Se o e-mail mudou, valida unicidade global
    if (email && email !== usuario.email) {
      const emailExistente = await db('GamUsuario').where({ email }).first();
      if (emailExistente) {
        throw new Error('E-mail já cadastrado por outro usuário.');
      }
    }

    const updates = {
      nome: nome || usuario.nome,
      email: email || usuario.email,
      cpf: cpf !== undefined ? cpf : usuario.cpf,
      updated_at: db.fn.now()
    };

    // Fluxo de alteração de senha
    if (nova_senha) {
      if (!senha_atual) {
        throw new Error('A senha atual é obrigatória para realizar a alteração de senha.');
      }
      const senhaValida = await bcrypt.compare(senha_atual, usuario.senha_hash);
      if (!senhaValida) {
        throw new Error('A senha atual inserida está incorreta.');
      }
      const salt = await bcrypt.genSalt(10);
      updates.senha_hash = await bcrypt.hash(nova_senha, salt);
    }

    await db('GamUsuario').where({ id: usuario_id }).update(updates);

    const { senha_hash: _, ...usuarioAtualizado } = { ...usuario, ...updates };
    return usuarioAtualizado;
  }
}

module.exports = new UsuarioService();
