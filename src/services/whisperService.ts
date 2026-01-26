/**
 * Whisper Large V3 Speech Recognition Service
 * 
 * Uses Hugging Face's Whisper Large V3 model for accurate speech-to-text
 * Supports multiple languages and long-form audio transcription
 */

export interface WhisperTranscriptionRequest {
  audioBlob: Blob;
  language?: string;
  task?: 'transcribe' | 'translate';
}

export interface WhisperTranscriptionResponse {
  success: boolean;
  text: string;
  error?: string;
  confidence?: number;
  language?: string;
}

export class WhisperService {
  private apiBase = import.meta.env.VITE_WHISPER_API_URL || '/api/whisper';
  private modelName = import.meta.env.VITE_WHISPER_MODEL || 'openai/whisper-large-v3';
  private apiKey: string | null = null;

  constructor() {
    // Try to get API key from environment
    this.apiKey = import.meta.env.VITE_HUGGINGFACE_API_KEY || null;
  }

  /**
   * Set Hugging Face API key
   */
  public setApiKey(apiKey: string) {
    this.apiKey = apiKey;
  }

  /**
   * Check if service is configured
   */
  public isConfigured(): boolean {
    return this.apiKey !== null;
  }

  /**
   * Transcribe audio using Whisper Large V3
   */
  public async transcribe(request: WhisperTranscriptionRequest): Promise<WhisperTranscriptionResponse> {
    if (!this.apiKey) {
      return {
        success: false,
        text: '',
        error: 'Hugging Face API key not configured'
      };
    }

    try {
      const audioBuffer = await request.audioBlob.arrayBuffer();
      const contentType = request.audioBlob.type || 'audio/webm';
      const modelFallbacks = [
        this.modelName,
        'openai/whisper-large-v3',
        'openai/whisper-large-v2',
        'openai/whisper-small'
      ];

      for (const model of modelFallbacks) {
        const url = this.buildApiUrl(model);
        const response = await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': contentType,
          },
          body: audioBuffer
        });

        if (response.ok) {
          const result = await response.json();
          let transcribedText = '';
          if (typeof result === 'string') {
            transcribedText = result;
          } else if (result.text) {
            transcribedText = result.text;
          } else if (Array.isArray(result) && result.length > 0) {
            transcribedText = result[0].text || result[0];
          } else {
            return {
              success: false,
              text: '',
              error: 'Unexpected response format from Whisper API'
            };
          }

          return {
            success: true,
            text: transcribedText.trim(),
            confidence: result.confidence || 0.9,
            language: result.language || request.language
          };
        }

        const errorText = await response.text();
        console.error('Whisper API error:', response.status, errorText);

        if (response.status === 404 || response.status === 410) {
          continue;
        }

        if (response.status === 503) {
          return {
            success: false,
            text: '',
            error: 'Model is loading, please try again in a few moments'
          };
        }

