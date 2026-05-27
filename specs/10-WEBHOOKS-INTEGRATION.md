# SPEC — Integração Segura de Webhooks (SaaS)
## Documento: 10-WEBHOOKS-INTEGRATION.md

> **Versão:** 1.0 | **Data:** 2026-05-27  
> **Status:** Aprovado para Planejamento  
> **Finalidade:** Definir contratos HTTP, segurança e processamento de eventos de pagamento do Stripe e Asaas.

---

## 1. Finalidade

Implementar receptores de webhooks assíncronos e seguros para capturar eventos de pagamento originados do **Stripe** e do **Asaas**. O processamento automático desses webhooks garante que a quitação de faturas e a renovação cumulativa de licenças ocorram instantaneamente, sem necessidade de ações manuais do Super-Admin.

---

## 2. Endpoints e Contratos de Integração

Os webhooks serão ouvidos em rotas públicas dedicadas para evitar conflito com filtros de autenticação baseada em tokens de usuários:

- **Stripe Webhook:** `POST /api/webhooks/stripe`
- **Asaas Webhook:** `POST /api/webhooks/asaas`

### A. Stripe Payload (checkout.session.completed)
O principal evento a ser tratado para o Stripe Checkout é o `checkout.session.completed` ou `charge.succeeded`.
- O payload conterá o objeto da sessão de checkout, que inclui `metadata.fatura_id` ou `client_reference_id` apontando para o UUID da nossa `GamFatura`.
- A API irá extrair esse ID, localizar a fatura e marcá-la como `PAGA`.

### B. Asaas Payload (PAYMENT_RECEIVED / PAYMENT_CONFIRMED)
O evento a ser processado é `PAYMENT_RECEIVED` ou `PAYMENT_CONFIRMED`.
- O payload de webhook do Asaas contém o campo `payment.externalReference` contendo o ID da fatura (`GamFatura.id`) ou `payment.id` que coincide com `provedor_fatura_id`.
- A API irá extrair esse identificador, encontrar a fatura e proceder com a quitação.

---

## 3. Segurança e Assinatura

Para blindar os endpoints contra payloads forjados, aplicaremos validação estrita de integridade:

1. **Stripe Signature Validation:**
   - Captura do cabeçalho `stripe-signature`.
   - Validação com a chave secreta de webhook (`webhook_secret`) cadastrada no banco.
   - Em ambiente de testes/sandbox, se a chave não estiver configurada, o endpoint permite um modo de simulação/ignorar assinatura para testes ágeis com cabeçalho de simulação.

2. **Asaas Token Validation:**
   - Captura do cabeçalho `asaas-access-token`.
   - Comparação direta com o valor de `webhook_secret` cadastrado na configuração do gateway no banco.

---

## 4. Regras de Negócio e Transação de Faturamento

Ao receber a confirmação de pagamento com sucesso de um webhook:
1. **Transação DB Única:**
   - Alterar `GamFatura.status = 'PAGA'` e preencher `data_pagamento = NOW()`.
   - Localizar a `GamEmpresa` correspondente.
   - Prorrogar `data_expiracao` de forma **cumulativa** (+30 dias adicionados ao vencimento atual, ou 30 dias a partir de hoje caso já esteja expirada).
   - Atualizar `GamEmpresa.status = 'ATIVO'` e limpar bypass de cortesia (`liberacao_emergencia = false`).
2. **Idempotência:**
   - Evitar duplicidade de quitação caso o webhook seja enviado múltiplas vezes. Se a fatura já estiver `PAGA`, retornar status `200 OK` imediatamente.

---

## 5. Estrutura de Arquivos

- [NEW] `src/backend/api/routes/webhooks.js` (Rotas públicas sem token middleware)
- [NEW] `src/backend/api/controllers/WebhookController.js` (Lógica de tratamento de webhooks)
- [NEW] `src/backend/__tests__/WebhookController.test.js` (Suíte de testes de integração com Supertest)

---

## 6. Referências de Configuração
As especificações detalhadas de chaves de API, webhooks e ambientes de Sandbox/Produção para os gateways de pagamento estão documentadas em [12-PAYMENT-GATEWAYS-CONFIG.md](file:///c:/Pasta%20de%20Trabalho/Projetos/Node/Premios/specs/12-PAYMENT-GATEWAYS-CONFIG.md).

---
