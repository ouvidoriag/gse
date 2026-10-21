/**
 * Parser de Endereços Brasileiros (Portado do SIMAC / Ações Comunitárias)
 * Extrai logradouro, número predial e bairro estruturado de strings de busca
 */

export interface ParsedAddress {
  street: string;
  number: string | null;
  neighborhood: string | null;
  isStructured: boolean;
}

export const addressParser = {
  parse(input: string): ParsedAddress | null {
    if (!input || typeof input !== 'string') return null;

    const trimmed = input.trim();
    const fullRegex = /^(.*?),\s*(\d+)\s*,\s*(.*?)(?:\s*-\s*.*)?$/i;
    const streetNumberRegex = /^(.*?),\s*(\d+)\s*$/i;

    let match = trimmed.match(fullRegex);
    if (match) {
      return {
        street: match[1].trim(),
        number: match[2].trim(),
        neighborhood: match[3].trim(),
        isStructured: true
      };
    }

    match = trimmed.match(streetNumberRegex);
    if (match) {
      return {
        street: match[1].trim(),
        number: match[2].trim(),
        neighborhood: null,
        isStructured: true
      };
    }

    return {
      street: trimmed,
      number: null,
      neighborhood: null,
      isStructured: false
    };
  }
};
