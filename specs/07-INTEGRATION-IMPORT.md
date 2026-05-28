# SPEC — Lógica de Integração e Importação Dinâmica
## Documento: 07-INTEGRATION-IMPORT.md

---

## 1. Conceito de Perfis de Importação (Templates)

Para suportar diferentes layouts de planilhas de diversos clientes, o sistema utiliza um motor de mapeamento dinâmico.

### 1.1. Configuração do Perfil
O Administrador cria um perfil vinculando os campos obrigatórios do sistema às colunas do Excel:
- **Campos Obrigatórios do Sistema:**
    - `Identificador do Corretor` (Nome ou CPF)
    - `Valor da Venda` (Para saldo total)
    - `Valor Pago` (Para saldo disponível)
    - `Identificador da Venda` (Empreendimento + Unidade)
- **Mapeamento:** O sistema lê o cabeçalho da planilha e permite ao usuário selecionar qual coluna corresponde a qual campo.

2. **Fluxo de Execução**

1. **Seleção:** O Admin faz o upload do arquivo e seleciona o **Perfil de Importação** correspondente.
2. **Validação de Cabeçalho:** O sistema verifica se as colunas configuradas no perfil ainda existem no arquivo.
3. **Processamento de Colunas Multi-Valor (Balões/Reforços):**
    - Se uma célula de data contiver o `separador_multiplo` (ex: `|`), o sistema:
        1. Divide a string em um array de datas.
        2. Divide o valor total do balão pela quantidade de datas (ou segue regra específica se houver).
        3. Cria múltiplas transações `PENDENTE`, cada uma com sua respectiva `data_vencimento`.
4. **Lógica de Importação Geral:**
    - O sistema percorre as linhas a partir da `linha_cabecalho` + 1.
    - Utiliza o `mapeamento_json` para extrair os valores.

### 2.2. Tratamento de Erros
- **Corretor não encontrado:** O sistema deve alertar o Admin e permitir o "vínculo manual" ou criação do corretor.
- **Valores negativos:** Se o saldo devedor aumentar (ex: renegociação), o sistema gera um alerta para revisão manual.

### 2.3. Auto-Mapeamento de Colunas
O Motor de Importação deve oferecer uma forma de sugerir automaticamente o mapeamento das colunas da planilha para os campos obrigatórios do sistema. Essa sugestão deve ser apresentada antes da validação final da importação, garantindo que o usuário revise e confirme o perfil.

- **Modo heurístico local:** deve analisar os cabeçalhos da planilha aplicando normalização de texto (remoção de acentos, minúsculas, espaços e caracteres especiais) e comparar com padrões esperados, como:
  - `corretor`, `nome`, `cpf`, `creci`
  - `valor venda`, `total venda`, `venda`
  - `valor pago`, `pago`
  - `empreendimento`
  - `unidade`
  - `cliente`, `nome cliente`
  - `balao`, `balões`, `reforço`, `parcelas`
  - `data`, `datas`, `vencimento`
  - `qtd`, `quantidade`

- **Modo opcional com IA:** se o parâmetro `usa_ia` for ativado, a IA poderá receber os cabeçalhos e exemplos do arquivo para sugerir qual coluna corresponde a cada campo do perfil. A IA deve ser usada apenas para sugerir, não para decidir automaticamente sem revisão do usuário.

- **Resultado:** o sistema deve preencher como sugestão os campos do perfil de mapeamento para revisão manual. O usuário deve poder ajustar os campos antes de salvar o perfil ou prosseguir com o preview.

### 2.4. Significado da etapa "Carregar Planilha"
O passo de "Carregar Planilha" faz o upload do arquivo e prepara os dados para análise de preview. Ele **não importa os dados definitivamente** e **não salva um novo perfil de mapeamento** por si só.

- O arquivo é lido e enviado para o backend apenas para validar o perfil existente ou a sugestão de mapeamento.
- O propósito dessa etapa é verificar colunas, detectar inconsistências e mostrar um preview antes da importação final.
- A importação definitiva só ocorre quando o usuário confirma explicitamente o processamento do lote imobiliário.

## 3. Frequência de Atualização
- Manual (Upload via Painel Admin).
- O sistema deve guardar o histórico de cada arquivo importado (Log de Importação).

## 4. Importação Avançada e Campos Customizados (Fase 5)

### 4.1. Identificador Extra do Corretor
- O perfil de importação pode conter a coluna opcional `identificador_extra_coluna` (CPF, CRECI, matrícula, etc.).
- Quando ativado, a busca e resolução de usuários no banco de dados prioriza a correspondência exata de `Nome + Identificador Extra` (CPF/CRECI/Matrícula do corretor).
- Se não for fornecido o Identificador Extra na linha ou no perfil, o motor faz fallback automático para busca somente por `Nome`.

### 4.2. Campos Extras Customizáveis
- O administrador da empresa pode configurar em cada perfil um conjunto de colunas dinâmicas (ex: `Gerente de Vendas`, `Canal de Captação`, `Percentual de Comissão`) como `campos_extras`.
- Durante a importação de cada linha da planilha, os valores dessas colunas mapeadas são lidos e salvos dentro do campo JSON `dados_extras` na transação criada na tabela `GamTransacao`.
- Exemplo de payload gravado em `GamTransacao.dados_extras`:
```json
{
  "gerente_vendas": "Carlos Souza",
  "canal_captacao": "Portal Web",
  "comissao_percentual": "1.5%"
}
```

### 4.3. Resolução de Ambiguidade de Nomes
- Se houver múltiplos usuários com o mesmo nome na empresa, e o perfil de importação não utilizar ou não tiver o `identificador_extra_coluna` preenchido para aquela linha, a linha é marcada como **Inconsistente**.
- O sistema deve sugerir no preview do frontend os candidatos com nomes correspondentes para que o administrador possa resolver a ambiguidade selecionando manualmente a qual corretor aquela transação pertence antes de concluir a importação definitiva.
