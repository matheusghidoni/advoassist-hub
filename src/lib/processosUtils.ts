/**
 * Utilitários para extração de dados de processos a partir de URLs de tribunais (PJe, e-SAJ, eproc, etc).
 */

export interface ProcessoExtraido {
  numeroCNJ: string | null;
  tribunal: string | null;
  linkOrigem: string;
}

/**
 * Tenta extrair o número do processo (padrão CNJ) e inferir o tribunal a partir de uma URL.
 * Padrão CNJ: NNNNNNN-DD.AAAA.J.TR.OOOO (ex: 0001234-56.2023.8.26.0000)
 */
export function extrairProcessoDaUrl(url: string): ProcessoExtraido {
  const result: ProcessoExtraido = {
    numeroCNJ: null,
    tribunal: null,
    linkOrigem: url,
  };

  if (!url) return result;

  try {
    // 1. Extrair Número CNJ (permite com ou sem pontuação na string original se tentarmos limpar, mas vamos focar na pontuação padrão primeiro)
    // Busca padrão de 20 dígitos formatados ou apenas a string de números
    const decodedUrl = decodeURIComponent(url);
    
    // Regex rigoroso para CNJ com pontuação
    const regexCNJ = /\d{7}-\d{2}\.\d{4}\.\d\.\d{2}\.\d{4}/g;
    const matches = decodedUrl.match(regexCNJ);
    
    if (matches && matches.length > 0) {
      result.numeroCNJ = matches[0];
    } else {
      // Tentar encontrar 20 números seguidos e formatar
      const regexNumeros = /\d{20}/g;
      const numerosMatches = decodedUrl.replace(/[^\d]/g, '').match(/\d{20}/);
      if (numerosMatches && numerosMatches.length > 0) {
        const n = numerosMatches[0];
        result.numeroCNJ = `${n.substring(0, 7)}-${n.substring(7, 9)}.${n.substring(9, 13)}.${n.substring(13, 14)}.${n.substring(14, 16)}.${n.substring(16, 20)}`;
      }
    }

    // 2. Inferir Tribunal pelo domínio
    const urlObj = new URL(url.startsWith('http') ? url : `https://${url}`);
    const hostname = urlObj.hostname.toLowerCase();

    if (hostname.includes('tjsp.jus.br')) {
      result.tribunal = 'TJSP';
    } else if (hostname.includes('tjmg.jus.br')) {
      result.tribunal = 'TJMG';
    } else if (hostname.includes('tjrs.jus.br')) {
      result.tribunal = 'TJRS';
    } else if (hostname.includes('tjrj.jus.br')) {
      result.tribunal = 'TJRJ';
    } else if (hostname.includes('trf1.jus.br')) {
      result.tribunal = 'TRF1';
    } else if (hostname.includes('trf2.jus.br')) {
      result.tribunal = 'TRF2';
    } else if (hostname.includes('trf3.jus.br')) {
      result.tribunal = 'TRF3';
    } else if (hostname.includes('trf4.jus.br')) {
      result.tribunal = 'TRF4';
    } else if (hostname.includes('trf5.jus.br')) {
      result.tribunal = 'TRF5';
    } else if (hostname.includes('trt') || hostname.includes('csjt')) {
      result.tribunal = 'Justiça do Trabalho (TRT)';
    } else if (hostname.includes('pje.')) {
      result.tribunal = 'Sistema PJe';
    } else if (hostname.includes('projudi')) {
      result.tribunal = 'Sistema Projudi';
    }

  } catch (error) {
    console.error("Erro ao fazer parse da URL do processo:", error);
  }

  return result;
}
