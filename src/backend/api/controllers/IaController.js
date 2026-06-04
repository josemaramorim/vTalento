const db = require('../../infra/db');
const IaFactory = require('../../core/services/ia/IaFactory');

class IaController {
  async gerarFluxo(req, res) {
    try {
      const { promptUsuario, colunasExcel } = req.body;
      if (!promptUsuario) {
        return res.status(400).json({ error: 'O prompt do usuário é obrigatório.' });
      }

      const adapter = await IaFactory.obterAdapter(req.empresa_id);
      const jsonFluxo = await adapter.gerarFluxoJSON(promptUsuario, colunasExcel || []);
      return res.json({ success: true, json: jsonFluxo });
    } catch (err) {
      console.error('[IaController] Erro em gerarFluxo:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  async sugerirSanitizacao(req, res) {
    try {
      const { exemploDados, objetivo } = req.body;
      if (!objetivo) {
        return res.status(400).json({ error: 'O objetivo da sanitização é obrigatório.' });
      }

      const adapter = await IaFactory.obterAdapter(req.empresa_id);
      const sugestao = await adapter.sugerirSanitizacao(exemploDados, objetivo);
      return res.json({ success: true, ...sugestao });
    } catch (err) {
      console.error('[IaController] Erro em sugerirSanitizacao:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  async diagnosticar(req, res) {
    try {
      const { mensagemErro, contexto } = req.body;
      if (!mensagemErro) {
        return res.status(400).json({ error: 'A mensagem de erro é obrigatória.' });
      }

      const adapter = await IaFactory.obterAdapter(req.empresa_id);
      const diagnostico = await adapter.diagnosticarErro(mensagemErro, contexto || {});
      return res.json({ success: true, ...diagnostico });
    } catch (err) {
      console.error('[IaController] Erro em diagnosticar:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }

  async salvarConfig(req, res) {
    try {
      const { provedor_ia, chave_ia } = req.body;
      
      if (provedor_ia && provedor_ia !== 'GEMINI' && provedor_ia !== 'OPENAI') {
        return res.status(400).json({ error: 'Provedor de IA inválido. Escolha GEMINI ou OPENAI.' });
      }

      const empresa = await db('GamEmpresa').where({ id: req.empresa_id }).first();
      if (!empresa) {
        return res.status(404).json({ error: 'Empresa não encontrada.' });
      }

      const updatePayload = {};

      if (provedor_ia !== undefined) {
        updatePayload.provedor_ia = provedor_ia || null;
      }

      if (chave_ia !== undefined) {
        // Se a chave for vazia, limpamos a chave encriptada. Caso contrário, encriptamos.
        // Se o usuário enviar a string especial 'mock', também a encriptamos normalmente.
        updatePayload.chave_ia_encriptada = chave_ia ? IaFactory.encriptarChave(chave_ia) : null;
      }

      await db('GamEmpresa').where({ id: req.empresa_id }).update(updatePayload);

      return res.json({
        success: true,
        message: 'Configurações de IA salvas com sucesso!'
      });
    } catch (err) {
      console.error('[IaController] Erro em salvarConfig:', err.message);
      return res.status(500).json({ error: err.message });
    }
  }
}

module.exports = new IaController();
