# SPEC — Dashboard Avançado e Indicadores Gráficos (Admin)
## Documento: 11-DASHBOARD-METRICS.md

> **Versão:** 1.0 | **Data:** 2026-05-27  
> **Status:** Aprovado para Planejamento  
> **Finalidade:** Definir contratos HTTP e gráficos do painel administrativo do V-Talentos usando Charts.js.

---

## 1. Finalidade

Implementar um endpoint analítico dedicado e painéis de indicadores visuais interativos na interface do Administrador da Empresa (`ADMIN_EMPRESA`). Através de gráficos modernos desenvolvidos com **Chart.js** via CDN, os administradores terão visão em tempo real sobre a saúde financeira de sua equipe, prêmios resgatados e corretores líderes.

---

## 2. Endpoints e Contratos de Indicadores

Criar um endpoint analítico agrupado no backend:

- **Endpoint:** `GET /api/admin/dashboard-graficos`
- **Autenticação:** Requer token de admin do tenant (`tenantMiddleware`, `adminMiddleware`).
- **Resposta:**
  ```json
  {
    "success": true,
    "evolucaoMensal": [
      { "mes": "Janeiro", "creditos": 12000, "debitos": 8000 },
      { "mes": "Fevereiro", "creditos": 15000, "debitos": 11000 }
    ],
    "topCorretores": [
      { "nome": "Corretor A", "saldo": 3500 },
      { "nome": "Corretor B", "saldo": 2900 }
    ],
    "distribuicaoPremios": [
      { "titulo": "Voucher iFood", "total_resgatado": 12 },
      { "titulo": "Netflix", "total_resgatado": 8 }
    ]
  }
  ```

---

## 3. UI/UX dos Gráficos e Estética Airy Glassmorphism

A página principal de controle do admin ([dashboard.html](file:///c:/Pasta%20de%20Trabalho/Projetos/Node/Premios/src/frontend/dashboard.html)) ou uma área de relatórios será enriquecida com:

1. **Gráfico 1: Evolução de Pontos (Line Chart - Linhas):**
   - Exibe a tendência mensal/semanal de créditos (distribuídos via importação/manual) vs débitos (consumidos em resgate de prêmios).
   - Estilo: Linhas curvas suaves (smooth bezier), preenchimento gradiente neon com transparência.

2. **Gráfico 2: Ranking Top 5 Corretores (Bar Chart - Barras Horizontais):**
   - Exibe o top 5 corretores com maior saldo disponível acumulado.
   - Estilo: Barras nobres douradas/purpurinas baseadas na cor primária da empresa.

3. **Gráfico 3: Prêmios Mais Desejados (Doughnut Chart - Rosca):**
   - Distribuição percentual das categorias de prêmios mais trocados.
   - Estilo: Rosca com centro vazado elegante e legenda minimalista.

---

## 4. Estrutura de Arquivos

- [MODIFY] `src/backend/api/controllers/LancamentoController.js` (Adicionar método `obterDadosGraficos`)
- [MODIFY] `src/backend/api/routes/admin.js` (Adicionar rota `GET /billing/dashboard-graficos` ou `GET /dashboard-graficos`)
- [MODIFY] `src/frontend/dashboard.html` (Carregar Chart.js via CDN, injetar contêineres canvas e Javascript de renderização)

---
