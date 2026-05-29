# SPEC — Plano de Implementação (Histórias e Tarefas)
## Documento: 08-IMPLEMENTATION-TASKS.md

Este documento é o guia de execução do projeto. Nenhuma tarefa deve ser iniciada sem estar documentada aqui e aprovada pelo usuário.

>> Observação: Nenhuma alteração de código deve ser iniciada antes da atualização física das SPECs (itens 12.1, 12.2, 12.3) e aprovação do Product Owner.
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
- [/] **Tarefa 5.4:** Implementar auto-mapeamento de colunas para o Motor de Importação, permitindo sugestão de mapeamento a partir dos cabeçalhos da planilha.
- [ ] **Tarefa 5.5:** Adicionar suporte opcional de IA ao auto-mapeamento, controlado pelo parâmetro `usa_ia`, para inferir nomes de campos com base em cabeçalhos e amostras.
- [ ] **Tarefa 5.6:** Atualizar `admin-importacao.html` para oferecer a opção "Sugerir mapeamento automático" e permitir revisão manual antes de salvar o perfil.
- [ ] **Tarefa 5.7:** Documentar no spec que a etapa "Carregar Planilha" serve apenas para análise/preview e não realiza importação definitiva.

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

---

## FASE 4.8: Correção de Bug Crítico — Resgate de Prêmios (400 Bad Request)

### História 10: Correção do Constraint de Origem em GamTransacao
*Como corretor, quero conseguir resgatar prêmios sem erros de banco de dados.*

- [x] **Tarefa 10.1:** Criar migration `20260526010000_update_transacoes_add_premio_origem.js` para adicionar `'PREMIO'` ao CHECK constraint do campo `origem` na tabela `GamTransacao` (SQLite não suporta ALTER COLUMN — tabela recriada via raw SQL).

---

## FASE 4.9: Painel Admin de Resgates na Vitrine de Recompensas

### História 11: Visão Gerencial de Resgates para Administradores
*Como administrador, quero visualizar na página Vitrine de Recompensas um painel completo com todos os resgates realizados pelos corretores da minha empresa, com filtros avançados (status, corretor, prêmio, data inicial, data final) e paginação, para ter total controle e visibilidade sobre as recompensas consumidas.*

**Regras de Negócio:**
- Admin **NÃO** pode resgatar prêmios — botão "RESGATAR" deve ser ocultado/desabilitado com banner informativo.
- Admin vê resgates de **todos** os corretores da sua empresa (isolamento multi-tenant obrigatório).
- Corretor vê apenas seu próprio histórico (comportamento atual preservado, sem nenhuma alteração).
- Todos os dados, labels, mensagens e status devem estar em **Português**.

**Filtros disponíveis (Admin):**
- Status: Todos / Pendente / Confirmado / Cancelado / Falha
- Corretor: Dropdown populado com os corretores ativos da empresa
- Prêmio: Dropdown com os prêmios cadastrados da empresa
- Data Inicial e Data Final (filtro por `Resgate.created_at`)

**Paginação:** Padrão de 10 registros por página. O usuário pode selecionar entre **10, 50 ou 100** registros por página via combobox (select) — o valor padrão é sempre **10**. Controles: Anterior / Próximo + indicador "Página X de Y — Total: N registros".

#### Tarefas de Backend

- [x] **Tarefa 11.1:** Atualizar `specs/09-VITRINE-DE-PREMIOS.md` — Seção 6 (Endpoints) para documentar o novo endpoint `GET /api/admin/resgates` com parâmetros de query (`page`, `limit`, `status`, `corretor_id`, `premio_id`, `data_inicio`, `data_fim`). O parâmetro `limit` aceita os valores 10, 50 ou 100 (default: 10).
- [x] **Tarefa 11.2:** Adicionar método `listAllResgatesAdmin({ empresa_id, page, limit, status, corretor_id, premio_id, data_inicio, data_fim })` no `PremioService.js` com join em `GamUsuario` (nome do corretor) e `Premio` (título), retornando `{ data, total, page, totalPages }`. O `limit` deve ser validado — valores fora de [10, 50, 100] são rejeitados com fallback para 10.
- [x] **Tarefa 11.3:** Adicionar método `listAllResgatesAdmin` no `PremioController.js` para receber os query params e chamar o serviço, com tratamento de erros e resposta padrão `{ success: true, data, meta }`.
- [x] **Tarefa 11.4:** Registrar a rota `GET /api/admin/resgates` no arquivo `admin.js` (protegida por `tenantMiddleware` + `adminMiddleware`, conforme governança Seção C).
- [x] **Tarefa 11.5:** Escrever testes de integração (Supertest) para o endpoint `GET /api/admin/resgates` validando: caminho feliz com paginação, filtro por status, filtro por data, limit=50, e isolamento multi-tenant (admin de empresa A não vê resgates de empresa B).

#### Tarefas de Frontend

