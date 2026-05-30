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

## 3. Helpers Utilitários Nativos

Estão expostos na sandbox sob o namespace `helpers`:

### `helpers.parseMoeda(val)`
Converte de forma flexível e ultra-robusta diversos formatos de moedas nacionais (BRL) e estrangeiras (USD) para números do tipo Float.
- Exemplos:
  - `helpers.parseMoeda("R$ 1.500,50")` ➔ `1500.5`
  - `helpers.parseMoeda("1,500.50")` ➔ `1500.5`
  - `helpers.parseMoeda("1500,50")` ➔ `1500.5`
  - `helpers.parseMoeda("1.500")` ➔ `1500`

### `helpers.cleanCPF(val)`
Remove qualquer caractere não numérico, ideal para padronização de CPF, CNPJ e códigos de matrículas.
- Exemplo: `helpers.cleanCPF("123.456.789-00")` ➔ `"12345678900"`

### `helpers.somarMeses(dataStr, meses)`
Calcula datas futuras adicionando meses a uma data inicial base. Suporta datas no padrão BRL (`DD/MM/YYYY`) ou padrão universal ISO. Retorna uma string no formato `YYYY-MM-DD`.
- Exemplo: `helpers.somarMeses("15/01/2026", 3)` ➔ `"2026-04-15"`

---

## 4. Exemplos Homologados e Executáveis

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
