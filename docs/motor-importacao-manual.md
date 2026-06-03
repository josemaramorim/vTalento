# Manual de Sintaxe e Autoria do Motor de Importação Programável (v2.0)

O Motor de Importação Programável (Motor 2) é um sistema robusto baseado em Sandbox segura (`vm` do Node.js) que executa instruções estruturadas em JSON e códigos Javascript customizados para cada linha de uma planilha Excel ou CSV.

Este motor foi construído sob regras estritas de governança, garantindo isolamento completo de CPU e memória, proteção contra laços de repetição infinitos (timeouts de 50ms) e dual-pass de resolução para macros.

---

## 1. Estrutura Geral do JSON de Perfil

Cada perfil programável é descrito por um documento JSON com os seguintes campos principais:

```json
{
  "versao_motor": "2.0",
  "configuracoes_gerais": {
    "linha_cabecalho": 1,
    "pular_linhas_vazias": true,
    "delimitador_lista": ";"
  },
  "contexto_global": {
    "script_inicializacao": "globalStore.fatorDolar = 5.25; globalStore.registrosAprovados = 0;"
  },
  "mapeamento_campos": {
    "NomeConsultor": {
      "celula": "A",
      "script": "return value.trim().toUpperCase();"
    },
    "Documento": {
      "celula": "B",
      "script": "return helpers.cleanCPF(value);"
    }
  },
  "hooks": {
    "antes_salvar_linha": "if (linhaResult.Vgv < 100) return false; return true;"
  }
}
```

### Detalhamento das Seções:
- **`versao_motor`**: String identificadora da versão do interpretador (atualmente `2.0`).
- **`configuracoes_gerais`**: Parâmetros de importação clássicos da planilha.
- **`contexto_global`**: Contém scripts de inicialização única (executados antes do início do processamento das linhas) para setar estados persistidos no objeto `globalStore`.
- **`mapeamento_campos`**: Objeto onde cada chave é uma coluna de destino na tabela de transações (`GamTransacao` ou dados resultantes). Cada campo pode possuir uma referência direta à coluna do Excel (`celula: "A"`) e/ou um script Javascript que retorna o valor tratado.
- **`hooks`**: Trechos procedurais globais. O hook `antes_salvar_linha` roda após a resolução de todos os campos da linha corrente. Se retornar `false`, a linha é pulada.

---

## 2. Contexto de Execução da Sandbox

Os scripts de campo e hooks rodam dentro de um contexto isolado (`vm` do Node.js). As seguintes variáveis e funções utilitárias são disponibilizadas nativamente:

### Variáveis Locais do Contexto:
- `value`: O valor bruto da célula da coluna mapeada (equivalente a `row[celula]`).
- `row`: A linha inteira atual sob formato de dicionário de colunas (Ex: `{ A: "Carlos", B: "123.456...", C: "1.500,00" }`).
- `globalStore`: Um objeto global mutável que persiste valores e estados acumulados entre a execução das linhas da mesma planilha.
- `log`: Um objeto contendo três funções de captura de logs para depuração visual:
  - `log.info(mensagem)`
  - `log.warning(mensagem)`
  - `log.error(mensagem)`

---

## 3. Helpers Utilitários Nativos e Instruções de Retorno

Nos scripts de `mapeamento_campos`, o valor final de cada coluna processada deve ser explicitamente retornado usando a instrução `return`. Como tarefas de sanitização, formatação de moeda e manipulação de datas são extremamente comuns no processamento de planilhas Excel, a sandbox disponibiliza nativamente o objeto global `helpers` contendo utilitários pré-compilados.

### Como utilizar a instrução `return helpers`
Você pode chamar o helper e retornar seu valor diretamente na mesma linha, reduzindo o código e tornando-o limpo:

```javascript
// Exemplo: sanitiza o CPF lido da célula e já retorna o resultado limpo
return helpers.cleanCPF(value);
```

Também é possível armazenar em variáveis para aplicar lógicas condicionais ou matemáticas mais complexas antes do retorno:

```javascript
// Exemplo: converte moeda, faz um cálculo e retorna
const vgv = helpers.parseMoeda(value);
if (vgv > 500000) {
  return vgv * 0.02; // 2% de comissão para grandes vendas
}
return vgv * 0.01; // 1% de comissão padrão
```

---

### Tabela de Helpers Existentes Atualmente:

| Função | Parâmetro | Tipo de Retorno | Descrição | Exemplo de Uso |
| :--- | :--- | :--- | :--- | :--- |
| **`helpers.parseMoeda(val)`** | `val` (String ou Número) | `Float` (ou `0` se inválido) | Sanitiza textos com cifras monetárias (BRL `R$ 1.500,00`, USD `1,500.00`, parciais `1.500`) e converte para decimal. | `helpers.parseMoeda("R$ 1.500,50")` ➔ `1500.5` |
| **`helpers.cleanCPF(val)`** | `val` (String) | `String` | Remove qualquer caractere não numérico (letras, pontos, traços, barras, espaços). | `helpers.cleanCPF("123.456.789-00")` ➔ `"12345678900"` |
| **`helpers.somarMeses(dataStr, meses)`** | `dataStr` (String), `meses` (Número) | `String` (formato `YYYY-MM-DD`) | Adiciona o número especificado de meses a uma data (suporta formato brasileiro `DD/MM/YYYY` ou formato ISO). | `helpers.somarMeses("15/01/2026", 3)` ➔ `"2026-04-15"` |

---

## 4. O Editor de Fluxos Visual (No-Code)

A plataforma também oferece uma experiência de mapeamento 100% visual no estilo arraste-e-solte (Node-RED/N8N), onde o JSON de perfil é gerado automaticamente nos bastidores. 

Dentro desse editor, destacam-se os **Nós Geradores Financeiros (Sinal, Parcelas, Lançamentos Extras)**, que são nós especializados em criar as transações financeiras automaticamente, sem precisar de programação em JavaScript para regras comuns.

### Exemplo Prático: Gerador de Entrada (Sinal)
Este é um nó (bloco verde) usado para gerar uma transação inicial (sinal) quando a linha da planilha é lida.

- **Portas de Conexão:** Possui entradas visuais para ligar as colunas do Excel correspondentes ao `Valor (Moeda)` e `Vencimento (Data)`. Quando você puxa um fio de uma coluna para essa porta, o sistema sabe de onde extrair os dados.
- **Painel de Configuração:** Ao clicar no nó, o administrador pode escolher o `Status de Entrada` inicial (ex: *Compensado* ou *Pendente*) e definir a `Justificativa da Transação`.
- **Poder das Macros:** A justificativa suporta macros dinâmicas, como `Entrada de Contrato - {{C}}`. O motor intercepta o `{{C}}`, busca o texto na **Coluna C** daquela respectiva linha do Excel e substitui em tempo real. (Ex: se na coluna C estiver "João", a transação salva será *"Entrada de Contrato - João"*).
- **Conversão Code-Gen:** Por trás dos panos, o fluxo visual traduz essa configuração simples em um script de sandbox (mostrado nos exemplos abaixo) que monta o objeto JSON de transação completo e o empurra para o banco de dados.

### Exemplo Prático: Gerador de Parcelas
Este é um nó (bloco turquesa) focado em gerar um array de múltiplas transações sequenciais, como um carnê de parcelamento.

