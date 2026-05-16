# SPEC — Plano de Implementação (Histórias e Tarefas)
## Documento: 08-IMPLEMENTATION-TASKS.md

Este documento é o guia de execução do projeto. Nenhuma tarefa deve ser iniciada sem estar documentada aqui e aprovada pelo usuário.

---

## FASE 1: Fundação do Ecossistema SaaS

### História 1: Setup do Workspace
*Como desenvolvedor, quero preparar a estrutura base do projeto para garantir organização e isolamento entre as camadas de Backend e Frontend.*

- [ ] **Tarefa 1.1:** Inicializar o projeto Node.js (`npm init -y`) na raiz.
- [ ] **Tarefa 1.2:** Criar estrutura de diretórios:
    - `src/backend` (API, Regras de Negócio, Infra)
    - `src/frontend` (Interface Web Premium)
- [ ] **Tarefa 1.3:** Configurar arquivo `.gitignore` (node_modules, .env, *.db).

### História 2: Infraestrutura de Dados Multi-Tenant
*Como arquiteto, preciso estabelecer a base de dados SaaS para garantir que cada empresa tenha seus dados estritamente isolados.*

- [ ] **Tarefa 2.1:** Instalar dependências base do Backend:
    - `express`, `cors`, `dotenv`, `knex`, `sqlite3` (para desenvolvimento rápido).
- [ ] **Tarefa 2.2:** Configurar o `knexfile.js` e a conexão com o banco de dados.
- [ ] **Tarefa 2.3:** Criar a Migration inicial para a tabela `GamEmpresa` (Tenants).
- [ ] **Tarefa 2.4:** Criar a Migration da tabela `GamUsuario` (Autenticação Multi-Tenant).

---

## FASE 2: Autenticação e Identidade SaaS

### História 3: Login Universal
*Como usuário (Corretor ou Admin), quero realizar login em um portal único para ser redirecionado ao ambiente personalizado da minha empresa.*

- [ ] **Tarefa 3.1:** Implementar o serviço de autenticação (JWT).
- [ ] **Tarefa 3.2:** Criar o middleware de identificação de Tenant (Extração do `empresa_id` a partir do usuário logado).
- [ ] **Tarefa 3.3:** Endpoint de "Meus Dados" que retorna o tema visual da empresa (Logo/Cores).

---

## FASE 3: Motor de Importação e Gamificação (Próximos Passos...)
*(A ser detalhado após conclusão da Fase 1)*
