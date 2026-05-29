const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const db = require('../src/backend/infra/db');

async function run() {
  console.log('Iniciando atualização de fator_conversao retroativo...');
  
  try {
    const transacoes = await db('GamTransacao');
    console.log(`Encontradas ${transacoes.length} transações no total.`);
    
    let atualizadas = 0;
    
    for (const t of transacoes) {
      let extras = {};
      if (t.dados_extras) {
        try {
          extras = typeof t.dados_extras === 'string' ? JSON.parse(t.dados_extras) : t.dados_extras;
        } catch (e) {
          extras = {};
        }
      }
      
      if (extras.fator_conversao_utilizado === undefined) {
        extras.fator_conversao_utilizado = 100;
        await db('GamTransacao')
          .where({ id: t.id })
          .update({ dados_extras: JSON.stringify(extras) });
        atualizadas++;
      }
    }
    
    console.log(`Sucesso: ${atualizadas} transações atualizadas com o fator 100.`);
  } catch (err) {
    console.error('Erro ao atualizar:', err);
  } finally {
    await db.destroy();
  }
}

run();
