const db = require('../db');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

async function run() {
  console.log('🔄 Inicializando banco de dados e verificando configurações/super_admin...');

  try {
    // 1. Verificar/criar configurações padrão da plataforma (SaaS)
    const saasConfigs = [
      { chave: 'dias_padrao_cortesia', valor: '7' },
      { chave: 'simular_pagamentos', valor: 'true' }
    ];

    for (const config of saasConfigs) {
      const exists = await db('GamSaaSConfig').where({ chave: config.chave }).first();
      if (!exists) {
        await db('GamSaaSConfig').insert(config);
        console.log(`✅ Configuração inserida: ${config.chave} = ${config.valor}`);
      } else {
        console.log(`ℹ️ Configuração '${config.chave}' já existe.`);
      }
    }

    // 2. Verificar se já existe algum super admin
    const superAdmin = await db('GamUsuario').where({ perfil: 'SUPER_ADMIN' }).first();

    if (!superAdmin) {
      // Ler variáveis de ambiente com fallbacks seguros
      const email = process.env.INITIAL_SUPER_ADMIN_EMAIL || 'super@plataforma.com.br';
      const password = process.env.INITIAL_SUPER_ADMIN_PASSWORD || '123456';
      
      const senhaHash = await bcrypt.hash(password, 10);

      await db('GamUsuario').insert({
        id: uuidv4(),
        empresa_id: null,
        nome: 'Super Admin',
        email: email,
        senha_hash: senhaHash,
        perfil: 'SUPER_ADMIN',
        saldo_disponivel: 0,
        saldo_a_receber: 0
      });

      console.log('====================================================');
      console.log('🎉 USUÁRIO SUPER_ADMIN CRIADO COM SUCESSO EM PRODUÇÃO!');
      console.log(`📧 E-mail: ${email}`);
      console.log(`🔑 Senha: ${password}`);
      console.log('⚠️ Altere esta senha imediatamente após fazer o primeiro login.');
      console.log('====================================================');
    } else {
      console.log(`ℹ️ Um usuário SUPER_ADMIN já existe no banco (${superAdmin.email}).`);
    }

  } catch (error) {
    console.error('❌ Erro durante a inicialização do banco/super_admin:', error);
    process.exit(1);
  } finally {
    await db.destroy();
    console.log('🔌 Conexão com o banco de dados encerrada graciosamente.');
  }
}

run();
