# SPEC — Motor Agnóstico de Recebíveis e Conciliação FIFO (Importação Avançada)

## 1. Contexto e Justificativa

Na Fase 7 de evolução, a plataforma V-Talentos deixou de ser estritamente focada no mercado imobiliário para se tornar um **Sistema Agnóstico de Conta Corrente e Comissionamento**. 

A nova arquitetura introduz um motor híbrido de importação dividido em dois passos lógicos independentes:
1. **Passo 1 (Novos Contratos):** Geração de Saldo Pendente (Contratos, Parcelas Mensais e Recebimentos Extras).
2. **Passo 2 (Baixa de Recebimentos):** Conciliação e liquidação baseada em planilhas financeiras utilizando o algoritmo FIFO (First-In, First-Out).

Essa evolução permite que a plataforma atenda a **qualquer segmento de negócio** que opere com recebíveis a longo prazo ou vendas comissionadas recorrentes.

---

## 2. A Nova Arquitetura de Importação

A tela de importação foi remodelada e agora oferece um **Seletor de Modo**:

### Passo 1: Novos Contratos (Geração de Saldo)
O usuário sobe a planilha de "Vendas" ou "Contratos Fechados".
- O motor lê o valor total da venda, calcula os talentos e gera a "promessa" de recebimento.
- **Bolo Inicial (Compensado):** Gera entrada imediata se houver valor já pago (Sinal/Ato).
- **Parcelas Fixas (Pendentes):** O perfil permite mapear `Quantidade de Parcelas`, `Valor da Parcela` e `Data de Início`. O sistema gera um array de $N$ transações com datas mensais incrementais.
- **Recebimentos Extras (Pendentes):** Valores avulsos futuros (antigos "balões" do setor imobiliário) continuam sendo mapeados com datas e valores específicos.

### Passo 2: Baixa de Recebimentos (Conciliação FIFO)
O usuário sobe a planilha do financeiro (os extratos bancários, repasses de seguradoras, etc).
- Apenas importam duas colunas vitais: `ID do Parceiro` (ex: CPF, Matrícula) e `Valor Pago`.
- **Motor FIFO:** O sistema busca todas as transações com status `PENDENTE` do Parceiro e começa a liquidá-las por ordem cronológica (da mais antiga para a mais nova).
- **Baixa Parcial:** Se a parcela pendente for de $100$ e o cliente pagou $40$, o sistema cria um recebimento de $40$ (`COMPENSADO`) e mantém a dívida original atualizada para $60$ (`PENDENTE`).
- **Conta Corrente Transparente:** O parceiro e o admin veem exatamente quais faturas originais estão sendo pagas pelos depósitos atuais.

---

## 3. Exemplos Práticos por Ramo de Negócio

Com o novo modelo, um único perfil de configuração flexibiliza o V-Talentos para dezenas de mercados.

### Exemplo 1: Mercado Imobiliário (Longo Prazo / Construção)
- **Cenário:** O corretor vende um imóvel na planta em 48 meses.
- **Mapeamento - Passo 1:** 
  - `Produto/Serviço`: "Residencial Park View" / "Apt 204"
  - `Parcelas Qtd`: 48
  - `Parcelas Valor`: R$ 1.500,00
  - `Recebimentos Extras`: Datas dos "Balões" (reforços anuais).
- **Dinâmica - Passo 2:** Todo mês, a construtora exporta do seu ERP financeiro a lista de clientes que pagaram os boletos. O administrador sobe essa lista no "Passo 2" e o motor FIFO abate as parcelas e balões na ordem do vencimento.

### Exemplo 2: Corretoras de Seguros (Comissão Recorrente)
- **Cenário:** O consultor vende uma Apólice de Vida com pagamento mensal (12x). A comissão só é liberada se o cliente pagar o boleto da seguradora.
- **Mapeamento - Passo 1:**
  - `Produto/Serviço`: "Seguro de Vida - SulAmérica" / "Apólice 99823"
  - `Parcelas Qtd`: 12
  - `Parcelas Valor`: R$ 200,00
  - `Data Início`: Data da contratação.
- **Dinâmica - Passo 2:** A seguradora envia no dia 05 o extrato de repasse (arquivo de comissões pagas). O gestor da corretora sobe o arquivo no "Passo 2", e o V-Talentos converte os repasses líquidos em Talentos, liquidando automaticamente as parcelas PENDENTES correspondentes a essas apólices.

### Exemplo 3: Administradoras de Consórcio
- **Cenário:** O vendedor recebe um percentual imediato na assinatura (Ato) e o restante "pulverizado" caso o consorciado mantenha as parcelas em dia por 6 meses.
- **Mapeamento - Passo 1:**
  - `Valor Pago (Entrada)`: R$ 500,00 (Gera saldo imediato COMPENSADO).
  - `Parcelas Qtd`: 6
  - `Parcelas Valor`: R$ 100,00
- **Dinâmica - Passo 2:** O consórcio manda a planilha de recebimentos do mês. Se o cliente 1 pagou, entra o fluxo financeiro na planilha. O Passo 2 lê o valor recebido e transforma a 1ª parcela de PENDENTE para COMPENSADO.

### Exemplo 4: Escolas, Cursos e Clínicas (Indicação de Alunos/Pacientes)
- **Cenário:** Um embaixador (Parceiro) indicou um aluno para um curso de inglês com duração de 24 meses. Ele ganha um residual de R$ 50 a cada mensalidade paga pelo aluno indicado.
- **Mapeamento - Passo 1:**
  - `Produto/Serviço`: "Inglês Fluency - Turma B" / "Aluno João Silva"
  - `Parcelas Qtd`: 24
  - `Parcelas Valor`: R$ 50,00
- **Dinâmica - Passo 2:** A secretaria sobe o controle de inadimplência mensal com os pagamentos recebidos no sistema. O motor abate apenas as mensalidades que constarem na planilha, garantindo que o embaixador não receba por alunos inadimplentes.

---

## 4. Estrutura de Telemetria e Inconsistências
Ao utilizar qualquer um dos modos de importação, a plataforma garantirá:
1. **Auditoria:** Todos os campos não-essenciais são guardados de forma segura dentro de um payload JSON `dados_extras` na tabela da transação.
2. **Gerenciamento de Ambiguidade:** Identificadores extras (`ID Profissional`) podem ser mapeados (CPF, Matrícula). Se houver duplicidade de nomes sem CPF preenchido, o motor pausa e permite que o Administrador resolva a ambiguidade visualmente (Dropdown Interativo) antes da importação definitiva.
3. **Resiliência:** A transação do banco de dados (ACID) envelopa todo o loop de importação. Caso haja falha em liquidar qualquer linha do FIFO, nenhum dado é corrompido e o Rollback é acionado.
