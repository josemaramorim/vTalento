# Manual Avançado do Motor de Importação Programável (v2.0)

O Motor de Importação Programável (Motor 2) é um sistema robusto baseado em Sandbox segura (`vm` do Node.js) que executa instruções estruturadas em JSON e códigos Javascript customizados para cada linha de uma planilha Excel ou CSV.

Este manual descreve a estrutura dos perfis de importação, a API de execução da Sandbox e as diretrizes de mapeamento lógico para desenvolvedores e administradores da plataforma V-Talentos.

---

## Sumário

1. [Visão Geral & Arquitetura](#1-visão-geral--arquitetura)
2. [Estrutura do Perfil de Importação (JSON)](#2-estrutura-do-perfil-de-importação-json)
   - [Campos Principais do Perfil](#campos-principais-do-perfil)
   - [Mapeamento de Entrada vs. Destino (Origem-Destino)](#mapeamento-de-entrada-vs-destino-origem-destino)
   - [Mapeamento Obrigatório e Comportamento em Caso de Ausência](#mapeamento-obrigatório-e-comportamento-em-caso-de-ausência)
3. [Sandbox JavaScript & APIs Nativas](#3-sandbox-javascript--apis-nativas)
   - [Variáveis do Contexto Seguro](#variáveis-do-contexto-seguro)
   - [Helpers Utilitários do Sistema](#helpers-utilitários-do-sistema)
   - [Instruções de Retorno (return)](#instruções-de-retorno-return)
4. [Modelador Visual (No-Code Flowchart)](#4-modelador-visual-no-code-flowchart)
   - [Nós Disponíveis (Toolbox)](#nós-disponíveis-toolbox)
   - [Portas do Nó de Destino "Gravar Transação"](#portas-do-nó-de-destino-gravar-transação)
   - [Gestão de Valores (Reais vs. Pontos/Talentos)](#gestão-de-valores-reais-vs-pontostalentos)
5. [Processo de Simulação e Gravação Definitiva](#5-processo-de-simulação-e-gravação-definitiva)
   - [Simulação em Tempo Real (Preview)](#simulação-em-tempo-real-preview)
   - [Confirmação Definitiva e Transações Seguras](#confirmação-definitiva-e-transações-seguras)
6. [Resolução de Dúvidas e Casos de Uso (Troubleshooting)](#6-resolução-de-dúvidas-e-casos-de-uso-troubleshooting)
   - [A. Corretor/Consultor aparece como "NÃO ENCONTRADO"](#a-corretorconsultor-aparece-como-não-encontrado)
   - [B. Como mapear campos extras da planilha](#b-como-mapear-campos-extras-da-planilha)
   - [C. O valor calculado pelo Bloco de Código JS resulta em 0](#c-o-valor-calculado-pelo-bloco-de-código-js-resulta-em-0)
   - [D. Configuração e Auditabilidade do Fator de Conversão](#d-configuração-e-auditabilidade-do-fator-de-conversão)
   - [E. Valor em Pontos/Talentos igual ao valor em Reais](#e-valor-em-pontostalentos-igual-ao-valor-em-reais)
7. [Exemplos Homologados de Perfis (Prontos para Uso)](#7-exemplos-homologados-de-perfis-prontos-para-uso)
   - [Exemplo 1: Conversão e Limpeza de Documentos](#exemplo-1-conversão-e-limpeza-de-documentos)
   - [Exemplo 2: Mapeamento de Comissões e Acumuladores Globais](#exemplo-2-mapeamento-de-comissões-e-acumuladores-globais)
   - [Exemplo 3: Controle e Filtro de Qualidade por Hooks](#exemplo-3-controle-e-filtro-de-qualidade-por-hooks)
   - [Exemplo 4: Esteira Completa de Venda (Entrada + Parcelas + Lançamentos Extras/Balões)](#exemplo-4-esteira-completa-de-venda-entrada--parcelas--lançamentos-extrasbalões)
   - [Exemplo 5: Lote de Lançamentos Extras/Balões (Sem Parcelas)](#exemplo-5-lote-de-lançamentos-extrasbalões-sem-parcelas)
   - [Exemplo 6: Esteira de Venda Parcelada Padrão (Sem Balões)](#exemplo-6-esteira-de-venda-parcelada-padrão-sem-balões)
   - [Exemplo 7: Conciliação Automática e Baixa de Parcelas (Motor FIFO)](#exemplo-7-conciliação-automática-e-baixa-de-parcelas-motor-fifo)
8. [Auto-Mapeamento Inteligente de Cabeçalhos](#8-auto-mapeamento-inteligente-de-cabeçalhos)

---

## 1. Visão Geral & Arquitetura

O motor foi construído sob regras estritas de segurança e governança de dados:
* **Isolamento Completo:** A execução ocorre em uma máquina virtual interna (`vm` do Node.js), impedindo scripts maliciosos de acessarem variáveis de ambiente, processos ou o sistema de arquivos do servidor.
* **Proteção contra Loops Infinitos:** Cada bloco de script possui um tempo limite estrito de **50ms**. Se o script exceder esse tempo, a execução é interrompida imediatamente.
* **Resolução Dual-Pass:** O compilador processa primeiro os campos estáticos/diretos e depois executa os scripts e referências dinâmicas, permitindo o uso de referências cruzadas entre campos.

---

## 2. Estrutura do Perfil de Importação (JSON)

### Campos Principais do Perfil

Cada perfil programável é descrito por um JSON estruturado:

```json
{
  "versao_motor": "2.0",
  "configuracoes_gerais": {
    "linha_cabecalho": 3,
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
    }
  },
  "hooks": {
    "antes_salvar_linha": "if (linhaResult.ValorVenda < 100) return false; return true;"
  }
}
```

* **`versao_motor`**: Identifica a versão do interpretador (atualmente `2.0`).
* **`configuracoes_gerais`**: Parâmetros de importação clássicos da planilha (linha do cabeçalho, separador de listas e tratamento de linhas vazias).
* **`contexto_global`**: Script executado uma única vez (antes do loop de linhas), ideal para inicializar acumuladores ou taxas no objeto `globalStore`.
  * *Exemplo de Uso:*
    ```javascript
    // No script_inicializacao:
    globalStore.taxaComissao = 0.05;
    
    // No script do campo de valor de comissão:
    return helpers.parseMoeda(value) * globalStore.taxaComissao;
    ```
* **`mapeamento_campos`**: Regras de gravação e scripts específicos para cada propriedade da transação final.
* **`hooks`**: Trechos de validação executados a nível de linha. Se `antes_salvar_linha` retornar `false`, a linha inteira correspondente é pulada.
  * *Exemplo de Uso:*
    ```javascript
    // No antes_salvar_linha:
    if (!linhaResult.IDProfissional || linhaResult.ValorVenda <= 0) {
      log.warning("Linha descartada por ausência de documento ou valor nulo.");
      return false; // Descarta a linha
    }
    return true; // Aceita e importa a linha
    ```

---

### Mapeamento de Entrada vs. Destino (Origem-Destino)

No JSON de configuração, existem duas seções fundamentais que fazem a ponte entre o arquivo Excel e o Banco de Dados:

#### A. A Origem: `colunas_entrada`
Indica o leiaute (schema) de entrada da planilha.
* **Propósito:** Informa ao sistema quais colunas existem no Excel, suas respectivas letras (`celula`) e rótulos (`label`).
* **Uso Visual:** No editor visual, cada item deste array gera uma **porta de saída** (bolinha) no bloco **Entrada Planilha** para conexão física de cabos.

#### B. O Destino: `mapeamento_campos`
Indica a tabela de transações no banco de dados.
* **Propósito:** Mapeia quais colunas físicas ou scripts Javascript preenchem os campos finais da tabela `GamTransacao`.
* **Uso Visual:** Cada propriedade neste objeto (ex: `NomeConsultor`, `IDProfissional`) gera uma **porta de entrada** no bloco terminal **Gravar Transação**.

#### 💡 Exemplo de Origem vs. Destino no JSON

Imagine que seu Excel possui o nome do consultor na **Coluna R** (cabeçalho *"Nome do Corretor"*) e você quer gravá-lo no campo de destino **`NomeConsultor`** do banco de dados. Veja como os blocos se correlacionam:

```json
{
  "colunas_entrada": [
    {
      "celula": "R",                // ORIGEM: Letra da coluna no Excel
      "label": "Nome/Consultor",    // Rótulo de exibição na bolinha do Entrada
      "tipo": "String"
    }
  ],
  "mapeamento_campos": {
    "NomeConsultor": {              // DESTINO: Campo de destino do banco de dados
      "celula": "R"                 // Vincula diretamente à coluna R de origem
    }
  }
}
```

---

### Mapeamento Obrigatório e Comportamento em Caso de Ausência

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

## 3. Sandbox JavaScript & APIs Nativas

### Variáveis do Contexto Seguro

Durante a avaliação de scripts em cada linha, as seguintes variáveis locais estão disponíveis na Sandbox:
* **`value`**: O valor bruto da célula da coluna vinculada ao campo corrente (equivalente a `row[celula]`).
* **`row`**: Objeto com todos os valores das colunas da linha atual (Ex: `{ A: "Cliente A", B: "123456", C: "150.000,00" }`).
  * *Exemplo de Uso:*
    ```javascript
    // Acessa o valor bruto da coluna E
    const valorTotal = helpers.parseMoeda(row.E);
    ```
* **`globalStore`**: Objeto global persistente compartilhado entre a execução de todas as linhas de uma mesma planilha.
  * *Exemplo de Uso:*
    ```javascript
    // Contador global acumulativo
    globalStore.quantidadeLinhas = (globalStore.quantidadeLinhas || 0) + 1;
    ```
* **`fatorConversao` / `fator_conversao`**: Fator de conversão numérico definido globalmente no cabeçalho do perfil (ex: `100`).
  * *Exemplo de Uso:*
    ```javascript
    return helpers.parseMoeda(value) / fatorConversao;
    ```
* **`log`**: Console de log virtual para depuração de scripts na aba de logs do preview:
  - `log.info(msg)`
  - `log.warning(msg)`
  - `log.error(msg)`
  * *Exemplo de Uso:*
    ```javascript
    if (helpers.parseMoeda(value) > 500000) {
      log.info("Venda de alto valor processada na linha! Cliente: " + row.A);
    }
    ```

---

### Helpers Utilitários do Sistema

A sandbox disponibiliza o objeto global `helpers` para facilitar manipulações recorrentes em planilhas:

| Helper | Tipo Retorno | Descrição | Exemplo |
| :--- | :--- | :--- | :--- |
| **`helpers.parseMoeda(val)`** | `Float` | Converte strings contendo cifras monetárias (brasileiras ou americanas) para decimal limpo. Retorna `0` se for inválido. | `helpers.parseMoeda("R$ 1.500,50")` ➔ `1500.5` |
| **`helpers.cleanCPF(val)`** | `String` | Mantém exclusivamente números no texto (remove pontos, traços, barras e espaços). | `helpers.cleanCPF("123.456.789-00")` ➔ `"12345678900"` |
| **`helpers.somarMeses(dt, m)`** | `String` | Soma `m` meses a uma data (suporta padrão brasileiro `DD/MM/YYYY` ou ISO). Retorna no padrão `YYYY-MM-DD`. | `helpers.somarMeses("15/01/2026", 3)` ➔ `"2026-04-15"` |

---

### Instruções de Retorno (return)

Cada script de campo deve explicitamente chamar o comando `return` com o valor resolvido para que este seja registrado.

```javascript
// Retorno direto simplificado
return helpers.cleanCPF(value);
```

---

## 4. Modelador Visual (No-Code Flowchart)

O V-Talentos inclui um editor visual completo de fluxo de processamento de dados (No-Code) que gera a configuração JSON automaticamente.

### Nós Disponíveis (Toolbox)

* **💻 Bloco Código (JS - Script):** Executa scripts Javascript personalizados sobre uma coluna (`value`).
* **🔀 Condicional Se (Hook):** Filtra linhas. Mapeia para `antes_salvar_linha`. Deve retornar `true` (salvar) ou `false` (descartar).
* **🔤 Sanitizador Texto:** Limpa textos sem código (UPPERCASE, lowercase, trim, remove caracteres especiais).
* **⚙️ Variáveis Globais (Configurações):** Centraliza configurações de cabeçalho, separador de listas, fator de conversão e variáveis do `globalStore`.
* **🔔 Webhook / Alerta:** Dispara chamadas de mensagens externas (Slack, Teams) contendo macros como `{{NomeConsultor}}`.
* **🔁 Repetição Loop:** Marcador visual de iteração.
  > [!IMPORTANT]
  > O nó de Loop genérico atua como marcação conceitual no diagrama. Loops financeiros automatizados (gerar parcelas ou balões sequenciais) são tratados diretamente pelos nós especializados abaixo. Para loops genéricos customizados, utilize o Bloco Código JS apontando para a porta `transacoes_geradas`.
* **💰 Gerador de Entrada (Sinal):** Gera uma transação inicial compensada ou pendente. Suporta macros de substituição (ex: `{{C}}` para a coluna C).
* **📆 Gerador de Parcelas:** Gera sequências de parcelas recorrentes (com macros de contagem `{i}/{total}`).
* **✨ Gerador de Lançamentos Extras:** Divide uma string contendo datas separadas por delimitadores (ex: `15/05/2026 | 15/12/2026`) em lançamentos avulsos individuais.

---

### Portas do Nó de Destino "Gravar Transação"

O bloco terminal de gravação possui 11 portas de dados vinculadas à tabela `GamTransacao`:

1. **`Nome Consultor (Nome)`** ➔ `NomeConsultor` (Utilizado para buscar o corretor).
2. **`CPF / ID (Documento)`** ➔ `IDProfissional` (Busca alternativa/identificação única).
3. **`Valor Comissão (ValorVenda)`** Mapeia para a comissão bruta original em Reais (`valor_original_rs`).
4. **`Fator Conversão (ValorComissao)`** Mapeia para o valor convertido em Talentos/Pontos (`valor`).
5. **`Empreendimento (Produto)`** ➔ `empreendimento`.
6. **`Unidade (Contrato)`** ➔ `unidade`.
7. **`Nome do Cliente`** ➔ `contato_cliente`.
8. **`Justificativa da Transação`** ➔ `justificativa` (suporta macros dinâmicas).
9. **`Tipo (Crédito/Débito)`** ➔ `tipo` (padrão: `'CREDITO'`).
10. **`Status da Transação`** ➔ `status` (padrão: `'COMPENSADO'`).
11. **`Data de Vencimento`** ➔ `data_vencimento`.

---

### Gestão de Valores (Reais vs. Pontos/Talentos)

No banco de dados, o V-Talentos mantém a distinção entre a comissão original e o saldo adicionado:
* **Valor em Reais (Porta ValorVenda):** Recebe o valor em dinheiro R$ (ex: `R$ 10.000,00`). É salvo na coluna `valor_original_rs`.
* **Valor em Talentos (Porta ValorComissao):** Recebe o valor convertido em pontos (ex: `100`). Altera de fato o saldo do corretor e é salvo na coluna `valor`.

> [!TIP]
> **Auditabilidade:** Para fins de auditoria histórica, o motor de importação grava automaticamente a propriedade `fator_conversao_utilizado` dentro do campo de JSON `dados_extras` no banco de dados para todas as transações criadas.

---

## 5. Processo de Simulação e Gravação Definitiva

### Simulação em Tempo Real (Preview)

A simulação é uma etapa crucial de segurança em duas fases:
1. **Memória Temporária:** Os dados da planilha são processados inteiramente em memória e executados na Sandbox. Nenhuma gravação física ocorre no banco.
2. **Análise de Vínculos:** O sistema confere se os consultores existem, exibindo status **`OK`** ou **`NÃO ENCONTRADO`** (tarja vermelha).

---

### Confirmação Definitiva e Transações Seguras

* **Validação Obrigatória:** O botão verde **`🚀 EFETUAR IMPORTAÇÃO DEFINITIVA`** só é exibido se **todos** os registros tiverem o corretor localizado com sucesso (status **`OK`**).
* **Integridade Transacional (Rollback):** Ao confirmar, a gravação é executada sob uma transação SQL isolada (`knex.transaction`). Se qualquer linha ou escrita falhar, a carga completa é descartada (rollback), mantendo o banco de dados íntegro e sem duplicidades parciais.

---

## 6. Resolução de Dúvidas e Casos de Uso (Troubleshooting)

### A. Corretor/Consultor aparece como "NÃO ENCONTRADO"

#### O Problema
Na tabela de simulação, o corretor exibe a tarja vermelha **`NÃO ENCONTRADO`** e a identificação **`Sem ID`**.

#### A Causa
O motor busca o usuário na tabela `GamUsuario` filtrando por:
* Perfil estritamente igual a **`CORRETOR`**.
* Usuários vinculados ao mesmo **`empresa_id`** do administrador logado.
* Nome do consultor idêntico ao da planilha (removendo espaços extras).

#### A Solução
1. **Cadastro Prévio:** Certifique-se de cadastrar o corretor no sistema na seção de usuários da empresa, com o nome escrito exatamente igual ao da planilha.
2. **Fator de Cabeçalho Errado:** Se o cabeçalho estiver configurado na linha errada (ex: `linha_cabecalho: 1` em vez de `3`), as linhas com títulos da planilha serão processadas como nomes de corretores fictícios (como "Corretor Responsável"), gerando o status "NÃO ENCONTRADO". **Corrija o número da linha de cabeçalho nas configurações gerais.**
3. **Mapeamento de Documento:** Conecte a coluna de CPF/CRECI na porta **`CPF / ID (Documento)`** do nó de gravação para efetuar buscas por ID exclusivo, mitigando duplicidades de nomes homônimos.

---

### B. Como mapear campos extras da planilha

#### Cenário
A planilha possui colunas específicas com o nome do cliente final (Coluna B) e observações adicionais (Coluna Q).

#### A Solução (JSON)
Mapeie-os no bloco `mapeamento_campos` apontando as respectivas letras de células:

```json
"mapeamento_campos": {
  "contato_cliente": {
    "celula": "B"
  },
  "dados_extras": {
    "script": "return { observacao: row.Q };"
  }
}
```

---

### C. O valor calculado pelo Bloco de Código JS resulta em 0

#### O Problema
Um script de comissão retorna com valor `0` no preview, embora as células da planilha estejam preenchidas.

#### A Causa
O programador tentou referenciar uma macro no script de sandbox de forma literal, como:
```javascript
let valor = helpers.parseMoeda('{{ValorEntrada}}'); // ERRADO!
```
Como as macros `{{...}}` servem para acessar variáveis finais gravadas da linha (e o script roda no primeiro passo de compilação), a propriedade `'{{ValorEntrada}}'` não é substituída por nada, gerando erro de parse no helper de moeda que retorna `0`.

#### A Solução
Substitua a macro por referências às variáveis da sandbox `value` (se o bloco estiver conectado à coluna) ou `row.LETRA`:
```javascript
// Forma Correta:
let valor = helpers.parseMoeda(value); // se conectado à coluna correspondente
// ou
let valor = helpers.parseMoeda(row.F); // acessando a coluna F diretamente
```

---

### D. Configuração e Auditabilidade do Fator de Conversão

O fator de conversão (BRL para Talentos) deve ser definido de forma centralizada e consumido nos scripts sem duplicação de dados.
* **Uso da Variável Nativa:** O valor preenchido no cabeçalho (ex: `100.00`) é exposto na Sandbox sob as variáveis **`fatorConversao`** e **`fator_conversao`**.
* **Exemplo de Script:**
  ```javascript
  const comissaoRs = helpers.parseMoeda(value);
  return Math.floor(comissaoRs / fatorConversao); // Consome a variável sem declarar o valor fixo no código!
  ```

---

### E. Valor em Pontos/Talentos igual ao valor em Reais

#### O Problema
O extrato do corretor mostra o valor em Talentos idêntico ao valor em Reais (BRL), pulando o fator de divisão.

#### A Causa
O perfil de importação mapeou o campo `ValorVenda` (Reais), mas não mapeou o campo de pontos (`valor`). O motor executa uma lógica de fallback e copia a primeira coluna numérica encontrada para preencher os pontos da transação.

#### A Solução
Mapeie a chave `valor` no `mapeamento_campos` aplicando a divisão pelo fator de conversão:
```json
"mapeamento_campos": {
  "ValorVenda": {
    "celula": "E"
  },
  "valor": {
    "script": "return helpers.parseMoeda(row.E) / fatorConversao;"
  }
}
```

---

## 7. Exemplos Homologados de Perfis (Prontos para Uso)

### Exemplo 1: Conversão e Limpeza de Documentos

Sanitiza o CPF removendo formatação, padroniza nomes em maiúsculo e formata a moeda original.

```json
{
  "versao_motor": "2.0",
  "colunas_entrada": [
    { "celula": "A", "label": "Nome", "tipo": "String" },
    { "celula": "B", "label": "CPF", "tipo": "String" },
    { "celula": "C", "label": "Venda R$", "tipo": "String" }
  ],
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

---

### Exemplo 2: Mapeamento de Comissões e Acumuladores Globais

Utiliza macro de referência cruzada `{{ValorVenda}}` e calcula taxas cumulativas no `globalStore`.

```json
{
  "versao_motor": "2.0",
  "colunas_entrada": [
    { "celula": "A", "label": "Nome", "tipo": "String" },
    { "celula": "B", "label": "Venda R$", "tipo": "String" }
  ],
  "configuracoes_gerais": {
    "linha_cabecalho": 1,
    "pular_linhas_vazias": true
  },
  "contexto_global": {
    "script_inicializacao": "globalStore.totalComissoes = 0; globalStore.taxaComissao = 0.05;"
  },
  "mapeamento_campos": {
    "Nome": {
      "celula": "A"
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

---

### Exemplo 3: Controle e Filtro de Qualidade por Hooks

Usa o hook `antes_salvar_linha` para ignorar lançamentos abaixo do limite mínimo de R$ 100,00.

```json
{
  "versao_motor": "2.0",
  "colunas_entrada": [
    { "celula": "A", "label": "Nome", "tipo": "String" },
    { "celula": "B", "label": "Valor R$", "tipo": "String" }
  ],
  "configuracoes_gerais": {
    "linha_cabecalho": 1,
    "pular_linhas_vazias": true
  },
  "mapeamento_campos": {
    "Nome": {
      "celula": "A"
    },
    "Valor": {
      "celula": "B",
      "script": "return helpers.parseMoeda(value);"
    }
  },
  "hooks": {
    "antes_salvar_linha": "if (linhaResult.Valor < 100.0) { log.warning('Valor inferior ao piso de 100 reais'); return false; } return true;"
  }
}
```

---

### Exemplo 4: Esteira Completa de Venda (Entrada + Parcelas + Lançamentos Extras/Balões)

Cenário imobiliário de larga escala: processa entrada compensada, loop de parcelas futuras e múltiplos reforços avulsos (balões) lidos de células agregadas.

```json
{
  "versao_motor": "2.0",
  "colunas_entrada": [
    { "celula": "A", "label": "Cliente", "tipo": "String" },
    { "celula": "C", "label": "Empreendimento", "tipo": "String" },
    { "celula": "D", "label": "Unidade", "tipo": "String" },
    { "celula": "E", "label": "Valor Venda", "tipo": "String" },
    { "celula": "F", "label": "Valor Entrada", "tipo": "String" },
    { "celula": "G", "label": "Data Entrada", "tipo": "String" },
    { "celula": "H", "label": "Valor Parcela", "tipo": "String" },
    { "celula": "J", "label": "Parcelas Qtd", "tipo": "String" },
    { "celula": "K", "label": "Parcelas Pagas", "tipo": "String" },
    { "celula": "L", "label": "Valor Balao", "tipo": "String" },
    { "celula": "M", "label": "Qtd Baloes", "tipo": "String" },
    { "celula": "N", "label": "Datas Baloes", "tipo": "String" },
    { "celula": "Q", "label": "Obs", "tipo": "String" },
    { "celula": "R", "label": "Corretor", "tipo": "String" },
    { "celula": "S", "label": "Creci", "tipo": "String" }
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

---

### Exemplo 5: Lote de Lançamentos Extras/Balões (Sem Parcelas)

Contrato estruturado apenas com Entrada (Compensado) e Lançamentos Extras (Pendente), sem recorrência de parcelamento.

```json
{
  "versao_motor": "2.0",
  "colunas_entrada": [
    { "celula": "A", "label": "Cliente", "tipo": "String" },
    { "celula": "C", "label": "Empreendimento", "tipo": "String" },
    { "celula": "D", "label": "Unidade", "tipo": "String" },
    { "celula": "E", "label": "Valor Venda", "tipo": "String" },
    { "celula": "F", "label": "Valor Entrada", "tipo": "String" },
    { "celula": "G", "label": "Data Entrada", "tipo": "String" },
    { "celula": "L", "label": "Valor Balao", "tipo": "String" },
    { "celula": "M", "label": "Qtd Baloes", "tipo": "String" },
    { "celula": "N", "label": "Datas Baloes", "tipo": "String" },
    { "celula": "Q", "label": "Obs", "tipo": "String" },
    { "celula": "R", "label": "Corretor", "tipo": "String" },
    { "celula": "S", "label": "Creci", "tipo": "String" }
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

---

### Exemplo 6: Esteira de Venda Parcelada Padrão (Sem Balões)

Contrato estruturado apenas com Entrada (Compensado) e Parcelas Sequenciais (Paga / Pendente), sem balões extras.

```json
{
  "versao_motor": "2.0",
  "colunas_entrada": [
    { "celula": "A", "label": "Cliente", "tipo": "String" },
    { "celula": "C", "label": "Empreendimento", "tipo": "String" },
    { "celula": "D", "label": "Unidade", "tipo": "String" },
    { "celula": "E", "label": "Valor Venda", "tipo": "String" },
    { "celula": "F", "label": "Valor Entrada", "tipo": "String" },
    { "celula": "G", "label": "Data Entrada", "tipo": "String" },
    { "celula": "H", "label": "Valor Parcela", "tipo": "String" },
    { "celula": "J", "label": "Parcelas Qtd", "tipo": "String" },
    { "celula": "K", "label": "Parcelas Pagas", "tipo": "String" },
    { "celula": "Q", "label": "Obs", "tipo": "String" },
    { "celula": "R", "label": "Corretor", "tipo": "String" },
    { "celula": "S", "label": "Creci", "tipo": "String" }
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

### Exemplo 7: Conciliação Automática e Baixa de Parcelas (Motor FIFO)

Perfil ideal para recebimentos de lotes de comissão (Modo Baixas). Lê a planilha e compensa as parcelas pendentes mais antigas por ordem cronológica (First-In, First-Out).

```json
{
  "versao_motor": "2.0",
  "colunas_entrada": [
    { "celula": "C", "label": "Venda R$", "tipo": "String" },
    { "celula": "O", "label": "Comissão R$", "tipo": "String" },
    { "celula": "R", "label": "Corretor", "tipo": "String" },
    { "celula": "S", "label": "Creci", "tipo": "String" }
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

## 8. Auto-Mapeamento Inteligente de Cabeçalhos

O sistema possui uma inteligência embarcada de detecção de colunas que analisa os cabeçalhos das planilhas enviadas. Ele utiliza uma normalização de texto (removendo acentos e espaços), cálculo de similaridade via distância de Levenshtein e busca de padrões de palavras-chave (sinônimos) para sugerir o mapeamento ideal no editor.

Para que a importação reconheça suas colunas automaticamente com 100% de assertividade, dê preferência por nomear os cabeçalhos da sua planilha utilizando um dos sinônimos reconhecidos abaixo:

### Dicionário de Cabeçalhos e Sinônimos Recomendados

| Campo Interno | Rótulo (Label) do Sistema | Sinônimos / Padrões de Nomes Recomendados na Planilha |
| :--- | :--- | :--- |
| **`corretor_identificador`** | Parceiro/Consultor (Nome) | `corretor`, `nome`, `consultor`, `vendedor`, `parceiro`, `colaborador`, `angariador`, `responsável` |
| **`corretor_creci`** | ID Profissional / Matrícula | `creci`, `cpf`, `cnpj`, `registro`, `identificador`, `matricula`, `documento`, `doc` |
| **`valor_venda`** | Valor Total do Negócio | `valor venda`, `venda`, `vgv`, `total`, `negócio`, `bruto`, `contrato valor` |
| **`valor_pago`** | Valor Pago (Entrada/Sinal) | `valor pago`, `pago`, `sinal`, `entrada`, `ato`, `recebido`, `repasse`, `pago ato` |
| **`empreendimento`** | Produto / Serviço / Campanha | `empreendimento`, `obra`, `residencial`, `produto`, `servico`, `campanha`, `projeto`, `loteamento` |
| **`unidade`** | Ref. Contrato / ID Venda | `unidade`, `apto`, `sala`, `lote`, `quadra`, `imovel`, `contrato`, `ref`, `venda id` |
| **`cliente_nome`** | Nome do Cliente | `cliente`, `comprador`, `adquirente`, `mutuário`, `cliente final` |
| **`balao_valor`** | Valores Rec. Extras | `balao valor`, `balão valor`, `reforco valor`, `reforço valor`, `extra valor` |
| **`balao_datas`** | Datas Rec. Extras | `balao datas`, `balão datas`, `reforco datas`, `reforço datas`, `datas baloes`, `datas balões` |
| **`balao_qtd`** | Qtd Recebimentos Extras | `balao qtd`, `balão qtd`, `reforco qtd`, `reforço qtd`, `qtd reforcos`, `qtd baloes` |
| **`parcela_valor`** | Valor da Parcela | `parcela valor`, `mensal valor`, `valor parcela`, `mensalidade` |
| **`parcela_qtd`** | Qtd de Parcelas | `parcela qtd`, `qtd parcelas`, `quantidade parcelas`, `meses` |
| **`parcela_data_inicio`** | Data Início Parcelas | `parcela data`, `data parcelas`, `inicio parcelas`, `primeiro vencimento` |

> [!TIP]
> **Como tirar vantagem da auto-detecção:** 
> Se você padronizar a sua planilha para usar nomes como `CPF` para documento, `Valor Venda` para o VGV e `Meses` para a quantidade de parcelas, o sistema fará o mapeamento inicial de forma instantânea quando você criar um novo perfil de importação, sem a necessidade de arrastar conexões manualmente para cada coluna.
