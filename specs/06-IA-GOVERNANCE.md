# SPEC — Governança e Contrato da IA
## Documento: 06-IA-GOVERNANCE.md

> **Versão:** 1.0 | **Data:** 2026-05-11  
> **Finalidade:** Garantir a integridade arquitetural e evitar alucinações da IA.

---

## 1. Leis Fundamentais (NÃO NEGOCIÁVEIS)

### A. Metodologia SPEC-First
A IA nunca deve implementar código antes que a SPEC do respectivo módulo esteja aprovada pelo usuário.
1. Se a IA identificar falta de informação, ela deve sugerir a atualização da SPEC.
2. O código só será escrito após a confirmação de que a SPEC reflete a necessidade.

### B. Nomenclatura Híbrida
- **Infraestrutura (Inglês):** Nomes de pastas, arquivos de sistema, namespaces técnicos e termos de programação (ex: `repositories/`, `controllers/`, `auth-service.js`).
- **Domínio de Negócio (Português):** Nomes de tabelas, entidades de banco, campos de negócio e erros de negócio (ex: `Corretor`, `Talento`, `Premio`, `valor_venda`).

### C. Nomes de Tabelas são Sagrados
Nunca renomear tabelas ou colunas que façam parte do legado de integração (planilha/financeiro).

---

## 2. Regras Anti-Alucinação

1. **Não Melhorar sem Pedido:** Não refatore lógica de negócio ou simplifique códigos complexos por "boas práticas" se não houver um pedido explícito na SPEC.
2. **Quando em dúvida, PARE:** Se a SPEC for ambígua, a IA deve reportar a `DÚVIDA` e aguardar instrução.
3. **Citar Origem:** Todo módulo complexo deve conter comentários indicando qual seção da SPEC ele atende.
4. **Validations vs Exceptions:** Use retornos estruturados (`Result<T>`) para erros de negócio esperados (ex: saldo insuficiente). Exceções são apenas para falhas críticas.
5. **Cobertura de Testes Obrigatória:** Todo novo *Service* ou *Controller* deve ser acompanhado de pelo menos um teste unitário/integração validando o caminho feliz e erros esperados (usando Jest/Supertest). O código não está "Pronto" sem testes passando.

---

## 3. Protocolo Git Estrito

Para garantir a integridade do código e facilitar o rastreio de mudanças, a IA deve seguir este fluxo:

1. **Estratégia de Branches:**
    - `main`: Reservada para versões estáveis aprovadas pelo usuário.
    - `develop`: Branch de integração diária.
    - `feature/[id-tarefa]`: Criada a partir da `develop` para executar cada item do documento `08-IMPLEMENTATION-TASKS.md`.
2. **Padrão de Commits (Conventional Commits):**
    - `feat(escopo):` Nova funcionalidade.
    - `fix(escopo):` Correção de erro.
    - `docs(escopo):` Alteração em documentação/SPECs.
    - `refactor(escopo):` Refatoração de código.
3. **Fluxo:** Abrir branch -> Executar tarefa -> Commitar -> Merge para `develop` após validação.

---

## 3. Ritual de Sessão e Handoff

Ao final de **toda sessão**, a IA deve atualizar o Log de Progresso abaixo. Isso garante que a próxima instância da IA saiba onde parou.

### Log de Progresso (Handoff)

| Módulo | Status | Task Atual | Branch | Observação |
| :--- | :--- | :--- | :--- | :--- |
| **SPEC-KIT** | ✅ Concluído | 2.0 (SaaS) | `docs/saas-ready` | Arquitetura Multi-Tenant com isolamento por Empresa integrada. |
| **DESENVOLVIMENTO** | 🏗️ Em Curso | Fase 3: Lançamento Manual / Importação | `develop` | Testes do Login concluídos (Jest/Supertest). Próxima etapa: Fase 3. |

---

## 4. Prompt de Onboarding (Copiar sempre que iniciar)

> "VOCÊ É O ENGENHEIRO DO PROJETO V-TALENTOS. Leia `specs/06-IA-GOVERNANCE.md` e verifique o Log de Progresso na Seção 3 antes de começar. Siga a regra de pastas em Inglês e Negócio em Português."
