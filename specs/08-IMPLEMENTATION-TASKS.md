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

### História 4.5 (Técnica): Cobertura de Testes
*Como engenheiro, quero garantir a estabilidade do fluxo de login e aderência à nova política de testes.*

- [x] **Tarefa 4.5.1:** Instalar dependências de teste (`jest`, `supertest`, `sqlite3` in-memory).
- [x] **Tarefa 4.5.2:** Escrever testes unitários para o `AutenticacaoService`.
- [x] **Tarefa 4.5.3:** Escrever testes de integração para o endpoint `/api/auth/login`.

---

## FASE 3: Motor de Importação e Gamificação

### História 5: Importação de Planilhas (CSV/Excel)
*Como administrador, quero fazer upload de planilhas financeiras para que o sistema distribua talentos automaticamente aos corretores.*

- [x] **Tarefa 5.1:** Criar backend para processamento de arquivos (usando `xlsx` ou `csv-parser`).
- [x] **Tarefa 5.2:** Implementar lógica de distribuição de saldo (Total recebido -> Percentual definido em GamEmpresa -> Atualiza `saldo_disponivel` do Usuário).
- [x] **Tarefa 5.3:** Criar tela no frontend para upload de arquivos com barra de progresso.

### História 6: Lançamento Manual de Talentos
*Como administrador, quero poder adicionar ou remover talentos manualmente de um corretor específico, justificando a ação (ex: bônus extra ou correção).*

- [x] **Tarefa 6.1:** Criar endpoint no backend (POST `/api/admin/lancamento-manual`) que recebe `usuario_id`, `valor` e `justificativa`, atualizando o saldo imediatamente.
- [x] **Tarefa 6.2:** Criar tabela no banco de dados (`GamTransacao`) para registrar o histórico/extrato de movimentações (quem lançou, para quem, valor, data e justificativa).
- [x] **Tarefa 6.3:** Criar interface no painel Admin contendo busca de corretor e formulário de lançamento.

---

## FASE 4: Vitrine de Prêmios e Resgate
*Como usuário, quero acessar uma vitrine de recompensas e solicitar resgates com saldo validado e transações registradas.*

- [x] **Tarefa 4.1:** Criar SPEC de Vitrine de Prêmios em `specs/09-VITRINE-DE-PREMIOS.md`.
- [x] **Tarefa 4.2:** Criar migração inicial para tabelas `Premio`, `VitrineItem` e `Resgate`.
- [x] **Tarefa 4.3:** Implementar `PremioService` com métodos `list`, `create` e `requestResgate`.
- [x] **Tarefa 4.4:** Implementar `PremioController` e rotas públicas/admin.
- [x] **Tarefa 4.5:** Escrever testes para `PremioService` e `PremioController` (`supertest`).
- [x] **Tarefa 4.6:** Implementar Frontend Admin para CRUD de prêmios (`admin-premios.html`).
- [x] **Tarefa 4.7:** Integrar navegação lateral consistente (Sidebar) em `dashboard.html`, `admin-lancamento.html`, `admin-importacao.html` e `admin-premios.html`.
- [x] **Tarefa 4.8:** Implementar Frontend do Colaborador para visualização e resgate de recompensas (`vitrine.html`).
- [x] **Tarefa 4.9:** Atualizar endpoint `/api/auth/me` para prover dados de perfil e saldo em tempo real no frontend.
- [x] **Tarefa 4.10 (Segurança / Multi-Tenant): Refatoração para Isolamento Estrito por Tenant:**
    - [x] **Tarefa 4.10.1:** Atualizar a migration `202605250001_create_premios_resgates.js` para adicionar `empresa_id` em `Premio` e `VitrineItem`.
    - [x] **Tarefa 4.10.2:** Atualizar a semente `01_initial_data.js` para atrelar prêmios a `empresaId` e atualizar banco local.
    - [x] **Tarefa 4.10.3:** Refatorar `PremioService` e `PremioController` para isolar listagem, criação, edição, deleção e resgates por `empresa_id`.
    - [x] **Tarefa 4.10.4:** Proteger rota `GET /premios` com `tenantMiddleware` e incluir cabeçalhos no frontend `vitrine.html`.
    - [x] **Tarefa 4.10.5:** Refatorar as suítes de testes (`Jest/Supertest`) para incluir o contexto e asserts de `empresa_id`.

