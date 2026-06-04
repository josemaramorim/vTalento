const BaseIaAdapter = require('./BaseIaAdapter');

class GeminiIaAdapter extends BaseIaAdapter {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || process.env.GEMINI_API_KEY;
  }

  async gerarFluxoJSON(promptUsuario, colunasExcel) {
    if (!this.apiKey || this.apiKey === 'mock' || this.apiKey === 'TEST_KEY') {
      return this._mockGerarFluxoJSON(promptUsuario, colunasExcel);
    }

    const systemPrompt = `Você é o tradutor de linguagem natural para o JSON do Motor de Importação Programável (V-Talentos).
Seu papel é retornar um objeto JSON válido correspondente às instruções do usuário.
As colunas disponíveis na planilha são: ${JSON.stringify(colunasExcel)}.
O JSON deve seguir esta estrutura estrita:
{
  "versao_motor": "2.0",
  "colunas_entrada": [{"celula": "A", "label": "Nome", "tipo": "String"}],
  "configuracoes_gerais": {
    "linha_cabecalho": 1,
    "pular_linhas_vazias": true,
    "delimitador_lista": ";",
    "fator_conversao": 100
  },
  "mapeamento_campos": {
    "NomeConsultor": { "celula": "A", "script": "return value.trim().toUpperCase();" }
  },
  "nodes": [
    { "id": "node_excel_input", "type": "excel_input", "x": 100, "y": 150, "data": { "linhaCabecalho": 1, "columns": [{"letter":"A","label":"Nome","type":"String"}] } },
    { "id": "node_save_node", "type": "save_node", "x": 750, "y": 200, "data": { "destFields": [{"name":"NomeConsultor","label":"Nome Consultor (Nome)"}] } }
  ],
  "connections": [
    { "from": "node_excel_input", "fromPort": "col_A", "to": "node_save_node", "toPort": "field_NomeConsultor" }
  ]
}

Nós disponíveis:
- excel_input: id 'node_excel_input'
- save_node: id 'node_save_node'
- text_sanitizer: para formatar texto (rule: 'UPPERCASE', 'lowercase', 'trim', 'clean')
- sinal_node: para entradas/sinais (status, justificativa)
- parcelas_node: para parcelas (justificativa, frequencia)
- baloes_node: para balões/reforços (justificativa, status)
- webhook_alert: para alertas de webhook (webhookUrl, mensagem)

Retorne estritamente o JSON, sem markdown ou explicações.`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [
              { text: systemPrompt },
              { text: `Gere o JSON para o prompt: "${promptUsuario}"` }
            ]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API do Gemini: HTTP ${response.status}`);
      }

      const resBody = await response.json();
      const text = resBody.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Retorno vazio da API do Gemini');
      }

      return JSON.parse(text);
    } catch (error) {
      console.error('[GeminiIaAdapter] Erro ao gerar fluxo:', error);
      throw error;
    }
  }

  async sugerirSanitizacao(exemploDados, objetivo) {
    if (!this.apiKey || this.apiKey === 'mock' || this.apiKey === 'TEST_KEY') {
      return this._mockSugerirSanitizacao(exemploDados, objetivo);
    }

    const systemPrompt = `Você é o assistente de sanitização do V-Talentos.
Dada a amostra de dados: ${JSON.stringify(exemploDados)} e o objetivo: "${objetivo}".
Sugira uma regra padrão ('UPPERCASE', 'lowercase', 'trim', 'clean') ou um script JavaScript curto.
Retorne um objeto JSON contendo:
{
  "regra": "UPPERCASE" | "lowercase" | "trim" | "clean" | "custom",
  "script": "return value.trim().toUpperCase();",
  "explicacao": "Explicação curta em português sobre o que a regra faz."
}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: systemPrompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API do Gemini: HTTP ${response.status}`);
      }

      const resBody = await response.json();
      const text = resBody.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text);
    } catch (error) {
      console.error('[GeminiIaAdapter] Erro ao sugerir sanitização:', error);
      throw error;
    }
  }

  async diagnosticarErro(mensagemErro, contexto) {
    if (!this.apiKey || this.apiKey === 'mock' || this.apiKey === 'TEST_KEY') {
      return this._mockDiagnosticarErro(mensagemErro, contexto);
    }

    const systemPrompt = `Você é o Import Doctor do V-Talentos.
Analise a mensagem de erro de importação: "${mensagemErro}".
O contexto atual é: ${JSON.stringify(contexto)}.
Explique o erro de forma amigável em português e sugira a correção.
Retorne um objeto JSON com esta estrutura:
{
  "explicacao": "Explicação amigável em português sobre por que o erro aconteceu.",
  "sugestao_correcao": "Instruções claras de como o usuário pode corrigir o erro.",
  "script_corrigido": "Código Javascript ou JSON corrigido se aplicável à falha (opcional).",
  "tipo_correcao": "script" | "json" | "data" | "none"
}`;

    try {
      const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{
            role: 'user',
            parts: [{ text: systemPrompt }]
          }],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.2
          }
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API do Gemini: HTTP ${response.status}`);
      }

      const resBody = await response.json();
      const text = resBody.candidates?.[0]?.content?.parts?.[0]?.text;
      return JSON.parse(text);
    } catch (error) {
      console.error('[GeminiIaAdapter] Erro ao diagnosticar erro:', error);
      throw error;
    }
  }

  // --- MOCK FALLBACK METHOD SIMULATIONS FOR OFFLINE/TESTS ---

  _mockGerarFluxoJSON(promptUsuario, colunasExcel) {
    const promptLower = String(promptUsuario).toLowerCase();
    const cols = Array.isArray(colunasExcel) && colunasExcel.length > 0 ? colunasExcel : ['Nome', 'Valor'];
    const letterA = 'A';
    const letterB = cols.length > 1 ? 'B' : 'A';

    const config = {
      versao_motor: "2.0",
      colunas_entrada: cols.map((c, i) => ({
        celula: String.fromCharCode(65 + i),
        label: c,
        tipo: c.toLowerCase().includes('valor') || c.toLowerCase().includes('comissao') ? 'Number' : 'String'
      })),
      configuracoes_gerais: {
        linha_cabecalho: 1,
        pular_linhas_vazias: true,
        delimitador_lista: ";",
        fator_conversao: 100
      },
      mapeamento_campos: {},
      nodes: [
        { id: "node_excel_input", type: "excel_input", x: 100, y: 150, data: { linhaCabecalho: 1, columns: cols.map((c, i) => ({ letter: String.fromCharCode(65 + i), label: c, type: c.toLowerCase().includes('valor') ? 'Currency' : 'String' })) } },
        { id: "node_save_node", type: "save_node", x: 750, y: 200, data: { destFields: [{ name: "NomeConsultor", label: "Nome Consultor (Nome)" }] } }
      ],
      connections: [
        { from: "node_excel_input", fromPort: `col_${letterA}`, to: "node_save_node", toPort: "field_NomeConsultor" }
      ]
    };

    config.mapeamento_campos["NomeConsultor"] = { celula: letterA };

    if (promptLower.includes('maiúscula') || promptLower.includes('uppercase') || promptLower.includes('limpar') || promptLower.includes('sanitizar')) {
      // Inserir nó de sanitização
      config.nodes.push({
        id: "sanitizer_1",
        type: "text_sanitizer",
        x: 350,
        y: 150,
        data: { rule: "UPPERCASE", fieldName: "NomeConsultor" }
      });
      // Reconectar conexões
      config.connections = [
        { from: "node_excel_input", fromPort: `col_${letterA}`, to: "sanitizer_1", toPort: "in" },
        { from: "sanitizer_1", fromPort: "out", to: "node_save_node", toPort: "field_NomeConsultor" }
      ];
      config.mapeamento_campos["NomeConsultor"] = {
        celula: letterA,
        script: "return value.trim().toUpperCase();"
      };
    }

    if (promptLower.includes('sinal') || promptLower.includes('entrada')) {
      config.nodes.push({
        id: "sinal_1",
        type: "sinal_node",
        x: 500,
        y: 280,
        data: { status: "COMPENSADO", justificativa: "Sinal de Contrato" }
      });
      config.connections.push({ from: "node_excel_input", fromPort: `col_${letterB}`, to: "sinal_1", toPort: "in_valor" });
      config.connections.push({ from: "sinal_1", fromPort: "out", to: "node_save_node", toPort: "field_ValorComissao" });
    }

    return config;
  }

  _mockSugerirSanitizacao(exemploDados, objetivo) {
    const obj = String(objetivo).toLowerCase();
    if (obj.includes('maiúscula') || obj.includes('uppercase')) {
      return {
        regra: "UPPERCASE",
        script: "return value.trim().toUpperCase();",
        explicacao: "Converte o texto para letras maiúsculas e remove espaços sobressalentes."
      };
    }
    return {
      regra: "trim",
      script: "return value.trim();",
      explicacao: "Remove espaços em branco no início e fim do texto."
    };
  }

  _mockDiagnosticarErro(mensagemErro, contexto) {
    const msg = String(mensagemErro).toLowerCase();
    if (msg.includes('ajuda') || msg.includes('olá') || msg.includes('oi') || msg.includes('como') || msg.includes('pode')) {
      return {
        explicacao: "Olá! Sou o seu Copiloto IA. Posso ajudar você a configurar o motor, sugerir funções de sanitização de texto ou corrigir eventuais erros em seus scripts de importação.",
        sugestao_correcao: "Experimente me pedir: 'Gerar mapeamento da coluna A para o nome' ou clique nos botões de Ações Rápidas para testar as ferramentas contextuais.",
        script_corrigido: null,
        tipo_correcao: "none"
      };
    }
    if (msg.includes('null') || msg.includes('undefined') || msg.includes('trim')) {
      return {
        explicacao: "O erro ocorre porque o script tentou chamar a função '.trim()' em um valor vazio ou nulo da planilha.",
        sugestao_correcao: "Adicione uma verificação de existência para garantir que a célula não está vazia antes de sanitizar.",
        script_corrigido: "let nome = value ? String(value).trim() : '';\nreturn nome.toUpperCase();",
        tipo_correcao: "script"
      };
    }
    return {
      explicacao: "Erro geral de parsing de JSON de configuração.",
      sugestao_correcao: "Verifique se a sintaxe do seu JSON está correta e não contém vírgulas sobrando.",
      script_corrigido: "{\n  \"versao_motor\": \"2.0\"\n}",
      tipo_correcao: "json"
    };
  }
}

module.exports = GeminiIaAdapter;
