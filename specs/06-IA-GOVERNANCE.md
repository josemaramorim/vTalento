# SPEC — Governança e Contrato da IA
## Documento: 06-IA-GOVERNANCE.md

> **Versão:** 1.0 | **Data:** 2026-05-11  
> **Finalidade:** Garantir a integridade arquitetural e evitar alucinações da IA.

---

## 1. Leis Fundamentais (NÃO NEGOCIÁVEIS)

### A. Metodologia SPEC-First (Evolução Estrita)
A IA nunca deve implementar, refatorar, adicionar sementes de dados (seeds), ou alterar qualquer linha de código sem antes ter a SPEC ou o respectivo Plano de Implementação documentado fisicamente e aprovado pelo usuário.
1. **Inexistência de atalhos em chat:** É terminantemente PROIBIDO realizar qualquer alteração em código baseado apenas em acordos ou planos gerados textualmente no chat. Todo e qualquer plano de implementação aprovado DEVE ser registrado fisicamente na pasta `specs/` antes da execução.
2. Qualquer necessidade de alteração não prevista na SPEC deve forçar uma pausa imediata, sugestão de revisão e atualização dos arquivos físicos de especificação (`specs/08-IMPLEMENTATION-TASKS.md` e similares), e obtenção de aprovação explícita.
3. **Nenhuma alteração é "pequena demais" para pular o fluxo:** mesmo ajustes finos, sementes de banco (seeds) ou correções pontuais exigem validação prévia na SPEC antes de mexer em código de produção. A conformidade com a documentação física do projeto é absoluta, imutável e inegociável.

### B. Nomenclatura Híbrida
- **Infraestrutura (Sufixos e Pastas em Inglês):** Nomes de pastas, arquivos de sistema, e design patterns (ex: `repositories/`, `controllers/`, `middlewares/`).
- **Domínio de Negócio (Português):** O prefixo do arquivo e nomes de tabelas, entidades, campos e erros DEVEM ser em Português.
  - ❌ ERRADO: `prizeService.js`, `prizesController.js`, `prizes.js` (isso é alucinação por tradução).
  - ✅ CORRETO: `PremioService.js`, `PremioController.js`, `premios.js`.

### C. Estrutura de Rotas Admin vs Public
- **Rotas Administrativas:** TODAS as rotas administrativas DEVEM ser inseridas no arquivo `api/routes/admin.js`, que já aplica os middlewares globais (`tenantMiddleware`, `adminMiddleware`). NÃO misture rotas de admin em arquivos de rotas públicas.
- **Rotas Públicas/Cliente:** Ficam em seus respectivos arquivos de domínio (ex: `premios.js`, `auth.js`).

### D. Nomes de Tabelas são Sagrados
Nunca renomear tabelas ou colunas que façam parte do legado de integração (planilha/financeiro).

