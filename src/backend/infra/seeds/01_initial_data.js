const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> } 
 */
exports.seed = async function(knex) {
  // Deleta dados existentes
  await knex('GamUsuario').del();
  await knex('GamEmpresa').del();

  const empresaId = 'b1b1b1b1-b1b1-b1b1-b1b1-b1b1b1b1b1b1';
  const senhaHash = await bcrypt.hash('123456', 10);

  // Insere Empresa Exemplo
  await knex('GamEmpresa').insert({
    id: empresaId,
    nome: 'Construtora Haja',
    slug: 'haja',
    plano: 'PROFISSIONAL',
    limite_corretores: 60,
    logo_url: 'https://haja.com.br/logo.png',
    cor_primaria: '#D4AF37',
    status: 'ATIVO'
  });

  // Insere Usuário Exemplo (Admin da Empresa)
  await knex('GamUsuario').insert({
    id: 'a1a1a1a1-a1a1-a1a1-a1a1-a1a1a1a1a1a1',
    empresa_id: empresaId,
    nome: 'Admin Haja',
    email: 'admin@haja.com.br',
    senha_hash: senhaHash,
    perfil: 'ADMIN_EMPRESA',
    saldo_disponivel: 0,
    saldo_a_receber: 0
  });

  // Insere Usuário Exemplo (Corretor / Colaborador)
  await knex('GamUsuario').insert({
    id: 'c2c2c2c2-c2c2-c2c2-c2c2-c2c2c2c2c2c2',
    empresa_id: empresaId,
    nome: 'Corretor Haja',
    email: 'corretor@haja.com.br',
    senha_hash: senhaHash,
    perfil: 'CORRETOR',
    saldo_disponivel: 1500.00,
    saldo_a_receber: 0
  });

  // Deleta dados de prêmios existentes
  await knex('Resgate').del();
  await knex('VitrineItem').del();
  await knex('Premio').del();

  // Insere Prêmios de Exemplo atrelados a Construtora Haja
  await knex('Premio').insert([
    {
      empresa_id: empresaId,
      titulo: 'Voucher iFood R$ 50',
      descricao: 'Resgate um voucher de R$ 50 para usar no iFood quando quiser.',
      quantidade_disponivel: 10,
      custo_pontos: 150,
      ativo: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      empresa_id: empresaId,
      titulo: 'Voucher Netflix 1 Mês',
      descricao: 'Um mês de assinatura Netflix Premium para assistir seus filmes e séries.',
      quantidade_disponivel: 5,
      custo_pontos: 250,
      ativo: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    },
    {
      empresa_id: empresaId,
      titulo: 'Fone de Ouvido Bluetooth JBL',
      descricao: 'Fone de ouvido JBL Pure Bass de alta qualidade.',
      quantidade_disponivel: 2,
      custo_pontos: 800,
      ativo: true,
      created_at: knex.fn.now(),
      updated_at: knex.fn.now()
    }
  ]);
};
