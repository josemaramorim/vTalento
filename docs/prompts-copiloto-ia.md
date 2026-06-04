# Guia de Prompts do Copiloto IA (V-Talentos)

Este documento contém 50 prompts reais e de exemplo para testar as capacidades de tradução de linguagem natural em fluxos JSON, regras de sanitização e diagnósticos de erro do Copiloto IA (OpenAI GPT-4o e Google Gemini).

---

## 📂 Sumário
1. [Sanitização de Textos e Formatações Básicas (1 a 10)](#1-sanitiza%C3%A7%C3%A3o-de-textos-e-formata%C3%A7%C3%B5es-b%C3%A1sicas-1-a-10)
2. [Operações Financeiras e Fatores de Conversão (11 a 20)](#2-opera%C3%A7%C3%B5es-financeiras-e-fatores-de-convers%C3%A3o-11-a-20)
3. [Esteiras Financeiras e Vendas Complexas (21 a 30)](#3-esteiras-financeiras-e-vendas-complexas-21-a-30)
4. [Hooks, Validações e Regras de Qualidade (31 a 40)](#4-hooks-valida%C3%A7%C3%B5es-e-regras-de-qualidade-31-a-40)
5. [Variáveis Globais, Logs e Metadados Extras (41 a 50)](#5-vari%C3%A1veis-globais-logs-e-metadados-extras-41-a-50)

---

## 1. Sanitização de Textos e Formatações Básicas (1 a 10)

### 1. Limpeza de Cadastro de Corretores (CPF e Nome)
* **Situação:** Nomes com espaços extras nas pontas e CPFs contendo pontos e traços.
* **Prompt:** 
  > *"Mapeie a coluna A para o Nome do Consultor em caixa alta (UPPERCASE) e limpe o CPF da coluna B usando a função cleanCPF salvando em IDProfissional."*
* **Uso no Motor:** Sanitiza a string usando `helpers.cleanCPF` e `.toUpperCase()`.

### 2. Formatação Padrão de Nomes Próprios
* **Situação:** Planilha com nomes de corretores escritos de forma desordenada (alguns em maiúsculo, outros minúsculo).
* **Prompt:**
  > *"Mapeie a coluna A para NomeConsultor aplicando a limpeza trim e convertendo todo o texto para letras maiúsculas."*
* **Uso no Motor:** Aplica o nó `text_sanitizer` com a regra `UPPERCASE`.

### 3. Extração e Padronização de CRECI / Registro
* **Situação:** A coluna de registro do profissional contém letras e traços (ex: `CRECI-12345-F`) e você quer apenas os números.
* **Prompt:**
  > *"Pegue a coluna D de Creci, remova todas as letras e traços usando um replace para sobrar apenas números e salve em IDProfissional."*
* **Uso no Motor:** Gera o script `return value ? value.replace(/[^0-9]/g, '') : '';`.

### 4. Limpeza Genérica de Espaços (Trim)
* **Situação:** A planilha possui espaços em branco invisíveis no início ou fim dos textos que dificultam a busca no banco de dados.
* **Prompt:**
  > *"Mapeie a coluna B para contato_cliente aplicando apenas a regra de trim para eliminar espaços vazios nas extremidades."*
* **Uso no Motor:** Aplica o nó `text_sanitizer` com a regra `trim`.

### 5. Normalização de Número de Telefone
* **Situação:** Coluna com telefones em múltiplos formatos (ex: `(11) 99999-9999` ou `11999999999`).
* **Prompt:**
  > *"Mapeie o telefone do cliente na coluna E. Crie um script que remova parênteses, traços e espaços, salvando apenas os dígitos dentro de dados_extras."*
* **Uso no Motor:** Limpa strings aplicando expressões regulares.

### 6. Sanitização de E-mail para Minúsculas
* **Situação:** Endereços de e-mail inseridos com letras maiúsculas misturadas.
* **Prompt:**
  > *"Mapeie a coluna F para email do consultor, garantindo que o texto fique todo em letras minúsculas (lowercase) e sem espaços."*
* **Uso no Motor:** Executa `value.toLowerCase().trim()`.

### 7. Formatação de Endereço e Unidade
* **Situação:** A coluna de unidade contém textos complementares que precisam ser isolados.
* **Prompt:**
  > *"Mapeie a coluna C para unidade e adicione um script para concatenar a palavra 'Apto ' antes do número da unidade."*
* **Uso no Motor:** Retorna `'Apto ' + value`.

### 8. Filtro de Caracteres Especiais
* **Situação:** Nomes de clientes com acentos ou caracteres estranhos que precisam ser sanitizados.
* **Prompt:**
  > *"Mapeie o nome do cliente na coluna B para contato_cliente, removendo caracteres especiais e acentos usando uma regra de clean."*
* **Uso no Motor:** Aplica o nó `text_sanitizer` com a regra `clean`.

### 9. Sufixo no Campo Empreendimento
* **Situação:** Identificar o condomínio de forma uniforme.
* **Prompt:**
  > *"Mapeie a coluna C para produto e concatene o texto ' - Fase 1' no final de cada registro."*
* **Uso no Motor:** Retorna `value + ' - Fase 1'`.

### 10. Substituição de Valores Nulos por Padrão
* **Situação:** A coluna de observações ou dados está vazia em algumas linhas.
* **Prompt:**
  > *"Mapeie a coluna Q para dados_extras. Se a célula estiver vazia, o script deve retornar o objeto com a observação 'Sem observações registradas'."*
* **Uso no Motor:** Implementa um fallback de string nula na Sandbox.

---

## 2. Operações Financeiras e Fatores de Conversão (11 a 20)

### 11. Conversão Monetária para Decimal
* **Situação:** Converter valores formatados como `R$ 1.250,50` para `1250.5`.
* **Prompt:**
  > *"Converta a coluna C contendo o valor bruto em dinheiro para decimal usando a função parseMoeda do sistema e grave em ValorVenda."*
* **Uso no Motor:** Utiliza `helpers.parseMoeda(value)`.

### 12. Divisão Automática pelo Fator de Conversão
* **Situação:** A comissão está em reais e deve ser convertida para pontos (Talentos) usando o fator central configurado.
* **Prompt:**
  > *"Mapeie o valor de venda da coluna C em ValorVenda e use o fatorConversao do sistema para preencher os pontos finais em valor dividindo a comissão por ele."*
* **Uso no Motor:** Retorna `Math.floor(helpers.parseMoeda(value) / fatorConversao)`.

### 13. Cálculo de Comissão Percentual (Ex: 5%)
* **Situação:** A comissão do corretor é uma fração fixa do valor total do negócio.
* **Prompt:**
  > *"Leia o valor total da venda da coluna C e calcule a comissão do corretor correspondente a 5% desse valor total, gravando o resultado em ValorVenda."*
* **Uso no Motor:** Calcula `helpers.parseMoeda(row.C) * 0.05`.

### 14. Divisão Proporcional de Venda Compartilhada (Ex: 50% para cada)
* **Situação:** Dois corretores dividiram uma venda e cada um recebe metade.
* **Prompt:**
  > *"A comissão final deve ser calculada pegando o valor da coluna D e dividindo por 2 antes de aplicar a conversão em pontos, salvando metade do valor original."*
* **Uso no Motor:** Divide o valor bruto de entrada por 2.

### 15. Aplicação de Fator de Conversão Fixo de Dólar
* **Situação:** As comissões são pagas com base em uma taxa de câmbio dolarizada mantida em cache.
* **Prompt:**
  > *"Gere um script no campo de valor que multiplica o valor lido da coluna D por 5.25 para converter de dólares para reais antes de salvar em ValorVenda."*
* **Uso no Motor:** Retorna `helpers.parseMoeda(value) * 5.25`.

### 16. Arredondamento para Baixo (Inteiro de Pontos)
* **Situação:** Pontos/Talentos não devem conter casas decimais.
* **Prompt:**
  > *"Calcule a comissão da coluna E dividida pelo fator de conversão e garanta que o resultado seja arredondado para baixo, retornando apenas inteiros em valor."*
* **Uso no Motor:** Aplica `Math.floor()`.

### 17. Teto de Comissão Máxima (Guardrail)
* **Situação:** Uma comissão nunca deve passar de 5.000 pontos para evitar erros de lançamento massivo.
* **Prompt:**
  > *"Calcule os pontos dividindo a coluna D pelo fator de conversão. Se o resultado passar de 5000, limite o retorno do script a exatamente 5000 pontos."*
* **Uso no Motor:** Aplica `Math.min(pontos, 5000)`.

### 18. Piso de Comissão Mínima
* **Situação:** Qualquer venda elegível deve render pelo menos 10 pontos.
* **Prompt:**
  > *"Mapeie o valor da coluna D dividido por 100. Caso o valor calculado seja inferior a 10 pontos, retorne o piso mínimo de 10 no script de valor."*
* **Uso no Motor:** Aplica `Math.max(pontos, 10)`.

### 19. Dedução de Impostos / Taxa Administrativa (Ex: Desconto de 1.5%)
* **Situação:** Deduzir taxas antes de computar os pontos finais.
* **Prompt:**
  > *"Pegue o valor da coluna C, deduza uma taxa de 1.5% e salve o valor líquido resultante em ValorVenda."*
* **Uso no Motor:** Retorna `helpers.parseMoeda(value) * 0.985`.

### 20. Multiplicação por Multiplicador de Campanha (Bônus Dobrado)
* **Situação:** Campanha promocional onde as vendas dão o dobro de pontos.
* **Prompt:**
  > *"Calcule a pontuação dividindo a comissão da coluna E pelo fator de conversão e multiplique o resultado por 2 para aplicar o bônus de campanha dobrada."*
* **Uso no Motor:** Retorna `(helpers.parseMoeda(value) / fatorConversao) * 2`.

---

## 3. Esteiras Financeiras e Vendas Complexas (21 a 30)

### 21. Lançamento Único de Créditos (Sinal)
* **Situação:** Mapear o sinal/entrada de uma venda.
* **Prompt:**
  > *"Gere um fluxo simples onde o valor recebido da coluna D é gravado como uma única transação compensada de entrada na data informada na coluna E. O corretor está na coluna A."*
* **Uso no Motor:** Gera transação simples com status `'COMPENSADO'`.

### 22. Esteira de Parcelas Mensais Clássicas
* **Situação:** Gerar parcelas futuras pendentes.
* **Prompt:**
  > *"Crie uma esteira de parcelas. O valor da parcela está na coluna F, a quantidade total de parcelas na coluna G e o número de parcelas já pagas na coluna H. Use a data de início da coluna I."*
* **Uso no Motor:** Loop cronológico adicionando parcelas compensadas ou pendentes.

### 23. Balões Anuais Avulsos
* **Situação:** Parcelas extras que caem em datas pré-definidas na planilha.
* **Prompt:**
  > *"Mapeie os balões extras da coluna J. O valor do reforço é o da coluna K e as datas estão separadas por pipeline na coluna L, gerando lançamentos avulsos pendentes para cada data."*
* **Uso no Motor:** Quebra a string por pipeline (`|`) e cria lançamentos individuais.

### 24. Esteira Completa: Sinal + Parcelas + Balões
* **Situação:** Estruturação completa de um contrato imobiliário de longo prazo.
* **Prompt:**
  > *"Configure uma esteira completa de venda imobiliária. A entrada é a coluna F (compensada na data G), as parcelas mensais estão na coluna H (Qtd J e pagas K) e os balões extras na coluna L usando datas da coluna N."*
* **Uso no Motor:** Script integrado no campo `transacoes_geradas` populando o array com múltiplos objetos.

### 25. Parcelas com Acréscimo / Juros (Ex: 1% ao Mês)
* **Situação:** Parcelas que sofrem juros progressivos simples a cada mês.
* **Prompt:**
  > *"Gere parcelas usando a coluna F (valor) e coluna G (quantidade). Aplique um acréscimo progressivo de 1% de juros sobre o valor da parcela a cada mês que passa."*
* **Uso no Motor:** Calcula `valor * (1 + 0.01 * i)` no loop.

### 26. Carência de Parcelas (Primeiro Vencimento após 90 dias)
* **Situação:** As parcelas só começam a vencer 3 meses após a assinatura.
* **Prompt:**
  > *"Gere 12 parcelas mensais com o valor da coluna F, mas aplique uma carência de 3 meses na data de vencimento da primeira parcela."*
* **Uso no Motor:** Soma 3 meses à data de referência inicial.

### 27. Parcelamento Semanal (Frequência Curta)
* **Situação:** Projetos com ciclos de pagamentos semanais em vez de mensais.
* **Prompt:**
  > *"Mapeie o valor de comissão semanal na coluna F e crie 4 transações semanais adicionando 7 dias de diferença no vencimento de cada uma."*
* **Uso no Motor:** Incrementa data adicionando `7 * i` dias em milissegundos.

### 28. Divisão Dinâmica de Balões por Vírgula
* **Situação:** As datas dos balões estão separadas por vírgula na coluna M.
* **Prompt:**
  > *"Leia as datas de balões na coluna M separadas por vírgula. Gere uma transação com valor da coluna L para cada uma dessas datas."*
* **Uso no Motor:** Aplica `.split(',')` para iterar sobre as datas.

### 29. Lançamento de Crédito e Débito Simultâneos (Estorno / Tx ADM)
* **Situação:** Gerar o crédito da comissão e um débito automático de taxa de marketing.
* **Prompt:**
  > *"Crie duas transações na linha: um Crédito de comissão com valor total da coluna C e um Débito de taxa no valor fixo de 50 pontos para o mesmo corretor."*
* **Uso no Motor:** Empurra um objeto `'CREDITO'` e um objeto `'DEBITO'` no array de transações.

### 30. Entrada e Parcelas com Valores Diferentes
* **Situação:** A planilha informa o valor da entrada em uma coluna e o valor das parcelas em outra.
* **Prompt:**
  > *"Mapeie a entrada da coluna D e mais 6 parcelas mensais adicionais com o valor reduzido indicado na coluna E."*
* **Uso no Motor:** Cria a primeira transação com o valor da coluna D e o loop das demais com a coluna E.

---

## 4. Hooks, Validações e Regras de Qualidade (31 a 40)

### 31. Filtro de Valor de Venda Mínimo (Piso de VGV)
* **Situação:** Evitar importar linhas referentes a vendas simbólicas ou com erros de digitação de valor.
* **Prompt:**
  > *"Adicione um hook antes de salvar a linha para rejeitar transações cujo valor de comissão seja menor do que 150 reais."*
* **Uso no Motor:** Retorna `false` no hook se o valor de venda lido for inferior a 150.

### 32. Validação de Email do Consultor
* **Situação:** Garantir que a linha tenha um e-mail válido para evitar cadastros quebrados.
* **Prompt:**
  > *"Crie um hook antes_salvar_linha que verifique se o e-mail na coluna F contém '@' e termina com '.com'. Se for inválido, descarte a linha."*
* **Uso no Motor:** Valida o email com regex ou busca de substring.

### 33. Filtro por Data Limite (Apenas Vendas Recentes)
* **Situação:** Bloquear a importação de vendas de anos anteriores.
* **Prompt:**
  > *"Gere um hook que impeça a importação se a data do contrato na coluna G for anterior ao ano de 2026."*
* **Uso no Motor:** Compara o ano do campo de data com 2026 no hook da linha.

### 34. Descarte de Unidades Fictícias ou Testes
* **Situação:** A planilha contém linhas de teste com unidade descrita como "TESTE" ou "X".
* **Prompt:**
  > *"Crie uma regra de filtro para ignorar qualquer linha em que a Unidade da coluna D seja 'TESTE', 'TBD' ou 'N/A'."*
* **Uso no Motor:** Hook retorna `false` se `row.D` corresponder aos termos.

### 35. Validação de CPF Vazio
* **Situação:** Rejeitar linhas onde o CPF do cliente ou do corretor não foi preenchido.
* **Prompt:**
  > *"Adicione uma validação no hook antes de salvar para descartar a linha caso o CPF na coluna B esteja nulo ou vazio."*
* **Uso no Motor:** Executa `if (!row.B) return false;`.

### 36. Filtro por Status da Proposta
* **Situação:** Só importar propostas que estejam marcadas com status "APROVADA" ou "CONCLUÍDA".
* **Prompt:**
  > *"Gere uma regra condicional antes de salvar a linha para aceitar apenas registros em que a coluna H (Status) seja igual a 'APROVADA'."*
* **Uso no Motor:** Compara `row.H === 'APROVADA'`.

### 37. Alerta de Webhook para Altas Comissões
* **Situação:** Chamar um webhook de parabéns sempre que uma comissão passar de 10.000 pontos.
* **Prompt:**
  > *"Crie um nó de Webhook com mensagem 'Super comissão de {{NomeConsultor}} no valor de {{ValorComissao}}' disparado apenas se a comissão passar de 10000."*
* **Uso no Motor:** Cria o gatilho de alerta baseado no valor computado da linha.

### 38. Filtro por Tipo de Produto
* **Situação:** Ignorar linhas de aluguéis, apenas importar vendas.
* **Prompt:**
  > *"Gere uma condicional que ignore a linha se a coluna E contiver a palavra 'Aluguel' ou 'Locação'."*
* **Uso no Motor:** Descarte no hook de validação da linha.

### 39. Validação de Duplicidade de Linha
* **Situação:** Garantir que o número do contrato não seja nulo para evitar duplicar transações acidentalmente.
* **Prompt:**
  > *"Use o hook antes_salvar_linha para rejeitar a importação caso o número do contrato na coluna D não esteja preenchido."*
* **Uso no Motor:** Valida presença da chave de unidade/contrato.

### 40. Validação de Margem de Comissão (Piso de 1%)
* **Situação:** Garantir que a comissão seja de pelo menos 1% do valor da venda.
* **Prompt:**
  > *"Crie uma regra no hook antes de salvar que rejeite o registro se o ValorComissao for menor do que 1% do ValorVenda."*
* **Uso no Motor:** Compara `ValorComissao < (ValorVenda * 0.01)`.

---

## 5. Variáveis Globais, Logs e Metadados Extras (41 a 50)

### 41. Inicialização de Variável de Taxa Global
* **Situação:** Declarar taxas uma única vez no boot da planilha.
* **Prompt:**
  > *"Configure no contexto de inicialização global do perfil a variável globalStore.taxaServico com o valor de 0.02."*
* **Uso no Motor:** Grava no `contexto_global.script_inicializacao`.

### 42. Acumulador Global de VGV total
* **Situação:** Somar o valor de todas as linhas e imprimir no log no final.
* **Prompt:**
  > *"Adicione um acumulador globalStore.somaVendas que adiciona o valor da coluna E a cada linha processada e emite um log.info com o saldo parcial."*
* **Uso no Motor:** Incrementa `globalStore` e executa `log.info` no loop.

### 43. Gravação de Metadados Extras da Planilha
* **Situação:** Salvar a linha original do excel e a data do processamento no banco de dados.
* **Prompt:**
  > *"Configure o campo dados_extras das transações para salvar um objeto JSON com o número da linha processada e a observação da coluna Q."*
* **Uso no Motor:** Retorna `{ linha: row.lineNumber, obs: row.Q }` para preencher `dados_extras`.

### 44. Log de Aviso para Vendas Acima de 1 Milhão
* **Situação:** Registrar avisos na console virtual sobre transações de altíssimo valor.
* **Prompt:**
  > *"No script de comissão, se o valor da venda na coluna E passar de 1000000, dispare um log.warning informando: 'Atenção: Venda milionária detectada para o consultor'."*
* **Uso no Motor:** Executa `log.warning(...)` na Sandbox.

### 45. Auditoria de Usuário Importador
* **Situação:** Guardar nos metadados da transação qual o perfil utilizado.
* **Prompt:**
  > *"Mapeie o campo dados_extras para gravar o nome do perfil de importação utilizado 'Perfil Imobiliário v2' e a versão do motor."*
* **Uso no Motor:** Grava constantes no JSON de metadados.

### 46. Compartilhamento de Câmbio de Moedas
* **Situação:** Ler uma taxa de câmbio de dólar declarada no início e usar em todas as comissões.
* **Prompt:**
  > *"Defina globalStore.cambioEuro = 5.60 na inicialização e use essa taxa para converter o valor da comissão da coluna F no script de valor."*
* **Uso no Motor:** Multiplica comissão por `globalStore.cambioEuro`.

### 47. Log de Erro se Corretor vier sem CPF
* **Situação:** Sinalizar nos logs do painel de simulação quando um corretor não tem identificador.
* **Prompt:**
  > *"Crie um script em NomeConsultor que se o CPF da coluna B estiver vazio, emita um log.error 'Erro: Corretor sem identificação na planilha!'."*
* **Uso no Motor:** Dispara `log.error(...)` se a coluna do CPF for nula.

### 48. Gravação do Nome Original da Planilha
* **Situação:** Associar o nome da planilha de importação a dados extras da transação.
* **Prompt:**
  > *"Mapeie a chave dados_extras para conter a string 'Importado via Planilha de Vendas Anuais 2026'."*
* **Uso no Motor:** Grava a string descritiva na coluna de metadados.

### 49. Contingência de Comissão Não Informada
* **Situação:** Planilhas onde o valor da comissão às vezes vem nulo ou em branco.
* **Prompt:**
  > *"No script do valor de comissão, se o valor da coluna D estiver nulo, assuma o valor padrão de comissão de 100 pontos e registre um log.warning."*
* **Uso no Motor:** Fallback `let val = helpers.parseMoeda(value) || 100; log.warning(...); return val;`.

### 50. Contador de Linhas Processadas
* **Situação:** Manter controle de performance e quantidade de linhas lidas.
* **Prompt:**
  > *"Inicialize globalStore.linhasLidas = 0 e a cada linha lida incremente o contador em 1, exibindo o número da linha atual via log.info."*
* **Uso no Motor:** Contador incremental armazenado no escopo global persistente da simulação.
