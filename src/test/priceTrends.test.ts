import { describe, it, expect } from 'vitest';
import { mandiPriceService } from '../services/mandiPriceService';

describe('Price Trends Feature', () => {
    describe('getPriceTrends', () => {
        it('should return 7 days of trend data by default', async () => {
            const trends = await mandiPriceService.getPriceTrends('wheat', 'delhi', 7);

            expect(trends).toHaveLength(7);
            expect(trends[0]).toHaveProperty('date');
            expect(trends[0]).toHaveProperty('modalPrice');
            expect(trends[0]).toHaveProperty('minPrice');
            expect(trends[0]).toHaveProperty('maxPrice');
            expect(trends[0]).toHaveProperty('volume');
            expect(trends[0]).toHaveProperty('confidence');
        });

        it('should return 30 days of trend data when requested', async () => {
            const trends = await mandiPriceService.getPriceTrends('tomato', 'mumbai', 30);

            expect(trends).toHaveLength(30);
        });

        it('should have prices within reasonable range', async () => {
            const trends = await mandiPriceService.getPriceTrends('wheat', 'delhi', 7);

            trends.forEach(trend => {
                expect(trend.modalPrice).toBeGreaterThan(0);
                expect(trend.minPrice).toBeLessThanOrEqual(trend.modalPrice);
                expect(trend.maxPrice).toBeGreaterThanOrEqual(trend.modalPrice);
                expect(trend.volume).toBeGreaterThan(0);
                expect(trend.confidence).toBeGreaterThan(0);
                expect(trend.confidence).toBeLessThanOrEqual(1);
            });
        });

        it('should have dates in descending order (oldest to newest)', async () => {
            const trends = await mandiPriceService.getPriceTrends('wheat', 'delhi', 7);

            for (let i = 1; i < trends.length; i++) {
                const prevDate = new Date(trends[i - 1].date);
                const currDate = new Date(trends[i].date);
                expect(currDate.getTime()).toBeGreaterThan(prevDate.getTime());
            }
        });
    });

    describe('analyzeTrend', () => {
        it('should identify rising trend correctly', () => {
            const mockTrends = [
                { date: '2024-01-01', modalPrice: 2000, minPrice: 1900, maxPrice: 2100, volume: 100, confidence: 0.9 },
                { date: '2024-01-02', modalPrice: 2050, minPrice: 1950, maxPrice: 2150, volume: 110, confidence: 0.9 },
                { date: '2024-01-03', modalPrice: 2100, minPrice: 2000, maxPrice: 2200, volume: 120, confidence: 0.9 },
                { date: '2024-01-04', modalPrice: 2150, minPrice: 2050, maxPrice: 2250, volume: 130, confidence: 0.9 },
                { date: '2024-01-05', modalPrice: 2200, minPrice: 2100, maxPrice: 2300, volume: 140, confidence: 0.9 },
            ];

            const analysis = mandiPriceService.analyzeTrend(mockTrends);

            expect(analysis.direction).toBe('rising');
            expect(analysis.percentageChange).toBeGreaterThan(3);
            expect(analysis.recommendation).toContain('increased');
        });

        it('should identify falling trend correctly', () => {
            const mockTrends = [
                { date: '2024-01-01', modalPrice: 2200, minPrice: 2100, maxPrice: 2300, volume: 140, confidence: 0.9 },
                { date: '2024-01-02', modalPrice: 2150, minPrice: 2050, maxPrice: 2250, volume: 130, confidence: 0.9 },
                { date: '2024-01-03', modalPrice: 2100, minPrice: 2000, maxPrice: 2200, volume: 120, confidence: 0.9 },
                { date: '2024-01-04', modalPrice: 2050, minPrice: 1950, maxPrice: 2150, volume: 110, confidence: 0.9 },
                { date: '2024-01-05', modalPrice: 2000, minPrice: 1900, maxPrice: 2100, volume: 100, confidence: 0.9 },
            ];

            const analysis = mandiPriceService.analyzeTrend(mockTrends);

            expect(analysis.direction).toBe('falling');
            expect(analysis.percentageChange).toBeLessThan(-3);
            expect(analysis.recommendation).toContain('decreased');
        });

        it('should identify stable trend correctly', () => {
            const mockTrends = [
                { date: '2024-01-01', modalPrice: 2100, minPrice: 2000, maxPrice: 2200, volume: 120, confidence: 0.9 },
                { date: '2024-01-02', modalPrice: 2105, minPrice: 2005, maxPrice: 2205, volume: 122, confidence: 0.9 },
                { date: '2024-01-03', modalPrice: 2095, minPrice: 1995, maxPrice: 2195, volume: 118, confidence: 0.9 },
                { date: '2024-01-04', modalPrice: 2110, minPrice: 2010, maxPrice: 2210, volume: 125, confidence: 0.9 },
                { date: '2024-01-05', modalPrice: 2100, minPrice: 2000, maxPrice: 2200, volume: 120, confidence: 0.9 },
            ];

            const analysis = mandiPriceService.analyzeTrend(mockTrends);

            expect(analysis.direction).toBe('stable');
            expect(Math.abs(analysis.percentageChange)).toBeLessThan(3);
            expect(analysis.recommendation).toContain('stable');
        });

        it('should calculate volatility correctly', () => {
            const highVolatilityTrends = [
                { date: '2024-01-01', modalPrice: 2000, minPrice: 1900, maxPrice: 2100, volume: 100, confidence: 0.9 },
                { date: '2024-01-02', modalPrice: 2300, minPrice: 2200, maxPrice: 2400, volume: 110, confidence: 0.9 },
                { date: '2024-01-03', modalPrice: 1900, minPrice: 1800, maxPrice: 2000, volume: 120, confidence: 0.9 },
                { date: '2024-01-04', modalPrice: 2400, minPrice: 2300, maxPrice: 2500, volume: 130, confidence: 0.9 },
                { date: '2024-01-05', modalPrice: 1800, minPrice: 1700, maxPrice: 1900, volume: 140, confidence: 0.9 },
            ];

            const analysis = mandiPriceService.analyzeTrend(highVolatilityTrends);

            expect(analysis.volatility).toBe('high');
            // High volatility should result in a recommendation
            expect(analysis.recommendation.length).toBeGreaterThan(0);
        });

        it('should include price range in analysis', () => {
            const mockTrends = [
                { date: '2024-01-01', modalPrice: 2000, minPrice: 1900, maxPrice: 2100, volume: 100, confidence: 0.9 },
                { date: '2024-01-02', modalPrice: 2050, minPrice: 1950, maxPrice: 2150, volume: 110, confidence: 0.9 },
                { date: '2024-01-03', modalPrice: 2100, minPrice: 2000, maxPrice: 2200, volume: 120, confidence: 0.9 },
            ];

            const analysis = mandiPriceService.analyzeTrend(mockTrends);

            expect(analysis.priceRange).toBeDefined();
            expect(analysis.priceRange?.min).toBe(1900);
            expect(analysis.priceRange?.max).toBe(2200);
        });

        it('should calculate average confidence from trend data', () => {
            const mockTrends = [
                { date: '2024-01-01', modalPrice: 2000, minPrice: 1900, maxPrice: 2100, volume: 100, confidence: 0.8 },
                { date: '2024-01-02', modalPrice: 2050, minPrice: 1950, maxPrice: 2150, volume: 110, confidence: 0.9 },
                { date: '2024-01-03', modalPrice: 2100, minPrice: 2000, maxPrice: 2200, volume: 120, confidence: 0.85 },
            ];

            const analysis = mandiPriceService.analyzeTrend(mockTrends);

            expect(analysis.confidence).toBeCloseTo(0.85, 2);
        });

        it('should handle insufficient data gracefully', () => {
            const mockTrends = [
                { date: '2024-01-01', modalPrice: 2000, minPrice: 1900, maxPrice: 2100, volume: 100, confidence: 0.9 },
            ];

            const analysis = mandiPriceService.analyzeTrend(mockTrends);

            expect(analysis.direction).toBe('stable');
            expect(analysis.percentageChange).toBe(0);
            expect(analysis.recommendation).toContain('Insufficient data');
        });
    });

    describe('Integration: Full trend analysis workflow', () => {
        it('should fetch trends and analyze them successfully', async () => {
            const trends = await mandiPriceService.getPriceTrends('wheat', 'delhi', 7);
            const analysis = mandiPriceService.analyzeTrend(trends);

            expect(trends.length).toBe(7);
            expect(analysis).toBeDefined();
            expect(analysis.direction).toMatch(/rising|falling|stable/);
            expect(analysis.volatility).toMatch(/low|medium|high/);
            expect(analysis.recommendation).toBeTruthy();
            expect(analysis.confidence).toBeGreaterThan(0);
            expect(analysis.confidence).toBeLessThanOrEqual(1);
        });
    });
});
