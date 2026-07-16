
export const extractTransactionData = (text: string) => {
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  return {
    title: extractTitle(lines),
    amount: extractAmount(text),
    date: extractDate(text),
    payment_method: extractPaymentMethod(text)
  };
};

const extractTitle = (lines: string[]): string => {
  for (const line of lines) {
    const cleanLine = line.trim();
    if (cleanLine && 
        !isDateLine(cleanLine) && 
        !isAmountLine(cleanLine) && 
        !isPaymentLine(cleanLine) &&
        !isReceiptHeader(cleanLine)) {
      const words = cleanLine.split(' ').filter(word => word.length > 2);
      if (words.length > 0) {
        return words.slice(0, 2).join(' ');
      }
    }
  }
  return 'Achat';
};

const extractAmount = (text: string): number => {
  console.log('🔍 Texte complet analysé:', text);
  
  const lines = text.split('\n');
  const lineAnalysis = analyzeLines(lines);
  
  // STRATÉGIE 1: Chercher le TOTAL principal (le plus important visuellement)
  const mainTotal = findMainTotal(lineAnalysis);
  if (mainTotal.amount > 0) {
    console.log('🎯 TOTAL principal trouvé:', mainTotal);
    return mainTotal.amount;
  }
  
  // STRATÉGIE 2: Chercher le montant final (souvent en bas)
  const finalAmount = findFinalAmount(lineAnalysis);
  if (finalAmount > 0) {
    console.log('💰 Montant final trouvé:', finalAmount);
    return finalAmount;
  }
  
  // STRATÉGIE 3: Fallback - prendre le plus grand montant non-TVA
  const fallbackAmount = findLargestNonTVAAmount(text, lineAnalysis);
  console.log('🔄 Montant de fallback:', fallbackAmount);
  return fallbackAmount;
};

// ===== ANALYSE AVANCÉE DES LIGNES =====

interface LineAnalysis {
  line: string;
  index: number;
  isTotal: boolean;
  isTVA: boolean;
  isFinal: boolean;
  hasEuroSymbol: boolean;
  hasPercentage: boolean;
  visualWeight: number; // 1=normal, 2=gras/large, 3=très visible
  amounts: number[];
}

const analyzeLines = (lines: string[]): LineAnalysis[] => {
  return lines.map((line, index) => {
    const cleanLine = line.trim();
    const amounts = findAllAmountsInLine(cleanLine);
    
    // Analyser le poids visuel (simplifié)
    const visualWeight = calculateVisualWeight(cleanLine);
    
    return {
      line: cleanLine,
      index,
      isTotal: isTotalLine(cleanLine),
      isTVA: isTVALine(cleanLine),
      isFinal: isFinalLine(cleanLine, index, lines.length),
      hasEuroSymbol: /€/.test(cleanLine),
      hasPercentage: /%/.test(cleanLine),
      visualWeight,
      amounts
    };
  });
};

const calculateVisualWeight = (line: string): number => {
  let weight = 1;
  
  // Lignes en "gras" (caractères répétés, majuscules, etc.)
  if (line === line.toUpperCase()) weight += 1; // TOUT EN MAJUSCULES
  if (line.includes('===') || line.includes('---') || line.includes('___')) weight += 1; // Séparateurs
  if (line.length > 40) weight += 1; // Ligne très longue
  if (/[=*_\-]{3,}/.test(line)) weight += 1; // Caractères répétés
  
  return weight;
};

const isTotalLine = (line: string): boolean => {
  const lowerLine = line.toLowerCase();
  
  // Mots-clés pour TOTAL (version étendue)
  const totalKeywords = [
    /\btotal\b/,
    /\bttc\b/,
    /\btotal\s+ttc\b/,
    /\bmontant\s+total\b/,
    /\bà\s+payer\b/,
    /\bpayer\b/,
    /\btotal\s+à\s+payer\b/,
    /\btotal\s+general\b/,
    /\bsomme\s+totale\b/,
    /\btotal\s+du\s+ticket\b/,
    /\bnet\s+à\s+payer\b/,
    /\bmontant\s+du\b/,
    /\bprix\s+total\b/
  ];
  
  const hasTotalKeyword = totalKeywords.some(keyword => keyword.test(lowerLine));
  const hasAmount = /(\d+[.,]\d{2})|€\s*\d+[.,]\d{2}|\d+[.,]\d{2}\s*€/.test(line);
  
  return hasTotalKeyword && hasAmount;
};

const isTVALine = (line: string): boolean => {
  const lowerLine = line.toLowerCase();
  return (
    /tva\s*%?/i.test(lowerLine) ||
    /%/.test(lowerLine) ||
    /\d+[.,]\d{2}\s*%/.test(lowerLine) ||
    /taux/.test(lowerLine) ||
    /taxe/.test(lowerLine)
  );
};

const isFinalLine = (line: string, index: number, totalLines: number): boolean => {
  // Les 3 dernières lignes sont considérées comme "finales"
  return index >= totalLines - 3;
};

// ===== STRATÉGIES DE SÉLECTION =====

const findMainTotal = (analysis: LineAnalysis[]): { amount: number; line: string } => {
  const totalLines = analysis.filter(item => item.isTotal && !item.isTVA);
  
  if (totalLines.length === 0) {
    return { amount: 0, line: '' };
  }
  
  // Priorité 1: TOTAL avec le plus grand poids visuel
  const sortedByWeight = [...totalLines].sort((a, b) => b.visualWeight - a.visualWeight);
  const strongestTotal = sortedByWeight[0];
  
  if (strongestTotal.amounts.length > 0) {
    const amount = getMainAmountFromLine(strongestTotal);
    return { amount, line: strongestTotal.line };
  }
  
  // Priorité 2: Dernier TOTAL dans le texte
  const lastTotal = totalLines[totalLines.length - 1];
  if (lastTotal.amounts.length > 0) {
    const amount = getMainAmountFromLine(lastTotal);
    return { amount, line: lastTotal.line };
  }
  
  return { amount: 0, line: '' };
};