- **Portas de Conexão:** Possui entradas para ligar as colunas de `Qtd Total`, `Qtd Pagas` (para saber quantas já estão compensadas), `Valor Parcela` e `Data Início`.
- **Painel de Configuração:** Permite definir a `Frequência` (Mensal, Bimestral, Anual) e a `Justificativa`.
- **Poder das Macros:** Além de suportar o valor da coluna com `{{C}}`, este nó suporta macros de loop como `{i}` (o número da parcela atual) e `{total}` (o número total de parcelas). Por exemplo: `Parcela {i}/{total} - {{C}}` vira *"Parcela 1/12 - João"*, *"Parcela 2/12 - João"*, etc.

### Exemplo Prático: Gerador de Lançamentos Extras (Balões / Reforços)
Este é um nó (bloco roxo) focado em gerar transações extras, avulsas ou de reforço (conhecidos em alguns segmentos como "balões") que não seguem uma frequência regular, lendo múltiplas datas de uma única célula do Excel.

- **Portas de Conexão:** Possui entradas para `Valor Unitário`, `Qtd Lançamentos` e `String Datas` (uma coluna que contém as datas separadas por um caractere, como `15/05/2026 | 15/12/2026`).
- **Painel de Configuração:** O usuário pode configurar qual o `Delimitador de Datas` (ex: `|`, `;` ou `,`) e o `Status Padrão do Lançamento`. A justificativa também aceita as macros `{i}`, `{total}` e `{{coluna}}`.

### Exemplo Prático: Repetição e Loop
Este é um nó (bloco laranja) focado em representar fluxos iterativos ou laços de repetição visualmente.

- **Portas de Conexão:** Possui uma porta de entrada (`in`) e uma de saída (`out`) para conectar a sequência do fluxo conceitual.
- **Painel de Configuração:** O administrador pode configurar a propriedade `Variável/Nome do Loop` (que por padrão inicia como *Parcelas*).
- **Importante (Comportamento no Compilador):** 
  > [!IMPORTANT]
  > Atualmente, o compilador bidirecional do Editor de Fluxos Visual ignora o nó genérico de Loop ao exportar para o JSON do perfil.
  > 
  > Isso ocorre porque as lógicas de repetição financeira mais comuns (como a criação automática de parcelas ou lançamentos extras sequenciais a partir de uma linha de planilha) já são inteiramente tratadas e automatizadas de forma especializada pelos nós **Gerador de Parcelas** e **Gerador de Lançamentos Extras**. Portanto, o nó de repetição genérico funciona hoje como um **marcador visual conceitual** do fluxo de dados.
- **Como implementar loops avançados via Código:** Caso você precise de loops genéricos ou lógicas de repetição complexas que vão além das capacidades dos nós geradores automáticos, você deve utilizar um **Bloco de Código JS (Script)** apontando para o campo especial `transacoes_geradas` e estruturar o loop manualmente via código Javascript.

#### Exemplo Prático de Código de Loop Personalizado:
Abaixo, veja como estruturar um loop no **Bloco de Código JS (Script)** para gerar uma quantidade de comissões customizada baseada em colunas da planilha:

```javascript
const transacoes = [];
const totalRepeticoes = parseInt(row.J) || 0; // lê a quantidade de parcelas da coluna J
const valorBase = helpers.parseMoeda(row.H); // lê o valor de cada repetição da coluna H
const dataReferencia = new Date();

// Loop manual estruturado via javascript na Sandbox
for (let i = 0; i < totalRepeticoes; i++) {
  const dataVencimento = new Date(dataReferencia.getTime());
  dataVencimento.setMonth(dataReferencia.getMonth() + i);

  transacoes.push({
    valor: valorBase,
    data_vencimento: dataVencimento.toISOString().split('T')[0],
    status: 'PENDENTE',
    justificativa: 'Comissão Recorrente ' + (i + 1) + '/' + totalRepeticoes,
    tipo: 'CREDITO'
  });
}

return transacoes; // Retorna o array de transações geradas pelo loop
```

### Exemplo Prático: Bloco Código JS (Script)
Este é um nó (bloco roxo/variante roxa) usado para aplicar lógicas procedimentais personalizadas ou cálculos complexos a um campo específico utilizando Javascript.

- **Portas de Conexão:** Possui uma porta de entrada (`in`) para receber o valor bruto de uma coluna da planilha (`value`) e uma porta de saída (`out`) que é conectada à porta correspondente do nó **Gravar Transação**.
- **Painel de Configuração:**
  - **Nome do Campo de Saída:** O nome da coluna de destino no banco de dados (ex: `ValorVenda`, `ValorComissao`).
  - **Editor de Código:** Um editor de código Monaco incorporado onde você escreve a função.
- **Contexto e Lógica:** O script deve retornar o valor resolvido usando `return`. Possui acesso à variável `value` (valor da coluna conectada na entrada) e ao objeto `row` (linha completa da planilha).
- **Exemplo de Script:**
  ```javascript
  // Aplica 10% de comissão extra sobre o valor lido da coluna conectada
  const valorVenda = helpers.parseMoeda(value);
  return valorVenda * 0.10;
  ```

### Exemplo Prático: Sanitizador de Texto
Este é um nó (bloco azul) focado na limpeza rápida, formatação e padronização de campos de texto, sem a necessidade de codificação manual em Javascript.

- **Portas de Conexão:** Possui uma porta de entrada (`in`) ligada a uma coluna do Excel, e uma porta de saída (`out`) ligada a uma das portas do nó **Gravar Transação**.
- **Painel de Configuração:**
  - **Nome do Campo de Saída:** Propriedade de destino.
  - **Regra de Sanitização:** Dropdown com regras pré-definidas:
    - *Tudo em Maiúsculo (UPPERCASE):* Converte para maiúsculas (ex: `"parceiro"` ➔ `"PARCEIRO"`).
    - *Tudo em Minúsculo (lowercase):* Converte para minúsculas (ex: `"Parceiro"` ➔ `"parceiro"`).
    - *Remover Espaços Extras (trim):* Elimina espaços em branco nas pontas e espaços duplicados.
    - *Limpar Caracteres Especiais (clean):* Retém exclusivamente letras, números e espaços, eliminando pontuações e símbolos.

### Exemplo Prático: Condicional Se (Hook)
Este é um nó (bloco rosa) de validação estruturado para atuar no nível da linha completa do arquivo antes da sua inserção final.

- **Portas de Conexão:** Possui uma porta de entrada (`in`).
- **Painel de Configuração:** Contém uma caixa Monaco Editor para o script de validação de linha.
- **Funcionamento:** O script do hook é compilado para a chave `hooks.antes_salvar_linha`. Ele deve retornar `true` (para aceitar e salvar a linha processada) ou `false` (para ignorar e descartar a linha atual inteira da importação).
- **Exemplo de Script:**
  ```javascript
  // Valida se a venda é superior a zero e o nome do consultor está presente
  if (!linhaResult.NomeConsultor || linhaResult.ValorVenda <= 0) {
    log.warning("Linha descartada por ausência de consultor ou valor nulo.");
    return false;
  }
  return true;
  ```

### Exemplo Prático: Enviar Webhook/Alerta
Este é um nó terminal (bloco laranja) focado na automação de alertas e integrações via canais de mensagens externos.

- **Portas de Conexão:** Possui uma porta de entrada (`in`).
- **Painel de Configuração:**
  - **URL do Webhook:** Endereço POST do canal de destino (ex: Slack, Teams).
  - **Mensagem customizada:** Conteúdo do alerta, com suporte a substituição de macros de campo `{{NomeConsultor}}`.
- **Exemplo de Configuração:**
  - *URL:* `https://hooks.slack.com/services/T00/B00/XXXX`
  - *Mensagem:* `🎉 Carga efetuada! O parceiro {{NomeConsultor}} registrou uma nova venda no valor de R$ {{ValorVenda}}.`

