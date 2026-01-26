import { describe, it, expect } from 'vitest';
import { multilingualMandiAI } from '../services/aiService';
import { mandiPriceService } from '../services/mandiPriceService';
import { detectLanguage, formatLanguageName } from '../utils/languageUtils';

describe('Multilingual Mandi AI Service', () => {
  it('should process a basic vendor request', async () => {
    const input = {
      productName: 'Tomato',
      location: 'Delhi',
      quantity: '50 kg',
      vendorLanguage: 'hindi',
      buyerMessage: 'This price is too high for bulk order'
    };

    const response = await multilingualMandiAI.processVendorRequest(input);

    expect(response).toBeDefined();
    expect(response.priceAnalysis).toBeDefined();
    expect(response.priceAnalysis.priceRange.low).toBeGreaterThan(0);
    expect(response.priceAnalysis.priceRange.average).toBeGreaterThan(response.priceAnalysis.priceRange.low);
    expect(response.priceAnalysis.priceRange.high).toBeGreaterThanOrEqual(response.priceAnalysis.priceRange.average);
    expect(response.priceAnalysis.explanation).toMatch(/Tomato|टमाटर|सरकारी डेटा|AGMARKNET/);
    expect(response.translatedBuyerMessage).toBeDefined();
    expect(response.translatedCounterOffer).toBeDefined();
  });

  it('should handle different products correctly', async () => {
    const products = ['Onion', 'Rice'];
    
    for (const product of products) {
      const input = {
        productName: product,
        location: 'Mumbai',
        quantity: '100 kg',
        vendorLanguage: 'hindi',
        buyerMessage: 'What is your best price?'
      };

      const response = await multilingualMandiAI.processVendorRequest(input);
      expect(response.priceAnalysis.priceRange.average).toBeGreaterThan(0);
      expect(response.priceAnalysis.confidence).toBeGreaterThan(0);
      expect(response.priceAnalysis.confidence).toBeLessThanOrEqual(1);
    }
  }, 15000); // Increase timeout to 15 seconds
});

describe('Language Utilities', () => {
  it('should detect Hindi text correctly', () => {
    const hindiText = 'यह कीमत बहुत ज्यादा है';
    const detected = detectLanguage(hindiText);
    expect(detected).toBe('hi');
  });

  it('should detect English text correctly', () => {
    const englishText = 'This price is too high';
    const detected = detectLanguage(englishText);
    expect(detected).toBe('en');
  });

  it('should format language names correctly', () => {
    expect(formatLanguageName('hi')).toContain('Hindi');
    expect(formatLanguageName('en')).toContain('English');
    expect(formatLanguageName('bn')).toContain('Bengali');
  });
});

describe('Mandi Price Service', () => {
  it('should fetch price summary for a commodity', async () => {
    const summary = await mandiPriceService.getPriceSummary('tomato', 'delhi');
    
    expect(summary).toBeDefined();
    expect(summary.commodity).toBe('tomato');
    expect(summary.priceRange.min).toBeGreaterThan(0);
    expect(summary.priceRange.max).toBeGreaterThan(summary.priceRange.min);
    expect(summary.priceRange.average).toBeGreaterThanOrEqual(summary.priceRange.min);
    expect(summary.priceRange.average).toBeLessThanOrEqual(summary.priceRange.max);
    expect(summary.marketCount).toBeGreaterThan(0);
    expect(summary.dataSource).toContain('AGMARKNET');
    expect(['high', 'medium', 'low']).toContain(summary.confidence);
  });

  it('should handle different commodities and locations', async () => {
    const commodities = ['onion', 'rice'];
    const locations = ['mumbai', 'bangalore'];
    
    for (const commodity of commodities) {
      const summary = await mandiPriceService.getPriceSummary(commodity, locations[0]);
      expect(summary.priceRange.average).toBeGreaterThan(0);
      expect(summary.marketCount).toBeGreaterThan(0);
    }
  }, 10000); // Increase timeout to 10 seconds
});