const findFinalAmount = (analysis: LineAnalysis[]): number => {
  // Regarder les dernières lignes (hors TVA)
  const finalLines = analysis.slice(-3).filter(item => !item.isTVA);
  
  for (const line of finalLines) {
    if (line.amounts.length > 0) {
      const amount = getMainAmountFromLine(line);
      if (amount > 0) {
        return amount;
      }
    }
  }
  
  return 0;
};

const findLargestNonTVAAmount = (text: string, analysis: LineAnalysis[]): number => {
  // Collecter tous les montants qui ne sont pas dans des lignes TVA
  const nonTVAAmounts: number[] = [];
  
  for (const item of analysis) {
    if (!item.isTVA) {
      nonTVAAmounts.push(...item.amounts);
    }
  }
  
  // Ajouter aussi les montants du texte global (fallback)
  const allAmounts = findAllAmounts(text);
  nonTVAAmounts.push(...allAmounts);
  
  if (nonTVAAmounts.length === 0) return 0;
  
  // Filtrer les montants raisonnables
  const reasonableAmounts = nonTVAAmounts.filter(amount => 
    amount >= 1 && amount <= 1000
  );
  
  return reasonableAmounts.length > 0 
    ? Math.max(...reasonableAmounts) 
    : Math.max(...nonTVAAmounts);
};

// ===== FONCTIONS UTILITAIRES =====

const getMainAmountFromLine = (lineAnalysis: LineAnalysis): number => {
  if (lineAnalysis.amounts.length === 0) return 0;
  
  // Si la ligne a un symbole €, prendre le montant associé
  if (lineAnalysis.hasEuroSymbol) {
    // Essayer de trouver le montant le plus proche du symbole €
    const euroAmount = findAmountNearEuro(lineAnalysis.line);
    if (euroAmount > 0) return euroAmount;
  }
  
  // Sinon prendre le dernier montant (souvent le montant final)
  return lineAnalysis.amounts[lineAnalysis.amounts.length - 1];
};

const findAmountNearEuro = (line: string): number => {
  // Chercher des patterns comme "12.34 €" ou "€ 12.34"
  const patterns = [
    /(\d+[.,]\d{2})\s*€/,  // 12.34 €
    /€\s*(\d+[.,]\d{2})/   // € 12.34
  ];
  
  for (const pattern of patterns) {
    const match = pattern.exec(line);
    if (match) {
      return parseFloat(match[1].replace(',', '.'));
    }
  }
  
  return 0;
};

const findAllAmountsInLine = (line: string): number[] => {
  const amounts: number[] = [];
  const amountRegex = /\d+[.,]\d{2}/g;
  
  let match;
  while ((match = amountRegex.exec(line)) !== null) {
    const amount = parseFloat(match[0].replace(',', '.'));
    if (!isNaN(amount) && amount > 0) {
      amounts.push(amount);
    }
  }
  
  return amounts;
};

const findAllAmounts = (text: string): number[] => {
  const amounts: number[] = [];
  const amountRegex = /\d+[.,]\d{2}/g;
  
  let match;
  while ((match = amountRegex.exec(text)) !== null) {
    const amount = parseFloat(match[0].replace(',', '.'));
    if (!isNaN(amount) && amount > 0) {
      amounts.push(amount);
    }
  }
  
  return amounts;
};

// ===== FONCTIONS EXISTANTES (légèrement modifiées) =====

const extractDate = (text: string): string => {
  const dateMatch = text.match(/(\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4})/);
  if (dateMatch) {
    const [day, month, year] = dateMatch[0].split(/[\/\-\.]/);
    return `${year}-${month}-${day}`;
  }
  
  const isoDateMatch = text.match(/(\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2})/);
  if (isoDateMatch) {
    return isoDateMatch[0].replace(/[\/\-\.]/g, '-');
  }
  
  return new Date().toISOString().split('T')[0];
};

const extractPaymentMethod = (text: string): 'cash' | 'electronic' => {
  const lowerText = text.toLowerCase();
  return (lowerText.includes('carte') || 
          lowerText.includes('cb') || 
          lowerText.includes('visa') ||
          lowerText.includes('mastercard') ||
          (lowerText.includes('paiement') && !lowerText.includes('espèces')))
    ? 'electronic' 
    : 'cash';
};

// ===== HELPERS =====

const isDateLine = (line: string): boolean => {
  return /\d{2}[\/\-\.]\d{2}[\/\-\.]\d{4}/.test(line) ||
         /\d{4}[\/\-\.]\d{2}[\/\-\.]\d{2}/.test(line);
};

const isAmountLine = (line: string): boolean => {
  return (/\b(total|sous.total|montant|ttc|€|euro|price|prix)/i.test(line) && 
          /\d+[.,]?\d*/i.test(line));
};

const isPaymentLine = (line: string): boolean => {
  return /carte|cb|visa|mastercard|espèces|especes|cash|paiement|payment/i.test(line.toLowerCase());
};

const isReceiptHeader = (line: string): boolean => {
  return /ticket|reçu|receipt|facture|invoice|caisse|merci|thank you|bienvenue/i.test(line.toLowerCase());
};