const SuperAdminService = require('../../core/services/SuperAdminService');

class SuperAdminController {
  // Configurações SaaS
  async getConfigs(req, res) {
    try {
      const configs = await SuperAdminService.getConfigs();
      return res.json({ success: true, configs });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateConfigs(req, res) {
    try {
      const configs = await SuperAdminService.updateConfigs(req.body);
      return res.json({ success: true, configs });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  // Empresas / Tenants
  async listEmpresas(req, res) {
    try {
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const busca = req.query.busca || '';
      const status = req.query.status || '';
      const plano = req.query.plano || '';
      const saude = req.query.saude || '';
      const result = await SuperAdminService.listEmpresas(page, limit, busca, status, plano, saude);
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async createEmpresa(req, res) {
    try {
      const empresa = await SuperAdminService.createEmpresa(req.body);
      return res.status(201).json({ success: true, data: empresa });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateEmpresa(req, res) {
    try {
      const { id } = req.params;
      const empresa = await SuperAdminService.updateEmpresa(id, req.body);
      return res.json({ success: true, data: empresa });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteEmpresa(req, res) {
    try {
      const { id } = req.params;
      await SuperAdminService.deleteEmpresa(id);
      return res.json({ success: true, message: 'Inquilino e todos os seus dados vinculados foram excluídos com sucesso.' });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async getEmpresaSaudeFinanceira(req, res) {
    try {
      const { id } = req.params;
      const saude = await SuperAdminService.getEmpresaSaudeFinanceira(id);
      return res.json({ success: true, data: saude });
    } catch (err) {
      return res.status(404).json({ success: false, error: err.message });
    }
  }

  async liberarAcessoEmergencia(req, res) {
    try {
      const { id } = req.params;
      const { dias } = req.body;
      const empresa = await SuperAdminService.liberarAcessoEmergencia(id, dias);
      return res.json({ success: true, data: empresa });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // Faturas
  async baixarFaturaManual(req, res) {
    try {
      const { id } = req.params;
      const fatura = await SuperAdminService.baixarFaturaManual(id);
      return res.json({ success: true, message: 'Fatura baixada com sucesso', data: fatura });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  // Usuários por Empresa
  async listUsuariosByEmpresa(req, res) {
    try {
      const { empresaId } = req.params;
      const page = parseInt(req.query.page, 10) || 1;
      const limit = parseInt(req.query.limit, 10) || 10;
      const busca = req.query.busca || '';
      const result = await SuperAdminService.listUsuariosByEmpresa(empresaId, page, limit, busca);
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async createUsuarioForEmpresa(req, res) {
    try {
      const { empresaId } = req.params;
      const usuario = await SuperAdminService.createUsuarioForEmpresa(empresaId, req.body);
      return res.status(201).json({ success: true, data: usuario });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async updateUsuarioForEmpresa(req, res) {
    try {
      const { empresaId, usuarioId } = req.params;
      const usuario = await SuperAdminService.updateUsuarioForEmpresa(empresaId, usuarioId, req.body);
      return res.json({ success: true, data: usuario });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }

  async deleteUsuarioForEmpresa(req, res) {
    try {
      const { empresaId, usuarioId } = req.params;
      const result = await SuperAdminService.deleteUsuarioForEmpresa(empresaId, usuarioId);
      return res.json({ success: true, ...result });
    } catch (err) {
      return res.status(400).json({ success: false, error: err.message });
    }
  }
}

module.exports = new SuperAdminController();