- [x] **Tarefa 11.6:** Modificar `vitrine.html` — lógica de renderização condicional por perfil:
  - **Se Admin:** Ocultar botão "RESGATAR" nos cards de prêmios; exibir banner informativo "Apenas corretores podem resgatar prêmios".
  - **Se Corretor:** Manter comportamento atual 100% intacto.
- [x] **Tarefa 11.7:** Implementar no `vitrine.html` (visão Admin) o bloco "Painel de Resgates da Equipe" com:
  - Formulário de filtros: Status (select), Corretor (select), Prêmio (select), Data Inicial (date input), Data Final (date input), Botão "Filtrar" e "Limpar Filtros".
  - Tabela com colunas: Data/Hora, Corretor, Prêmio, Qtd., Custo Total (T$), Status (badge colorido).
  - Controles de paginação: Combobox "Registros por página" com opções **10 / 50 / 100** (default: 10), Botões Anterior / Próximo, indicador "Página X de Y — N resgates no total". Ao alterar o combobox, a tabela recarrega automaticamente voltando para a página 1.
  - Estado vazio: mensagem "Nenhum resgate encontrado com os filtros aplicados."
  - Design seguindo o padrão Glassmorphism premium já estabelecido no projeto.

---

### FASE 5: Importação Avançada e Redesign (Campos Customizáveis, Identificador Extra e UI)

### História 12: Motor de Importação Flexível e Multissegmento
*Como administrador (de imobiliárias, varejo, educação, saúde, etc.), quero um motor de importação que permita mapear campos fixos e customizáveis, definir um identificador adicional para evitar ambiguidade entre usuários e executar o fluxo de importação em etapas separadas para garantir usabilidade e auditabilidade.*

**Regras de Negócio e Comportamento Esperado:**
- **Campos Fixos vs Campos Extras:** O motor mantém suporte a campos fixos essenciais (ex: `corretor(nome)`, `valor_venda`, `valor_pago`) e introduz `campos_extras` configuráveis por perfil. Os campos extras são armazenados em `dados_extras` (JSON) por registro importado.
- **Identificador Extra:** Perfis podem declarar uma coluna `identificador_extra` (ex: `CRECI`, `CPF`, `matricula`). Quando mapeado, a resolução de usuário prioriza `nome + identificador`. Se o identificador estiver ausente/ vazio, ocorre fallback para `nome`.
- **Ambiguidade e Inconsistências:** Em caso de múltiplos candidatos (ex.: dois usuários com mesmo nome e sem identificador), o registro será marcado como `inconsistente` e listado no preview com `candidatos` sugeridos para revisão manual.
- **Retrocompatibilidade:** Perfis existentes continuam funcionando sem mudanças; novas opções são opcionais e retrocompatíveis.
- **Multi-Tenant:** Todo lookup e persistência respeitam `empresa_id` do tenant atual.
- **Persistência Temporária entre Etapas:** O fluxo em 3 páginas (Upload → Preview → Confirmar) deve preservar estado (arquivo, perfil, mapeamentos) para permitir navegação reversa sem perda de dados.
- **Auditabilidade e Telemetria:** Cada importação produz um resumo com estatísticas (total linhas, resolvidos, inconsistências) e armazena `dados_extras` para futuras consultas/exportações.

**Critérios de Aceite (mínimos):**
- Criar/editar perfis com `identificador_extra` e `campos_extras` via API e UI.
- Importar planilha usando `identificador_extra` de forma a associar corretamente usuários quando dados válidos.
- Registros ambíguos são sinalizados no preview com candidatos sugeridos.
- Perfis antigos operam inalterados.
- APIs e UI expõem `dados_extras` no preview e nos relatórios de importação.

---

#### Tarefas de Especificação (detalhadas)
- [x] **Tarefa 12.1:** Atualizar `specs/07-INTEGRATION-IMPORT.md` com:
  - Descrição do campo `identificador_extra` (nome, propósito, exemplos: `CRECI`, `CPF`, `matricula`).
  - Definição de `campos_extras` como lista de pares {label, coluna_planilha} configuráveis por perfil.
  - Exemplo de payload de perfil de importação e exemplos de mapeamento.
  - Critério de Aceite: Documento contém exemplos e JSON de input/output, revisado e aprovado.
- [x] **Tarefa 12.2:** Atualizar `specs/01-DATA-MODEL.md` com:
  - Adição de campo `dados_extras JSON` na tabela de lançamentos/importações (`GamLancamento` ou equivalente).
  - Novo campo opcional `identificador_extra_coluna` no modelo de `PerfilImportacao` (referência da coluna mapeada).
  - Regras de negócio: priorização de busca por `nome + identificador` quando disponível; fallback para `nome` caso identificador não mapeado ou vazio.
  - Critério de Aceite: Data model documentado e exemplos de queries para buscas.
