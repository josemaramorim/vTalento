require('dotenv').config();

module.exports = {
  development: {
    client: 'sqlite3',
    connection: {
      filename: './src/backend/infra/database.sqlite'
    },
    useNullAsDefault: true,
    migrations: {
      directory: './src/backend/infra/migrations'
    },
    seeds: {
      directory: './src/backend/infra/seeds'
    }
  },

  production: {
    client: 'postgresql',
    connection: {
      host: process.env.DB_HOST,
      database: process.env.DB_NAME,
      user:     process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      port:     process.env.DB_PORT || 5432
    },
    pool: {
      min: 2,
      max: 10
    },
    migrations: {
      directory: './src/backend/infra/migrations'
    }
  }
};