### Exemplo Prático: Configurações & Vars (Variáveis Globais)
Este é um nó estático global (bloco dourado/amarelo) utilizado para definir as configurações de cabeçalho da planilha e registrar variáveis globais persistentes compartilhadas.

- **Portas de Conexão:** Não possui portas de conexão (bloco conceitual estático).
- **Painel de Configuração:**
  - **Linha do Cabeçalho:** Indica a linha dos cabeçalhos na planilha.
  - **Separador de Lista:** Define o caractere delimitador (ex: `;` ou `,`).
  - **Fator Conversão:** O valor padrão para cálculo dos Talentos virtuais.
  - **Pular Linhas Vazias:** Booleano para pular ou não linhas vazias.
  - **Variáveis Globais:** Tabela dinâmica de chave-valor para configurar parâmetros que ficam disponíveis no objeto `globalStore` durante toda a execução.
- **Exemplo de Variável:**
  - *Chave:* `fatorDolar` | *Tipo:* `Número` | *Valor:* `5.25`
  - *Acesso nos scripts:* `globalStore.fatorDolar`

### **Portas de Entrada (Campos de Destino) do Nó "Gravar Transação"**:

O nó **Gravar Transação** possui 11 portas de entrada, cada uma mapeando diretamente para a coluna correspondente na tabela `GamTransacao` no banco de dados:

1. **`Nome Consultor (Nome)`**: Grava na coluna `NomeConsultor` (usado para localizar o usuário no banco de dados).
2. **`CPF / ID (Documento)`**: Grava na coluna `IDProfissional` (usado alternativamente ou conjuntamente para localizar o usuário).
3. **`Valor Comissão (ValorVenda)`**: Grava na coluna `ValorVenda` (valor original em Reais BRL do negócio/comissão).
4. **`Fator Conversão (ValorComissao)`**: Grava na coluna `ValorComissao` (valor convertido em Pontos/Talentos virtuais que o consultor vai receber).
5. **`Empreendimento (Produto)`**: Grava na coluna `empreendimento`.
6. **`Unidade (Contrato)`**: Grava na coluna `unidade`.
7. **`Nome do Cliente`**: Grava na coluna `contato_cliente`.
8. **`Justificativa da Transação`**: Grava na coluna `justificativa` (caso não seja fornecido por um gerador financeiro ou por esta porta, o sistema gera uma justificativa padrão com o número da linha).
9. **`Tipo (Crédito/Débito)`**: Grava na coluna `tipo` (padrão: `'CREDITO'`).
10. **`Status da Transação`**: Grava na coluna `status` (padrão: `'COMPENSADO'`).
11. **`Data de Vencimento`**: Grava na coluna `data_vencimento`.

### **Mapeamento Obrigatório e Comportamento em Caso de Ausência**

Para que uma linha da planilha seja importada com sucesso no motor programável, o resultado da execução do script (ou o mapeamento direto de campos) deve atender a alguns critérios de obrigatoriedade.

#### 1. Identificação do Corretor (Obrigatório)
O motor precisa vincular a transação a um corretor cadastrado no banco de dados (`GamUsuario`).
* **Como o sistema resolve:** Ele busca no objeto resultante por chaves comuns (independente de maiúsculas/minúsculas):
  * **Chaves de Nome:** `NomeConsultor`, `parceiro`, `consultor`, `nome`, `corretor`, `colaborador`, `nome_consultor`
  * **Chaves de Documento/CRECI:** `IDProfissional`, `creci`, `cpf`, `matricula`, `email`, `documento`, `id_profissional`
* **Se faltar:** Se o script ou mapeamento não fornecer nenhuma dessas chaves, ou se o corretor indicado não for localizado no banco de dados da empresa, a linha receberá o status **NÃO ENCONTRADO** (tarja vermelha). 
* **Impacto:** A importação definitiva ficará bloqueada até que o corretor seja cadastrado no banco ou resolvido manualmente na tela de preview.

#### 2. Transações e Valores (Obrigatório)
Deve ser gerada pelo menos uma transação financeira válida.
* **Como o sistema resolve:** Ele procura por uma lista chamada `transacoes_geradas` (ou `transacoes`, `movimentacoes`). Se não houver essa lista, ele cai em um *fallback* de transação única buscando as chaves de valor (`valor`, `valor_talentos`, `valor_pontos`, `valortalentos`) ou o primeiro número retornado.
* **Se faltar:** Se o valor resolvido em pontos for zero (ou não numérico) e nenhuma transação for adicionada, a simulação não criará transações para essa linha.

#### 💡 Exemplo Prático de Mapeamento Manual Mínimo (JSON)
Abaixo, veja um exemplo de mapeamento JSON mínimo que atende a todos os critérios obrigatórios de forma manual (sem scripts complexos), vinculando o nome da coluna R, CRECI da coluna S, valor total da venda da coluna E e os pontos finais da coluna F:

```json
{
  "versao_motor": "2.0",
  "colunas_entrada": [
    {
      "celula": "R",
      "label": "Nome/Consultor",
      "tipo": "String"
    },
    {
      "celula": "S",
      "label": "Creci",
      "tipo": "String"
    },
    {
      "celula": "E",
      "label": "Valor Total",
      "tipo": "String"
    },
    {
      "celula": "F",
      "label": "Valor Pago",
      "tipo": "String"
    }
  ],
  "configuracoes_gerais": {
    "linha_cabecalho": 3,
    "pular_linhas_vazias": true
  },
  "mapeamento_campos": {
    "NomeConsultor": {
      "celula": "R"
    },
    "IDProfissional": {
      "celula": "S"
    },
    "ValorVenda": {
      "celula": "E",
      "script": "return helpers.parseMoeda(value);"
    },
    "valor": {
      "celula": "F",
      "script": "return Math.floor(helpers.parseMoeda(value) / 100);"
    }
  }
}
```

---

#### 📌 Entendendo os campos de Valores no Nó de Destino

No fluxo do V-Talentos, existem duas formas de representar o valor de uma comissão no banco de dados. É fundamental compreender a diferença entre essas duas portas do nó de gravação:

##### A. **Valor Comissão (ValorVenda)**
* **O que recebe:** Recebe o valor monetário bruto em Reais (BRL / R$). Geralmente é conectado diretamente a um nó de coluna da planilha (ex: coluna que contém a comissão bruta) ou após passar por um bloco de limpeza.
* **O que representa no banco:** Mapeia para a coluna `valor_original_rs` na tabela `GamTransacao`.
* **Exemplo de uso:** Se a comissão na planilha é de **R$ 1.500,00**, você conecta a coluna correspondente a esta porta. No extrato, o administrador verá que a venda original tinha o valor de R$ 1.500,00.

##### B. **Fator Conversão (ValorComissao)**
* **O que recebe:** Recebe o valor final convertido em **Pontos/Talentos** (moeda virtual da plataforma) que será adicionado ao saldo do consultor.
* **O que representa no banco:** Mapeia para a coluna `valor` na tabela `GamTransacao`. Este é o valor numérico que de fato altera o saldo disponível ou a receber do usuário.
* **Exemplo de uso:** Geralmente, você passa o valor original por um **Bloco de Código JS** para realizar a divisão pelo fator de conversão (ex: 100). Se a comissão é de R$ 1.500,00 e o fator é 100, o bloco de código retornará **15** e você conectará a saída desse bloco à porta `Fator Conversão (ValorComissao)`.

---

##### 💡 Exemplo Prático Completo de Fluxo (Conexão e Código)