- [x] **Tarefa 12.3:** Atualizar `specs/04-UI-UX-DESIGN.md` com wireframes e comportamento:
  - Wireframes para 3 páginas independentes: `upload.html`, `preview.html`, `confirm.html`.
  - Modal de gerenciamento de perfis incluindo: nome do perfil, linha do cabeçalho, separador, `identificador_extra` (select de colunas) e lista de `campos_extras` (label + coluna mapeada).
  - Critério de Aceite: Protótipos ou descrições aprovadas pelo produto.

#### Tarefas de Backend (detalhadas)
- [x] **Tarefa 12.4:** Model & Migration — `perfil_importacao` / `GamLancamento`
  - Criar migration `20260528_add_import_extra_fields.js` que:
    - Adiciona `identificador_extra_coluna` (string/nullable) ao `perfil_importacao`.
    - Adiciona `dados_extras` (JSON nullable) à tabela de lançamentos/importações (`GamLancamento` ou tabela equivalente usada pelo motor).
  - Critério de Aceite: Migration criada e executável localmente sem perda de dados.
- [x] **Tarefa 12.5:** API — Endpoints para gerenciar `campos_extras`
  - Atualizar endpoints existentes `GET/POST/PUT /api/admin/importacao/perfis` para aceitar/retornar `identificador_extra_coluna` e `campos_extras` (array de {label, coluna}).
  - Critério de Aceite: API aceita payloads novos e valida o formato.
- [x] **Tarefa 12.6:** Import Service — lógica de resolução de usuário e armazenamento
  - Atualizar `ImportacaoService.sugerirMapeamento` e `ImportacaoService.confirm` (ou método equivalente) para:
    - Quando `identificador_extra_coluna` estiver presente e não vazia, buscar usuário por `nome_corretor` + valor_do_identificador (ambos normalizados).
    - Se encontrar múltiplos matches, marcar como inconsistência e registrar possíveis candidatos para revisão manual.
    - Armazenar colunas configuradas como `campos_extras` no `dados_extras` JSON do registro importado.
  - Critério de Aceite: Serviço passa testes unitários cobrindo busca com/sem identificador, e grava `dados_extras` corretamente.
- [x] **Tarefa 12.7:** Testes Backend
  - Testes unitários para `ImportacaoService` (Jest): cenário feliz, ambiguidade (dois nomes iguais), identificador extra presente/ausente, fallback por nome.
  - Testes de integração (Supertest) para endpoints de perfis e preview/confirm usando banco em memória.
  - Critério de Aceite: Suites verdes em CI local.

#### Tarefas de Frontend (detalhadas)
- [x] **Tarefa 12.8:** Arquitetura de páginas
  - Criar as páginas `src/frontend/admin-importacao-upload.html`, `admin-importacao-preview.html`, `admin-importacao-confirm.html` (ou rotas SPA equivalentes).
  - Cada página tem responsabilidades únicas e botões de navegação (Avançar/Voltar).
  - Critério de Aceite: páginas navegáveis e load/restore do estado do upload.
- [x] **Tarefa 12.9:** UI de Perfis e Campos Extras
  - Modal/rota para criar/editar `PerfilImportacao` com campos: `nome`, `linha_cabecalho`, `separador`, `identificador_extra_coluna` (select) e `campos_extras` (lista dinâmica de label+coluna).
  - Critério de Aceite: perfil salvo via API e listado corretamente.
- [x] **Tarefa 12.10:** Persistência entre etapas
  - Implementar persistência temporária (localStorage ou sessionStorage) para manter `selectedFileBase64`, `perfilSelecionado`, e mapeamentos entre páginas.
  - Critério de Aceite: usuário pode navegar entre etapas sem perder dados.
- [x] **Tarefa 12.11:** Preview & Confirm UI
  - Preview mostra primeiras N linhas, inconsistências, candidatos para correção manual (quando múltiplos matches), resumo de estatísticas.
  - Confirm executa POST `/api/admin/importacao/confirm` e mostra resultado detalhado.
  - Critério de Aceite: publicação do import resulta em registros persistidos com `dados_extras`.

---

### FASE 6: Fator de Conversão Configurável e Baixa em Lote

### História 13: Flexibilidade Multi-Tenant e Operação em Lote
*Como administrador de múltiplos perfis de empresa, quero poder configurar dinamicamente o fator de conversão de moeda (R$ para Talentos) direto no perfil de importação, além de precisar de uma tela específica para aplicar a compensação de múltiplas transações simultaneamente com a flexibilidade de aplicar datas retroativas.*

**Critérios de Aceite:**
- `GamConfigImportacao` e a interface de perfis devem suportar "fator_conversao" (float, default 100) e "formato_data_balao".
- `ImportacaoService` não usa mais o hardcode `* 0.01`, calculando divisões baseadas no novo parâmetro. O fator utilizado deve constar em `dados_extras`.
- Existência de script retroativo para injetar `{"fator_conversao_utilizado": 100}` nas transações passadas.
- Criação da página `admin-baixas.html` focada exclusivamente em transações `PENDENTES`, contendo grid, checkboxes por linha, toggle "Selecionar Todos" (baseado nos filtros atuais) e submissão em lote (`compensarEmLote`) para o status `COMPENSADO`.
- Funcionalidades de alteração de status em lote alteram coerentemente os saldos (`saldo_a_receber` e `saldo_disponivel`) numa única transação de banco.

