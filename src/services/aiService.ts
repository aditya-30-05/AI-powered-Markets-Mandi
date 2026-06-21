/**
 * Multilingual Mandi AI Service
 *
 * After Issue #11 refactor:
 *   - processVendorRequestAsync()  → queues a job, returns job_id immediately (NEW, preferred)
 *   - processVendorRequest()       → legacy synchronous path (kept for backward compat)
 *
 * The API layer must NEVER call runPriceInference() directly.
 * All inference runs exclusively in the background worker.
 */

import { mandiPriceService, PriceSummary } from './mandiPriceService';
import { indicTTSService } from './indicTTSService';
import { predictionTaskService, PredictionJobCreated } from './predictionTaskService';

export interface ProductInput {
  productName: string;
  location: string;
  quantity: string;
  vendorLanguage: string;
  buyerMessage: string;
}

export interface PriceAnalysis {
  priceRange: {
    low: number;
    average: number;
    high: number;
  };
  explanation: string;
  counterOffer: string;
  confidence: number;
}

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLanguage: string;
  targetLanguage: string;
}

export interface VoiceOutput {
  audioUrl: string;
  duration: number;
  language: string;
  method: 'indicf5' | 'iiit-api' | 'browser-fallback';
  success: boolean;
}

export interface AIResponse {
  priceAnalysis: PriceAnalysis;
  translatedBuyerMessage: TranslationResult;
  translatedCounterOffer: TranslationResult;
  voiceOutput?: VoiceOutput;
  priceSummary?: {
    dataSource: string;
    lastUpdated: string;
    marketCount: number;
    confidence: 'high' | 'medium' | 'low';
  };
}

/**
 * Main AI Service Class
 * Orchestrates all AI functionality for the Multilingual Mandi system
 */
export class MultilingualMandiAI {
  private priceReasoningService: PriceReasoningService;
  private translationService: TranslationService;
  private voiceService: VoiceService;

  constructor() {
    this.priceReasoningService = new PriceReasoningService();
    this.translationService = new TranslationService();
    this.voiceService = new VoiceService();
  }

  // ─────────────────────────────────────────────────────────────────────────
  // ASYNC PATH (Issue #11): Queue job, return immediately
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * Queue a prediction job and return job_id immediately.
   *
   * This is the PREFERRED entry point for all new code.
   * No inference is performed in this method — it is guaranteed to
   * return within a single DB round-trip.
   *
   * The background worker (supabase/functions/prediction-worker) picks up
   * the job, runs inference, and stores the result in price_predictions.
   *
   * Use usePredictionJob() hook or predictionTaskService.subscribeToJob()
   * to receive the result via Supabase Realtime push.
   */
  async processVendorRequestAsync(input: ProductInput): Promise<PredictionJobCreated> {
    // 1. Handle translation in parallel (lightweight, no inference)
    //    We still do this in-band because it is fast and stateless.
    //    If translation also becomes heavy, it too can be queued.
    const translationPromise = this.translationService.translate(
      input.buyerMessage,
      'en',
      input.vendorLanguage,
    );

    // 2. Queue the price prediction job — returns immediately with job_id
    const jobCreated = await predictionTaskService.createJob({
      productName:    input.productName,
      location:       input.location,
      quantity:       input.quantity,
      vendorLanguage: input.vendorLanguage,
      buyerMessage:   input.buyerMessage,
    });

    // Allow translation to complete in background (non-blocking for caller)
    translationPromise.catch((err) => {
      console.warn('[MultilingualMandiAI] Background translation error:', err);
    });

    return jobCreated;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // LEGACY SYNC PATH: kept for backward compatibility
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * @deprecated Use processVendorRequestAsync() for production code.
   *             This method runs inference in the calling thread, which
   *             causes latency and blocks the UI event loop.
   *
   * Kept so existing pages (AIDemo, GuidedVoiceDemo) continue to work
   * without modification during the migration period.
   */
  async processVendorRequest(input: ProductInput): Promise<AIResponse> {
    try {
      // Step 1: Generate AI price analysis and counter-offer
      const { priceAnalysis, priceSummary } = await this.priceReasoningService.analyzePricingWithSummary(
        input.productName,
        input.location,
        input.quantity
      );

      // Step 2: Translate buyer's message to vendor's language
      const translatedBuyerMessage = await this.translationService.translate(
        input.buyerMessage,
        'en', // Assuming buyer message is in English
        input.vendorLanguage
      );

      // Step 3: Translate AI counter-offer to vendor's language
      const translatedCounterOffer = await this.translationService.translate(
        priceAnalysis.counterOffer,
        'en',
        input.vendorLanguage
      );

      // Step 4: Generate voice output for the counter-offer
      const voiceOutput = await this.generateVoiceOutput(
        translatedCounterOffer.translatedText,
        input.vendorLanguage
      );

      return {
        priceAnalysis,
        translatedBuyerMessage,
        translatedCounterOffer,
        voiceOutput,
        priceSummary
      };
    } catch (error) {
      console.error('AI processing error:', error);
      throw new Error('Failed to process vendor request');
    }
  }

  private async generateVoiceOutput(text: string, language: string): Promise<VoiceOutput | undefined> {
    if (import.meta.env.VITE_SKIP_VOICE_OUTPUT === 'true') {
      return undefined;
    }

    try {
      return await this.withTimeout(
        this.voiceService.generateSpeech(text, language),
        1200
      );
    } catch (error) {
      console.warn('Voice output skipped for speed:', error);
      return undefined;
    }
  }

  private async withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`timeout after ${ms}ms`));
      }, ms);

      promise
        .then((value) => {
          clearTimeout(timer);
          resolve(value);
        })
        .catch((error) => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }
}

