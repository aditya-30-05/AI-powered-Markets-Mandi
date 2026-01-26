import { useState } from "react";
import { Volume2, Play, Pause, Award, Zap, Globe, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { indicTTSService } from "@/services/indicTTSService";
import { getAllLanguages, formatLanguageName } from "@/utils/languageUtils";
import { toast } from "@/hooks/use-toast";

const DEMO_TEXTS = {
  'hi': 'नमस्ते! आज मंडी में टमाटर का भाव अच्छा चल रहा है। ₹35 प्रति किलो मिल रहा है।',
  'bn': 'নমস্কার! আজ বাজারে টমেটোর দাম ভালো চলছে। কিলো প্রতি ৩৫ টাকা পাওয়া যাচ্ছে।',
  'ta': 'வணக்கம்! இன்று சந்தையில் தக்காளி விலை நன்றாக இருக்கிறது। கிலோ ₹35 கிடைக்கிறது।',
  'te': 'నమస్కారం! ఈరోజు మార్కెట్‌లో టమాటో ధర బాగుంది। కిలో ₹35 దొరుకుతోంది।',
  'mr': 'नमस्कार! आज बाजारात टोमॅटोचा भाव चांगला चालला आहे। किलो ₹35 मिळत आहे।',
  'gu': 'નમસ્તે! આજે બજારમાં ટમેટાનો ભાવ સારો ચાલી રહ્યો છે। કિલો ₹35 મળી રહ્યો છે।',
  'kn': 'ನಮಸ್ಕಾರ! ಇಂದು ಮಾರುಕಟ್ಟೆಯಲ್ಲಿ ಟೊಮೇಟೊ ಬೆಲೆ ಚೆನ್ನಾಗಿದೆ। ಕಿಲೋ ₹35 ಸಿಗುತ್ತಿದೆ।',
  'ml': 'നമസ്കാരം! ഇന്ന് മാർക്കറ്റിൽ തക്കാളിയുടെ വില നല്ലതാണ്. കിലോ ₹35 കിട്ടുന്നു।',
  'pa': 'ਸਤ ਸ੍ਰੀ ਅਕਾਲ! ਅੱਜ ਮਾਰਕੀਟ ਵਿੱਚ ਟਮਾਟਰ ਦਾ ਭਾਅ ਚੰਗਾ ਚੱਲ ਰਿਹਾ ਹੈ। ਕਿਲੋ ₹35 ਮਿਲ ਰਿਹਾ ਹੈ।',
  'or': 'ନମସ୍କାର! ଆଜି ବଜାରରେ ଟମାଟୋର ଦାମ ଭଲ ଚାଲିଛି। କିଲୋ ₹35 ମିଳୁଛି।',
  'as': 'নমস্কাৰ! আজি বজাৰত টমেটোৰ দাম ভাল চলিছে। কিলো ₹35 পোৱা গৈছে।'
};

export function IndicTTSShowcase() {
  const [selectedLanguage, setSelectedLanguage] = useState('hi');
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentAudio, setCurrentAudio] = useState<string | null>(null);
  const [generatedAudios, setGeneratedAudios] = useState<Record<string, string>>({});
  const [isGenerating, setIsGenerating] = useState(false);

  const supportedLanguages = getAllLanguages().filter(lang => 
    indicTTSService.isLanguageSupported(lang.code)
  );

  const handleGenerateAudio = async (langCode: string) => {
    if (generatedAudios[langCode]) {
      // Audio already generated, just play it
      handlePlayAudio(langCode);
      return;
    }

    setIsGenerating(true);
    try {
      const text = DEMO_TEXTS[langCode as keyof typeof DEMO_TEXTS] || DEMO_TEXTS['hi'];
      const response = await indicTTSService.generateSpeech({
        text,
        language: langCode,
        speaker: 'female',
        speed: 0.9
      });

      if (response.success) {
        setGeneratedAudios(prev => ({ ...prev, [langCode]: response.audioUrl }));
        toast({
          title: "🎉 Audio Generated!",
          description: `High-quality ${formatLanguageName(langCode)} speech using ${response.method}`,
        });
        
        // Auto-play the generated audio
        handlePlayAudio(langCode, response.audioUrl);
      } else {
        throw new Error('Generation failed');
      }
    } catch (error) {
      toast({
        title: "Generation Failed",
        description: "Unable to generate audio. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handlePlayAudio = async (langCode: string, audioUrl?: string) => {
    const url = audioUrl || generatedAudios[langCode];
    if (!url) return;

    if (isPlaying && currentAudio === langCode) {
      // Stop current playback
      setIsPlaying(false);
      setCurrentAudio(null);
      return;
    }

    try {
      setIsPlaying(true);
      setCurrentAudio(langCode);

      const audio = new Audio(url);
      await new Promise<void>((resolve, reject) => {
        audio.onended = () => {
          setIsPlaying(false);
          setCurrentAudio(null);
          resolve();
        };
        audio.onerror = () => {
          setIsPlaying(false);
          setCurrentAudio(null);
          reject(new Error('Playback failed'));
        };
        audio.play().catch(reject);
      });
    } catch (error) {
      setIsPlaying(false);
      setCurrentAudio(null);
      toast({
        title: "Playback Failed",
        description: "Unable to play audio",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Award size={24} className="text-amber-500" />
          <h2 className="text-2xl font-bold text-foreground">AI4Bharat Indic TTS</h2>
          <div className="px-2 py-1 rounded-full bg-success/10 text-success text-xs font-bold">
            BEST CHOICE
          </div>
        </div>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Experience the highest quality text-to-speech for Indian languages, powered by 
          cutting-edge research from IIT Madras and designed specifically for Indian phonetics.
        </p>
      </div>

      {/* Features */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-success/10 flex items-center justify-center mx-auto mb-3">
            <Award size={20} className="text-success" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Research-Backed</h3>
          <p className="text-sm text-muted-foreground">
            Built by AI4Bharat (IIT Madras) with state-of-the-art neural TTS models
          </p>
        </div>

        <div className="glass-card p-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Globe size={20} className="text-primary" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">11+ Indian Languages</h3>
          <p className="text-sm text-muted-foreground">
            Native support for Hindi, Bengali, Tamil, Telugu, and 7 more languages
          </p>
        </div>

        <div className="glass-card p-4 text-center">
          <div className="w-12 h-12 rounded-xl bg-amber-100 dark:bg-amber-950/30 flex items-center justify-center mx-auto mb-3">
            <Zap size={20} className="text-amber-600" />
          </div>
          <h3 className="font-semibold text-foreground mb-2">Indian Phonetics</h3>
          <p className="text-sm text-muted-foreground">
            Optimized pronunciation and intonation for authentic Indian speech
          </p>
        </div>
      </div>

      {/* Language Selector */}
      <div className="glass-card p-5">
        <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
          <Volume2 size={18} />
          Try Different Languages
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {supportedLanguages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => setSelectedLanguage(lang.code)}
              className={cn(
                "p-3 rounded-xl text-left transition-all",
                "border border-border hover:border-primary/50",
                selectedLanguage === lang.code 
                  ? "border-primary bg-primary/10 text-primary" 
                  : "hover:bg-muted/50"
              )}
            >
              <div className="font-medium text-sm">{lang.name}</div>
              <div className="text-xs text-muted-foreground">{lang.nativeName}</div>
            </button>
          ))}
        </div>

        {/* Selected Language Demo */}
        <div className="border border-border rounded-xl p-4 bg-muted/20">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-semibold text-foreground">
              {formatLanguageName(selectedLanguage)} Demo
            </h4>
            <div className="flex items-center gap-2">
              {generatedAudios[selectedLanguage] && (
                <div className="flex items-center gap-1 text-xs text-success">
                  <CheckCircle2 size={12} />
                  <span>Generated</span>
                </div>
              )}
            </div>
          </div>

          <div className="mb-4 p-3 rounded-lg bg-background/50 border border-border/50">
            <p className="text-foreground leading-relaxed">
              {DEMO_TEXTS[selectedLanguage as keyof typeof DEMO_TEXTS] || DEMO_TEXTS['hi']}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => handleGenerateAudio(selectedLanguage)}
              disabled={isGenerating}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                "bg-primary text-primary-foreground hover:bg-primary/90",
                "disabled:opacity-50 disabled:cursor-not-allowed"
              )}
            >
              <Volume2 size={16} />
              {isGenerating ? "Generating..." : "Generate Audio"}
            </button>

            {generatedAudios[selectedLanguage] && (
              <button
                onClick={() => handlePlayAudio(selectedLanguage)}
                disabled={isGenerating}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-colors",
                  isPlaying && currentAudio === selectedLanguage
                    ? "bg-destructive text-destructive-foreground"
                    : "bg-success text-success-foreground hover:bg-success/90"
                )}
              >
                {isPlaying && currentAudio === selectedLanguage ? (
                  <>
                    <Pause size={16} />
                    Stop
                  </>
                ) : (
                  <>
                    <Play size={16} />
                    Play
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Technical Details */}
      <div className="glass-card p-5">
        <h3 className="font-bold text-foreground mb-4">Technical Excellence</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-semibold text-foreground mb-2">Model Architecture</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• FastPitch + HiFi-GAN V1</li>
              <li>• 24kHz high-quality audio output</li>
              <li>• Multi-speaker training</li>
              <li>• Neural vocoder for natural speech</li>
            </ul>
          </div>
          <div>
            <h4 className="font-semibold text-foreground mb-2">Training Data</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• 1417+ hours of high-quality speech</li>
              <li>• Rasa, IndicTTS, LIMMITS datasets</li>
              <li>• Male and female speakers</li>
              <li>• Diverse regional accents</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Open Source Badge */}
      <div className="text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-success/10 text-success border border-success/20">
          <CheckCircle2 size={16} />
          <span className="font-medium">100% Open Source & Free</span>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          MIT License • Available on GitHub • No API keys required
        </p>
      </div>
    </div>
  );
}