#### Tarefas de Testes e Usabilidade
- [ ] **Tarefa 12.12:** Testes E2E (Cypress / Playwright)
  - Fluxos: criar perfil com campo extra, fazer upload, revisar preview, confirmar importação, validar dados no backend.
  - Critério de Aceite: cenários principais automáticos passando.
- [ ] **Tarefa 12.13:** Testes de usabilidade
  - Realizar teste com 2-3 usuários admins para validar clareza do fluxo, ajustes finos de labels e tooltips.

#### Tarefas de Governança e Entrega
- [ ] **Tarefa 12.14:** Branching e PR
  - Criar branches curtas: `feature/import-campos-extras`, `feature/import-ui-redesign`.
  - Cada branch deve ter PR com descrição, checklist de testes e referência às tasks na SPEC.
- [ ] **Tarefa 12.15:** Pre-commit e CI
  - Garantir que o `preCommitValidator` valide que as tasks relevantes estão atualizadas em `specs/08-IMPLEMENTATION-TASKS.md` antes de permitir commit.
  - Critério de Aceite: hook ativo e testes unitários rodando no pipeline.

---

> Observação: Nenhuma alteração de código deve ser iniciada antes da atualização física das SPECs (itens 12.1, 12.2, 12.3) e aprovação do Product Owner.

---

## FASE 6: UNIFICAÇÃO DE CABEÇALHO (DRY FRONTEND) E AJUSTES DE NAVEGAÇÃO
Esta fase visa eliminar a repetição de código no frontend unificando os cabeçalhos das páginas e adicionando o redirecionamento para o perfil ao clicar no bloco de informações do usuário.

#### Regras de Negócio e UX:
- **DRY Header:** O cabeçalho deve ser gerado de forma totalmente dinâmica por uma função global em `auth.js` (`renderHeader(titulo, subtitulo)`). As páginas HTML devem conter apenas o container `<header class="header" id="appHeader"></header>`.
- **Redirecionamento ao Perfil:** Clicar no bloco do usuário (nome, perfil ou avatar) no cabeçalho deve redirecionar para `meu-perfil.html`.
- **Compatibilidade de Temas:** O botão de alternar tema em todos os cabeçalhos dinâmicos deve continuar funcionando 100%.

#### Tarefas de Frontend

- [x] **Tarefa 13.1:** Implementar a função global `renderHeader(titulo, subtitulo)` no `auth.js` para renderizar o cabeçalho dinamicamente com suporte a tema, avatar com inicial, perfil em português, e redirecionamento de clique para `meu-perfil.html` no bloco do usuário.
- [x] **Tarefa 13.2:** Atualizar `dashboard.html` para utilizar o cabeçalho unificado dinâmico.
- [x] **Tarefa 13.3:** Atualizar `vitrine.html` para utilizar o cabeçalho unificado dinâmico.
- [x] **Tarefa 13.4:** Atualizar `admin-lancamento.html` para utilizar o cabeçalho unificado dinâmico.
- [x] **Tarefa 13.5:** Atualizar `admin-importacao.html` para utilizar o cabeçalho unificado dinâmico.
- [x] **Tarefa 13.6:** Atualizar `admin-premios.html` para utilizar o cabeçalho unificado dinâmico.
- [x] **Tarefa 13.7:** Atualizar `admin-usuarios.html` para utilizar o cabeçalho unificado dinâmico.
- [x] **Tarefa 13.8:** Atualizar `meu-perfil.html` para utilizar o cabeçalho unificado dinâmico.

---

### FASE 7: EXIBIÇÃO DE EMPRESA E RESPONSIVIDADE MOBILE GLOBAL (DRY)
Esta fase implementa a exibição elegante da empresa logada no cabeçalho dinâmico e resolve os problemas de corte e responsividade em dispositivos móveis de forma global em todas as páginas da aplicação.

#### Regras de Negócio e UX:
- **Exibição da Empresa:** A pílula translúcida `🏢 [Nome da Empresa]` deve ser adicionada dinamicamente no cabeçalho.
- **Responsividade Global:** As regras de empilhamento vertical do cabeçalho, empilhamento dos cards e a blindagem contra overflow de tabelas devem ser aplicadas globalmente em `style.css`, afetando automaticamente 100% das páginas da aplicação.

#### Tarefas de Desenvolvimento

- [x] **Tarefa 14.1:** Atualizar `/api/auth/me` no backend para retornar `empresa_nome` na resposta JSON.
- [x] **Tarefa 14.2:** Atualizar `auth.js` no frontend para sincronizar e renderizar a pílula de empresa no cabeçalho.
- [x] **Tarefa 14.3:** Adicionar as regras globais de responsividade mobile e blindagem contra overflow no `style.css`.


