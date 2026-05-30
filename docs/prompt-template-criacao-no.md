# Guia e Prompt de Engenharia para Criação de Novos Nós (Visual Flowchart Editor)

Este documento foi criado para servir como um manual vivo e um modelo de prompt automatizado. No futuro, quando você quiser adicionar um novo bloco/nó funcional ao modelador visual e ao motor programável do V-Talentos, bastará copiar o **Prompt Template** localizado na **Seção 2**, preencher os campos indicados entre colchetes (`[ ]`) e enviar para o assistente de IA.

---

## 1. Entendendo a Arquitetura do Canvas para Criação de Nós

Para que qualquer Inteligência Artificial ou Desenvolvedor crie um nó robusto no arquivo `src/frontend/admin-importacao-programavel.html`, é necessário alterar 6 pontos estruturais no arquivo:

1. **Toolbox (Barra Lateral):** Inserir o botão do nó na lista de nós disponíveis.
2. **Estilo CSS (.node-variant-type):** Definir as cores das bordas, sombras neon e gradientes do cabeçalho do nó.
3. **Instanciação (addNodeToCanvas):** Definir o título padrão e o schema de dados iniciais (`node.data`) do nó ao ser criado.
4. **Renderização (renderNodes):** Desenhar a interface interna do card do nó no canvas, incluindo suas portas de entrada/saída (`flow-port` ou `flow-port-row-port`).
5. **Painel de Propriedades (showNodeProperties):** Criar os inputs/formulários que aparecem na base da tela para configurar os parâmetros específicos do nó e vincular os listeners de alteração.
6. **Compilador e Parser Bidirecional (compileFlowchartToJSON & parseJSONToFlowchart):** Definir como as configurações deste nó geram código JSON no Monaco Editor e como o JSON reconstrói o nó visualmente.

---

## 2. Prompt Copiar e Colar (Template de Solicitação)

> [!IMPORTANT]
> Copie o bloco abaixo, preencha as variáveis de acordo com a sua necessidade e envie para a IA para gerar o novo nó visual.

```markdown
Olá! Preciso que você crie um novo nó no nosso Editor Visual de Importação Programável (admin-importacao-programavel.html). Siga rigorosamente a arquitetura de 6 etapas estabelecida no arquivo para garantir o funcionamento visual e a compilação bidirecional com o Monaco Editor.

Aqui estão as especificações do nó que você deve criar:
- **ID/Tipo do Nó:** [ex: text_sanitizer]
- **Título do Bloco:** [ex: 🔤 Sanitizador de Textos]
- **Cor de Destaque / Gradiente:** [ex: Bordas em tons azuis, gradiente do header de #3498db a #2980b9]
- **Portas Físicas (Entrada / Saída):** [ex: Uma porta de entrada 'in' e uma porta de saída 'out']
- **Dados Iniciais (node.data):**
  [ex:
  - campoDestino: "NomeConsultor"
  - regraSanitizacao: "uppercase"
  ]
- **Inputs do Painel de Propriedades (Formulário):**
  [ex:
  - Dropdown para selecionar o "Campo de Destino"
  - Dropdown com as regras: "Tudo Maiúsculo (uppercase)", "Tudo Minúsculo (lowercase)", "Remover Espaços (trim)", "Remover Acentos (clear_accents)"
  ]
- **Lógica de Compilação (Flowchart ➔ Monaco JSON):**
  [ex: O nó deve compilar na seção "mapeamento_campos.[campoDestino]" adicionando ou atualizando a propriedade "script" com uma linha correspondente, como:
  Se "uppercase" ➔ "return value.trim().toUpperCase();"
  Se "lowercase" ➔ "return value.trim().toLowerCase();"
  ]
- **Lógica de Parsing (Monaco JSON ➔ Flowchart):**
  [ex: Ao carregar o JSON no Monaco Editor, se encontrar uma regra de script que contenha ".toUpperCase()", deve instanciar este nó visualmente na posição intermediária do canvas e recriar suas conexões com as portas de entrada e saída correspondentes]

Por favor, faça a substituição utilizando a ferramenta de edição de arquivos de forma contígua e cirúrgica, preservando todos os estilos e lógicas existentes. Adicione notas claras de quais alterações você fez.
```

---

## 3. Exemplos Prontos para as Próximas Fases (Copiar e Usar)

Abaixo estão os prompts prontos contendo as especificações detalhadas de dois blocos planejados para a sua nova **Fase 16** (com exceção do conversor de moedas):

### Exemplo A: Criação do Nó Sanitizador de Textos (No-Code puro)

