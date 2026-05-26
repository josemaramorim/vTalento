# SPEC — Vitrine de Prêmios
## Documento: 09-VITRINE-DE-PREMIOS.md

> Versão: 0.1 | Data: 2026-05-25
> Origem: Especificação para a Fase 4 (ver [specs/06-IA-GOVERNANCE.md](specs/06-IA-GOVERNANCE.md))

---

## 1. Finalidade

Especificar a Vitrine de Prêmios (catálogo de recompensas) e o fluxo de resgate para o projeto V-TALENTOS. Esta SPEC define o modelo de domínio, contratos HTTP, regras de negócio, validações, migrações e testes obrigatórios.

## 2. Premissas e Conformidade

- Seguir `SPEC-First` conforme `specs/06-IA-GOVERNANCE.md` antes de implementar.
- Nomenclatura híbrida: pastas/arquivos/serviços em Inglês; tabelas/entidades/campos de negócio em Português.
- Nomes de tabelas existentes são sagrados e não devem ser renomeados.

## 3. Escopo

- Catálogo público de prêmios (visualização no admin e no cliente).
- Gerenciamento administrativo de itens da vitrine (CRUD admin).
- Fluxo de resgate: usuário solicita resgate; valida saldo; cria registro de `Resgate` e transação associada; decrementa saldo; notificação do status.

## 4. Modelo de Dados (Domínio - Português)

- `Premio` (tabela: `Premio`)
  - `id` (integer, PK)
  - `empresa_id` (uuid, FK -> GamEmpresa.id) — isolamento multi-tenant obrigatório
  - `titulo` (string)
  - `descricao` (text)
  - `quantidade_disponivel` (integer)
  - `custo_pontos` (integer)
  - `ativo` (boolean)
  - `created_at`, `updated_at`

- `VitrineItem` (tabela: `VitrineItem`) — ponte para exibir ordens/posições customizadas
  - `id` (integer, PK)
  - `empresa_id` (uuid, FK -> GamEmpresa.id) — isolamento de exibição por tenant
  - `premio_id` (integer, FK -> Premio.id)
  - `ordem` (integer)
  - `ativo` (boolean)

- `Resgate` (tabela: `Resgate`)
  - `id` (integer, PK)
  - `usuario_id` (integer) — referência ao usuário/tenant
  - `premio_id` (integer)
  - `quantidade` (integer)
  - `custo_total` (integer)
  - `status` (string) — `pendente`, `confirmado`, `cancelado`, `falha`
  - `motivo` (text, nullable)
  - `created_at`, `updated_at`

Observação: nomes de tabelas e campos em Português (requisito de domínio).

## 5. Pastas e arquivos (Infra — Inglês/Português)

- `src/backend/api/controllers/PremioController.js`
- `src/backend/core/services/PremioService.js`
- `src/backend/infra/migrations/2026xxxxxx_create_premios.js`
- `src/backend/api/routes/premios.js` (rotas public/cliente protegidas por Tenant)
- `src/backend/api/routes/admin.js` (novas rotas admin/premios)

## 6. Endpoints (contratos HTTP)

- Admin (require admin middleware):
  - `GET /admin/premios` — lista paginada de `Premio` filtrados por Tenant.
  - `POST /admin/premios` — criar `Premio` atrelado ao Tenant (body: `titulo, descricao, quantidade_disponivel, custo_pontos, ativo`).
  - `PUT /admin/premios/:id` — atualizar (restrito ao Tenant).
  - `DELETE /admin/premios/:id` — remover (soft delete restrito ao Tenant).
  - `GET /admin/resgates` — lista paginada de **todos** os resgates dos corretores da empresa, filtrada por Tenant.
    - Query params: `page` (default: 1), `limit` (valores aceitos: 10, 50, 100 — default: 10), `status` (pendente|confirmado|cancelado|falha), `corretor_id`, `premio_id`, `data_inicio` (YYYY-MM-DD), `data_fim` (YYYY-MM-DD).
    - Resposta: `{ success: true, data: [...], meta: { total, page, totalPages, limit } }`.
    - Cada item inclui: `id, usuario_id, premio_id, quantidade, custo_total, status, created_at, corretor_nome, premio_titulo`.
    - Isolamento multi-tenant obrigatório: somente resgates de usuários da mesma `empresa_id` do admin logado.
    - Admin **não pode** criar resgates — endpoint é somente leitura.