Se você tem a comissão original de **R$ 25.000,00** na **Coluna F** da planilha e quer alimentar as duas portas corretamente:

1. **Ligando o Valor Original (Reais):**
   * Puxe a ligação da **Coluna F** diretamente para a porta **`Valor Comissão (ValorVenda)`**.
   * *Resultado:* O banco salvará `valor_original_rs = 25000.00`.

2. **Ligando o Valor Convertido (Pontos/Talentos):**
   * Crie um nó **`Bloco Código (JS)`** e conecte a saída da **Coluna F** na entrada dele.
   * No script do bloco de código, utilize o helper e a variável global do fator de conversão:
     ```javascript
     const valorReais = helpers.parseMoeda(value); // value aqui é o valor da coluna F
     return valorReais / fatorConversao; // Divide pelo fator (ex: 100) para converter em pontos
     ```
   * Puxe a ligação da saída (`out`) do seu **`Bloco Código (JS)`** para a porta **`Fator Conversão (ValorComissao)`** do nó de gravação.
   * *Resultado:* Se o fator for 100, o script retornará `250`. O banco salvará `valor = 250` na tabela de transações.

> [!TIP]
> **Auditabilidade do Fator de Conversão:**
> Para garantir que possamos auditar e saber exatamente qual fator de conversão foi utilizado em cada lançamento (uma vez que o fator global do perfil pode ser alterado por usuários no futuro), o motor de importação **grava automaticamente** a chave `fator_conversao_utilizado` dentro do JSON de metadados `dados_extras` da tabela `GamTransacao` para todas as transações criadas.

---

- **Como funciona a ligação e os nomes de variáveis**:
  > [!IMPORTANT]
  > O que determina qual campo do banco de dados receberá o valor **não é o nome interno que você deu ao seu bloco de código/variável**, mas sim **a porta física do nó "Gravar Transação" onde você conectou o fio**.
  >
  > Se você criar um bloco de código com o nome do campo de saída configurado como `ComissaoGeral` ou `var_123`, esse nome interno **será ignorado na gravação final**. O compilador utiliza a conexão visual para saber o destino:
  - Se a linha de ligação sai do seu bloco de código e entra na porta **`Valor Comissão (ValorVenda)`**, o valor calculado pelo seu código será gravado na coluna `ValorVenda` no banco de dados.
  - Se a linha sai do mesmo bloco e entra na porta **`Fator Conversão (ValorComissao)`**, o valor será gravado na coluna `ValorComissao`.

- **Visualização das Conexões**:
  Ao clicar no nó **Gravar Transação**, o painel de propriedades exibe o status de cada porta em tempo real:
  - `🔌 Conectado ao nó [NOME_NÓ]`: Indica de qual bloco o dado está sendo importado.
  - `⚠️ Desconectado (Usará valor nulo)`: Indica que a porta está livre e o banco registrará valor vazio para aquele campo se nenhuma linha de ligação for feita.

---

## 5. Resolução de Casos de Uso e Dúvidas Comuns

Nesta seção abordamos dúvidas frequentes na utilização do motor programável baseadas em planilhas reais de vendas, como a `Park_View_Clientes (1).xlsx`.

### A. Por que o Corretor/Consultor aparece como "NÃO ENCONTRADO" no preview de simulação?

No painel de simulação à direita (ao rodar em tempo real), a linha da planilha pode exibir um status em vermelho: **`NÃO ENCONTRADO`** e exibir o nome do consultor seguido de **`Sem ID`**.

**Análise Prática da Imagem (Exemplo Real):**
1. Na simulação, no bloco **DADOS RESOLVIDOS**, vemos o JSON gerado da linha:
   ```json
   {
     "NomeConsultor": "Maria Costa",
     "empreendimento": "Park View Residencial"
   }
   ```
2. Na coluna **CONSULTOR**, o sistema exibe:
   - **`Maria Costa`** (Nome resolvido)
   - **`Sem ID`** (Isso significa que o campo `IDProfissional` não foi preenchido ou não foi conectado a nenhuma coluna da planilha contendo o CPF/ID. Portanto, o sistema só tem o nome para tentar localizar a conta).
3. Na coluna **STATUS**, exibe **`NÃO ENCONTRADO`** (com uma tarja vermelha).

**O Motivo Técnico:**
O motor programável de importação realiza uma busca no banco de dados na tabela `GamUsuario` para converter o nome/documento da planilha em um ID de usuário real. 
Ele executa uma busca restrita:
* Apenas usuários com o perfil de **`CORRETOR`**.
* Apenas usuários associados ao mesmo **`empresa_id`** do administrador logado.
* Que possuam exatamente o mesmo nome `"MARIA COSTA"` (sem espaços extras e sem diferenciar maiúsculas/minúsculas).

Se nenhuma linha no banco atender a esses 3 critérios, o motor não consegue descobrir qual é o ID da Maria Costa no banco de dados e retorna status **`NÃO ENCONTRADO`**.

**Como Resolver (Passo a Passo):**

#### Solução 1: Cadastrar a corretora no sistema (Recomendado)
A Maria Costa precisa estar devidamente cadastrada na plataforma antes da importação.
1. Vá até o menu de **Gestão de Usuários / Corretores** no painel de administração.
2. Cadastre um novo usuário com os seguintes dados obrigatórios:
   - **Nome Completo:** `Maria Costa` (deve coincidir exatamente com o nome da planilha).
   - **Perfil / Função:** Selecione **Corretor**.
   - **Empresa:** Certifique-se de vincular à sua empresa logada atual.
3. Se você estiver importando em um ambiente local de testes (onde o banco é limpo), certifique-se de que o script de sementes (`seeding`) ou os testes insiram esse usuário antes do processo.

#### Solução 2: Mapear a coluna de CPF/ID (Evita duplicidades de nomes)
Buscar apenas por nome pode gerar conflitos caso existam duas corretoras com o mesmo nome (ex: duas "Maria Costa").
1. Identifique se a planilha possui uma coluna com o CPF ou CNPJ do corretor (ex: Coluna S).
2. No Editor de Fluxos Visual, conecte a porta de saída da **Coluna S (CPF/ID)** à porta de entrada **`CPF / ID (Documento)`** do nó **`Gravar Transação`**.
3. No cadastro da corretora no painel de administração, certifique-se de preencher o CPF/Documento correspondente. O motor passará a buscar pelo CPF/ID em primeiro lugar, resolvendo o vínculo perfeitamente.

---

### B. Como mapear campos extras: Justificativa, EMPREENDIMENTO, unidade e contato_cliente?

Se na sua planilha Excel (ex: `Park_View_Clientes (1).xlsx`) você possui colunas que trazem esses metadados (como nome do empreendimento, o número da unidade, o nome do cliente final e uma justificativa customizada), você pode importá-los e persistir nas colunas correspondentes do banco.

Abaixo, veja o exemplo detalhado utilizando as seguintes colunas da planilha:
* **Coluna R**: "corretor responsavel" (Nome da Maria Costa, etc.)
* **Coluna C**: "EMPREENDIMENTO" (ex: "Park View Residencial")
* **Coluna D**: "unidade" (ex: "Apto 102")
* **Coluna B**: "contato_cliente" (ex: "João da Silva")
* **Coluna P**: "Justificativa" (ex: "Venda aprovada pela diretoria")

