# SPEC — Governança e Contrato da IA
## Documento: 06-IA-GOVERNANCE.md

> **Versão:** 1.0 | **Data:** 2026-05-11  
> **Finalidade:** Garantir a integridade arquitetural e evitar alucinações da IA.

---

## 1. Leis Fundamentais (NÃO NEGOCIÁVEIS)

### A. Metodologia SPEC-First (Evolução Estrita)
A IA nunca deve implementar, refatorar, adicionar sementes de dados (seeds), ou alterar qualquer linha de código sem antes ter a SPEC ou o respectivo Plano de Implementação aprovado pelo usuário.
1. Qualquer necessidade de alteração não prevista na SPEC deve forçar uma pausa imediata, sugestão de revisão da SPEC/Plano de Implementação, e obtenção de aprovação explícita.
2. **Nenhuma alteração é "pequena demais" para pular o fluxo:** mesmo ajustes finos, sementes de banco (seeds) ou correções pontuais exigem validação prévia na SPEC antes de mexer em código de produção.

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

---

## 4. Prompt de Onboarding (Copiar sempre que iniciar)

> "VOCÊ É O ENGENHEIRO DO PROJETO V-TALENTOS. Leia `specs/06-IA-GOVERNANCE.md` e verifique o Log de Progresso na Seção 3 antes de começar. Siga a regra de pastas em Inglês e Negócio em Português."