        return {
          success: false,
          text: '',
          error: `API error: ${response.status} ${errorText}`
        };
      }

      return {
        success: false,
        text: '',
        error: 'Whisper models unavailable. Try setting VITE_WHISPER_MODEL.'
      };
    } catch (error) {
      console.error('Whisper transcription error:', error);
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private buildApiUrl(model: string): string {
    if (this.apiBase.includes('{model}')) {
      return this.apiBase.replace('{model}', model);
    }
    return `${this.apiBase}/${model}`;
  }

  /**
   * Record audio from microphone and transcribe
   */
  public async recordAndTranscribe(
    durationMs: number = 5000,
    language?: string
  ): Promise<WhisperTranscriptionResponse> {
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        return {
          success: false,
          text: '',
          error: 'Microphone access is not available in this browser.'
        };
      }
      if (typeof MediaRecorder === 'undefined') {
        return {
          success: false,
          text: '',
          error: 'Audio recording is not supported in this browser. Please use Chrome/Brave.'
        };
      }
      const safeDurationMs = Math.max(3000, durationMs);
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ 
        audio: {
          sampleRate: 16000, // Whisper prefers 16kHz
          channelCount: 1,   // Mono audio
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        } 
      });

      // Create MediaRecorder with a supported mime type
      const preferredTypes = [
        'audio/webm;codecs=opus',
        'audio/webm',
        'audio/ogg;codecs=opus',
        'audio/ogg'
      ];
      const supportedType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type));
      const mediaRecorder = supportedType
        ? new MediaRecorder(stream, { mimeType: supportedType })
        : new MediaRecorder(stream);

      const audioChunks: Blob[] = [];

      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = async () => {
          // Stop all tracks to release microphone
          stream.getTracks().forEach(track => track.stop());

          try {
            // Create audio blob
            const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
            
            // Convert to WAV if needed (Whisper prefers WAV)
            const wavBlob = await this.convertToWav(audioBlob);
            
            // Transcribe
            const result = await this.transcribe({
              audioBlob: wavBlob,
              language,
              task: 'transcribe'
            });

            resolve(result);
          } catch (error) {
            reject(error);
          }
        };

        mediaRecorder.onerror = (event) => {
          stream.getTracks().forEach(track => track.stop());
          reject(new Error(`MediaRecorder error: ${event}`));
        };

        // Start recording (timeslice helps some browsers flush data)
        mediaRecorder.start(250);

        // Some browsers stop immediately if mic is blocked
        const startCheck = setTimeout(() => {
          if (mediaRecorder.state === 'inactive') {
            try {
              stream.getTracks().forEach(track => track.stop());
            } catch {
              // ignore cleanup errors
            }
            reject(new Error('Recording stopped immediately. Check microphone permission or Brave Shields.'));
          }
        }, 200);

        // Stop after specified duration
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          clearTimeout(startCheck);
        }, safeDurationMs);
      });

    } catch (error) {
      console.error('Recording error:', error);
      return {
        success: false,
        text: '',
        error: error instanceof Error ? error.message : 'Failed to access microphone'
      };
    }
  }

  /**
   * Convert audio blob to WAV format
   * This is a simplified conversion - in production, you might want to use a library like lamejs
   */
  private async convertToWav(audioBlob: Blob): Promise<Blob> {
    try {
      // For now, return the original blob
      // In a full implementation, you'd convert WebM/MP3 to WAV here
      return audioBlob;
    } catch (error) {
      console.warn('Audio conversion failed, using original format:', error);
      return audioBlob;
    }
  }

  /**
   * Get supported languages for Whisper
   */
  public getSupportedLanguages(): string[] {
    return [
      'en', 'hi', 'bn', 'ta', 'te', 'mr', 'gu', 'kn', 'ml', 'pa', 'ur', 'or',
      'as', 'ne', 'si', 'my', 'km', 'lo', 'th', 'vi', 'id', 'ms', 'tl', 'zh',
      'ja', 'ko', 'ar', 'fa', 'tr', 'ru', 'de', 'fr', 'es', 'pt', 'it', 'nl',
      'pl', 'sv', 'da', 'no', 'fi', 'et', 'lv', 'lt', 'sl', 'sk', 'cs', 'hu',
      'ro', 'bg', 'hr', 'sr', 'bs', 'mk', 'sq', 'eu', 'ca', 'gl', 'cy', 'ga',
      'mt', 'is', 'fo', 'he', 'yi', 'sw', 'am', 'yo', 'zu', 'sn', 'so', 'af'
    ];
  }

  /**
   * Map our language codes to Whisper language codes
   */
  public mapLanguageCode(ourLangCode: string): string {
    const languageMap: Record<string, string> = {
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
      'urdu': 'ur',
      'odia': 'or',
      'assamese': 'as'
    };

    return languageMap[ourLangCode] || 'en';
  }
}

// Export singleton instance
export const whisperService = new WhisperService();