// Origem: specs/10-WEBHOOKS-INTEGRATION.md
// Governança: specs/06-IA-GOVERNANCE.md — Arquivos e namespaces em Inglês

const { Router } = require('express');
const WebhookController = require('../controllers/WebhookController');

const router = Router();

// Endpoints públicos de webhook (sem token middleware)
router.post('/stripe', WebhookController.processStripeWebhook);
router.post('/asaas', WebhookController.processAsaasWebhook);

module.exports = router;