#### Método 1: Fazendo a Ligação Visivelmente (No-Code Flowchart)
No Editor de Fluxos Visual, proceda da seguinte maneira:
1. **Configurar a Entrada**: No nó **`Entrada Planilha`**, garanta que as colunas da planilha estejam cadastradas e nomeadas corretamente (ex: `R: Nome/Consultor`, `C: Empreendimento`, `D: Unidade`, `B: Contato Cliente`, `P: Justificativa`).
2. **Fazer a Ligação Visual**:
   - Puxe uma linha a partir da porta de saída **`R: Nome/Consultor`** e conecte-a na porta de entrada **`Nome Consultor (Nome)`** do nó **`Gravar Transação`**.
   - Puxe uma linha a partir da porta de saída **`C: Empreendimento`** e conecte-a na porta de entrada **`Empreendimento (Produto)`** do nó **`Gravar Transação`**.
   - Puxe uma linha a partir da porta de saída **`D: Unidade`** e conecte-a na porta de entrada **`Unidade (Contrato)`** do nó **`Gravar Transação`**.
   - Puxe uma linha a partir da porta de saída **`B: Contato Cliente`** e conecte-a na porta de entrada **`Nome do Cliente`** do nó **`Gravar Transação`**.
   - Puxe uma linha a partir da porta de saída **`P: Justificativa`** e conecte-a na porta de entrada **`Justificativa da Transação`** do nó **`Gravar Transação`**.
3. O modelador sincronizará instantaneamente a estrutura no JSON.

#### Método 2: Configurando via JSON Direto
Se preferir usar o editor de código Monaco (JSON), a seção `mapeamento_campos` do seu perfil deve ser estruturada da seguinte forma:

```json
{
  "versao_motor": "2.0",
  "configuracoes_gerais": {
    "linha_cabecalho": 3,
    "pular_linhas_vazias": true,
    "delimitador_lista": ";"
  },
  "mapeamento_campos": {
    "NomeConsultor": {
      "celula": "R"
    },
    "empreendimento": {
      "celula": "C"
    },
    "unidade": {
      "celula": "D"
    },
    "contato_cliente": {
      "celula": "B"
    },
    "justificativa": {
      "celula": "P"
    },
    "ValorVenda": {
      "celula": "E",
      "script": "return helpers.parseMoeda(value);"
    },
    "ValorComissao": {
      "celula": "F",
      "script": "return helpers.parseMoeda(value);"
    }
  }
}
```

Desta forma, ao clicar em **"Iniciar Simulação"**, o motor carregará o empreendimento da coluna C, a unidade da coluna D, o cliente da coluna B, a justificativa da coluna P e o corretor da coluna R, preenchendo perfeitamente o banco de dados.

---

### C. Por que o valor do campo calculado por um "Bloco de Código JS (Script)" resulta em 0?

No painel de simulação à direita, um dos campos do banco de dados (ex: `"ValorVenda"`) pode aparecer resolvido como `0`, mesmo sabendo que a planilha possui valores preenchidos naquela linha.

**Análise Prática da Imagem (Exemplo Real):**
1. No editor visual, temos uma ligação vinda da coluna **`F: ValorEntrada`** conectando na entrada (`in`) de um **`Bloco Código JS (Script)`**.
2. A saída (`out`) do Bloco de Código está ligada na porta **`Valor Comissão (ValorVenda)`** do nó **`Gravar Transação`**.
3. O código javascript inserido no Bloco de Código é:
   ```javascript
   let venda = helpers.parseMoeda('{{ValorEntrada}}');
   return venda;
   ```
4. No preview, o resultado final do campo `"ValorVenda"` aparece como `0`.

**O Motivo Técnico:**
* **`value` e `row`:** Quando um Bloco de Código está conectado a uma coluna da planilha (ex: coluna `F`), o motor injeta automaticamente o valor bruto daquela célula na variável local **`value`**. Ele também disponibiliza a linha inteira no objeto **`row`** (onde a coluna F pode ser lida escrevendo `row.F`).
* **Substituição de Macros `{{...}}`:** O recurso de chaves duplas `{{NomeCampo}}` serve unicamente para referenciar **outros campos já calculados e salvos no resultado da linha** (ex: `{{NomeConsultor}}` ou `{{IDProfissional}}`).
* Como o seu Bloco de Código está conectado à porta `ValorVenda`, o campo gerado na saída se chamará `"ValorVenda"`. **Não existe** nenhum campo na saída final chamado `"ValorEntrada"`.
* Como `"ValorEntrada"` não existe nos resultados finais da linha, o compilador não consegue substituir a macro `{{ValorEntrada}}`, mantendo o texto literal `'{{ValorEntrada}}'`.
* Ao rodar a instrução `helpers.parseMoeda('{{ValorEntrada}}')`, o helper tenta converter o texto literal contendo chaves em número, falha (pois não é um número válido) e retorna o valor padrão `0`.

**Como Resolver:**
Substitua o uso da macro `{{ValorEntrada}}` por `value` ou `row.F` no seu código JavaScript.

* **Solução Recomendada (Usando `value`):**
  A variável `value` já contém o valor da coluna ligada à entrada do script (Coluna F):
  ```javascript
  let venda = helpers.parseMoeda(value);
  return venda;
  ```

* **Solução Alternativa (Usando `row.F`):**
  Lê diretamente da linha do Excel apontando a letra da coluna:
  ```javascript
  let venda = helpers.parseMoeda(row.F);
  return venda;
  ```

---

### D. Onde visualizar e como funciona o Fator de Conversão de Talentos?

O Fator de Conversão é a relação de equivalência entre a moeda real (BRL/R$) e a moeda virtual da plataforma (Talentos). Por padrão, o sistema utiliza o fator **`100`**, o que significa que cada R$ 100,00 de VGV/Comissão equivalem a 1 Talento.

A visualização e configuração dessa informação varia dependendo do motor de importação utilizado:

#### 1. No Motor de Importação Clássico
Para visualizar ou alterar o fator de conversão de um perfil clássico:
1. Vá para a tela de **Mapeamento / Importação de Planilhas** (`admin-importacao-upload.html`).
2. Clique no botão **Editar Perfil** no topo da página.
3. No modal que abrir, você verá o campo **Fator de Conversão** (por padrão definido como `100`).
4. Altere o valor nesse campo se necessário (por exemplo, defina `50` para que R$ 50,00 = 1 Talento) e salve o perfil.

#### 2. No Motor Programável (Editor de Fluxos & Monaco)
No Motor Programável, o processamento de dados é procedimental e configurado via código ou nós visuais. Por essa razão:
1. Disponibilizamos o campo **Fator Conversão** diretamente no cabeçalho do editor visual (junto ao nome do perfil, linha do cabeçalho e separador de lista).
2. O valor preenchido no cabeçalho é salvo no perfil do banco de dados e **injetado automaticamente** dentro do escopo da Sandbox segura como as variáveis nativas **`fatorConversao`** e **`fator_conversao`**.
3. Você pode usar esta variável nativa diretamente em qualquer bloco de script, sem precisar declarar um valor estático no código.

* **Exemplo Prático (Código JS no Bloco de Mapeamento):**
  Se o valor original da planilha está na coluna `F` e você quer converter usando o fator definido no cabeçalho:
  ```javascript
  const valorOriginal = helpers.parseMoeda(row.F);
  return Math.floor(valorOriginal / fatorConversao); // Usa a variável nativa injetada!
  ```

* **Exemplo com Sobrecarga/Customização:**
  Você pode também usar regras condicionais que variam o fator dependendo de outras colunas, ignorando ou multiplicando o fator do cabeçalho:
  ```javascript
  const valorOriginal = helpers.parseMoeda(row.F);
  const isParceiroVIP = row.K === 'VIP';
  // Se for parceiro VIP, usa metade do fator configurado (ganhando o dobro de talentos)
  const fatorEfetivo = isParceiroVIP ? (fatorConversao / 2) : fatorConversao;
  return Math.floor(valorOriginal / fatorEfetivo);
  ```