---

## FASE 4.5: Estabilização de Interface, Notificações e Documentação de Operação

### História 7: Lapidação Premium de Notificações, Lançamentos e Integração Técnica
*Como usuário e desenvolvedor, quero que todos os alertas da aplicação sigam a identidade premium (Toast Glassmorphism), que o lançamento manual aceite e envie valores perfeitamente sanitizados, e que haja um guia centralizado para rodar o ecossistema.*

- [x] **Tarefa 7.1:** Substituir todos os `alert()` nativos nos arquivos administrativos (`admin-lancamento.html`, `admin-premios.html`, `admin-importacao.html`) pelo componente premium global `showToast()` importado via `auth.js`.
- [x] **Tarefa 7.2:** Sanitizar os campos numéricos no formulário do frontend `admin-lancamento.html` convertendo-os explicitamente para float antes de realizar a requisição, prevenindo erros de tipagem/validação no backend.
- [x] **Tarefa 7.3:** Criar o arquivo central de documentação e guia de execução `README.md` detalhando as instruções exatas para inicialização dos ambientes do Backend e Frontend concorrentemente (`npm run dev`) ou individualmente.
- [x] **Tarefa 7.4:** Corrigir os botões de alternância de Tema em `admin-lancamento.html` e `admin-importacao.html` garantindo compatibilidade total com o gerenciador global de temas de `auth.js`.
- [x] **Tarefa 7.5:** Implementar a persistência do tema preferido no banco de dados (`GamUsuario`) adicionando uma coluna `tema_preferido` ('light' ou 'dark') via migration, sincronizando o tema local da sessão com a API na autenticação.
- [x] **Tarefa 7.6:** Reestruturar e embelezar o `dashboard.html` para Administradores, exibindo métricas de alto valor como: Total de Talentos Distribuídos, Total de Prêmios Resgatados, Gráfico de Movimentações Recentes e Rápido Atalho de Ações Administrativas.

---

## FASE 4.6: Blindagem Sistêmica da Governança (Pre-Commit Guard)

### História 8: Proteção Automatizada contra Edições sem Específicas no Roadmap
*Como administrador e responsável pelo código, quero um mecanismo automatizado (Git Hook Pre-Commit) que impeça IAs ou desenvolvedores de commitar qualquer código modificado se as tarefas correspondentes no arquivo físico specs/08-IMPLEMENTATION-TASKS.md não estiverem explicitamente como "Em Andamento" ou "Concluídas".*

- [x] **Tarefa 8.1:** Criar um script de auditoria e validação física em node (`src/backend/infra/scripts/preCommitValidator.js`) que varra as modificações pendentes no git e certifique que a especificação specs/08-IMPLEMENTATION-TASKS.md tenha tarefas sinalizadas para o escopo.
- [x] **Tarefa 8.2:** Configurar um pre-commit hook nativo na pasta `.git/hooks/pre-commit` para executar este validador e abortar a operação de commit caso o checklist físico não esteja alinhado.
- [x] **Tarefa 8.3:** Documentar este validador na especificação de governança (specs/06-IA-GOVERNANCE.md) para blindar a integridade técnica.

---

## FASE 4.7: Lapidação e Melhorias no App do Corretor (Colaborador)

### História 9: Experiência Premium e Histórico de Resgates do Corretor
*Como corretor, quero que meu histórico de resgates reflita perfeitamente as minhas transações efetuadas e que meu painel inicial exiba saldos claros e extrato de talentos completo.*

- [x] **Tarefa 9.1:** Ajustar e corrigir no backend (`PremioController.js`) a associação de `usuario_id` com base no token JWT (`req.usuario_id`), e criar teste unitário para validar resgate simulado de corretor logado.
- [x] **Tarefa 9.2:** Melhorar o `dashboard.html` para corretores, exibindo em destaque tanto o "Saldo Disponível" quanto o "Saldo a Receber" daquele corretor de forma visualmente estimulante (premium).
- [x] **Tarefa 9.3:** Integrar uma tabela de extrato com histórico recente das transações individuais de ganho/resgate do corretor diretamente no `dashboard.html` para total clareza.




