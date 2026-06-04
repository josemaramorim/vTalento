class BaseIaAdapter {
  constructor(manualContent = '') {
    this.manualContent = manualContent;
  }
  /**
   * Traduz um prompt em linguagem natural para um grafo JSON estruturado do Motor Programável.
   * @param {string} promptUsuario - Descrição textual do que o usuário deseja mapear/fazer.
   * @param {Array<string>} colunasExcel - Lista de cabeçalhos/colunas lidos da planilha (ex: ["A", "B", "C"]).
   * @returns {Promise<Object>} - O JSON de configuração compilado do fluxo.
   */
  async gerarFluxoJSON(promptUsuario, colunasExcel) {
    throw new Error('Método gerarFluxoJSON deve ser implementado pelo adapter');
  }

  /**
   * Sugere configurações ou pequenos scripts de sanitização com base em dados de amostra.
   * @param {any} exemploDados - Exemplos de dados da coluna.
   * @param {string} objetivo - O que se deseja fazer (ex: "limpar caracteres", "converter data").
   * @returns {Promise<Object>} - Configurações sugeridas contendo script e/ou regra.
   */
  async sugerirSanitizacao(exemploDados, objetivo) {
    throw new Error('Método sugerirSanitizacao deve ser implementado pelo adapter');
  }

  /**
   * Diagnostica erros ocorridos na simulação ou processamento e sugere correções rápidas.
   * @param {string} mensagemErro - A stack ou mensagem de erro.
   * @param {Object} contexto - Dados de contexto (linha, dados lidos, scripts).
   * @returns {Promise<Object>} - Diagnóstico em português e ação recomendada de correção.
   */
  async diagnosticarErro(mensagemErro, contexto) {
    throw new Error('Método diagnosticarErro deve ser implementado pelo adapter');
  }
}

module.exports = BaseIaAdapter;