---

## FASE 8: Painel SaaS, Faturamento Autogovernado e Cortesia Parametrizada

Esta fase introduz o papel de `SUPER_ADMIN` no ecossistema V-Talentos, incorporando controle de faturamento, liberação de emergência parametrizada (concessão de cortesia com manipulação de dias), histórico de faturamento (`GamFatura`) e gestão lógica isolada de usuários.

### Regras de Negócio e UX:
- **Acesso de Emergência Flexível:** O Super-Admin pode conceder acesso temporário para inquilinos suspensos. O tempo padrão de cortesia (padrão: 7 dias) é obtido de uma configuração global (`GamSaaSConfig`) e pode ser modificado ou manipulado sob demanda para cada empresa no modal de concessão.
- **Lockout e Redirecionamento:** Se uma empresa for marcada como suspensa e o período de emergência expirar ou não estiver ativo, os usuários `ADMIN_EMPRESA` serão redirecionados na API e no frontend para a tela `fatura-vencida.html` para visualizar e pagar a fatura em aberto. Usuários `CORRETOR` receberão uma mensagem amigável de suspensão temporária.
- **Saúde Financeira:** O Super-Admin possui um painel financeiro detalhado com indicadores rápidos (total pago, total em aberto) e a possibilidade de dar "Baixa Manual" em faturas da empresa.
- **Isolamento de Usuários:** O gerenciador de usuários do Super-Admin é estritamente isolado pelo dropdown de inquilinos.

### Tarefas de Desenvolvimento

- [x] **Tarefa 15.1 (Infra / Banco):** Criar as migrações do banco de dados para a tabela `GamSaaSConfig` (chave-valor para configurações da plataforma), tabela `GamFatura` (invoices do SaaS) e adicionar colunas de faturamento e cortesia (`data_expiracao`, `liberacao_emergencia`, `emergencia_expiracao`, `provedor_pagamento`, `config_pagamento_json`) na tabela `GamEmpresa`.
- [x] **Tarefa 15.2 (Backend):** Atualizar o fluxo de login em `AutenticacaoService.js` para permitir a autenticação de empresas suspensas (para fins de pagamento) e refatorar `TenantMiddleware.js` para interceptar acessos suspensos/expirados (retornando HTTP 402) com bypass ativo de cortesia se `liberacao_emergencia === true` dentro do prazo.
- [x] **Tarefa 15.3 (Backend):** Implementar rotas e serviços exclusivos do Super-Admin (`SuperAdminController` / `SuperAdminService`), englobando CRUD de empresas, concessão de acesso de emergência parametrizado, alteração de configurações globais (incluindo `dias_padrao_cortesia`), visualização de faturas e quitação com baixa manual.
- [x] **Tarefa 15.4 (Backend):** Implementar gerenciamento lógico de usuários isolado por inquilino em rotas exclusivas do Super-Admin.
- [x] **Tarefa 15.5 (Frontend):** Desenvolver a tela `super-dashboard.html` com gráficos translúcidos de faturamento acumulado, lista de empresas ativas/inadimplentes e aba de configurações de gateways e dias padrão de cortesia.
- [x] **Tarefa 15.6 (Frontend):** Desenvolver a tela `super-empresas.html` com listagem de inquilinos, modal de Acesso de Emergência dinâmico (com manipulação de dias) e aba de Saúde Financeira com quitação manual.
- [x] **Tarefa 15.7 (Frontend):** Desenvolver a tela `super-usuarios.html` para controle de usuários filtrado e isolado por dropdown de empresa.
- [x] **Tarefa 15.8 (Frontend):** Desenvolver as telas de faturamento do inquilino `admin-faturamento.html` e a tela de bloqueio `fatura-vencida.html` (com checkout simulado/gateways) e integrar interceptores reativos no `auth.js` com banner dinâmico de cortesia ativa.
- [x] **Tarefa 15.9 (Testes):** Desenvolver suíte de testes de integração Jest/Supertest validando o bloqueio de tenant expirado, bypass de cortesia parametrizada e endpoints de faturamento e quitação do Super-Admin.

---

## FASE 9: Personalização de Marca (Auto-Branding) & Licenciamento Cumulativo

Esta fase permite que o administrador da empresa (`ADMIN_EMPRESA`) gerencie a identidade visual da sua marca (Auto-Branding / White-Label) de forma autônoma na página de perfil, e adquira licenças adicionais de 30 dias que se acumulam de forma cumulativa com o saldo de dias restante da empresa.

### Regras de Negócio e UX:
- **Auto-Branding:** O administrador pode alterar o nome da empresa, URL da logomarca e cor principal. A logomarca e a cor temática (sobrescrevendo as variáveis CSS `--accent-primary` e `--accent-secondary`) são injetadas em tempo real em todas as páginas para o respectivo inquilino.
- **Licenciamento Cumulativo:** O administrador visualiza um card com o comportamento cumulativo das licenças e pode clicar em "COMPRAR +30 DIAS" para auto-gerar uma fatura de licença no valor do plano contratado. A quitação de faturas soma +30 dias a partir da data de expiração existente, sem perda de nenhum dia atual.

