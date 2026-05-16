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
};
