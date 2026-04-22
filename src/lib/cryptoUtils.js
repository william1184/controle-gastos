/**
 * Utilitários de criptografia simples.
 * NOTA: Esta é uma ofuscação básica (XOR + Base64) para evitar que chaves de API
 * fiquem em texto plano visível no DevTools (IndexedDB). Não é segura contra
 * um atacante determinado que tenha acesso ao código-fonte.
 */

const SECRET = "meu-orcamento-ai-secret-key-2026";

export function encrypt(text) {
  if (!text) return text;
  let result = '';
  for (let i = 0; i < text.length; i++) {
    result += String.fromCharCode(text.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length));
  }
  // Convert to base64 to avoid encoding issues in DB
  return btoa(unescape(encodeURIComponent(result)));
}

export function decrypt(encodedText) {
  if (!encodedText) return encodedText;
  try {
    const text = decodeURIComponent(escape(atob(encodedText)));
    let result = '';
    for (let i = 0; i < text.length; i++) {
      result += String.fromCharCode(text.charCodeAt(i) ^ SECRET.charCodeAt(i % SECRET.length));
    }
    return result;
  } catch (e) {
    // Retorna o texto original caso não seja um Base64 válido (útil para dados legados não criptografados)
    return encodedText;
  }
}