/**
 * Price Reasoning Service
 * Generates fair mandi prices and negotiation advice using rule-based AI
 */
class PriceReasoningService {
  private readonly INDIAN_PRODUCTS_DB = {
    // Common vegetables (prices per kg in INR)
    'tomato': { base: 25, seasonal: 0.2, volatility: 0.3 },
    'onion': { base: 30, seasonal: 0.15, volatility: 0.25 },
    'potato': { base: 20, seasonal: 0.1, volatility: 0.2 },
    'cabbage': { base: 15, seasonal: 0.25, volatility: 0.2 },
    'cauliflower': { base: 35, seasonal: 0.3, volatility: 0.25 },
    'carrot': { base: 40, seasonal: 0.2, volatility: 0.2 },
    'beans': { base: 60, seasonal: 0.2, volatility: 0.3 },
    'peas': { base: 80, seasonal: 0.4, volatility: 0.3 },
    'spinach': { base: 25, seasonal: 0.3, volatility: 0.25 },
    'okra': { base: 45, seasonal: 0.25, volatility: 0.3 },
    
    // Fruits (prices per kg in INR)
    'apple': { base: 120, seasonal: 0.15, volatility: 0.2 },
    'banana': { base: 40, seasonal: 0.1, volatility: 0.15 },
    'orange': { base: 60, seasonal: 0.2, volatility: 0.2 },
    'mango': { base: 80, seasonal: 0.5, volatility: 0.4 },
    'grapes': { base: 100, seasonal: 0.3, volatility: 0.25 },
    
    // Grains (prices per kg in INR)
    'rice': { base: 45, seasonal: 0.1, volatility: 0.15 },
    'wheat': { base: 25, seasonal: 0.1, volatility: 0.15 },
    'dal': { base: 80, seasonal: 0.2, volatility: 0.25 },
  };

  private readonly LOCATION_MULTIPLIERS = {
    // Major cities - higher prices
    'delhi': 1.2,
    'mumbai': 1.3,
    'bangalore': 1.15,
    'chennai': 1.1,
    'kolkata': 1.05,
    'hyderabad': 1.1,
    'pune': 1.15,
    
    // Tier 2 cities
    'jaipur': 1.0,
    'lucknow': 0.95,
    'kanpur': 0.9,
    'nagpur': 0.95,
    'indore': 0.95,
    
    // Rural/smaller towns
    'default': 0.85
  };

  async analyzePricing(productName: string, location: string, quantity: string): Promise<PriceAnalysis> {
    const result = await this.analyzePricingWithSummary(productName, location, quantity);
    return result.priceAnalysis;
  }