### F. Governança de Faturamento e Meios de Pagamento (Stripe/Asaas)
Qualquer modificação na lógica de cobranças, geração de faturas, adapters de pagamento (Stripe, Asaas, MercadoPago, etc.) ou recebimento de webhooks **DEVE** ser obrigatoriamente precedida pela atualização detalhada do arquivo físico de especificação [12-PAYMENT-GATEWAYS-CONFIG.md](file:///c:/Pasta%20de%20Trabalho/Projetos/Node/Premios/specs/12-PAYMENT-GATEWAYS-CONFIG.md) para garantir que toda a infraestrutura e credenciais fiquem perfeitamente documentadas e alinhadas.

### E. Protocolo de Validação de Spec-First (OBRIGATÓRIO E IMUTÁVEL)
Antes de realizar QUALQUER chamada de ferramenta que modifique arquivos de código (ex: `replace_file_content`, `multi_replace_file_content`, `write_to_file` em arquivos fora de `specs/` ou `artifacts/`), a IA DEVE obrigatoriamente realizar e exibir a validação deste checklist no chat:
1. **[Roadmap Check]:** Qual é o ID exato da tarefa em `specs/08-IMPLEMENTATION-TASKS.md` que esta modificação atende? (Ex: `Tarefa 4.10.5`).
2. **[Status Check]:** Essa tarefa já foi atualizada no arquivo físico `specs/08-IMPLEMENTATION-TASKS.md` para "Em Andamento" (`[/]`) ou "Concluída" (`[x]`)? (O código NUNCA deve ser modificado se a tarefa estiver marcada como pendente `[ ]` no roadmap).
3. **[Design Spec Check]:** As modificações estruturais (tabelas, campos, endpoints, erros ou regras de negócio) já foram integralmente descritas e detalhadas nas respectivas especificações (ex: `specs/01-DATA-MODEL.md` ou `specs/09-VITRINE-DE-PREMIOS.md`)?
4. **[Plan Integration Check] (NÃO NEGOCIÁVEL):** Todo plano de implementação gerado em chat deve ter suas tarefas e decisões detalhadamente descritas e integradas nos arquivos físicos de especificações (`specs/`) antes da execução das correções. Isso garante que qualquer IA subsequente tenha acesso total ao escopo planejado sem depender de histórico de chat volátil.
5. **[Pre-Commit Hook Validation] (BLINDAGEM AUTOMÁTICA):** O sistema agora possui um Git Pre-Commit Hook ativo (`.git/hooks/pre-commit` acoplado ao script `src/backend/infra/scripts/preCommitValidator.js`) que impede fisicamente o commit de modificações em `src/` caso a especificação de tarefas no roadmap não possua tarefas ativas marcadas fisicamente como "Em Andamento" (`[/]`).

*Se a resposta para qualquer um dos 5 itens for NÃO, a IA está terminantemente bloqueada e PROIBIDA de editar qualquer arquivo de código. Ela deve parar imediatamente, atualizar/criar as SPECs necessárias no repositório, e aguardar autorização explícita do usuário.*

---

## 2. Regras Anti-Alucinação

1. **Não Melhorar sem Pedido:** Não refatore lógica de negócio ou simplifique códigos complexos por "boas práticas" se não houver um pedido explícito na SPEC.
2. **Quando em dúvida, PARE:** Se a SPEC for ambígua, a IA deve reportar a `DÚVIDA` e aguardar instrução.
3. **Citar Origem:** Todo módulo complexo deve conter comentários indicando qual seção da SPEC ele atende.
4. **Validations vs Exceptions:** Use retornos estruturados (`Result<T>`) para erros de negócio esperados (ex: saldo insuficiente). Exceções são apenas para falhas críticas.
5. **Cobertura de Testes Obrigatória:** Todo novo *Service* ou *Controller* deve ser acompanhado de pelo menos um teste unitário/integração validando o caminho feliz e erros esperados (usando Jest/Supertest). O código não está "Pronto" sem testes passando.

---

## 3. Protocolo Git Estrito (Micro-Branches e Entregas Focadas)

Para garantir a integridade do código, evitar conflitos massivos e facilitar o rastreio de mudanças, a IA deve seguir rigorosamente este fluxo:

1. **Micro-Branches (Branches Curtas e Focadas):**
    - Nunca crie uma única branch gigante para acumular múltiplas modificações complexas (ex: toda uma fase do projeto na mesma branch).
    - As branches de *Feature* devem ser **micro-branches** extremamente focadas em uma única subtarefa (ex: `feature/vitrine-backend-routes`, `feature/vitrine-ui-admin`, `feature/vitrine-ui-cliente`).
    - Cada micro-branch deve ser criada a partir de `develop`, validada com testes passando, mesclada via Merge para `develop` o quanto antes, e excluída.
2. **Estratégia Geral:**
    - `main`: Reservada exclusivamente para versões estáveis em produção aprovadas pelo usuário.
    - `develop`: Branch padrão para integração e testes integrados.
3. **Padrão de Commits (Conventional Commits):**
    - `feat(escopo):` Nova funcionalidade.
    - `fix(escopo):` Correção de erro.
    - `docs(escopo):` Alteração em documentação/SPECs.
    - `refactor(escopo):` Refatoração de código.
4. **Fluxo Estrito:** Abrir micro-branch -> Executar tarefa única -> Validar testes locais -> Commitar -> **Merge para `develop` (Apenas após todos os testes passarem 100% E com aprovação explícita do usuário)** -> Deletar micro-branch.

---

## 3. Ritual de Sessão e Handoff

Para garantir a continuidade perfeita e o alinhamento do projeto, a IA deve seguir este ritual estrito ao final de toda sessão:
1. **Atualização de Progresso Técnico:** O arquivo [08-IMPLEMENTATION-TASKS.md](file:///c:/Pasta%20de%20Trabalho/Projetos/Node/Premios/specs/08-IMPLEMENTATION-TASKS.md) deve ser mantido rigorosamente atualizado, marcando com `- [x]` as tarefas concluídas. Nenhuma sessão pode ser finalizada sem que este checklist reflita o estado real do código.
2. **Atualização do Log de Handoff:** Atualizar a tabela de Log de Progresso abaixo com o módulo, status, task atual, branch e observações, garantindo que a próxima instância da IA saiba exatamente onde retomar.

### Log de Progresso (Handoff)

| Módulo | Status | Task Atual | Branch | Observação |
| :--- | :--- | :--- | :--- | :--- |
| **SPEC-KIT** | ✅ Concluído | 2.0 (SaaS) | `docs/saas-ready` | Arquitetura Multi-Tenant com isolamento por Empresa integrada. |
| **DESENVOLVIMENTO** | ✅ Concluído | Fase 3: Importação & Gamificação | `develop` | Motor de processamento dinâmico Excel, balões, transações pendentes/compensadas e UI Airy Glassmorphism 100% concluído e verificado. |
| **LIMPEZA/GOVERNANÇA** | ✅ Concluído | Remoção de arquivos legado Versatus | `develop` | Removidos da raiz: `03-REGRAS-ANTI-ALUCINACAO.md`, `04-CONTRATO-DA-IA.md`, `05-ONBOARDING-IA-PROMPT.md`, `MOD-14-GAMIFICACAO-VENDAS.md`. Spec `01-DATA-MODEL.md` sincronizada com `GamUsuario` (era `GamCorretor`). 23/23 testes passando. |
| **DESENVOLVIMENTO** | ✅ Concluído | Fase 4: Vitrine de Prêmios | develop | Frontend do Admin (admin-premios.html) e do Colaborador (vitrine.html) 100% integrados; Toasts modernizados; 27/27 testes Jest passando. |
| **DESENVOLVIMENTO** | ✅ Concluído | Fase 4.5: Estabilização, Toasts e Premium Admin Dashboard | `develop` | Substituição de alert() por Toasts em todas as telas de admin; correção de toggle de tema; persistência de tema preferido em GamUsuario; dashboard premium de métricas para Admin. |
| **DESENVOLVIMENTO** | ✅ Concluído | Fase 4.7: Lapidação e Melhorias no App do Corretor | `develop` | Correção na associação do req.usuario_id nos resgates; dual card de saldos (Disponível + A Receber) e extrato de transações individuais no dashboard do Corretor. |
| **DESENVOLVIMENTO** | ✅ Concluído | Fase 11: Gestão de Provedores e Pattern Strategy/Adapter | `develop` | Padrão Strategy/Adapter de pagamentos implementado para Stripe, Asaas e Genérico; nova página premium `super-provedores.html` com formulário dinâmico chave-valor e segurança de segredos; 73/73 testes integrados passando. |
| **DESENVOLVIMENTO** | ✅ Concluído | Fases 12 e 13: Webhooks & Dashboard Charts | `develop` | Webhooks de Stripe/Asaas, renovações cumulativas, dashboard com gráficos neon interativos Chart.js, especificações de configuração (specs 12, 13, 14 e 15) e 81/81 testes passando. |
| **IMPLANTAÇÃO** | ✅ Concluído | Fase 14: Inicialização Segura em Produção | `develop` | Correção da migration para PostgreSQL (Pg check constraint) e criação do utilitário CLI `npm run db:init-admin` para inicialização segura e cadastramento do primeiro SUPER_ADMIN em produção; 81/81 testes passando. |

---

## 4. Prompt de Onboarding (Copiar sempre que iniciar)

> "VOCÊ É O ENGENHEIRO DO PROJETO V-TALENTOS. Leia `specs/06-IA-GOVERNANCE.md` e verifique o Log de Progresso na Seção 3 antes de começar. Siga a regra de pastas em Inglês e Negócio em Português."
