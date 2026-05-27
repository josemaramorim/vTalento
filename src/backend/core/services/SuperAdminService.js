const db = require('../../infra/db');
const crypto = require('crypto');

class SuperAdminService {
  // --- CONFIGURAÇÕES SAAS (GamSaaSConfig) ---

  async getConfigs() {
    const rows = await db('GamSaaSConfig').select('chave', 'valor');
    const configMap = {};
    rows.forEach(row => {
      configMap[row.chave] = row.valor;
    });
    // Fallbacks padrão
    if (!configMap.dias_padrao_cortesia) configMap.dias_padrao_cortesia = '7';
    if (!configMap.simular_pagamentos) configMap.simular_pagamentos = 'true';
    return configMap;
  }

  async updateConfigs(configs) {
    const chaves = Object.keys(configs);
    for (const chave of chaves) {
      const valor = String(configs[chave]);
      const existe = await db('GamSaaSConfig').where({ chave }).first();
      if (existe) {
        await db('GamSaaSConfig')
          .where({ chave })
          .update({ valor, updated_at: db.fn.now() });
      } else {
        await db('GamSaaSConfig').insert({
          chave,
          valor,
          created_at: db.fn.now(),
          updated_at: db.fn.now()
        });
      }
    }
    return this.getConfigs();
  }

  async getConfigValue(chave, valorPadrao) {
    const row = await db('GamSaaSConfig').where({ chave }).first();
    return row ? row.valor : valorPadrao;
  }

  // --- EMPRESAS / TENANTS (GamEmpresa) ---

  async listEmpresas(page = 1, limit = 10, busca = '', status = '', plano = '', saude = '') {
    const offset = (page - 1) * limit;

    let query = db('GamEmpresa');
    let countQuery = db('GamEmpresa');

    if (busca) {
      const b = `%${busca}%`;
      query = query.where(function() {
        this.where('nome', 'like', b).orWhere('slug', 'like', b);
      });
      countQuery = countQuery.where(function() {
        this.where('nome', 'like', b).orWhere('slug', 'like', b);
      });
    }

    if (status) {
      query = query.where({ status });
      countQuery = countQuery.where({ status });
    }

    if (plano) {
      query = query.where({ plano });
      countQuery = countQuery.where({ plano });
    }

    if (saude) {
      const agora = new Date().toISOString();
      if (saude === 'ATIVA') {
        query = query.where('status', 'ATIVO').andWhere('data_expiracao', '>', agora);
        countQuery = countQuery.where('status', 'ATIVO').andWhere('data_expiracao', '>', agora);
      } else if (saude === 'EXPIRADA') {
        query = query.where('data_expiracao', '<=', agora);
        countQuery = countQuery.where('data_expiracao', '<=', agora);
      } else if (saude === 'CORTESIA') {
        query = query.where({ liberacao_emergencia: true }).andWhere('emergencia_expiracao', '>', agora);
        countQuery = countQuery.where({ liberacao_emergencia: true }).andWhere('emergencia_expiracao', '>', agora);
      }
    }

    const countResult = await countQuery.count({ total: '*' });
    const total = countResult[0].total;

    const empresas = await query
      .select('*')
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset);

