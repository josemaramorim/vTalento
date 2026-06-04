const BaseIaAdapter = require('./BaseIaAdapter');

class OpenAiIaAdapter extends BaseIaAdapter {
  constructor(apiKey) {
    super();
    this.apiKey = apiKey || process.env.OPENAI_API_KEY;
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: `Gere o JSON para o prompt: "${promptUsuario}"` }
          ],
          response_format: { type: "json_object" },
          temperature: 0.1
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API do OpenAI: HTTP ${response.status}`);
      }

      const resBody = await response.json();
      const text = resBody.choices?.[0]?.message?.content;
      if (!text) {
        throw new Error('Retorno vazio da API do OpenAI');
      }

      return JSON.parse(text);
    } catch (error) {
      console.error('[OpenAiIaAdapter] Erro ao gerar fluxo:', error);
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API do OpenAI: HTTP ${response.status}`);
      }

      const resBody = await response.json();
      const text = resBody.choices?.[0]?.message?.content;
      return JSON.parse(text);
    } catch (error) {
      console.error('[OpenAiIaAdapter] Erro ao sugerir sanitização:', error);
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
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4o',
          messages: [
            { role: 'system', content: systemPrompt }
          ],
          response_format: { type: "json_object" },
          temperature: 0.2
        })
      });

      if (!response.ok) {
        throw new Error(`Erro na API do OpenAI: HTTP ${response.status}`);
      }

      const resBody = await response.json();
      const text = resBody.choices?.[0]?.message?.content;
      return JSON.parse(text);
    } catch (error) {
      console.error('[OpenAiIaAdapter] Erro ao diagnosticar erro:', error);
      throw error;
    }
  }

  // --- MOCK FALLBACK METHOD SIMULATIONS FOR OFFLINE/TESTS ---

  _mockGerarFluxoJSON(promptUsuario, colunasExcel) {
    // Reutiliza a lógica simulada comum
    const GeminiIaAdapter = require('./GeminiIaAdapter');
    const geminiMock = new GeminiIaAdapter('mock');
    return geminiMock._mockGerarFluxoJSON(promptUsuario, colunasExcel);
  }

  _mockSugerirSanitizacao(exemploDados, objetivo) {
    const GeminiIaAdapter = require('./GeminiIaAdapter');
    const geminiMock = new GeminiIaAdapter('mock');
    return geminiMock._mockSugerirSanitizacao(exemploDados, objetivo);
  }

  _mockDiagnosticarErro(mensagemErro, contexto) {
    const GeminiIaAdapter = require('./GeminiIaAdapter');
    const geminiMock = new GeminiIaAdapter('mock');
    return geminiMock._mockDiagnosticarErro(mensagemErro, contexto);
  }
}

module.exports = OpenAiIaAdapter;
