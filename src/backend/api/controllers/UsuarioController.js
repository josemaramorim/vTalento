const UsuarioService = require('../../core/services/UsuarioService');

class UsuarioController {
  // GET /api/admin/usuarios
  async listAdmin(req, res) {
    try {
      const { empresa_id } = req;
      const { page, limit, busca, perfil, ativo } = req.query;

      const result = await UsuarioService.listAllUsuariosAdmin({
        empresa_id,
        page,
        limit,
        busca,
        perfil,
        ativo
      });

      return res.status(200).json({
        success: true,
        data: result.data,
        meta: result.meta
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  // POST /api/admin/usuarios
  async create(req, res) {
    try {
      const { empresa_id } = req;
      const { nome, email, senha, cpf, perfil, identificador_extra } = req.body;

      const novoUsuario = await UsuarioService.createUsuarioAdmin({
        empresa_id,
        nome,
        email,
        senha,
        cpf,
        perfil,
        identificador_extra
      });

      return res.status(201).json({
        success: true,
        data: novoUsuario
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  // PUT /api/admin/usuarios/:id
  async update(req, res) {
    try {
      const { empresa_id } = req;
      const { id } = req.params;
      const { nome, email, cpf, senha, ativo, perfil, identificador_extra } = req.body;

      const usuarioAtualizado = await UsuarioService.updateUsuarioAdmin({
        empresa_id,
        id,
        nome,
        email,
        cpf,
        senha,
        ativo,
        perfil,
        identificador_extra
      });

      return res.status(200).json({
        success: true,
        data: usuarioAtualizado
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  // DELETE /api/admin/usuarios/:id
  async delete(req, res) {
    try {
      const { empresa_id } = req;
      const { id } = req.params;

      await UsuarioService.deleteUsuarioAdmin({
        empresa_id,
        id
      });

      return res.status(200).json({
        success: true,
        message: 'Corretor excluído com sucesso.'
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }

  // PUT /api/users/me
  async updateMe(req, res) {
    try {
      const { usuario_id } = req;
      const { nome, email, cpf, identificador_extra, senha_atual, nova_senha } = req.body;

      const profileAtualizado = await UsuarioService.updateOwnProfile({
        usuario_id,
        nome,
        email,
        cpf,
        identificador_extra,
        senha_atual,
        nova_senha
      });

      return res.status(200).json({
        success: true,
        data: profileAtualizado
      });
    } catch (err) {
      return res.status(400).json({
        success: false,
        error: err.message
      });
    }
  }
  // GET /api/admin/usuarios/:id/extrato
  async getExtrato(req, res) {
    try {
      const { empresa_id } = req;
      const { id } = req.params;
      const db = require('../../infra/db');

      // Validar que o corretor pertence à empresa
      const usuario = await db('GamUsuario').where({ id, empresa_id }).first();
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Corretor não encontrado.' });
      }

      const transacoes = await db('GamTransacao')
        .where({ 'GamTransacao.usuario_id': id })
        .leftJoin('GamUsuario as Admin', 'GamTransacao.admin_id', 'Admin.id')
        .select(
          'GamTransacao.id',
          'GamTransacao.tipo',
          'GamTransacao.valor',
          'GamTransacao.origem',
          'GamTransacao.status',
          'GamTransacao.justificativa',
          'GamTransacao.empreendimento',
          'GamTransacao.unidade',
          'GamTransacao.data_vencimento',
          'GamTransacao.created_at',
          db.raw("COALESCE(\"Admin\".\"nome\", 'Sistema') as admin_nome")
        )
        .orderBy('GamTransacao.created_at', 'desc')
        .limit(50);

      return res.json({
        success: true,
        corretor: {
          id: usuario.id,
          nome: usuario.nome,
          email: usuario.email,
          saldo_disponivel: usuario.saldo_disponivel,
          saldo_a_receber: usuario.saldo_a_receber
        },
        transacoes
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // POST /api/admin/usuarios/:id/recalcular-saldo
  async recalcularSaldo(req, res) {
    try {
      const { empresa_id } = req;
      const { id } = req.params;
      const db = require('../../infra/db');

      const usuario = await db('GamUsuario').where({ id, empresa_id }).first();
      if (!usuario) {
        return res.status(404).json({ success: false, error: 'Corretor não encontrado.' });
      }

      // Otimização: As somas são feitas diretamente no banco de dados, sendo muito mais rápido e não consumindo memória do Node.js
      const resultado = await db('GamTransacao')
        .where({ usuario_id: id })
        .select(
          db.raw(`SUM(CASE WHEN status = 'COMPENSADO' THEN valor ELSE 0 END) as novo_disponivel`),
          db.raw(`SUM(CASE WHEN status = 'PENDENTE' AND tipo = 'CREDITO' THEN valor ELSE 0 END) as novo_a_receber`),
          db.raw(`COUNT(id) as transacoes_processadas`)
        )
        .first();

      const novoDisponivel = parseFloat(resultado.novo_disponivel || 0);
      const novoAReceber = parseFloat(resultado.novo_a_receber || 0);
      const qtdTransacoes = parseInt(resultado.transacoes_processadas || 0, 10);

      const saldoDisponivel = Math.max(0, novoDisponivel);
      const saldoAReceber = Math.max(0, novoAReceber);

      await db('GamUsuario').where({ id }).update({
        saldo_disponivel: saldoDisponivel,
        saldo_a_receber: saldoAReceber,
        updated_at: db.fn.now()
      });

      return res.json({
        success: true,
        message: 'Saldo recalculado com base nas transações registradas.',
        saldo_disponivel: saldoDisponivel,
        saldo_a_receber: saldoAReceber,
        transacoes_processadas: qtdTransacoes
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new UsuarioController();
