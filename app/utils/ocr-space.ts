import * as ImagePicker from 'expo-image-picker';

const OCR_API_KEY = 'K82755071888957';
const OCR_API_URL = 'https://api.ocr.space/parse/image';

export const launchRealOCR = async (): Promise<string> => {
  try {
    console.log('🔍 Démarrage OCR réel...');
    
    // Permissions
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      throw new Error('Permission caméra refusée. Veuillez autoriser l\'accès à la caméra dans les paramètres.');
    }

    // Prendre photo avec timeout
    const result = await Promise.race([
      ImagePicker.launchCameraAsync({
        allowsEditing: false,
        quality: 0.7,
        base64: true,
      }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout de la caméra')), 30000)
      )
    ]) as ImagePicker.ImagePickerResult;

    if (!result.canceled && result.assets[0]?.base64) {
      const extractedText = await callOCRSpaceAPI(result.assets[0].base64);
      console.log('✅ Texte extrait:', extractedText);
      return extractedText;
    } else {
      throw new Error('Aucune photo prise');
    }
  } catch (error) {
    console.error('❌ Erreur OCR:', error);
    throw error;
  }
};

const callOCRSpaceAPI = async (imageBase64: string): Promise<string> => {
  try {
    console.log('🌐 Appel API OCR.space...');
    
    const formData = new FormData();
    formData.append('base64Image', `data:image/jpeg;base64,${imageBase64}`);
    formData.append('apikey', OCR_API_KEY);
    formData.append('language', 'fre');
    formData.append('isOverlayRequired', 'false');
    formData.append('OCREngine', '2');

    // Ajouter un timeout pour la requête fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

    const response = await fetch(OCR_API_URL, {
      method: 'POST',
      body: formData,
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`Erreur HTTP: ${response.status}`);
    }

    const data = await response.json();
    
    if (data.IsErroredOnProcessing) {
      throw new Error(data.ErrorMessage || 'Erreur de traitement OCR');
    }

    if (!data.ParsedResults || data.ParsedResults.length === 0) {
      throw new Error('Aucun texte détecté dans l\'image');
    }

    return data.ParsedResults[0].ParsedText;
  } catch (error: any) {
    console.error('❌ Erreur API OCR:', error);
    
    if (error.name === 'AbortError') {
      throw new Error('Le service OCR met trop de temps à répondre. Vérifiez votre connexion internet.');
    }
    
    throw new Error('Impossible de contacter le service OCR. Vérifiez votre connexion internet.');
  }
};

export const processTicketOCR = async () => {
  try {
    const extractedText = await launchRealOCR();
    const transactionData = extractTransactionData(extractedText);
    return transactionData;
  } catch (error) {
    throw error;
  }
};

// ===== FONCTIONS D'EXTRACTION =====

export const extractTransactionData = (text: string) => {
  console.log('📝 Extraction des données depuis:', text);
  const lines = text.split('\n').filter(line => line.trim().length > 0);
  
  return {
    title: extractTitle(lines),
    amount: extractAmount(text),
    date: extractDate(text),
    payment_method: extractPaymentMethod(text)
  };
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
  visualWeight: number;
  amounts: number[];
}

const analyzeLines = (lines: string[]): LineAnalysis[] => {
  return lines.map((line, index) => {
    const cleanLine = line.trim();
    const amounts = findAllAmountsInLine(cleanLine);
    
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
  
  if (line === line.toUpperCase()) weight += 1;
  if (line.includes('===') || line.includes('---') || line.includes('___')) weight += 1;
  if (line.length > 40) weight += 1;
  if (/[=*_\-]{3,}/.test(line)) weight += 1;
  
  return weight;
};

const isTotalLine = (line: string): boolean => {
  const lowerLine = line.toLowerCase();
  
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
  return index >= totalLines - 3;
};

// ===== STRATÉGIES DE SÉLECTION =====

const findMainTotal = (analysis: LineAnalysis[]): { amount: number; line: string } => {
  const totalLines = analysis.filter(item => item.isTotal && !item.isTVA);
  
  if (totalLines.length === 0) {
    return { amount: 0, line: '' };
  }
  
  const sortedByWeight = [...totalLines].sort((a, b) => b.visualWeight - a.visualWeight);
  const strongestTotal = sortedByWeight[0];
  
  if (strongestTotal.amounts.length > 0) {
    const amount = getMainAmountFromLine(strongestTotal);
    return { amount, line: strongestTotal.line };
  }
  
  const lastTotal = totalLines[totalLines.length - 1];
  if (lastTotal.amounts.length > 0) {
    const amount = getMainAmountFromLine(lastTotal);
    return { amount, line: lastTotal.line };
  }
  
  return { amount: 0, line: '' };
};

const findFinalAmount = (analysis: LineAnalysis[]): number => {
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
  const nonTVAAmounts: number[] = [];
  
  for (const item of analysis) {
    if (!item.isTVA) {
      nonTVAAmounts.push(...item.amounts);
    }
  }
  
  const allAmounts = findAllAmounts(text);
  nonTVAAmounts.push(...allAmounts);
  
  if (nonTVAAmounts.length === 0) return 0;
  
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
  
  if (lineAnalysis.hasEuroSymbol) {
    const euroAmount = findAmountNearEuro(lineAnalysis.line);
    if (euroAmount > 0) return euroAmount;
  }
  
  return lineAnalysis.amounts[lineAnalysis.amounts.length - 1];
};

const findAmountNearEuro = (line: string): number => {
  const patterns = [
    /(\d+[.,]\d{2})\s*€/,
    /€\s*(\d+[.,]\d{2})/
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

// ===== FONCTIONS D'EXTRACTION PRINCIPALES =====

const extractAmount = (text: string): number => {
  console.log('🔍 Texte complet analysé:', text);
  
  const lines = text.split('\n');
  const lineAnalysis = analyzeLines(lines);
  
  const mainTotal = findMainTotal(lineAnalysis);
  if (mainTotal.amount > 0) {
    console.log('🎯 TOTAL principal trouvé:', mainTotal);
    return mainTotal.amount;
  }
  
  const finalAmount = findFinalAmount(lineAnalysis);
  if (finalAmount > 0) {
    console.log('💰 Montant final trouvé:', finalAmount);
    return finalAmount;
  }
  
  const fallbackAmount = findLargestNonTVAAmount(text, lineAnalysis);
  console.log('🔄 Montant de fallback:', fallbackAmount);
  return fallbackAmount;
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