  /**
   * Analyze pricing and return both analysis and summary data
   */
  async analyzePricingWithSummary(productName: string, location: string, quantity: string): Promise<{
    priceAnalysis: PriceAnalysis;
    priceSummary?: {
      dataSource: string;
      lastUpdated: string;
      marketCount: number;
      confidence: 'high' | 'medium' | 'low';
    };
  }> {
    try {
      // Step 1: Fetch real mandi price data
      const priceSummary = await mandiPriceService.getPriceSummary(productName, location);
      
      // Step 2: Apply AI reasoning on top of real data
      const priceAnalysis = this.enhancePriceAnalysis(priceSummary, quantity);
      
      return {
        priceAnalysis,
        priceSummary: {
          dataSource: priceSummary.dataSource,
          lastUpdated: priceSummary.lastUpdated,
          marketCount: priceSummary.marketCount,
          confidence: priceSummary.confidence
        }
      };
    } catch (error) {
      console.warn('Failed to fetch real mandi data, falling back to rule-based pricing:', error);
      
      // Fallback to original rule-based approach
      const priceAnalysis = this.fallbackPriceAnalysis(productName, location, quantity);
      return { priceAnalysis };
    }
  }

  /**
   * Enhance real mandi data with AI reasoning
   */
  private enhancePriceAnalysis(priceSummary: PriceSummary, quantity: string): PriceAnalysis {
    const { priceRange } = priceSummary;
    
    // Apply quantity-based adjustments
    const quantityFactor = this.getQuantityFactor(quantity);
    const seasonalFactor = this.getSeasonalFactor();
    
    // Adjust prices based on AI reasoning
    const adjustedPrices = {
      low: Math.round(priceRange.min * quantityFactor),
      average: Math.round(priceRange.average * quantityFactor * (1 + seasonalFactor)),
      high: Math.round(priceRange.max * quantityFactor)
    };

    // Generate AI explanation
    const explanation = this.generateRealDataExplanation(priceSummary, quantityFactor, seasonalFactor);
    
    // Generate counter-offer
    const counterOffer = this.generateSmartCounterOffer(priceSummary, adjustedPrices, quantity);
    
    // Calculate confidence based on data quality
    const confidence = this.calculateDataConfidence(priceSummary);

    return {
      priceRange: adjustedPrices,
      explanation,
      counterOffer,
      confidence
    };
  }

  /**
   * Fallback to rule-based pricing when real data is unavailable
   */
  /**
   * Fallback to rule-based pricing when real data is unavailable
   */
  private fallbackPriceAnalysis(productName: string, location: string, quantity: string): PriceAnalysis {
    const normalizedProduct = productName.toLowerCase().trim();
    const normalizedLocation = location.toLowerCase().trim();
    
    // Get base product data
    const productData = this.INDIAN_PRODUCTS_DB[normalizedProduct] || 
                       this.INDIAN_PRODUCTS_DB['tomato']; // Default fallback
    
    // Calculate location multiplier
    const locationMultiplier = this.getLocationMultiplier(normalizedLocation);
    
    // Calculate seasonal and market variations
    const seasonalFactor = this.getSeasonalFactor();
    const marketVolatility = this.getMarketVolatility(productData.volatility);
    
    // Base price calculation
    const basePrice = productData.base * locationMultiplier;
    const adjustedPrice = basePrice * (1 + seasonalFactor) * (1 + marketVolatility);
    
    // Generate price range
    const priceRange = {
      low: Math.round(adjustedPrice * 0.85),
      average: Math.round(adjustedPrice),
      high: Math.round(adjustedPrice * 1.15)
    };
    
    // Generate explanation and counter-offer
    const explanation = this.generatePriceExplanation(productName, location, priceRange);
    const counterOffer = this.generateCounterOffer(productName, priceRange, quantity);
    
    return {
      priceRange,
      explanation,
      counterOffer,
      confidence: this.calculateConfidence(normalizedProduct)
    };
  }

  /**
   * Get quantity-based pricing factor
   */
  private getQuantityFactor(quantity: string): number {
    const numericQuantity = this.extractNumericQuantity(quantity);
    
    if (numericQuantity >= 100) {
      return 0.95; // 5% bulk discount for 100+ units
    } else if (numericQuantity >= 50) {
      return 0.97; // 3% discount for 50+ units
    } else if (numericQuantity >= 20) {
      return 0.99; // 1% discount for 20+ units
    }
    
    return 1.0; // No discount for small quantities
  }

