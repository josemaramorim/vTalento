# SPEC — Plano de Implementação (Histórias e Tarefas)
## Documento: 08-IMPLEMENTATION-TASKS.md

Este documento é o guia de execução do projeto. Nenhuma tarefa deve ser iniciada sem estar documentada aqui e aprovada pelo usuário.

---

## FASE 1: Fundação do Ecossistema SaaS

### História 1: Setup do Workspace
*Como desenvolvedor, quero preparar a estrutura base do projeto para garantir organização e isolamento entre as camadas de Backend e Frontend.*

- [x] **Tarefa 1.1:** Inicializar o projeto Node.js (`npm init -y`) na raiz.
- [x] **Tarefa 1.2:** Criar estrutura de diretórios:
    - `src/backend` (API, Regras de Negócio, Infra)
    - `src/frontend` (Interface Web Premium)
- [x] **Tarefa 1.3:** Configurar arquivo `.gitignore` (node_modules, .env, *.db).

### História 2: Infraestrutura de Dados Multi-Tenant
*Como arquiteto, preciso estabelecer a base de dados SaaS para garantir que cada empresa tenha seus dados estritamente isolados.*

- [x] **Tarefa 2.1:** Instalar dependências base do Backend:
    - `express`, `cors`, `dotenv`, `knex`, `sqlite3`, `pg`.
- [x] **Tarefa 2.2:** Configurar o `knexfile.js` e a conexão com o banco de dados (SQLite/Postgres).
- [x] **Tarefa 2.3:** Criar a Migration inicial para a tabela `GamEmpresa` (Tenants).
- [x] **Tarefa 2.4:** Criar a Migration da tabela `GamUsuario` (Autenticação Multi-Tenant).

---

## FASE 2: Autenticação e Identidade SaaS

### História 3: Login Universal
*Como usuário (Corretor ou Admin), quero realizar login em um portal único para ser redirecionado ao ambiente personalizado da minha empresa.*

- [x] **Tarefa 3.1:** Implementar o serviço de autenticação (JWT).
- [x] **Tarefa 3.2:** Criar o middleware de identificação de Tenant (Extração do `empresa_id` a partir do usuário logado).
- [x] **Tarefa 3.3:** Endpoint de "Meus Dados" que retorna o tema visual da empresa (Logo/Cores).

### História 4: Interface de Acesso (Frontend)
*Como usuário, quero uma interface premium para me autenticar e acessar meu painel de prêmios.*

- [x] **Tarefa 4.1:** Configurar estrutura base do Frontend (Index, CSS Global, Assets).
- [x] **Tarefa 4.2:** Desenvolver a Tela de Login com estética "Airy" e Glassmorphism.
- [x] **Tarefa 4.3:** Implementar a lógica de consumo da API de Login e armazenamento do Token.
- [x] **Tarefa 4.4:** Criar o layout base do Dashboard com barra lateral e cabeçalho responsivo.

---

## FASE 3: Motor de Importação e Gamificação

### História 5: Importação de Planilhas (CSV/Excel)
*Como administrador, quero fazer upload de planilhas financeiras para que o sistema distribua talentos automaticamente aos corretores.*

- [ ] **Tarefa 5.1:** Criar backend para processamento de arquivos (usando `xlsx` ou `csv-parser`).
- [ ] **Tarefa 5.2:** Implementar lógica de distribuição de saldo (Total recebido -> Percentual definido em GamEmpresa -> Atualiza `saldo_disponivel` do Usuário).
- [ ] **Tarefa 5.3:** Criar tela no frontend para upload de arquivos com barra de progresso.

### História 6: Lançamento Manual de Talentos
*Como administrador, quero poder adicionar ou remover talentos manualmente de um corretor específico, justificando a ação (ex: bônus extra ou correção).*

- [ ] **Tarefa 6.1:** Criar endpoint no backend (POST `/api/admin/lancamento-manual`) que recebe `usuario_id`, `valor` e `justificativa`, atualizando o saldo imediatamente.
- [ ] **Tarefa 6.2:** Criar tabela no banco de dados (`GamTransacao`) para registrar o histórico/extrato de movimentações (quem lançou, para quem, valor, data e justificativa).
- [ ] **Tarefa 6.3:** Criar interface no painel Admin contendo busca de corretor e formulário de lançamento.

---

## FASE 4: Vitrine de Prêmios e Resgate
*(A ser detalhado após conclusão da Fase 3)*
