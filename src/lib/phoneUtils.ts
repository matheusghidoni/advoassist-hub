/**
 * Utilitários de formatação de número de telefone para WhatsApp.
 *
 * Converte qualquer formato de telefone brasileiro para o formato
 * exigido pelo wa.me e pela Evolution API: somente dígitos com DDI 55.
 *
 * Exemplos:
 *   "(11) 99999-9999"  → "5511999999999"
 *   "11999999999"      → "5511999999999"
 *   "5511999999999"    → "5511999999999"
 */
export function formatWhatsAppNumber(telefone: string): string {
  const digits = telefone.replace(/\D/g, "");
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  return `55${digits}`;
}