- Client / Public (com tenantMiddleware):
  - `GET /premios` — listar vitrine ativa filtrada pelo tenant logado (usa `VitrineItem` ordem se existir).
  - `POST /premios/:id/resgates` — solicitar resgate (body: `quantidade`).
  - `GET /users/:userId/resgates` — histórico de resgates do usuário.

Resposta padrão de sucesso: `{ success: true, data: ... }`.
Erros de negócio devem usar retornos estruturados (`Result<T>`) com códigos e mensagens em Português.

## 7. Regras de Negócio

1. Ao solicitar resgate:
   - Verificar `Premio.ativo` e `quantidade_disponivel` suficiente.
   - Calcular `custo_total = quantidade * Premio.custo_pontos`.
   - Verificar saldo do usuário (usar serviço existente de `LancamentoService`/conta).
   - Usar transação DB para: criar `Resgate` pendente, criar registro de transação, decrementar saldo do usuário e decrementar `Premio.quantidade_disponivel` atomically.
   - Em caso de falha parcial, reverter tudo e registrar `Resgate.status = falha` com `motivo`.

2. Concurrency: proteger decrementos com bloqueio otimista (versão) ou transação serializável.

3. Notificações: enviar evento/local webhook ao admin e ao usuário quando `Resgate.status` mudar para `confirmado` ou `falha`.

## 8. Validações e Erros (exemplos)

- `SaldoInsuficiente` — Result.fail({ code: 'SALDO_INSUFICIENTE', message: 'Saldo insuficiente para resgate' })
- `PremioIndisponivel` — Result.fail({ code: 'PREMIO_INDISPONIVEL', message: 'Prêmio indisponível' })
- `QuantidadeInvalida` — Result.fail({ code: 'QUANTIDADE_INVALIDA', message: 'Quantidade deve ser >= 1' })

## 9. Migrações

- Criar migração: `src/backend/infra/migrations/20260525_create_premios_resgates.js` com tabelas `Premio`, `VitrineItem`, `Resgate`.

## 10. Testes Obrigatórios (Jest / Supertest)

- `PremioService.test.js`:
  - Teste caminho feliz: resgate com saldo suficiente cria `Resgate` e decrementa saldo/premio.
  - Teste erro: saldo insuficiente -> retorna `SaldoInsuficiente` sem criar `Resgate`.
  - Teste concorrência: duas requisições paralelas não permitem vender além da `quantidade_disponivel`.

- `PremioController.test.js` (integração usando Supertest):
  - `POST /premios/:id/resgates` retorna 200 + body esperado no caminho feliz.
  - Erros retornam status e estrutura esperada.

Cobertura mínima: um teste unitário do Service + um teste de integração do Controller.

## 11. Observações de Implementação

- Todos os arquivos implementados devem conter comentário apontando a esta SPEC (`09-VITRINE-DE-PREMIOS.md`) e referenciar `specs/06-IA-GOVERNANCE.md` (regra anti-alucinação).
- Use `Result<T>` para erros de negócio e lance exceções apenas para falhas críticas.
- Não alterar nomes de tabelas existentes; criar novas tabelas em Português conforme acima.

---

## 12. Próximos passos (sugestão)

1. Criar migração inicial e modelos (infra). 
2. Implementar `PremioService` com métodos: `list`, `create`, `update`, `requestResgate`.
3. Implementar `PremioController` + rotas e testes.
4. Rodar testes locais e commitar em `feature/vitrine-premios`.
