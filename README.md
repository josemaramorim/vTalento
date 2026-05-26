# V-Talentos — Guia de Inicialização e Execução do Ecossistema

Este guia fornece instruções detalhadas sobre como configurar, executar e testar todo o ecossistema SaaS do **V-Talentos** localmente.

---

## 🚀 Como Executar o Ecossistema (Backend e Frontend)

O projeto possui um utilitário integrado de execução simultânea (`concurrently`) que permite iniciar tanto o servidor de API (Backend) quanto o servidor web de desenvolvimento (Frontend) através de um único comando.

### Execução Simultânea (Recomendado)
Para iniciar ambos os ambientes em paralelo na mesma janela de terminal, execute:
```bash
npm run dev
```

Após iniciar, os ambientes estarão disponíveis em:
- **Frontend App:** [http://localhost:3000](http://localhost:3000) (Tela de Login/Interface)
- **Backend API:** [http://localhost:3001](http://localhost:3001)

---

## 🛠️ Execução Individual (Alternativa)

Se preferir rodar os servidores em terminais separados, você pode usar os comandos individuais abaixo:

### 1. Iniciar apenas o Backend (API)
```bash
npm run backend:dev
```
*Porta padrão da API: `3001`*

### 2. Iniciar apenas o Frontend (Servidor de Estáticos)
```bash
npm run frontend:dev
```
*Porta padrão da Web: `3000`*

---

## 💾 Banco de Dados, Migrations e Seeds (SQLite)

O projeto utiliza o **Knex.js** para gerenciar o esquema do banco de dados relacional. Por padrão, em ambiente de desenvolvimento local, o banco SQLite é gerado em `src/backend/infra/database.sqlite`.

### Reconstruir o Esquema do Banco
Se você precisar recriar as tabelas e aplicar as migrations do zero:
```bash
npx knex migrate:rollback --all
npx knex migrate:latest
```

### Popular o Banco com Dados Iniciais (Seeds)
Para popular os dados de demonstração (Empresa `Construtora Haja`, Admin, Corretores e Prêmios padrão de amostra):
```bash
npx knex seed:run
```

---

## 🧪 Como Executar a Suíte de Testes (Jest)

Nossos fluxos e serviços críticos de negócios possuem 100% de cobertura de testes de integração e unitários para evitar regressões de código e brechas em isolamento de dados SaaS.

Para executar todos os testes da aplicação:
```bash
npm test
```