### Tarefas de Desenvolvimento

- [x] **Tarefa 16.1 (Backend):** Atualizar o endpoint `/api/auth/me` para incluir o logotipo (`logo_url`) e a cor primária (`cor_primaria`) no retorno JSON da empresa.
- [x] **Tarefa 16.2 (Backend):** Implementar e registrar as rotas de administrador `PUT /api/admin/empresa` (para atualização de branding) e `POST /api/admin/billing/faturas` (para criação de faturas de renovação antecipada).
- [x] **Tarefa 16.3 (Frontend):** Atualizar `auth.js` para salvar os dados de branding no `localStorage` e aplicá-los dinamicamente nas cores e logo da barra lateral.
- [x] **Tarefa 16.4 (Frontend):** Desenvolver a seção "Configurações da Empresa" em `meu-perfil.html` com colorpicker bidirecional sincronizado e lógica de salvamento.
- [x] **Tarefa 16.5 (Frontend):** Desenvolver o card de Licenciamento Cumulativo e o botão de comprar licença em `admin-faturamento.html` com recarregamento reativo do painel.
- [x] **Tarefa 16.6 (Testes):** Criar e rodar testes de integração Jest `TenantBillingBranding.test.js` para garantir 100% de cobertura nos novos endpoints de branding e faturas de inquilino.
- [x] **Tarefa 16.7 (Frontend):** Desenvolver e integrar o card/alerta visual de expiração de licença no dashboard de administração (`dashboard.html`) seguindo as cores condicionais combinadas.

---

## FASE 10: Gestão Avançada de Corretores e Extrato de Movimentações da Equipe (Admin)

### História 12: Inativação, Exclusão de Corretores e Extrato Filtrado de Movimentações
*Como administrador, quero inativar ou excluir corretores para controlar o acesso ao app, e quero ter uma listagem detalhada de todas as movimentações da minha equipe, com filtros, resumos e totalizadores, para ter um controle perfeito sobre a saúde financeira.*

#### Tarefas de Backend
- [x] **Tarefa 17.1 (Infra / Banco):** Criar migration `20260527000100_add_ativo_to_usuarios.js` para adicionar a coluna `ativo` (boolean, default: true) à tabela `GamUsuario`.
- [x] **Tarefa 17.2 (Backend):** Atualizar `AutenticacaoService.js` no login para rejeitar usuários inativos (`ativo === false`).
- [x] **Tarefa 17.3 (Backend):** Atualizar `UsuarioService.js` e `UsuarioController.js` para permitir inativar/ativar e excluir (delete) corretores, garantindo isolamento multi-tenant (admin não pode excluir/inativar usuários de outras empresas).
- [x] **Tarefa 17.4 (Backend):** Criar endpoint `GET /api/admin/movimentacoes` no backend (protegido por `tenantMiddleware` + `adminMiddleware`), retornando o histórico filtrado e paginado de todas as transações dos corretores da empresa, com resumos consolidados de saldo disponível total, saldo a receber total, total de créditos e total de débitos.
- [x] **Tarefa 17.5 (Testes):** Escrever testes unitários e de integração validando login com usuário inativo, exclusão de usuários, isolamento e filtragem de movimentações da equipe.

#### Tarefas de Frontend
- [x] **Tarefa 17.6 (Frontend):** Atualizar a tela `admin-usuarios.html` para incluir:
  - Uma coluna de "Status" (Ativo / Inativo) e botão de alternar status (Inativar / Ativar).
  - Um botão de "Excluir" que exibe um Modal de Confirmação Premium (Glassmorphism) com alerta explícito e elegante destacando que todos os dados e histórico de transações associados serão apagados definitivamente.
  - Atualização dos modais de criação/edição se necessário.
- [x] **Tarefa 17.7 (Frontend):** Criar a nova página de Histórico/Movimentações da Equipe (`admin-movimentacoes.html`) com:
  - Cards de resumo: Saldo Disponível Total, Saldo a Receber Total, Total de Créditos, Total de Débitos.
  - Filtros: Tipo (Crédito/Débito/Estorno), Origem (Manual/Importação/Prêmio), Corretor (Dropdown de corretores ativos), Período (De/Até), Paginação (10/50/100 registros por página).
  - Tabela com: Data/Hora, Corretor, Tipo, Origem, Valor (colorido), Descrição/Justificativa, Lançado por.
  - Design Glassmorphism premium unificado.