    // Enriquecer empresas com quantidade de corretores e informações financeiras
    const data = [];
    for (const emp of empresas) {
      const corretoresCount = await db('GamUsuario')
        .where({ empresa_id: emp.id, perfil: 'CORRETOR' })
        .count({ total: '*' });

      const financeiro = await db('GamFatura')
        .where({ empresa_id: emp.id })
        .select('valor', 'status');

      let totalPago = 0;
      let totalPendente = 0;

      financeiro.forEach(f => {
        if (f.status === 'PAGA') {
          totalPago += parseFloat(f.valor);
        } else if (f.status === 'PENDENTE' || f.status === 'VENCIDA') {
          totalPendente += parseFloat(f.valor);
        }
      });

      data.push({
        ...emp,
        corretores_ativos: corretoresCount[0].total,
        total_pago: totalPago,
        total_pendente: totalPendente
      });
    }

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    };
  }

  async createEmpresa(dados) {
    const { nome, slug, plano, limite_corretores, logo_url, cor_primaria } = dados;

    if (!nome || !slug) {
      throw new Error('Nome e slug são obrigatórios');
    }

    const slugExistente = await db('GamEmpresa').where({ slug }).first();
    if (slugExistente) {
      throw new Error('Slug já cadastrado na plataforma');
    }

    const id = crypto.randomUUID();
    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 30); // 30 dias de trial por padrão

    const planoDefinido = plano || 'ESSENCIAL';
    const limiteDefinido = limite_corretores || (planoDefinido === 'ESSENCIAL' ? 20 : planoDefinido === 'PROFISSIONAL' ? 60 : 150);

    await db('GamEmpresa').insert({
      id,
      nome,
      slug: slug.toLowerCase().trim(),
      plano: planoDefinido,
      limite_corretores: limiteDefinido,
      logo_url: logo_url || '',
      cor_primaria: cor_primaria || '#D4AF37',
      status: 'ATIVO',
      data_expiracao: dataExpiracao,
      liberacao_emergencia: false,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    // Determinar valor da primeira fatura automática
    let valorFatura = 199.00;
    if (planoDefinido === 'PROFISSIONAL') valorFatura = 399.00;
    if (planoDefinido === 'ENTERPRISE') valorFatura = 899.00;

    // Gerar primeira fatura PENDENTE automática vencendo em 30 dias
    await db('GamFatura').insert({
      id: crypto.randomUUID(),
      empresa_id: id,
      valor: valorFatura,
      status: 'PENDENTE',
      data_vencimento: dataExpiracao,
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    });

    return db('GamEmpresa').where({ id }).first();
  }

  async updateEmpresa(id, dados) {
    const empresa = await db('GamEmpresa').where({ id }).first();
    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    const updatePayload = {
      nome: dados.nome || empresa.nome,
      plano: dados.plano || empresa.plano,
      limite_corretores: dados.limite_corretores || empresa.limite_corretores,
      logo_url: dados.logo_url || empresa.logo_url,
      cor_primaria: dados.cor_primaria || empresa.cor_primaria,
      status: dados.status || empresa.status,
      updated_at: db.fn.now()
    };

    if (dados.data_expiracao) {
      updatePayload.data_expiracao = new Date(dados.data_expiracao);
    }

    await db('GamEmpresa').where({ id }).update(updatePayload);
    return db('GamEmpresa').where({ id }).first();
  }

  async getEmpresaSaudeFinanceira(empresaId) {
    const empresa = await db('GamEmpresa').where({ id: empresaId }).first();
    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    const faturas = await db('GamFatura')
      .where({ empresa_id: empresaId })
      .orderBy('data_vencimento', 'desc');

    let totalPago = 0;
    let totalPendente = 0;

    faturas.forEach(f => {
      if (f.status === 'PAGA') {
        totalPago += parseFloat(f.valor);
      } else if (f.status === 'PENDENTE' || f.status === 'VENCIDA') {
        totalPendente += parseFloat(f.valor);
      }
    });

    return {
      empresa: {
        id: empresa.id,
        nome: empresa.nome,
        plano: empresa.plano,
        status: empresa.status,
        data_expiracao: empresa.data_expiracao
      },
      total_pago: totalPago,
      total_pendente: totalPendente,
      data_proxima_cobranca: empresa.data_expiracao,
      faturas
    };
  }

  async liberarAcessoEmergencia(empresaId, diasString) {
    const empresa = await db('GamEmpresa').where({ id: empresaId }).first();
    if (!empresa) {
      throw new Error('Empresa não encontrada');
    }

    // Obter dias padrão se não fornecido ou inválido
    let N = parseInt(diasString, 10);
    if (isNaN(N) || N <= 0) {
      const diasDefaultStr = await this.getConfigValue('dias_padrao_cortesia', '7');
      N = parseInt(diasDefaultStr, 10) || 7;
    }

    const expiracao = new Date();
    expiracao.setDate(expiracao.getDate() + N);

    await db('GamEmpresa')
      .where({ id: empresaId })
      .update({
        liberacao_emergencia: true,
        emergencia_expiracao: expiracao,
        status: empresa.status === 'SUSPENSO' ? 'ATIVO' : empresa.status, // Reativa se suspensa
        updated_at: db.fn.now()
      });

    return db('GamEmpresa').where({ id: empresaId }).first();
  }

  // --- FATURAS / INVOICES (GamFatura) ---

  async listFaturas(page = 1, limit = 10, empresaId = '', status = '') {
    const limitSanitizado = [10, 50, 100].includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;
    const paginaSanitizada = Math.max(1, parseInt(page, 10) || 1);
    const offset = (paginaSanitizada - 1) * limitSanitizado;

    let query = db('GamFatura')
      .join('GamEmpresa', 'GamFatura.empresa_id', '=', 'GamEmpresa.id')
      .select(
        'GamFatura.id',
        'GamFatura.empresa_id',
        'GamFatura.valor',
        'GamFatura.status',
        'GamFatura.data_vencimento',
        'GamFatura.data_pagamento',
        'GamFatura.created_at',
        'GamEmpresa.nome as empresa_nome',
        'GamEmpresa.plano as empresa_plano'
      );

    let countQuery = db('GamFatura');

    if (empresaId) {
      query = query.where('GamFatura.empresa_id', empresaId);
      countQuery = countQuery.where('empresa_id', empresaId);
    }

    if (status) {
      query = query.where('GamFatura.status', status);
      countQuery = countQuery.where('status', status);
    }

    const [{ total }] = await countQuery.count('id as total');
    const totalRegistros = parseInt(total, 10);

    const faturas = await query
      .orderBy('GamFatura.created_at', 'desc')
      .limit(limitSanitizado)
      .offset(offset);

    // Métricas
    let totalPagoQuery = db('GamFatura').where({ status: 'PAGA' });
    let totalPendenteQuery = db('GamFatura').whereIn('status', ['PENDENTE', 'VENCIDA']);

    if (empresaId) {
      totalPagoQuery = totalPagoQuery.where({ empresa_id: empresaId });
      totalPendenteQuery = totalPendenteQuery.where({ empresa_id: empresaId });
    }

    const totalPagoResult = await totalPagoQuery.sum('valor as total');
    const totalPendenteResult = await totalPendenteQuery.sum('valor as total');

    const totalPago = parseFloat(totalPagoResult[0].total) || 0;
    const totalPendente = parseFloat(totalPendenteResult[0].total) || 0;

    return {
      data: faturas,
      stats: {
        total_pago: totalPago,
        total_pendente: totalPendente,
        total_geral: totalPago + totalPendente
      },
      meta: {
        total: totalRegistros,
        page: paginaSanitizada,
        limit: limitSanitizado,
        totalPages: Math.ceil(totalRegistros / limitSanitizado)
      }
    };
  }

  async baixarFaturaManual(faturaId) {
    const fatura = await db('GamFatura').where({ id: faturaId }).first();
    if (!fatura) {
      throw new Error('Fatura não encontrada');
    }

    if (fatura.status === 'PAGA') {
      throw new Error('Esta fatura já está quitada');
    }

    // Atualizar fatura
    await db('GamFatura')
      .where({ id: faturaId })
      .update({
        status: 'PAGA',
        data_pagamento: db.fn.now(),
        updated_at: db.fn.now()
      });

    // Estender expiração da licença da empresa
    const empresa = await db('GamEmpresa').where({ id: fatura.empresa_id }).first();
    if (empresa) {
      const novaDataExpiracao = new Date();
      // Se a data de expiração original ainda estiver no futuro, soma a partir dela
      const dataOriginal = new Date(empresa.data_expiracao);
      if (dataOriginal > novaDataExpiracao) {
        novaDataExpiracao.setTime(dataOriginal.getTime() + 30 * 24 * 60 * 60 * 1000);
      } else {
        novaDataExpiracao.setDate(novaDataExpiracao.getDate() + 30);
      }

      await db('GamEmpresa')
        .where({ id: fatura.empresa_id })
        .update({
          data_expiracao: novaDataExpiracao,
          status: 'ATIVO', // Reativa empresa
          liberacao_emergencia: false, // Quita emergência se houver
          updated_at: db.fn.now()
        });
    }

    return db('GamFatura').where({ id: faturaId }).first();
  }

  // --- USUÁRIOS ISOLADOS POR TENANT (GamUsuario) ---

  async listUsuariosByEmpresa(empresaId, page = 1, limit = 10, busca = '') {
    const limitSanitizado = [10, 50, 100].includes(parseInt(limit, 10)) ? parseInt(limit, 10) : 10;
    const paginaSanitizada = Math.max(1, parseInt(page, 10) || 1);
    const offset = (paginaSanitizada - 1) * limitSanitizado;

    let query = db('GamUsuario').where('empresa_id', empresaId);

    if (busca) {
      const termo = `%${busca}%`;
      query = query.where(function() {
        this.where('nome', 'LIKE', termo)
            .orWhere('email', 'LIKE', termo)
            .orWhere('cpf', 'LIKE', termo);
      });
    }

    const [{ total }] = await query.clone().count('id as total');
    const totalRegistros = parseInt(total, 10);

    const data = await query
      .select('id', 'nome', 'email', 'cpf', 'perfil', 'saldo_disponivel', 'saldo_a_receber', 'created_at')
      .orderBy('nome', 'asc')
      .limit(limitSanitizado)
      .offset(offset);

    return {
      data,
      meta: {
        total: totalRegistros,
        page: paginaSanitizada,
        totalPages: Math.ceil(totalRegistros / limitSanitizado),
        limit: limitSanitizado
      }
    };
  }

  async createUsuarioForEmpresa(empresaId, dados) {
    const { nome, email, senha, cpf, perfil } = dados;

    if (!nome || !email || !senha) {
      throw new Error('Nome, e-mail e senha são obrigatórios.');
    }

    const emailExistente = await db('GamUsuario').where({ email }).first();
    if (emailExistente) {
      throw new Error('E-mail já cadastrado no sistema.');
    }

    const empresa = await db('GamEmpresa').where({ id: empresaId }).first();
    if (!empresa) {
      throw new Error('Empresa não encontrada.');
    }

    // Valida limite do plano
    const [{ total }] = await db('GamUsuario').where({ empresa_id: empresaId }).count('id as total');
    if (empresa.limite_corretores && parseInt(total, 10) >= empresa.limite_corretores) {
      throw new Error(`Limite de usuários do plano da empresa atingido (${empresa.limite_corretores}).`);
    }

    const bcrypt = require('bcryptjs');
    const salt = await bcrypt.genSalt(10);
    const senha_hash = await bcrypt.hash(senha, salt);

    const userId = require('crypto').randomUUID();
    const novoUsuario = {
      id: userId,
      empresa_id: empresaId,
      nome,
      email,
      senha_hash,
      cpf: cpf || null,
      perfil: perfil || 'CORRETOR',
      saldo_disponivel: 0,
      saldo_a_receber: 0,
      tema_preferido: 'dark',
      created_at: db.fn.now(),
      updated_at: db.fn.now()
    };

    await db('GamUsuario').insert(novoUsuario);

    // Busca o usuário do banco para evitar retornar os helpers do Knex (db.fn.now) que possuem estrutura circular
    const usuarioCriado = await db('GamUsuario')
      .where({ id: userId })
      .select('id', 'nome', 'email', 'cpf', 'perfil', 'saldo_disponivel', 'saldo_a_receber', 'tema_preferido', 'created_at', 'updated_at')
      .first();

    return usuarioCriado;
  }

  async updateUsuarioForEmpresa(empresaId, usuarioId, dados) {
    const usuario = await db('GamUsuario').where({ id: usuarioId, empresa_id: empresaId }).first();
    if (!usuario) {
      throw new Error('Usuário não encontrado nesta empresa.');
    }

    if (dados.email && dados.email !== usuario.email) {
      const emailExistente = await db('GamUsuario').where({ email: dados.email }).first();
      if (emailExistente) {
        throw new Error('E-mail já cadastrado por outro usuário.');
      }
    }

    const updates = {
      nome: dados.nome || usuario.nome,
      email: dados.email || usuario.email,
      cpf: dados.cpf !== undefined ? dados.cpf : usuario.cpf,
      perfil: dados.perfil || usuario.perfil,
      updated_at: db.fn.now()
    };

    if (dados.senha) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(10);
      updates.senha_hash = await bcrypt.hash(dados.senha, salt);
    }

    await db('GamUsuario').where({ id: usuarioId, empresa_id: empresaId }).update(updates);

    // Busca o usuário atualizado do banco para evitar problemas com serialização circular de db.fn.now()
    const usuarioAtualizado = await db('GamUsuario')
      .where({ id: usuarioId, empresa_id: empresaId })
      .select('id', 'nome', 'email', 'cpf', 'perfil', 'saldo_disponivel', 'saldo_a_receber', 'tema_preferido', 'created_at', 'updated_at')
      .first();

    return usuarioAtualizado;
  }

  async deleteUsuarioForEmpresa(empresaId, usuarioId) {
    const usuario = await db('GamUsuario').where({ id: usuarioId, empresa_id: empresaId }).first();
    if (!usuario) {
      throw new Error('Usuário não encontrado nesta empresa.');
    }

    await db('GamUsuario').where({ id: usuarioId, empresa_id: empresaId }).del();
    return { success: true };
  }

  async deleteEmpresa(id) {
    const empresa = await db('GamEmpresa').where({ id }).first();
    if (!empresa) {
      throw new Error('Inquilino não encontrado.');
    }
    // Deleta a empresa, cascateando automaticamente para todas as tabelas vinculadas
    await db('GamEmpresa').where({ id }).del();
    return { success: true };
  }
}

module.exports = new SuperAdminService();