  /**
   * Extract numeric quantity from string
   */
  private extractNumericQuantity(quantity: string): number {
    const match = quantity.match(/(\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  /**
   * Generate explanation based on real mandi data
   */
  private generateRealDataExplanation(priceSummary: PriceSummary, quantityFactor: number, seasonalFactor: number): string {
    const { commodity, region, marketCount, lastUpdated, confidence } = priceSummary;
    
    const confidenceText = confidence === 'high' ? 'विश्वसनीय' : confidence === 'medium' ? 'अच्छा' : 'सामान्य';
    const discountText = quantityFactor < 1 ? ' थोक छूट के साथ' : '';
    const seasonalText = seasonalFactor > 0.1 ? ' मौसमी मांग के कारण' : seasonalFactor < -0.1 ? ' अच्छी सप्लाई के कारण' : '';
    
    const explanations = [
      `${region} में ${commodity} का ${confidenceText} डेटा ${marketCount} मंडियों से मिला है। आज का भाव ₹${priceSummary.priceRange.average} प्रति किलो${discountText}${seasonalText}।`,
      `सरकारी डेटा के अनुसार ${commodity} की कीमत ${region} में ₹${priceSummary.priceRange.min} से ₹${priceSummary.priceRange.max} तक है। ${marketCount} मंडियों का औसत भाव ₹${priceSummary.priceRange.average} है।`,
      `AGMARKNET के अनुसार ${commodity} का ताजा भाव ${region} में ₹${priceSummary.priceRange.average} प्रति किलो है। यह ${marketCount} मंडियों के डेटा पर आधारित है।`
    ];
    
    return explanations[Math.floor(Math.random() * explanations.length)];
  }

  /**
   * Generate smart counter-offer based on real data
   */
  private generateSmartCounterOffer(priceSummary: PriceSummary, adjustedPrices: any, quantity: string): string {
    const targetPrice = Math.round((adjustedPrices.average + adjustedPrices.high) / 2);
    const { commodity, confidence } = priceSummary;
    
    const qualityAssurance = confidence === 'high' ? 'सबसे अच्छी क्वालिटी का' : 'अच्छी क्वालिटी का';
    const dataSupport = 'सरकारी डेटा के अनुसार';
    
    const offers = [
      `साहब, ${dataSupport} यह ${commodity} ${qualityAssurance} है। ₹${targetPrice} प्रति किलो से कम नहीं हो सकता।`,
      `भाई, मंडी भाव ₹${priceSummary.priceRange.average} चल रहा है। मैं ₹${targetPrice} में दे रहा हूं, यह बहुत उचित रेट है।`,
      `देखिए साहब, ${quantity} का ऑर्डर है तो ₹${targetPrice} में दे सकता हूं। यह ${qualityAssurance} माल है।`,
      `${dataSupport} आज का भाव ₹${priceSummary.priceRange.average} है। मैं ₹${targetPrice} प्रति किलो अंतिम रेट दे रहा हूं।`
    ];
    
    return offers[Math.floor(Math.random() * offers.length)];
  }

  /**
   * Calculate confidence based on data quality
   */
  private calculateDataConfidence(priceSummary: PriceSummary): number {
    let confidence = 0.7; // Base confidence
    
    // Adjust based on market count
    if (priceSummary.marketCount >= 15) {
      confidence += 0.2;
    } else if (priceSummary.marketCount >= 8) {
      confidence += 0.1;
    }
    
    // Adjust based on data confidence
    if (priceSummary.confidence === 'high') {
      confidence += 0.1;
    } else if (priceSummary.confidence === 'low') {
      confidence -= 0.1;
    }
    
    return Math.min(0.95, Math.max(0.5, confidence));
  }

  private getLocationMultiplier(location: string): number {
    // Check for major cities first
    for (const [city, multiplier] of Object.entries(this.LOCATION_MULTIPLIERS)) {
      if (location.includes(city)) {
        return multiplier;
      }
    }
    return this.LOCATION_MULTIPLIERS.default;
  }

  private getSeasonalFactor(): number {
    // Simple seasonal variation based on current month
    const month = new Date().getMonth();
    const seasonalFactors = [
      0.1,   // Jan - Winter vegetables cheaper
      0.05,  // Feb
      -0.05, // Mar - Spring transition
      -0.1,  // Apr
      0.15,  // May - Summer heat affects supply
      0.2,   // Jun - Monsoon preparation
      0.1,   // Jul - Monsoon
      0.05,  // Aug
      -0.05, // Sep - Post monsoon
      -0.1,  // Oct - Good harvest
      0.0,   // Nov - Stable
      0.05   // Dec - Winter demand
    ];
    return seasonalFactors[month];
  }

  private getMarketVolatility(baseVolatility: number): number {
    // Random market fluctuation within volatility range
    return (Math.random() - 0.5) * 2 * baseVolatility;
  }

  private generatePriceExplanation(product: string, location: string, priceRange: any): string {
    const explanations = [
      `आज ${product} की मांग अच्छी है। ${location} में औसत भाव ₹${priceRange.average} प्रति किलो चल रहा है।`,
      `मंडी में ${product} का अच्छा माल आया है। आज का भाव ₹${priceRange.low} से ₹${priceRange.high} तक है।`,
      `${product} की सप्लाई कम है आज। इसलिए भाव ₹${priceRange.average} के आसपास मिल रहा है।`,
      `आज ${location} मंडी में ${product} का भाव स्थिर है। ₹${priceRange.average} अच्छा रेट है।`
    ];
    
    return explanations[Math.floor(Math.random() * explanations.length)];
  }

  private generateCounterOffer(product: string, priceRange: any, quantity: string): string {
    const targetPrice = Math.round((priceRange.average + priceRange.high) / 2);
    
    const offers = [
      `साहब, यह ${product} बहुत अच्छी क्वालिटी का है। ₹${targetPrice} प्रति किलो से कम नहीं हो सकता।`,
      `भाई, आज मंडी में यही रेट चल रहा है। ₹${targetPrice} में दे रहा हूं, यह बहुत अच्छा रेट है।`,
      `देखिए साहब, ${quantity} का ऑर्डर है तो ₹${targetPrice} में दे सकता हूं। इससे कम नहीं होगा।`,
      `यह ताजा माल है, आज सुबह ही आया है। ₹${targetPrice} प्रति किलो अंतिम रेट है।`
    ];
    
    return offers[Math.floor(Math.random() * offers.length)];
  }

  private calculateConfidence(product: string): number {
    // Higher confidence for common products
    return this.INDIAN_PRODUCTS_DB[product] ? 0.85 : 0.65;
  }
}

/**
 * Translation Service
 * Handles multilingual translation for Indian languages using open-source approaches
 */
class TranslationService {
  private readonly LANGUAGE_CODES = {
    'hindi': 'hi',
    'english': 'en',
    'bengali': 'bn',
    'tamil': 'ta',
    'telugu': 'te',
    'marathi': 'mr',
    'gujarati': 'gu',
    'kannada': 'kn',
    'malayalam': 'ml',
    'punjabi': 'pa',
    'urdu': 'ur'
  };

  // Basic translation dictionary for common mandi terms
  private readonly TRANSLATION_DICT = {
    'hi': {
      'price': 'कीमत',
      'quality': 'गुणवत्ता',
      'fresh': 'ताजा',
      'good': 'अच्छा',
      'best': 'सबसे अच्छा',
      'market': 'मंडी',
      'today': 'आज',
      'tomorrow': 'कल',
      'rupees': 'रुपये',
      'per kg': 'प्रति किलो',
      'wholesale': 'थोक',
      'retail': 'खुदरा',
      'discount': 'छूट',
      'final price': 'अंतिम कीमत',
      'deal': 'सौदा',
      'buyer': 'खरीदार',
      'seller': 'विक्रेता',
      'quantity': 'मात्रा',
      'delivery': 'डिलीवरी'
    }
  };

  async translate(text: string, sourceLanguage: string, targetLanguage: string): Promise<TranslationResult> {
    try {
      // For demo purposes, we'll use a combination of:
      // 1. Dictionary-based translation for common terms
      // 2. Transliteration for proper nouns
      // 3. Fallback to browser's built-in translation if available
      
      const sourceLang = this.normalizeLanguageCode(sourceLanguage);
      const targetLang = this.normalizeLanguageCode(targetLanguage);
      
      if (sourceLang === targetLang) {
        return {
          originalText: text,
          translatedText: text,
          sourceLanguage: sourceLang,
          targetLanguage: targetLang
        };
      }

      let translatedText = text;

      // Try dictionary-based translation first
      if (targetLang === 'hi' && this.TRANSLATION_DICT.hi) {
        translatedText = this.dictionaryTranslate(text, this.TRANSLATION_DICT.hi);
      }

      // If no significant translation happened, use rule-based approach
      if (translatedText === text) {
        translatedText = await this.ruleBasedTranslate(text, sourceLang, targetLang);
      }

      return {
        originalText: text,
        translatedText,
        sourceLanguage: sourceLang,
        targetLanguage: targetLang
      };
    } catch (error) {
      console.error('Translation error:', error);
      // Fallback: return original text
      return {
        originalText: text,
        translatedText: text,
        sourceLanguage: sourceLanguage,
        targetLanguage: targetLanguage
      };
    }
  }

  private normalizeLanguageCode(language: string): string {
    const normalized = language.toLowerCase().trim();
    return this.LANGUAGE_CODES[normalized] || normalized;
  }

  private dictionaryTranslate(text: string, dictionary: Record<string, string>): string {
    let translated = text;
    
    // Replace common terms
    for (const [english, hindi] of Object.entries(dictionary)) {
      const regex = new RegExp(`\\b${english}\\b`, 'gi');
      translated = translated.replace(regex, hindi);
    }
    
    return translated;
  }

  private async ruleBasedTranslate(text: string, sourceLang: string, targetLang: string): Promise<string> {
    // Simple rule-based translation for common patterns
    if (sourceLang === 'en' && targetLang === 'hi') {
      return this.englishToHindiRules(text);
    } else if (sourceLang === 'hi' && targetLang === 'en') {
      return this.hindiToEnglishRules(text);
    }
    
    // For other language pairs, return transliterated version
    return this.transliterate(text, targetLang);
  }

  private englishToHindiRules(text: string): string {
    // Basic English to Hindi translation rules
    const patterns = [
      { pattern: /this price is (.*)/i, replacement: 'यह कीमत $1 है' },
      { pattern: /can you do (.*)/i, replacement: 'क्या आप $1 कर सकते हैं' },
      { pattern: /what about (.*)/i, replacement: '$1 के बारे में क्या' },
      { pattern: /i want (.*)/i, replacement: 'मुझे $1 चाहिए' },
      { pattern: /how much for (.*)/i, replacement: '$1 के लिए कितना' },
      { pattern: /too expensive/i, replacement: 'बहुत महंगा' },
      { pattern: /good quality/i, replacement: 'अच्छी गुणवत्ता' },
      { pattern: /fresh produce/i, replacement: 'ताजा माल' },
      { pattern: /bulk order/i, replacement: 'थोक ऑर्डर' },
      { pattern: /final price/i, replacement: 'अंतिम कीमत' }
    ];

    let translated = text;
    for (const { pattern, replacement } of patterns) {
      translated = translated.replace(pattern, replacement);
    }

    return translated;
  }

  private hindiToEnglishRules(text: string): string {
    // Basic Hindi to English translation rules
    const patterns = [
      { pattern: /यह कीमत (.*) है/g, replacement: 'This price is $1' },
      { pattern: /क्या आप (.*) कर सकते हैं/g, replacement: 'Can you do $1' },
      { pattern: /मुझे (.*) चाहिए/g, replacement: 'I want $1' },
      { pattern: /बहुत महंगा/g, replacement: 'too expensive' },
      { pattern: /अच्छी गुणवत्ता/g, replacement: 'good quality' },
      { pattern: /ताजा माल/g, replacement: 'fresh produce' },
      { pattern: /थोक ऑर्डर/g, replacement: 'bulk order' },
      { pattern: /अंतिम कीमत/g, replacement: 'final price' }
    ];

    let translated = text;
    for (const { pattern, replacement } of patterns) {
      translated = translated.replace(pattern, replacement);
    }

    return translated;
  }

  private transliterate(text: string, targetLang: string): string {
    // Simple transliteration for unsupported language pairs
    // In a real implementation, this would use a proper transliteration library
    return `[${targetLang.toUpperCase()}] ${text}`;
  }
}

/**
 * Voice Service
 * Generates speech output using AI4Bharat Indic TTS - the best open-source solution for Indian languages
 */
class VoiceService {
  /**
   * Generate speech using AI4Bharat Indic TTS
   */
  async generateSpeech(text: string, language: string): Promise<VoiceOutput> {
    try {
      const ttsResponse = await indicTTSService.generateSpeech({
        text,
        language,
        speaker: 'female', // Default to female voice
        speed: 0.9 // Slightly slower for clarity
      });

      return {
        audioUrl: ttsResponse.audioUrl,
        duration: ttsResponse.duration,
        language: ttsResponse.language,
        method: ttsResponse.method,
        success: ttsResponse.success
      };
    } catch (error) {
      console.error('Indic TTS generation failed:', error);
      
      // Fallback to basic mock audio
      return {
        audioUrl: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT',
        duration: this.estimateDuration(text),
        language: this.normalizeLanguageCode(language),
        method: 'browser-fallback',
        success: false
      };
    }
  }

  private normalizeLanguageCode(language: string): string {
    const langMap: Record<string, string> = {
      'hindi': 'hi',
      'english': 'en',
      'bengali': 'bn',
      'tamil': 'ta',
      'telugu': 'te',
      'marathi': 'mr',
      'gujarati': 'gu',
      'kannada': 'kn',
      'malayalam': 'ml',
      'punjabi': 'pa'
    };
    
    return langMap[language.toLowerCase()] || language.toLowerCase();
  }

  private async createAudioBlob(text: string, voiceConfig: any): Promise<string> {
    // For demo purposes, create a data URL
    // In production, this would use actual TTS engines like:
    // - eSpeak-ng for open-source TTS
    // - Festival Speech Synthesis System
    // - MaryTTS for multilingual support
    
    return new Promise((resolve) => {
      // Simulate audio generation delay
      setTimeout(() => {
        // Create a mock audio data URL with valid base64
        const mockAudioData = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT';
        resolve(mockAudioData);
      }, 500);
    });
  }

  private estimateDuration(text: string): number {
    // Estimate duration based on text length (roughly 150 words per minute)
    const words = text.split(' ').length;
    return Math.ceil((words / 150) * 60); // Duration in seconds
  }

  /**
   * Play audio using AI4Bharat Indic TTS (real-time synthesis)
   */
  async playAudio(text: string, language: string): Promise<void> {
    try {
      const ttsResponse = await indicTTSService.generateSpeech({
        text,
        language,
        speaker: 'female',
        speed: 0.9
      });

      if (ttsResponse.success && ttsResponse.audioUrl) {
        // Play the generated audio
        const audio = new Audio(ttsResponse.audioUrl);
        await new Promise<void>((resolve, reject) => {
          audio.onended = () => resolve();
          audio.onerror = () => reject(new Error('Audio playback failed'));
          audio.play().catch(reject);
        });
      } else {
        throw new Error('TTS generation failed');
      }
    } catch (error) {
      console.warn('Indic TTS playback failed, falling back to browser TTS:', error);
      
      // Fallback to browser TTS
      return this.playWithBrowserTTS(text, language);
    }
  }

  /**
   * Fallback to browser TTS for immediate playback
   */
  private async playWithBrowserTTS(text: string, language: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
        // Mock success in test environment
        setTimeout(resolve, 100);
        return;
      }

      const langCode = this.normalizeLanguageCode(language);
      const browserLangCode = this.getBrowserLanguageCode(langCode);

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = browserLangCode;
      utterance.rate = 0.9;
      utterance.pitch = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (error) => reject(error);

      // Cancel any ongoing speech
      speechSynthesis.cancel();
      
      // Start speaking
      speechSynthesis.speak(utterance);
    });
  }

  /**
   * Get browser-compatible language code
   */
  private getBrowserLanguageCode(langCode: string): string {
    const browserCodes: Record<string, string> = {
      'hi': 'hi-IN',
      'bn': 'bn-IN',
      'ta': 'ta-IN',
      'te': 'te-IN',
      'mr': 'mr-IN',
      'gu': 'gu-IN',
      'kn': 'kn-IN',
      'ml': 'ml-IN',
      'pa': 'pa-IN',
      'or': 'or-IN',
      'as': 'as-IN',
      'en': 'en-IN'
    };
    
    return browserCodes[langCode] || 'hi-IN';
  }
}

// Export the main service
export const multilingualMandiAI = new MultilingualMandiAI();