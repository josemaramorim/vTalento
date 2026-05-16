# SPEC — MOD-14-GAMIFICACAO-VENDAS

## 1. Visão Geral do Módulo
A aplicação visa incentivar a força de vendas (corretores) através de um sistema de pontuação (V-Talentos) baseado no recebimento real de vendas.

- **Nicho:** Construtoras e Imobiliárias (Adaptável).
- **Integração:** Planilha de Recebíveis (Excel/CSV) ou Banco de Dados de Vendas.
- **Fluxo Principal:** Venda realizada -> Pagamento confirmado pelo cliente -> Conversão em V-Talentos -> Resgate de Prêmios.

### Tabelas Envolvidas (A Criar)
- `GamCorretor`: Cadastro de corretores e saldos.
- `GamTransacao`: Registro de entradas (vendas) e saídas (resgates).
- `GamPremio`: Catálogo de prêmios disponíveis.
- `GamResgate`: Registro de pedidos de troca de pontos.

---

## 2. Histórias de Usuário (User Stories)

### US01 - Acesso e Dashboard
**Como** corretor,  
**Quero** acessar meu painel exclusivo,  
**Para** ver meu saldo de V-Talentos (Disponíveis, Recebidos e A Receber).

### US02 - Transparência de Créditos
**Como** corretor,  
**Quero** ver um extrato detalhado de quais vendas geraram quais créditos,  
**Para** validar se minhas comissões gamificadas estão corretas.

### US03 - Apoio à Cobrança (Moedas não compensadas)
**Como** corretor,  
**Quero** visualizar quais boletos de minhas vendas estão em atraso (créditos não compensados),  
**Para** atuar na cobrança e garantir meu prêmio.

### US04 - Gestão Admin
**Como** administrador,  
**Quero** importar a planilha de recebíveis e gerenciar os usuários,  
**Para** manter o sistema atualizado com os dados reais do financeiro.

---

## 3. Funcionalidades (Features)

### F01: Gestão de Talentos (Moedas)
- Regra de Conversão: Definir quantos R$ equivalem a 1 V-Talento.
- Status de Pontos:
    - **A Receber:** Venda realizada mas boleto não pago.
    - **Disponível:** Boleto pago e compensado.
    - **Sacado/Resgatado:** Pontos já utilizados em prêmios.

### F02: Dashboard do Corretor
- Gráficos de performance.
- Lista de "Créditos em Espera" (Boletos vencendo/vencidos).
- Vitrine de prêmios.

### F03: Painel Administrativo
- Importação de dados (CSV/Excel).
- Ajuste manual de saldo (Débito/Crédito).
- Aprovação de resgates.

---

## 4. Tarefas Técnicas (Tasks)

### T01: Infraestrutura e Backend
- [ ] Configurar ambiente Node.js / Express (ou .NET se integrado).
- [ ] Modelagem do Banco de Dados (PostgreSQL/SQL Server).
- [ ] Implementar serviço de autenticação (JWT).

### T02: Motor de Gamificação
- [ ] Criar lógica de processamento de recebíveis.
- [ ] Implementar cálculo de saldo histórico para evitar inconsistências.

### T03: Frontend (UX/UI Premium)
- [ ] Criar interface de Dashboard (Tema Dark/Moderno).
- [ ] Implementar extrato estilo "Internet Banking".
- [ ] Criar vitrine de prêmios com animações de hover.

---

## 5. Regras de Negócio Críticas
- **RN01:** Um ponto só se torna "Disponível" após a confirmação do pagamento no financeiro.
- **RN02:** Se uma venda for cancelada, os pontos "A Receber" devem ser estornados.
- **RN03:** O sistema deve permitir múltiplos "perfis" de conversão (ex: corretores seniores ganham mais talentos por venda).

---

## 6. Checklist de Conclusão
- [ ] Banco de dados migrado.
- [ ] Autenticação funcionando.
- [ ] Importação de planilha validada.
- [ ] Dashboard exibe saldos corretamente.
- [ ] Fluxo de resgate completo.