Desta forma, no Motor Programável, você pode definir o fator de conversão de forma global no cabeçalho e consumi-lo dinamicamente nos scripts, mantendo a flexibilidade para regras de negócio complexas.

### E. Por que o valor dos pontos (campo `valor`) ficou igual ao valor original em reais (`valor_original_rs`)?

Se no seu JSON de mapeamento você definiu o campo `"ValorVenda"`, mas não especificou nenhum campo específico de pontos (como `"valor"` ou `"valor_talentos"`), o motor de importação aplicará uma lógica de *fallback*:
1. Para o campo `valor_original_rs` (dinheiro em reais), ele buscará a chave `"ValorVenda"` e salvará o valor bruto em R$.
2. Para o campo `valor` (pontos/talentos), ele tentará buscar chaves como `"valor"`, `"valor_talentos"` ou `"valortalentos"`. Como nenhuma delas foi mapeada, o motor seleciona o **primeiro campo de tipo numérico** resultante da linha (que neste caso foi o próprio `"ValorVenda"`).
3. O resultado é que tanto o valor em pontos quanto o valor original em reais ficarão idênticos e sem a devida conversão.

#### Como resolver sem mapear a mesma coluna/célula física duas vezes:
Mapear a mesma letra de coluna (ex: `"celula": "F"`) mais de uma vez pode ser bloqueado pela validação da interface visual ou do JSON. Para contornar isso, você pode mapear apenas a coluna `"ValorVenda"` de forma física e o campo de pontos `"valor"` de forma puramente programável (usando scripts e sem declarar a propriedade `"celula"`).

Existem duas formas limpas de configurar isso no seu JSON:

##### Opção 1: Utilizando macros de referência cruzada (Recomendado)
Como o campo `"ValorVenda"` não possui script, ele é resolvido na primeira passada do motor. O campo `"valor"` pode então usar uma macro `{{ValorVenda}}` para acessar seu valor já processado:

```json
"mapeamento_campos": {
  "ValorVenda": {
    "celula": "F"
  },
  "valor": {
    "script": "return {{ValorVenda}} / fatorConversao;"
  }
}
```

##### Opção 2: Acessando a linha (`row`) diretamente
Como o objeto `row` com todas as colunas da planilha é injetado no contexto, você pode ler a coluna `F` em tempo de execução usando `row.F` no script do campo `"valor"`:

```json
"mapeamento_campos": {
  "ValorVenda": {
    "celula": "F"
  },
  "valor": {
    "script": "return helpers.parseMoeda(row.F) / fatorConversao;"
  }
}
```

---

## 6. Exemplos Homologados e Executáveis

Abaixo estão descritos três exemplos avançados de perfis perfeitamente válidos e testados pelo nosso auditor de integridade sintática.

### Exemplo 1: Conversão e Limpeza de Documentos
Este script limpa o CPF, padroniza nomes em maiúsculo e formata o valor monetário da venda.

```json
{
  "versao_motor": "2.0",
  "configuracoes_gerais": {
    "linha_cabecalho": 1,
    "pular_linhas_vazias": true
  },
  "mapeamento_campos": {
    "Nome": {
      "celula": "A",
      "script": "return value.trim().toUpperCase();"
    },
    "Documento": {
      "celula": "B",
      "script": "return helpers.cleanCPF(value);"
    },
    "ValorVenda": {
      "celula": "C",
      "script": "return helpers.parseMoeda(value);"
    }
  }
}
```

### Exemplo 2: Mapeamento de Comissões e Acumuladores Globais
Este script demonstra o uso de macros `{{ValorVenda}}` (que resolvem o valor já processado de outros campos) e do acumulador `globalStore` para trackear a soma total das comissões pagas.

```json
{
  "versao_motor": "2.0",
  "configuracoes_gerais": {
    "linha_cabecalho": 1,
    "pular_linhas_vazias": true
  },
  "contexto_global": {
    "script_inicializacao": "globalStore.totalComissoes = 0; globalStore.taxaComissao = 0.05;"
  },
  "mapeamento_campos": {
    "Nome": {
      "celula": "A",
      "script": "return value.trim();"
    },
    "ValorVenda": {
      "celula": "B",
      "script": "return helpers.parseMoeda(value);"
    },
    "ValorComissao": {
      "script": "let venda = helpers.parseMoeda('{{ValorVenda}}'); let comissao = venda * globalStore.taxaComissao; globalStore.totalComissoes += comissao; return comissao;"
    }
  }
}
```

### Exemplo 3: Controle e Filtro de Qualidade por Hooks
Este exemplo utiliza o hook global `antes_salvar_linha` para impedir transações de baixíssimo valor, prevenindo a poluição do extrato financeiro.

```json
{
  "versao_motor": "2.0",
  "configuracoes_gerais": {
    "linha_cabecalho": 1,
    "pular_linhas_vazias": true
  },
  "mapeamento_campos": {
    "Nome": {
      "celula": "A",
      "script": "return value.trim();"
    },
    "Valor": {
      "celula": "B",
      "script": "return helpers.parseMoeda(value);"
    }
  },
  "hooks": {
    "antes_salvar_linha": "if (linhaResult.Valor < 100.0) { log.warning('Valor da venda inferior ao piso aceitavel de 100 reais'); return false; } return true;"
  }
}
```

---

### Exemplo 4: Esteira Completa de Contrato Imobiliário (Entrada + Parcelas Mensais + Lançamentos Extras/Balões)
Este exemplo demonstra um cenário corporativo completo do mercado imobiliário ou de bens duráveis, gerando dinamicamente transações de entrada compensadas, múltiplas parcelas mensais futuras (compensadas ou pendentes) e múltiplos lançamentos extras/reforços (balões) a partir das colunas lidas de cada linha da planilha.

