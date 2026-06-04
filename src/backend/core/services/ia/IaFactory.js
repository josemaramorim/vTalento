const db = require('../../../infra/db');
const GeminiIaAdapter = require('./GeminiIaAdapter');
const OpenAiIaAdapter = require('./OpenAiIaAdapter');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

let cacheManual = null;

// Configuração de Criptografia Simples para as chaves de API
const ALGORITHM = 'aes-256-cbc';
const SECRET_KEY = process.env.IA_CRYPT_KEY || 'VTalentosSecureIaKey2026String32'; // Deve ter 32 bytes
const IV_LENGTH = 16;

function encrypt(text) {
  if (!text) return '';
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
  let encrypted = cipher.update(text);
  encrypted = Buffer.concat([encrypted, cipher.final()]);
  return iv.toString('hex') + ':' + encrypted.toString('hex');
}

function decrypt(text) {
  if (!text || !text.includes(':')) return '';
  try {
    const parts = text.split(':');
    const iv = Buffer.from(parts.shift(), 'hex');
    const encryptedText = Buffer.from(parts.join(':'), 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(SECRET_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString();
  } catch (error) {
    console.error('[IaFactory] Erro ao decriptar chave de API:', error.message);
    return '';
  }
}

class IaFactory {
  /**
   * Instancia o adapter de IA configurado para a empresa/tenant.
   * @param {string} empresa_id - ID da empresa
   * @returns {Promise<BaseIaAdapter>}
   */
  async obterAdapter(empresa_id) {
    let provedor = null;
    let chave = null;

    if (empresa_id) {
      try {
        const empresa = await db('GamEmpresa').where({ id: empresa_id }).first();
        if (empresa) {
          provedor = empresa.provedor_ia;
          chave = decrypt(empresa.chave_ia_encriptada);
        }
      } catch (error) {
        console.error('[IaFactory] Erro ao buscar configuração da empresa no DB:', error.message);
      }
    }

    // Se a empresa não tem configuração própria, verifica variáveis de ambiente
    if (!provedor || !chave) {
      const defaultProvider = process.env.IA_PROVIDER || 'GEMINI';
      if (defaultProvider === 'GEMINI' && process.env.GEMINI_API_KEY) {
        provedor = 'GEMINI';
        chave = process.env.GEMINI_API_KEY;
      } else if (defaultProvider === 'OPENAI' && process.env.OPENAI_API_KEY) {
        provedor = 'OPENAI';
        chave = process.env.OPENAI_API_KEY;
      } else if (process.env.GEMINI_API_KEY) {
        provedor = 'GEMINI';
        chave = process.env.GEMINI_API_KEY;
      } else if (process.env.OPENAI_API_KEY) {
        provedor = 'OPENAI';
        chave = process.env.OPENAI_API_KEY;
      }
    }

    // Instancia o provedor correto
    const manual = this.obterManual();
    if (provedor === 'GEMINI' && chave) {
      return new GeminiIaAdapter(chave, manual);
    } else if (provedor === 'OPENAI' && chave) {
      return new OpenAiIaAdapter(chave, manual);
    }

    // Fallback Mock se nada estiver configurado (útil para desenvolvimento local/testes)
    console.log('[IaFactory] Nenhum provedor de IA ativo ou chave encontrada. Usando adapter de Fallback Local.');
    return new GeminiIaAdapter('mock', manual);
  }

  /**
   * Obtém o conteúdo do manual em cache de memória
   * @returns {string}
   */
  obterManual() {
    if (cacheManual !== null) {
      return cacheManual;
    }
    try {
      const p = path.resolve(__dirname, '../../../../../docs/manual-motor-importacao.md');
      if (fs.existsSync(p)) {
        cacheManual = fs.readFileSync(p, 'utf-8');
      } else {
        console.warn('[IaFactory] Arquivo de manual não encontrado em:', p);
        cacheManual = '';
      }
    } catch (err) {
      console.error('[IaFactory] Erro ao carregar manual:', err.message);
      cacheManual = '';
    }
    return cacheManual;
  }

  /**
   * Helper para encriptar chaves de API antes de salvar no DB
   */
  encriptarChave(chave) {
    return encrypt(chave);
  }
}

module.exports = new IaFactory();
