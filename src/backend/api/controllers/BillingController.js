const db = require('../../infra/db');

class BillingController {
  async getStatus(req, res) {
    try {
      const empresa = await db('GamEmpresa').where({ id: req.empresa_id }).first();
      if (!empresa) {
        return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
      }

      // Contagem de corretores ativos
      const [{ total }] = await db('GamUsuario')
        .where({ empresa_id: req.empresa_id, perfil: 'CORRETOR' })
        .count('id as total');

      // Obter configuração de simulação e provedores globais da plataforma
      const simularRow = await db('GamSaaSConfig').where({ chave: 'simular_pagamentos' }).first();
      const simular_pagamentos = simularRow ? simularRow.valor === 'true' : true;

      // Buscar provedores cadastrados dinamicamente
      const provedoresRow = await db('GamSaaSConfig').where({ chave: 'provedores_pagamento_json' }).first();
      let provedores = [];
      if (provedoresRow && provedoresRow.valor) {
        try {
          const parsed = JSON.parse(provedoresRow.valor);
          if (Array.isArray(parsed)) {
            provedores = parsed;
          }
        } catch (e) {}
      }

      // Fallback padrão se vazio
      if (provedores.length === 0) {
        provedores = [
          { id: 'stripe_default', nome: 'Stripe Integrado', tipo: 'STRIPE', ativo: true },
          { id: 'asaas_default', nome: 'Asaas Pix/Boleto', tipo: 'ASAAS', ativo: true }
        ];
      }

      // Filtra apenas os ativos para o inquilino
      const provedoresAtivos = provedores.filter(p => p.ativo);

      return res.json({
        success: true,
        empresa: {
          id: empresa.id,
          nome: empresa.nome,
          status: empresa.status,
          plano: empresa.plano,
          limite_corretores: empresa.limite_corretores,
          data_expiracao: empresa.data_expiracao,
          provedor_pagamento: empresa.provedor_pagamento || 'stripe_default',
          config_pagamento_json: empresa.config_pagamento_json,
          liberacao_emergencia: empresa.liberacao_emergencia,
          emergencia_expiracao: empresa.emergencia_expiracao
        },
        corretores_ativos: parseInt(total, 10),
        simular_pagamentos,
        provedores_disponiveis: provedoresAtivos
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async getFaturas(req, res) {
    try {
      const faturas = await db('GamFatura')
        .where({ empresa_id: req.empresa_id })
        .orderBy('data_vencimento', 'desc');
      return res.json({ success: true, data: faturas });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async pagarFatura(req, res) {
    try {
      const { faturaId, metodo_pagamento, provedor } = req.body;
      if (!faturaId) {
        return res.status(400).json({ success: false, error: 'ID da fatura é obrigatório' });
      }

      const fatura = await db('GamFatura')
        .where({ id: faturaId, empresa_id: req.empresa_id })
        .first();

      if (!fatura) {
        return res.status(404).json({ success: false, error: 'Fatura não encontrada' });
      }

      if (fatura.status === 'PAGA') {
        return res.status(400).json({ success: false, error: 'Fatura já está quitada' });
      }

      // Buscar provedores cadastrados dinamicamente
      const provedoresRow = await db('GamSaaSConfig').where({ chave: 'provedores_pagamento_json' }).first();
      let provedores = [];
      if (provedoresRow && provedoresRow.valor) {
        try {
          const parsed = JSON.parse(provedoresRow.valor);
          if (Array.isArray(parsed)) {
            provedores = parsed;
          }
        } catch (e) {}
      }

      const provId = provedor || 'stripe_default';
      const provConfig = provedores.find(p => p.id === provId || p.tipo === provId) || 
                         provedores.find(p => p.tipo === 'STRIPE') || 
                         { id: 'stripe_default', tipo: 'STRIPE', nome: 'Stripe' };

      const provedorTipo = provConfig.tipo || 'STRIPE';
      const metodoEscolhido = metodo_pagamento || 'CARTAO';

      // Obter configuração de simulação
      const simularRow = await db('GamSaaSConfig').where({ chave: 'simular_pagamentos' }).first();
      const simular = simularRow ? simularRow.valor === 'true' : true;

      if (simular) {
        // Modo sandbox/simulado: quita a fatura imediatamente e estende a licença
        await db('GamFatura')
          .where({ id: faturaId })
          .update({
            status: 'PAGA',
            metodo_pagamento: metodoEscolhido,
            provedor: provedorTipo,
            data_pagamento: db.fn.now(),
            updated_at: db.fn.now()
          });

        const empresa = await db('GamEmpresa').where({ id: req.empresa_id }).first();
        const novaDataExpiracao = new Date();
        const dataOriginal = new Date(empresa.data_expiracao);
        if (dataOriginal > novaDataExpiracao) {
          novaDataExpiracao.setTime(dataOriginal.getTime() + 30 * 24 * 60 * 60 * 1000);
        } else {
          novaDataExpiracao.setDate(novaDataExpiracao.getDate() + 30);
        }

        await db('GamEmpresa')
          .where({ id: req.empresa_id })
          .update({
            data_expiracao: novaDataExpiracao,
            status: 'ATIVO',
            liberacao_emergencia: false, // Limpa o bypass de cortesia se pago
            provedor_pagamento: provConfig.id,
            updated_at: db.fn.now()
          });

        return res.json({
          success: true,
          simulado: true,
          message: 'Fatura paga com sucesso (Simulação). Licença estendida em 30 dias.'
        });
      } else {
        // Caso real: Atualiza o provedor e método da fatura e retorna link mock/sandbox simulando checkout real
        await db('GamFatura')
          .where({ id: faturaId })
          .update({
            metodo_pagamento: metodoEscolhido,
            provedor: provedorTipo,
            updated_at: db.fn.now()
          });

        await db('GamEmpresa')
          .where({ id: req.empresa_id })
          .update({
            provedor_pagamento: provConfig.id,
            updated_at: db.fn.now()
          });

        // Retorna URLs de checkout e detalhes de pagamento mockados de acordo com o provedor e método
        let paymentInfo = {
          checkout_url: provedorTipo === 'STRIPE' 
            ? `https://checkout.stripe.com/pay/mock_${faturaId}` 
            : `https://sandbox.asaas.com/pay/mock_${faturaId}`,
          pix_qr_code: metodoEscolhido === 'PIX' ? '00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925V-Talentos SaaS6009SAO PAULO62070503***63041A2F' : null,
          pix_copia_cola: metodoEscolhido === 'PIX' ? '00020126360014BR.GOV.BCB.PIX0114+5511999999999520400005303986540510.005802BR5925V-Talentos SaaS6009SAO PAULO62070503***63041A2F' : null,
          boleto_linha: metodoEscolhido === 'BOLETO' ? '34191.79001 01043.513184 91020.150008 7 90020000019900' : null
        };

        return res.json({
          success: true,
          simulado: false,
          provedor: provedorTipo,
          metodo_pagamento: metodoEscolhido,
          paymentInfo,
          message: 'Instruções de pagamento geradas com sucesso!'
        });
      }
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async alterarMetodo(req, res) {
    try {
      const { provedor } = req.body;
      if (!provedor) {
        return res.status(400).json({ success: false, error: 'Provedor de pagamento é obrigatório' });
      }

      await db('GamEmpresa')
        .where({ id: req.empresa_id })
        .update({
          provedor_pagamento: provedor,
          updated_at: db.fn.now()
        });

      return res.json({ success: true, message: 'Provedor de pagamento preferencial atualizado' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async updateEmpresaBranding(req, res) {
    try {
      const { nome, logo_url, cor_primaria } = req.body;
      const empresa = await db('GamEmpresa').where({ id: req.empresa_id }).first();
      if (!empresa) {
        return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
      }

      const updatePayload = {
        nome: nome ? nome.trim() : empresa.nome,
        logo_url: logo_url !== undefined ? logo_url.trim() : empresa.logo_url,
        cor_primaria: cor_primaria ? cor_primaria.trim() : empresa.cor_primaria,
        updated_at: db.fn.now()
      };

      if (!updatePayload.nome) {
        return res.status(400).json({ success: false, error: 'O nome da empresa não pode ser vazio' });
      }

      await db('GamEmpresa').where({ id: req.empresa_id }).update(updatePayload);

      return res.json({
        success: true,
        message: 'Dados da empresa atualizados com sucesso!',
        data: {
          id: req.empresa_id,
          ...updatePayload
        }
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async criarFaturaAdicional(req, res) {
    try {
      const { plano } = req.body || {};
      const empresa = await db('GamEmpresa').where({ id: req.empresa_id }).first();
      if (!empresa) {
        return res.status(404).json({ success: false, error: 'Empresa não encontrada' });
      }

      const planoAlvo = plano || empresa.plano;

      // Determinar o valor e limites com base no plano alvo
      let valorFatura = 199.00;
      let limiteCorretores = 20;
      if (planoAlvo === 'PROFISSIONAL') {
        valorFatura = 399.00;
        limiteCorretores = 60;
      } else if (planoAlvo === 'ENTERPRISE') {
        valorFatura = 899.00;
        limiteCorretores = 150;
      }

      // Se o plano alvo for diferente do atual, atualiza o plano da empresa
      if (plano && plano !== empresa.plano) {
        await db('GamEmpresa')
          .where({ id: req.empresa_id })
          .update({
            plano: planoAlvo,
            limite_corretores: limiteCorretores,
            updated_at: db.fn.now()
          });
      }

      // Gerar a fatura pendente
      const faturaId = require('crypto').randomUUID();
      
      // Vencimento em 5 dias para faturas manuais do cliente
      const dataVencimento = new Date();
      dataVencimento.setDate(dataVencimento.getDate() + 5);

      await db('GamFatura').insert({
        id: faturaId,
        empresa_id: req.empresa_id,
        valor: valorFatura,
        status: 'PENDENTE',
        data_vencimento: dataVencimento,
        created_at: db.fn.now(),
        updated_at: db.fn.now()
      });

      return res.status(201).json({
        success: true,
        message: plano && plano !== empresa.plano
          ? `Plano atualizado para ${planoAlvo} com sucesso! Pague a nova fatura gerada para ativar.`
          : 'Nova fatura de renovação de licença gerada com sucesso!',
        faturaId
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  async cancelarFatura(req, res) {
    try {
      const { id } = req.params;

      const fatura = await db('GamFatura')
        .where({ id, empresa_id: req.empresa_id })
        .first();

      if (!fatura) {
        return res.status(404).json({ success: false, error: 'Fatura não encontrada' });
      }

      if (fatura.status === 'PAGA') {
        return res.status(400).json({ success: false, error: 'Não é possível cancelar uma fatura já paga.' });
      }

      await db('GamFatura').where({ id }).del();

      return res.json({ success: true, message: 'Fatura cancelada e removida com sucesso.' });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }
}

module.exports = new BillingController();