```json
{
  "versao_motor": "2.0",
  "configuracoes_gerais": {
    "linha_cabecalho": 3,
    "pular_linhas_vazias": true
  },
  "mapeamento_campos": {
    "NomeConsultor": {
      "celula": "R"
    },
    "IDProfissional": {
      "celula": "S",
      "script": "return value ? value.replace(/[^0-9]/g, '') : '';"
    },
    "ValorVenda": {
      "celula": "E",
      "script": "return helpers.parseMoeda(value);"
    },
    "transacoes_geradas": {
      "script": "function parseExcelDate(val) {\n  if (!val) return new Date();\n  if (typeof val === 'number') {\n    return new Date((val - 25569) * 86400000);\n  }\n  const str = String(val).trim();\n  if (str.includes('/')) {\n    const parts = str.split('/');\n    if (parts.length === 3) {\n      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));\n    }\n  }\n  const parsed = Date.parse(str);\n  return isNaN(parsed) ? new Date() : new Date(parsed);\n}\n\nconst fator = 100;\nconst transacoes = [];\n\nconst emp = row.C || 'Park View Residencial';\nconst uni = row.D || 'Geral';\nconst cliente = row.A || 'Cliente';\nconst obs = row.Q || '';\n\n// 1. Entrada / Sinal (Compensado na data de pagamento)\nconst valorEntradaRs = helpers.parseMoeda(row.F);\nif (valorEntradaRs > 0) {\n  const dataEntrada = parseExcelDate(row.G);\n  transacoes.push({\n    valor: Math.floor(valorEntradaRs / fator),\n    valor_original_rs: valorEntradaRs,\n    tipo: 'CREDITO',\n    status: 'COMPENSADO',\n    data_vencimento: dataEntrada.toISOString(),\n    empreendimento: emp,\n    unidade: uni,\n    contato_cliente: cliente,\n    justificativa: 'Entrada de Contrato - ' + emp + ' ' + uni,\n    dados_extras: { observacao: obs }\n  });\n}\n\n// 2. Loop de Parcelas (K parcelas já pagas -> COMPENSADO; restantes -> PENDENTE)\nconst qtdParcelas = parseInt(row.J) || 0;\nconst parcelasPagas = parseInt(row.K) || 0;\nconst valorParcelaRs = helpers.parseMoeda(row.H);\nconst dataReferencia = parseExcelDate(row.G);\n\nif (qtdParcelas > 0 && valorParcelaRs > 0) {\n  const valorParcelaTalentos = Math.floor(valorParcelaRs / fator);\n  for (let i = 0; i < qtdParcelas; i++) {\n    const dataVenc = new Date(dataReferencia.getTime());\n    dataVenc.setMonth(dataReferencia.getMonth() + i + 1);\n\n    const isPaga = i < parcelasPagas;\n    transacoes.push({\n      valor: valorParcelaTalentos,\n      valor_original_rs: valorParcelaRs,\n      tipo: 'CREDITO',\n      status: isPaga ? 'COMPENSADO' : 'PENDENTE',\n      data_vencimento: dataVenc.toISOString(),\n      empreendimento: emp,\n      unidade: uni,\n      contato_cliente: cliente,\n      justificativa: 'Parcela ' + (i + 1) + '/' + qtdParcelas + ' - ' + emp + ' ' + uni + (isPaga ? ' (Paga)' : ' (Pendente)'),\n      dados_extras: { observacao: obs }\n    });\n  }\n}\n\n// 3. Balões / Reforços Extras (Pendentes)\nconst valorBalaoRs = helpers.parseMoeda(row.L);\nconst qtdBaloes = parseInt(row.M) || 0;\nconst datasBaloesStr = String(row.N || '').trim();\n\nif (valorBalaoRs > 0 && qtdBaloes > 0 && datasBaloesStr) {\n  const valorBalaoTalentos = Math.floor(valorBalaoRs / fator);\n  const datasArray = datasBaloesStr.split('|').map(d => d.trim()).filter(Boolean);\n  \n  datasArray.forEach((dataStr, idx) => {\n    const dataBalao = parseExcelDate(dataStr);\n    transacoes.push({\n      valor: valorBalaoTalentos,\n      valor_original_rs: valorBalaoRs,\n      tipo: 'CREDITO',\n      status: 'PENDENTE',\n      data_vencimento: dataBalao.toISOString(),\n      empreendimento: emp,\n      unidade: uni,\n      contato_cliente: cliente,\n      justificativa: 'Balão Reforço ' + (idx + 1) + '/' + datasArray.length + ' - ' + emp + ' ' + uni,\n      dados_extras: { observacao: obs }\n    });\n  });\n}\n\nreturn transacoes;"
    }
  }
}
```

### Exemplo 5: Conciliação Automática e Baixa de Parcelas (Motor FIFO)
Este perfil simplificado é ideal para planilhas de recebimentos de comissões/baixas de parcelas. Quando importado no **Modo Baixas (Passo 2)** na tela de upload, o motor lê o valor de cada parceiro e aciona automaticamente o algoritmo **FIFO (First-In, First-Out)** para compensar suas parcelas pendentes mais antigas.

```json
{
  "versao_motor": "2.0",
  "configuracoes_gerais": {
    "linha_cabecalho": 3,
    "pular_linhas_vazias": true
  },
  "mapeamento_campos": {
    "NomeConsultor": {
      "celula": "R"
    },
    "IDProfissional": {
      "celula": "S",
      "script": "return value ? value.replace(/[^0-9]/g, '') : '';"
    },
    "ValorVenda": {
      "celula": "C",
      "script": "return helpers.parseMoeda(value);"
    },
    "ValorComissao": {
      "celula": "O",
      "script": "return Math.floor(helpers.parseMoeda(value) / 100);"
    }
  }
}
```

---

### Exemplo 6: Lote de Lançamentos Extras/Balões (Sem Parcelas)
Este exemplo demonstra um cenário onde o contrato financeiro não possui fluxo de parcelas mensais, mas apenas o pagamento da Entrada (compensado) e múltiplos Lançamentos Extras ou Reforços programados futuros (pendentes).

