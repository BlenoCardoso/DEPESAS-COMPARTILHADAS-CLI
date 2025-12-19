/**
 * Converter string em reais para centavos (inteiro)
 * Aceita: "25,99", "25.99", "25", "1.234,56", "1,234.56"
 */
export function realsToCents(value: string): number {
  if (!value || value.trim() === '') return 0;
  
  // Remove espaços
  let cleaned = value.trim();
  
  // Remove símbolos de moeda
  cleaned = cleaned.replace(/[R$\s]/g, '');
  
  // Detectar formato: se tem vírgula depois do ponto, é formato BR (1.234,56)
  // Se tem ponto depois da vírgula, é formato US (1,234.56)
  const hasCommaAfterDot = cleaned.indexOf('.') < cleaned.lastIndexOf(',');
  const hasDotAfterComma = cleaned.indexOf(',') < cleaned.lastIndexOf('.');
  
  if (hasCommaAfterDot) {
    // Formato BR: 1.234,56 -> remove pontos e troca vírgula por ponto
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else if (hasDotAfterComma) {
    // Formato US: 1,234.56 -> remove vírgulas
    cleaned = cleaned.replace(/,/g, '');
  } else if (cleaned.includes(',')) {
    // Só tem vírgula: assume formato BR (25,99)
    cleaned = cleaned.replace(',', '.');
  }
  // Senão, já está em formato US (25.99) ou inteiro (25)
  
  const floatValue = parseFloat(cleaned);
  
  if (isNaN(floatValue)) return 0;
  
  // Converter para centavos e arredondar
  return Math.round(floatValue * 100);
}

/**
 * Converter centavos (inteiro) para string em reais
 * Retorna: "25,99" (formato BR com vírgula)
 */
export function centsToRealsInput(cents: number): string {
  if (!cents || isNaN(cents)) return '';
  
  const reals = cents / 100;
  return reals.toFixed(2).replace('.', ',');
}

/**
 * Formatar centavos para exibição com R$
 * Retorna: "R$ 1.234,56"
 */
export function formatCentsToDisplay(cents: number): string {
  if (!cents || isNaN(cents)) return 'R$ 0,00';
  
  const reals = cents / 100;
  return reals.toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

/**
 * Validar se o input é um valor válido em reais
 */
export function isValidRealInput(value: string): boolean {
  if (!value || value.trim() === '') return false;
  
  const cents = realsToCents(value);
  return cents > 0;
}
