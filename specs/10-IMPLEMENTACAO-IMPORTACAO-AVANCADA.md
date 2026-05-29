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

### Exemplo 1: Mercado Imobiliário (Longo Prazo / Construção)
- **Cenário:** O corretor vende um imóvel na planta em 48 meses com balões anuais.
- **Configuração do Perfil de Importação (Configurações Gerais):**
  - `Fator de Conversão`: 100 (100 reais = 1 Talento)
  - `Separador de Múltiplos`: `;`
- **Mapeamento (Passo 1 - Contratos):** 
  - `Nome do Parceiro`: Coluna `CORRETOR`
  - `ID Profissional (Identificador Extra)`: Coluna `CRECI`
  - `Produto/Serviço`: Coluna `EMPREENDIMENTO`
  - `Ref. Contrato`: Coluna `UNIDADE`
  - `Valor da Venda`: Coluna `VGV`
  - `Valor Pago (Entrada)`: Coluna `SINAL_PAGO` (Gera transação imediata COMPENSADA)
  - `Quantidade de Parcelas`: Coluna `QTD_PARCELAS` (ex: 48)
  - `Valor da Parcela`: Coluna `VALOR_MENSAL` (ex: 1500,00)
  - `Data Início (Parcelas)`: Coluna `VENCIMENTO_1`
  - `Datas Recebimentos Extras (Balões)`: Coluna `DATAS_BALOES` (ex: 10/12/2026;10/12/2027)
  - `Valores Recebimentos Extras`: Coluna `VALORES_BALOES` (ex: 50000,00;50000,00)
- **Dinâmica (Passo 2 - Baixa via FIFO):** 
  - A construtora exporta o extrato do mês com as colunas `CRECI_CORRETOR` e `VALOR_COMISSAO_PAGA`. 
  - O gestor sobe no Passo 2 e o motor FIFO busca as parcelas/balões PENDENTES daquele corretor (usando o `CRECI`) e liquida as mais antigas usando o `VALOR_COMISSAO_PAGA`.

### Exemplo 2: Corretoras de Seguros (Comissão Recorrente)
- **Cenário:** O consultor vende uma Apólice de Vida com pagamento mensal (12x). A comissão só é liberada se o cliente pagar o boleto.
- **Configuração do Perfil de Importação:**
  - `Fator de Conversão`: 1 (1 real = 1 Talento, ou seja, pontos 1:1)
- **Mapeamento (Passo 1 - Contratos):**
  - `Nome do Parceiro`: Coluna `CONSULTOR`
  - `ID Profissional`: Coluna `SUSEP`
  - `Produto/Serviço`: Coluna `RAMO_SEGURO`
  - `Ref. Contrato`: Coluna `NUM_APOLICE`
  - `Quantidade de Parcelas`: Coluna `PARCELAS_VIGENCIA` (ex: 12)
  - `Valor da Parcela`: Coluna `COMISSAO_PREVISTA` (ex: 200,00)
  - `Data Início (Parcelas)`: Coluna `DATA_INICIO_VIGENCIA`
- **Dinâmica (Passo 2 - Baixa via FIFO):** 
  - A seguradora envia no dia 05 o extrato de repasse (arquivo de comissões). 
  - O gestor sobe o arquivo mapeando `SUSEP` e `VALOR_LIQUIDO_REPASSE` no "Passo 2". O V-Talentos liquida automaticamente as parcelas PENDENTES correspondentes a essas apólices (ex: a 1ª das 12 parcelas passa para COMPENSADO).

### Exemplo 3: Administradoras de Consórcio
- **Cenário:** O vendedor recebe um percentual imediato na assinatura (Ato) e bônus residual pulverizado em 6 meses.
- **Mapeamento (Passo 1 - Contratos):**
  - `Nome do Parceiro`: Coluna `VENDEDOR`
  - `ID Profissional`: Coluna `CPF_VENDEDOR`
  - `Produto/Serviço`: Coluna `GRUPO_CONSORCIO`
  - `Ref. Contrato`: Coluna `COTA`
  - `Valor Pago (Entrada)`: Coluna `COMISSAO_ATO` (ex: 500,00 - vira saldo imediato)
  - `Quantidade de Parcelas`: Coluna `MESES_BONUS` (ex: 6)
  - `Valor da Parcela`: Coluna `VALOR_BONUS_MENSAL` (ex: 100,00)
- **Dinâmica (Passo 2 - Baixa via FIFO):** 
  - O consórcio exporta a base de cotas adimplentes do mês. 
  - Ao subir a planilha no Passo 2, mapeando `CPF_VENDEDOR` e o valor pago naquele mês (ex: 100,00), o sistema transforma a parcela do mês de PENDENTE para COMPENSADA. Se um cliente não pagou a cota, o valor não vem na planilha e a parcela PENDENTE aguarda o próximo repasse.

### Exemplo 4: Escolas, Cursos e Clínicas (Indicação de Alunos/Pacientes)
- **Cenário:** Um embaixador indicou um aluno para um curso de 24 meses. Ele ganha R$ 50 a cada mensalidade paga pelo aluno indicado.
- **Configuração do Perfil de Importação:**
  - `Fator de Conversão`: 50 (50 reais = 1 Talento)
- **Mapeamento (Passo 1 - Contratos):**
  - `Nome do Parceiro`: Coluna `NOME_EMBAIXADOR`
  - `ID Profissional`: Coluna `MATRICULA_EMBAIXADOR`
  - `Produto/Serviço`: Coluna `CURSO`
  - `Cliente (Indicado)`: Coluna `ALUNO_INDICADO`
  - `Quantidade de Parcelas`: Coluna `DURACAO_MESES` (ex: 24)
  - `Valor da Parcela`: Coluna `BKP_VALOR_MENSAL` (ex: 50,00)
- **Dinâmica (Passo 2 - Baixa via FIFO):** 
  - A secretaria sobe o relatório de recebimentos (mensalidades pagas). 
  - Ao mapear a `MATRICULA_EMBAIXADOR` e o `VALOR_REPASSE`, o motor abate exatamente as mensalidades (pendências) pagas naquele mês, convertendo 50 reais em 1 Talento automaticamente e creditando no extrato do embaixador.

---

## 4. Estrutura de Telemetria e Inconsistências
Ao utilizar qualquer um dos modos de importação, a plataforma garantirá:
1. **Auditoria:** Todos os campos não-essenciais são guardados de forma segura dentro de um payload JSON `dados_extras` na tabela da transação.
2. **Gerenciamento de Ambiguidade:** Identificadores extras (`ID Profissional`) podem ser mapeados (CPF, Matrícula). Se houver duplicidade de nomes sem CPF preenchido, o motor pausa e permite que o Administrador resolva a ambiguidade visualmente (Dropdown Interativo) antes da importação definitiva.
3. **Resiliência:** A transação do banco de dados (ACID) envelopa todo o loop de importação. Caso haja falha em liquidar qualquer linha do FIFO, nenhum dado é corrompido e o Rollback é acionado.
