import { useState } from "react";
import { Sparkles, Volume2, Languages, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { AIResponse } from "@/services/aiService";
import { useVoicePlayback } from "@/hooks/useMandiAI";
import { formatLanguageName } from "@/utils/languageUtils";
import { DataSourceInfo } from "@/components/DataSourceInfo";
import { toast } from "@/hooks/use-toast";

interface AIInsightsCardProps {
  aiResponse: AIResponse;
  vendorLanguage: string;
  priceSummary?: {
    dataSource: string;
    lastUpdated: string;
    marketCount: number;
    confidence: 'high' | 'medium' | 'low';
  };
  className?: string;
}

export function AIInsightsCard({ aiResponse, vendorLanguage, priceSummary, className }: AIInsightsCardProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const { isPlaying, playAudio, stopAudio } = useVoicePlayback();

  const handleCopyText = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      toast({
        title: "Copied to clipboard",
        description: `${label} copied successfully`,
      });
      setTimeout(() => setCopiedText(null), 2000);
    } catch (error) {
      toast({
        title: "Copy failed",
        description: "Unable to copy text to clipboard",
        variant: "destructive"
      });
    }
  };

  const handlePlayAudio = async (text: string) => {
    try {
      if (isPlaying) {
        stopAudio();
      } else {
        await playAudio(text, vendorLanguage);
      }
    } catch (error) {
      toast({
        title: "Audio playback failed",
        description: "Unable to play audio. Please check your browser settings.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className={cn("space-y-4", className)}>
      {/* AI Price Analysis */}
      <div className="glass-card p-5">
        <div className="flex items-start gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Sparkles size={20} className="text-primary" />
          </div>
          <div className="flex-1">
            <h3 className="font-bold text-primary text-lg mb-1">AI Market Analysis</h3>
            <p className="text-sm text-muted-foreground">
              Confidence: {Math.round(aiResponse.priceAnalysis.confidence * 100)}%
            </p>
          </div>
        </div>
        
        <div className="space-y-3">
          <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
            <p className="text-foreground leading-relaxed">
              {aiResponse.priceAnalysis.explanation}
            </p>
          </div>
          
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-3 rounded-lg bg-destructive/10">
              <p className="text-xs font-medium text-muted-foreground mb-1">LOW</p>
              <p className="text-lg font-bold text-destructive">
                ₹{aiResponse.priceAnalysis.priceRange.low}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-primary/10">
              <p className="text-xs font-medium text-muted-foreground mb-1">AVERAGE</p>
              <p className="text-lg font-bold text-primary">
                ₹{aiResponse.priceAnalysis.priceRange.average}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-success/10">
              <p className="text-xs font-medium text-muted-foreground mb-1">HIGH</p>
              <p className="text-lg font-bold text-success">
                ₹{aiResponse.priceAnalysis.priceRange.high}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Translation Results */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Languages size={18} className="text-primary" />
          <h3 className="font-bold text-foreground">Translation Results</h3>
        </div>

        <div className="space-y-4">
          {/* Buyer Message Translation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                Buyer's Message ({formatLanguageName(aiResponse.translatedBuyerMessage.sourceLanguage)})
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => handleCopyText(aiResponse.translatedBuyerMessage.translatedText, "Buyer message")}
                  className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  {copiedText === "Buyer message" ? (
                    <Check size={14} className="text-success" />
                  ) : (
                    <Copy size={14} className="text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-amber-50 border-l-4 border-amber-400 dark:bg-amber-950/30">
              <p className="text-sm text-amber-800 dark:text-amber-200">
                {aiResponse.translatedBuyerMessage.originalText}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 mt-2">
              <p className="text-foreground">
                {aiResponse.translatedBuyerMessage.translatedText}
              </p>
            </div>
          </div>

          {/* AI Counter-offer Translation */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-muted-foreground">
                AI Counter-offer ({formatLanguageName(aiResponse.translatedCounterOffer.targetLanguage)})
              </p>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePlayAudio(aiResponse.translatedCounterOffer.translatedText)}
                  className={cn(
                    "w-8 h-8 rounded-lg flex items-center justify-center transition-colors",
                    isPlaying 
                      ? "bg-primary text-primary-foreground" 
                      : "bg-muted hover:bg-muted/80 text-muted-foreground"
                  )}
                >
                  <Volume2 size={14} />
                </button>
                <button
                  onClick={() => handleCopyText(aiResponse.translatedCounterOffer.translatedText, "Counter-offer")}
                  className="w-8 h-8 rounded-lg bg-muted hover:bg-muted/80 flex items-center justify-center transition-colors"
                >
                  {copiedText === "Counter-offer" ? (
                    <Check size={14} className="text-success" />
                  ) : (
                    <Copy size={14} className="text-muted-foreground" />
                  )}
                </button>
              </div>
            </div>
            <div className="p-3 rounded-lg bg-success/10 border-l-4 border-success">
              <p className="text-foreground font-medium">
                {aiResponse.translatedCounterOffer.translatedText}
              </p>
            </div>
            <div className="p-3 rounded-lg bg-muted/50 mt-2">
              <p className="text-sm text-muted-foreground italic">
                English: {aiResponse.translatedCounterOffer.originalText}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Voice Output Info */}
      {aiResponse.voiceOutput && (
        <div className="glass-card p-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
              <Volume2 size={16} className="text-primary" />
            </div>
            <div className="flex-1">
              <p className="text-sm font-medium text-foreground">
                AI4Bharat Indic TTS Ready
              </p>
              <p className="text-xs text-muted-foreground">
                Duration: {aiResponse.voiceOutput.duration}s • Language: {formatLanguageName(aiResponse.voiceOutput.language)} • Method: {aiResponse.voiceOutput.method}
              </p>
            </div>
            <button
              onClick={() => handlePlayAudio(aiResponse.translatedCounterOffer.translatedText)}
              className={cn(
                "px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                isPlaying
                  ? "bg-primary text-primary-foreground"
                  : "bg-primary/10 text-primary hover:bg-primary/15"
              )}
            >
              {isPlaying ? "Playing..." : "Play Audio"}
            </button>
          </div>
          
          {/* TTS Method Badge */}
          <div className="mt-3 flex items-center gap-2">
            <div className={cn(
              "px-2 py-1 rounded-full text-xs font-medium",
              aiResponse.voiceOutput.method === 'indicf5' && "bg-success/10 text-success",
              aiResponse.voiceOutput.method === 'iiit-api' && "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-300",
              aiResponse.voiceOutput.method === 'browser-fallback' && "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
            )}>
              {aiResponse.voiceOutput.method === 'indicf5' && '🥇 IndicF5 (Best Quality)'}
              {aiResponse.voiceOutput.method === 'iiit-api' && '🔊 IIIT Indic TTS'}
              {aiResponse.voiceOutput.method === 'browser-fallback' && '🔄 Browser Fallback'}
            </div>
            {aiResponse.voiceOutput.success && (
              <div className="text-xs text-success">✓ Generated</div>
            )}
          </div>
        </div>
      )}

      {/* Data Source Information */}
      {priceSummary && (
        <DataSourceInfo
          dataSource={priceSummary.dataSource}
          lastUpdated={priceSummary.lastUpdated}
          marketCount={priceSummary.marketCount}
          confidence={priceSummary.confidence}
        />
      )}
    </div>
  );
}