- [x] **Tarefa 17.8 (Frontend):** Registrar no menu lateral dinâmico de `auth.js` o novo link "📈 Movimentações" para administradores.
- [x] **Tarefa 17.9 (UX / Refatoração):** Substituir o modal de extrato simplificado na tela de usuários por um redirecionamento direto para a tela de movimentações filtrada por corretor, eliminando código redundante e permitindo filtros avançados.
- [x] **Tarefa 17.10 (UX / Integração):** Sincronizar o link do Meu Extrato na barra de navegação dinâmica do dashboard para garantir acesso uniforme a todos os usuários.
- [x] **Tarefa 17.11 (Handoff / Alinhamento):** Preparação do log de progresso e ritual de encerramento da sessão atual no repositório.

---

## FASE 11: Gestão Dedicada de Provedores e Padrão Strategy/Adapter de Pagamentos (SaaS)

### Regras de Negócio e UX:
- **Modularidade de Pagamentos:** A lógica de comunicação com os gateways (Stripe, Asaas) é isolada por meio do padrão Strategy/Adapter.
- **Gestão Dedicada para Super-Admin:** Provedores de pagamento agora possuem uma tela exclusiva com visualização premium em cards nobre (`super-provedores.html`).
- **Universalidade de Configuração:** O Super-Admin pode registrar chaves/parâmetros arbitrários em um formulário dinâmico chave-valor, permitindo suporte a qualquer provedor do mundo.

### Tarefas de Desenvolvimento

- [x] **Tarefa 18.1 (Backend):** Implementar a classe base e os adapters `BasePaymentAdapter.js`, `StripeAdapter.js` e `AsaasAdapter.js` na nova pasta `src/backend/core/services/payment/`.
- [x] **Tarefa 18.2 (Backend):** Implementar a fábrica de carregamento dinâmico de adapters `PaymentFactory.js`.
- [x] **Tarefa 18.3 (Backend):** Refatorar `BillingController.js` para consumir a fábrica de adapters e delegar a geração de cobranças.
- [x] **Tarefa 18.4 (Frontend):** Criar a nova página `super-provedores.html` com layout de cards, exclusão física e cadastro dinâmico chave-valor.
- [x] **Tarefa 18.5 (Frontend):** Atualizar sidebar de todas as páginas do Super-Admin (`super-dashboard.html`, `super-empresas.html`, `super-usuarios.html`, `meu-perfil.html`) e limpar o dashboard.
- [x] **Tarefa 18.6 (Testes):** Criar testes integrados em Jest para os adapters de pagamentos e fábrica.

---

## FASE 12: Integração Segura de Webhooks (SaaS)

### Regras de Negócio e UX:
- **Automatização:** O recebimento de confirmações de pagamento dos gateways liquida a fatura e estende a licença do inquilino de forma transparente.
- **Segurança Estrita:** Assinaturas e tokens de autenticação de webhooks são checados e validados rigorosamente.

### Tarefas de Desenvolvimento

- [x] **Tarefa 19.1 (Backend):** Criar a nova rota pública `src/backend/api/routes/webhooks.js` e montá-la em `app.js` sem filtros de Bearer token.
- [x] **Tarefa 19.2 (Backend):** Implementar o `WebhookController.js` para processar eventos do Asaas (`PAYMENT_CONFIRMED`/`PAYMENT_RECEIVED`) e atualizar faturas e prorrogar licenças de forma cumulativa.
- [x] **Tarefa 19.3 (Backend):** Implementar suporte ao Stripe no `WebhookController.js` (eventos `checkout.session.completed` / `charge.succeeded`).
- [x] **Tarefa 19.4 (Backend):** Adicionar segurança e validação de assinaturas de webhooks para Asaas (`asaas-access-token`) e Stripe (`stripe-signature`).
- [x] **Tarefa 19.5 (Testes):** Criar suíte de testes `WebhookController.test.js` cobrindo fluxos de sucesso e assinaturas inválidas.

---

## FASE 13: Dashboard Avançado e Indicadores Gráficos (Admin)

### Regras de Negócio e UX:
- **Visibilidade:** Administradores possuem gráficos dinâmicos e interativos para acompanhar o saldo, transações e performance.
- **Aestética Premium:** Gráficos desenvolvidos com gradientes neon suaves e design Airy Glassmorphism elegante.

### Tarefas de Desenvolvimento

