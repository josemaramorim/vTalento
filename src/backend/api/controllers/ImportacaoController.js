const ImportacaoService = require('../../core/services/ImportacaoService');

class ImportacaoController {
  async obterPerfis(req, res) {
    try {
      const perfis = await ImportacaoService.listarPerfis(req.empresa_id);
      return res.json(perfis);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async criarPerfil(req, res) {
    try {
      const { nome_perfil, mapeamento_json, separador_multiplo, linha_cabecalho } = req.body;
      const empresa_id = req.empresa_id;

      const result = await ImportacaoService.criarPerfil(empresa_id, {
        nome_perfil,
        mapeamento_json,
        separador_multiplo,
        linha_cabecalho
      });

      return res.status(201).json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async obterPerfilUnico(req, res) {
    try {
      const { id } = req.params;
      const empresa_id = req.empresa_id;

      const perfil = await ImportacaoService.obterPerfil(empresa_id, id);
      if (!perfil) {
        return res.status(404).json({ error: 'Perfil não encontrado' });
      }
      return res.json(perfil);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async atualizarPerfil(req, res) {
    try {
      const { id } = req.params;
      const { nome_perfil, mapeamento_json, separador_multiplo, linha_cabecalho } = req.body;
      const empresa_id = req.empresa_id;

      const result = await ImportacaoService.atualizarPerfil(empresa_id, id, {
        nome_perfil,
        mapeamento_json,
        separador_multiplo,
        linha_cabecalho
      });

      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async deletarPerfil(req, res) {
    try {
      const { id } = req.params;
      const empresa_id = req.empresa_id;

      const result = await ImportacaoService.deletarPerfil(empresa_id, id);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async previewImportacao(req, res) {
    try {
      const { fileBase64, perfil_id } = req.body;
      const empresa_id = req.empresa_id;

      if (!fileBase64 || !perfil_id) {
        return res.status(400).json({ error: 'Os campos fileBase64 e perfil_id são obrigatórios' });
      }

      const result = await ImportacaoService.previewImportacao(empresa_id, fileBase64, perfil_id);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }

  async confirmarImportacao(req, res) {
    try {
      const { fileBase64, perfil_id } = req.body;
      const empresa_id = req.empresa_id;
      const admin_id = req.usuario_id; // Injetado pelo TenantMiddleware / Autenticação

      if (!fileBase64 || !perfil_id) {
        return res.status(400).json({ error: 'Os campos fileBase64 e perfil_id são obrigatórios' });
      }

      const result = await ImportacaoService.confirmarImportacao(empresa_id, admin_id, fileBase64, perfil_id);
      return res.json(result);
    } catch (err) {
      return res.status(400).json({ error: err.message });
    }
  }
}

module.exports = new ImportacaoController();