```json
{
  "versao_motor": "2.0",
  "configuracoes_gerais": {
    "linha_cabecalho": 3,
    "pular_linhas_vazias": true
  },
  "mapeamento_campos": {
    "NomeConsultor": {
      "celula": "R"
    },
    "IDProfissional": {
      "celula": "S",
      "script": "return value ? value.replace(/[^0-9]/g, '') : '';"
    },
    "ValorVenda": {
      "celula": "E",
      "script": "return helpers.parseMoeda(value);"
    },
    "transacoes_geradas": {
      "script": "function parseExcelDate(val) {\n  if (!val) return new Date();\n  if (typeof val === 'number') {\n    return new Date((val - 25569) * 86400000);\n  }\n  const str = String(val).trim();\n  if (str.includes('/')) {\n    const parts = str.split('/');\n    if (parts.length === 3) {\n      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));\n    }\n  }\n  const parsed = Date.parse(str);\n  return isNaN(parsed) ? new Date() : new Date(parsed);\n}\n\nconst fator = 100;\nconst transacoes = [];\n\nconst emp = row.C || 'Park View Residencial';\nconst uni = row.D || 'Geral';\nconst cliente = row.A || 'Cliente';\nconst obs = row.Q || '';\n\n// 1. Entrada / Sinal (Compensado na data de pagamento)\nconst valorEntradaRs = helpers.parseMoeda(row.F);\nif (valorEntradaRs > 0) {\n  const dataEntrada = parseExcelDate(row.G);\n  transacoes.push({\n    valor: Math.floor(valorEntradaRs / fator),\n    valor_original_rs: valorEntradaRs,\n    tipo: 'CREDITO',\n    status: 'COMPENSADO',\n    data_vencimento: dataEntrada.toISOString(),\n    empreendimento: emp,\n    unidade: uni,\n    contato_cliente: cliente,\n    justificativa: 'Entrada de Contrato - ' + emp + ' ' + uni,\n    dados_extras: { observacao: obs }\n  });\n}\n\n// 2. Balões / Reforços Extras (Pendentes) - Sem Parcelas!\nconst valorBalaoRs = helpers.parseMoeda(row.L);\nconst qtdBaloes = parseInt(row.M) || 0;\nconst datasBaloesStr = String(row.N || '').trim();\n\nif (valorBalaoRs > 0 && qtdBaloes > 0 && datasBaloesStr) {\n  const valorBalaoTalentos = Math.floor(valorBalaoRs / fator);\n  const datasArray = datasBaloesStr.split('|').map(d => d.trim()).filter(Boolean);\n  \n  datasArray.forEach((dataStr, idx) => {\n    const dataBalao = parseExcelDate(dataStr);\n    transacoes.push({\n      valor: valorBalaoTalentos,\n      valor_original_rs: valorBalaoRs,\n      tipo: 'CREDITO',\n      status: 'PENDENTE',\n      data_vencimento: dataBalao.toISOString(),\n      empreendimento: emp,\n      unidade: uni,\n      contato_cliente: cliente,\n      justificativa: 'Balão Reforço ' + (idx + 1) + '/' + datasArray.length + ' - ' + emp + ' ' + uni,\n      dados_extras: { observacao: obs }\n    });\n  });\n}\n\nreturn transacoes;"
    }
  }
}
```
```

---

### Exemplo 7: Esteira de Venda Parcelada Padrão (Sem Balões)
Este exemplo demonstra um cenário onde o contrato possui fluxo de parcelas mensais sucessivas (como financiamento padrão ou parcelas de comissão recorrentes) e pagamento da Entrada/Sinal, sem a necessidade de balões de reforço.

```json
{
  "versao_motor": "2.0",
  "configuracoes_gerais": {
    "linha_cabecalho": 3,
    "pular_linhas_vazias": true
  },
  "mapeamento_campos": {
    "NomeConsultor": {
      "celula": "R"
    },
    "IDProfissional": {
      "celula": "S",
      "script": "return value ? value.replace(/[^0-9]/g, '') : '';"
    },
    "ValorVenda": {
      "celula": "E",
      "script": "return helpers.parseMoeda(value);"
    },
    "transacoes_geradas": {
      "script": "function parseExcelDate(val) {\n  if (!val) return new Date();\n  if (typeof val === 'number') {\n    return new Date((val - 25569) * 86400000);\n  }\n  const str = String(val).trim();\n  if (str.includes('/')) {\n    const parts = str.split('/');\n    if (parts.length === 3) {\n      return new Date(parseInt(parts[2], 10), parseInt(parts[1], 10) - 1, parseInt(parts[0], 10));\n    }\n  }\n  const parsed = Date.parse(str);\n  return isNaN(parsed) ? new Date() : new Date(parsed);\n}\n\nconst fator = 100;\nconst transacoes = [];\n\nconst emp = row.C || 'Park View Residencial';\nconst uni = row.D || 'Geral';\nconst cliente = row.A || 'Cliente';\nconst obs = row.Q || '';\n\n// 1. Entrada / Sinal (Compensado na data de pagamento)\nconst valorEntradaRs = helpers.parseMoeda(row.F);\nif (valorEntradaRs > 0) {\n  const dataEntrada = parseExcelDate(row.G);\n  transacoes.push({\n    valor: Math.floor(valorEntradaRs / fator),\n    valor_original_rs: valorEntradaRs,\n    tipo: 'CREDITO',\n    status: 'COMPENSADO',\n    data_vencimento: dataEntrada.toISOString(),\n    empreendimento: emp,\n    unidade: uni,\n    contato_cliente: cliente,\n    justificativa: 'Entrada de Contrato - ' + emp + ' ' + uni,\n    dados_extras: { observacao: obs }\n  });\n}\n\n// 2. Loop de Parcelas (K parcelas já pagas -> COMPENSADO; restantes -> PENDENTE) - Sem Balões!\nconst qtdParcelas = parseInt(row.J) || 0;\nconst parcelasPagas = parseInt(row.K) || 0;\nconst valorParcelaRs = helpers.parseMoeda(row.H);\nconst dataReferencia = parseExcelDate(row.G);\n\nif (qtdParcelas > 0 && valorParcelaRs > 0) {\n  const valorParcelaTalentos = Math.floor(valorParcelaRs / fator);\n  for (let i = 0; i < qtdParcelas; i++) {\n    const dataVenc = new Date(dataReferencia.getTime());\n    dataVenc.setMonth(dataReferencia.getMonth() + i + 1);\n\n    const isPaga = i < parcelasPagas;\n    transacoes.push({\n      valor: valorParcelaTalentos,\n      valor_original_rs: valorParcelaRs,\n      tipo: 'CREDITO',\n      status: isPaga ? 'COMPENSADO' : 'PENDENTE',\n      data_vencimento: dataVenc.toISOString(),\n      empreendimento: emp,\n      unidade: uni,\n      contato_cliente: cliente,\n      justificativa: 'Parcela ' + (i + 1) + '/' + qtdParcelas + ' - ' + emp + ' ' + uni + (isPaga ? ' (Paga)' : ' (Pendente)'),\n      dados_extras: { observacao: obs }\n    });\n  }\n}\n\nreturn transacoes;"
    }
  }
}
```

---

## 6. Natureza de Preview e Processo de Gravação (Confirmação)

A esteira de importação opera sob um modelo transacional de duas etapas ("Preview/Simulação" e "Confirmação Definitiva"), garantindo total previsibilidade e segurança antes da gravação física de qualquer dado.

### A. Fluxo de Carga na Memória (Preview / Simulação)
Quando o usuário seleciona uma planilha e executa a análise:
1. **Leitura Temporária em Memória:** Os dados da planilha são processados temporariamente no servidor para simulação. Nenhum registro é persistido no banco de dados neste momento.
2. **Execução em Sandbox:** O Motor de Sandbox avalia todas as linhas, processando os scripts, helpers e hooks definidos no perfil JSON, e gera os resultados da simulação.
3. **Identificação de Inconsistências:** O sistema analisa em tempo real se os consultores mapeados existem no banco de dados (`GamUsuario`) ou se há inconsistências de nomes e CPFs.

---

### B. Como Gravar Definitivamente os Dados no Banco

Tanto no Motor Clássico quanto no Motor Programável, os dados **só serão gravados de fato no banco de dados** após a ação de confirmação final do usuário. Veja a diferença do fluxo nas duas interfaces:

#### 1. No Motor de Importação Clássico
No fluxo em etapas (Upload ➔ Preview ➔ Confirmação):
1. Após analisar o preview, clique no botão **Avançar para Confirmação**.
2. Na tela final (Etapa 3), você verá os cartões de resumo (Total de Registros, Corretores Resolvidos, Resoluções Manuais).
3. Clique no botão verde **CONFIRMAR IMPORTAÇÃO DEFINITIVA** para abrir a transação de banco de dados.

#### 2. No Motor Programável (Editor de Fluxos & Monaco)
Na interface do Motor Programável, o fluxo de persistência é integrado diretamente ao **Simulador Lateral (Hot-Preview)**:
1. Faça o upload da planilha modelo no card de simulação e clique em **⚡ INICIAR SIMULAÇÃO EM TEMPO REAL**.
2. O sistema gerará a simulação na aba **Tabela Resultante** e os logs de execução na aba **Terminal de Logs**.
3. **Regra de Segurança de Gravação:** 
   - Se houver qualquer consultor/corretor com o status **`NÃO ENCONTRADO`** (tarja vermelha), o botão de confirmação definitiva ficará desabilitado com o texto **`🚀 IMPORTAÇÃO DESABILITADA (PARCEIROS NÃO LOCALIZADOS)`**. Nesse caso, você deve primeiro cadastrar os corretores no sistema ou ajustar as chaves do seu perfil.
   - Se todos os registros forem validados com sucesso (todos os consultores marcados como **`OK`**), um botão verde premium **`🚀 EFETUAR IMPORTAÇÃO DEFINITIVA`** aparecerá logo abaixo do botão de simulação.
4. Clique no botão **🚀 EFETUAR IMPORTAÇÃO DEFINITIVA**.
5. Um modal de confirmação será exibido na tela perguntando se você deseja prosseguir. Clique em **Sim, Confirmar**.
6. O sistema executará a chamada definitiva ao endpoint `/api/admin/importacao/programavel/confirm` envelopado em uma transação única de banco de dados (`knex.transaction`). Se qualquer linha falhar por erro crítico, toda a carga de dados será desfeita automaticamente (rollback), garantindo integridade transacional completa.
7. Após o sucesso, um alerta de sucesso será exibido e um log consolidado com a telemetria da carga (vendas processadas, transações criadas e parceiros atualizados) será impresso no seu **Terminal de Logs**.