- [x] **Tarefa 20.1 (Backend):** Criar endpoint `GET /api/admin/dashboard-graficos` no `LancamentoController.js` para retornar dados agrupados por mês (créditos vs débitos), ranking top 5 corretores e distribuição de prêmios.
- [x] **Tarefa 20.2 (Frontend):** Carregar Chart.js via CDN em `dashboard.html` e criar contêineres canvas no layout para os 3 gráficos.
- [x] **Tarefa 20.3 (Frontend):** Implementar lógica JavaScript no frontend para carregar os dados analíticos e instanciar os gráficos interativos.
- [x] **Tarefa 20.4 (Testes):** Adicionar testes de integração Jest para validar o novo endpoint de dados gráficos.
- [x] **Tarefa 20.5 (Docs):** Criar o guia operacional de configuração e testes do Asaas em `specs/13-ASAAS-SETUP-AND-TESTING.md`.
- [x] **Tarefa 20.6 (Docs):** Criar o guia operacional de configuração e testes da Stripe em `specs/14-STRIPE-SETUP-AND-TESTING.md`.
- [x] **Tarefa 20.7 (Frontend):** Implementar interceptor dinâmico global de API no `auth.js` para transição transparente entre localhost e produção.
- [x] **Tarefa 20.8 (Docs):** Criar o guia de implantação e deploy em produção do ecossistema em `specs/15-PRODUCTION-DEPLOYMENT-GUIDE.md`.
- [x] **Tarefa 20.9 (Hotfix/Infra):** Corrigir migration de check constraint de transações para suportar dialeto pg do PostgreSQL de forma não destrutiva.
- [x] **Tarefa 20.10 (Infra/Produção):** Criar script CLI de inicialização segura em produção para cadastrar o primeiro SUPER_ADMIN e configurações de SaaS se não existirem no banco PostgreSQL.
- [x] **Tarefa 20.11 (Saúde Financeira SaaS):** Criar a tela de faturamento dedicada `super-faturamento.html` para o Super Admin, unificando a gestão de faturas, filtros avançados, métricas agregadas, baixa manual e o redirecionamento com filtro a partir da listagem de inquilinos.

---

## FASE 6: Fator Dinâmico e Baixa em Lote

### História 7: Flexibilidade na Importação e Agilidade Financeira
*Como administrador, quero poder definir o fator de conversão de pontos e o formato de data dos balões por perfil de importação, além de conseguir realizar baixas em lote (com data retroativa) de comissões pendentes para manter meu extrato preciso e ágil.*

### Tarefas de Desenvolvimento
- [x] **Tarefa 21.1 (Backend/Migração):** Criar migration para adicionar `fator_conversao` e `formato_data_balao` na tabela `GamConfigImportacao`.
- [x] **Tarefa 21.2 (Backend/Script):** Escrever script para aplicar o `fator_conversao_utilizado: 100` em transações passadas.
- [x] **Tarefa 21.3 (Backend):** Modificar `ImportacaoController` e `ImportacaoService` para usar `fator_conversao` e tratar os formatos de data customizados dos balões, salvando o fator nos `dados_extras` das transações.
- [x] **Tarefa 21.4 (Backend):** Adicionar função `compensarEmLote` em `LancamentoService` e `POST /api/admin/movimentacoes/lote` em `LancamentoController`.
- [x] **Tarefa 21.5 (Frontend):** Atualizar `admin-importacao-upload.html` para os novos campos no perfil.
- [x] **Tarefa 21.6 (Frontend):** Criar `admin-baixas.html` com filtros, checkboxes em lote, calendário de data retroativa e integração com a API.

---

## FASE 7: Terminologia Agnóstica e Motor de Recebíveis (SaaS Enterprise)

### História 22: Universalização e Flexibilidade de Importação
*Como administrador de um negócio em qualquer segmento, quero que a plataforma adote nomenclaturas comerciais universais ao invés de jargões imobiliários, e que permita importar planilhas em dois formatos independentes: (1) Gerando Saldo e Parcelas Futuras e (2) Dando baixa massiva em saldo pendente por meio de planilhas de recebimentos do mês.*

### Tarefas de Desenvolvimento
- [x] **Tarefa 22.1 (Refactor/UI):** Alterar os termos imobiliários (Corretor, CRECI, Empreendimento, Unidade, Balão) para seus correspondentes universais (Parceiro/Consultor, ID Profissional, Produto/Serviço, Ref. Contrato, Recebimento Extra) na tela `admin-importacao-upload.html` e modais do perfil.
- [x] **Tarefa 22.2 (Backend):** Adicionar suporte a `parcela_valor`, `parcela_qtd` e `parcela_data_inicio` na tabela `GamConfigImportacao` e no `ImportacaoController`/`ImportacaoService`.
- [x] **Tarefa 22.3 (Backend):** Implementar no `ImportacaoService` o loop gerador de N parcelas fixas (`PENDENTES` com datas mensais) quando os campos de parcelamento estiverem mapeados (Passo 1 - Importação de Contratos).
- [x] **Tarefa 22.4 (Frontend):** Adicionar interface de abas/botões para o usuário selecionar entre "Importar Novos Contratos" e "Importar Planilha de Baixas/Recebimentos" no `admin-importacao-upload.html`.
- [x] **Tarefa 22.5 (Backend):** Desenvolver método no `ImportacaoService` exclusivo para conciliação de Baixas. O método deve utilizar FIFO (First-In, First-Out) nas transações `PENDENTES` do corretor e liquidar total ou parcialmente os valores usando os pagamentos lidos da planilha (Passo 2 - Importação de Baixas).
- [ ] **Tarefa 22.6 (Testes):** Testes unitários do Gerador de Parcelas mensais no Backend.
- [ ] **Tarefa 22.7 (Testes):** Testes unitários para o motor de liquidação FIFO (conciliação parcial e total em cascata).
