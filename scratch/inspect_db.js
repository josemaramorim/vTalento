const db = require('../src/backend/infra/db');

async function inspect() {
  try {
    const users = await db('GamUsuario').select('id', 'nome', 'email', 'ativo');
    console.log('USERS IN DB:', users);
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}

inspect();