````markdown
Olá! Preciso que você crie um novo nó no nosso Editor Visual de Importação Programável (admin-importacao-programavel.html). Siga rigorosamente a arquitetura estabelecida no arquivo para garantir o funcionamento visual e a compilação bidirecional com o Monaco Editor.

Aqui estão as especificações do nó que você deve criar:
- **ID/Tipo do Nó:** `text_sanitizer`
- **Título do Bloco:** `🔤 Sanitizador de Texto`
- **Cor de Destaque / Gradiente:** Bordas em `#3498db` (azul vibrante) com brilho neon e gradiente do cabeçalho de `#3498db` a `#1d6fa5`.
- **Portas Físicas (Entrada / Saída):** Uma porta de entrada `in` (azul) na esquerda e uma porta de saída `out` (azul) na direita.
- **Dados Iniciais (node.data):**
  ```json
  {
    "fieldName": "CampoSanitizado",
    "regra": "uppercase"
  }
  ```
- **Inputs do Painel de Propriedades (Formulário):**
  - Input do tipo texto para definir o "Nome do Campo de Saída".
  - Seletor `<select>` com as opções: 
    - "Tudo em Maiúsculo (UPPERCASE)" -> valor `uppercase`
    - "Tudo em Minúsculo (lowercase)" -> valor `lowercase`
    - "Remover Espaços Extras (trim)" -> valor `trim`
    - "Limpar Caracteres Especiais (clean)" -> valor `clean`
- **Lógica de Compilação (Flowchart ➔ Monaco JSON):**
  O nó deve compilar na seção `"mapeamento_campos"` gerando um script automático baseado na opção escolhida:
  - Se `uppercase` ➔ `return value.trim().toUpperCase();`
  - Se `lowercase` ➔ `return value.trim().toLowerCase();`
  - Se `trim` ➔ `return value.trim();`
  - Se `clean` ➔ `return value.replace(/[^a-zA-Z0-9\s]/g, "");`
- **Lógica de Parsing (Monaco JSON ➔ Flowchart):**
  Varre as chaves do mapeamento. Se um campo tiver script e corresponder exatamente a um desses retornos de sanitização, reconstrói o nó visual `text_sanitizer` no canvas e conecta sua entrada à coluna de origem e a saída ao campo correspondente do nó Gravar Transação.

Por favor, implemente essa funcionalidade de forma limpa e atualize as configurações.
````

### Exemplo B: Criação do Nó de Envio de Alertas (Slack/Webhook)

````markdown
Olá! Preciso que você crie um novo nó no nosso Editor Visual de Importação Programável (admin-importacao-programavel.html). Siga rigorosamente a arquitetura estabelecida no arquivo para garantir o funcionamento visual e a compilação bidirecional com o Monaco Editor.

Aqui estão as especificações do nó que você deve criar:
- **ID/Tipo do Nó:** `webhook_alert`
- **Título do Bloco:** `🔔 Enviar Webhook/Alerta`
- **Cor de Destaque / Gradiente:** Bordas em `#e67e22` (laranja vibrante) com brilho neon e gradiente do cabeçalho de `#e67e22` a `#d35400`.
- **Portas Físicas (Entrada / Saída):** Uma porta de entrada `in` (laranja) na esquerda. Sem portas de saída (é um nó terminal).
- **Dados Iniciais (node.data):**
  ```json
  {
    "webhookUrl": "https://hooks.slack.com/services/...",
    "mensagem": "Importação realizada com sucesso para o consultor {{NomeConsultor}}!"
  }
  ```
- **Inputs do Painel de Propriedades (Formulário):**
  - Input do tipo texto para configurar a "URL do Webhook (Slack/Teams/Generic)".
  - Textarea para escrever a "Mensagem customizada do Alerta" (com suporte a tags/macros com chaves duplas `{{NomeConsultor}}`).
- **Lógica de Compilação (Flowchart ➔ Monaco JSON):**
  O nó deve compilar na propriedade de hooks globais, injetando um código de disparo no hook `"antes_salvar_linha"` ou criando uma seção customizada no JSON de configurações gerais como `"webhook_notificacao": { "url": "...", "mensagem": "..." }`.
- **Lógica de Parsing (Monaco JSON ➔ Flowchart):**
  Detecta se a seção de `"webhook_notificacao"` está presente no JSON do Monaco. Se sim, reconstrói o nó `webhook_alert` no canvas e preenche a URL e a mensagem nos inputs de propriedades correspondentes.

Por favor, implemente essa funcionalidade de forma limpa e atualize as configurações.
````
