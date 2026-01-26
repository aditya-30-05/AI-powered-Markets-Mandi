# Technical Architecture - Complete Implementation Details

## Project Built From Scratch

This entire technical architecture was designed and implemented in this development environment. Every service, component, and integration was built from the ground up with careful consideration for scalability, maintainability, and user experience.

## Core Services Architecture (Custom Implementations)

### 1. guidedVoiceService.ts - Voice Form State Machine (500+ lines)
**Purpose**: Central coordinator for voice-assisted form filling
**Implementation**: Custom state machine with predictable transitions

```typescript
// Complete state machine implementation
export class GuidedVoiceService {
  private state: VoiceState = {
    isActive: false,
    isListening: false,
    isSpeaking: false,
    isRecording: false,
    currentState: 0,
    language: 'hindi',
    formData: { /* structured form data */ },
    lastTranscript: '',
    error: null,
    isRetrying: false,
    useWhisper: whisperService.isConfigured()
  };

  // Fixed sequence state machine - no skipping allowed
  private readonly STATES = [
    'ASK_NAME', 'ASK_PRODUCT', 'ASK_QUANTITY', 
    'ASK_QUALITY', 'ASK_LOCATION', 'CONFIRM'
  ];
}
```

**Key Implementation Features**:
- **Dual Speech Recognition**: Whisper Large V3 + Browser Web Speech API
- **Language-Specific Questions**: Native script questions for 11+ languages
- **Input Normalization**: Smart processing of spoken numbers and product names
- **Error Recovery**: Multiple retry mechanisms with user-friendly messages
- **State Persistence**: Maintains form data across state transitions

### 2. aiService.ts - AI Orchestrator (400+ lines)
**Purpose**: Central coordinator for all AI operations and price analysis
**Implementation**: Custom AI engine with market intelligence

```typescript
export class MultilingualMandiAI {
  private priceReasoningService: PriceReasoningService;
  private translationService: TranslationService;
  private voiceService: VoiceService;

  async processMandiQuery(query: MandiQuery): Promise<AIResponse> {
    // 1. Fetch real government data from AGMARKNET
    const marketData = await this.fetchMarketPrices(query);
    
    // 2. Apply AI reasoning for price calculation
    const priceAnalysis = this.calculateFairPrice(marketData, query);
    
    // 3. Generate insights and recommendations
    const insights = this.generateMarketInsights(priceAnalysis);
    
    // 4. Translate response to user's language
    const translatedResponse = await this.translateResponse(insights, query.language);
    
    return { priceAnalysis, insights, translatedResponse };
  }
}
```

**Custom Price Reasoning Logic**:
- **Quality Premiums**: 8-15% for premium grade, 5-8% for good quality
- **Bulk Discounts**: 2-3% for 50+ quintals, 5% for 100+ quintals
- **Seasonal Adjustments**: Historical pattern analysis for price predictions
- **Location Factors**: Transportation costs and regional demand variations

### 3. mandiPriceService.ts - Government Data Integration (300+ lines)
**Purpose**: Real-time agricultural market price data from AGMARKNET
**Implementation**: Direct API integration with Ministry of Agriculture

```typescript
export class MandiPriceService {
  private readonly AGMARKNET_API = 'https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070';
  
  async fetchPrices(params: PriceQuery): Promise<MarketPriceData[]> {
    // Real government API integration
    const response = await fetch(`${this.AGMARKNET_API}?api-key=${this.apiKey}&filters[commodity]=${params.commodity}`);
    const data = await response.json();
    
    return this.transformAndValidateData(data.records);
  }
  
  private calculateConfidence(record: any): number {
    // Custom confidence scoring based on data freshness and completeness
    const dataAge = Date.now() - new Date(record.arrival_date).getTime();
    const completeness = this.assessDataCompleteness(record);
    return Math.max(0.1, Math.min(1.0, completeness * (1 - dataAge / (7 * 24 * 60 * 60 * 1000))));
  }
}
```

**Data Sources & Processing**:
- **Primary**: AGMARKNET API with 900+ markets across India
- **Fallback**: Rule-based pricing with seasonal adjustments
- **Validation**: Data quality assessment with confidence scoring
- **Caching**: Intelligent TTL based on market volatility

### 4. whisperService.ts - Advanced Speech Recognition (250+ lines)
**Purpose**: High-accuracy multilingual speech recognition using Whisper Large V3
**Implementation**: Hugging Face API integration with local audio processing

```typescript
export class WhisperService {
  private readonly WHISPER_API = 'https://api-inference.huggingface.co/models/openai/whisper-large-v3';
  
  async recordAndTranscribe(durationMs: number = 5000, language?: string): Promise<TranscriptionResult> {
    // 1. Capture high-quality audio
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        sampleRate: 16000,    // Whisper's preferred sample rate
        channelCount: 1,      // Mono audio
        echoCancellation: true,
        noiseSuppression: true
      }
    });
    
    // 2. Record with MediaRecorder
    const audioBlob = await this.recordAudio(stream, durationMs);
    
    // 3. Transcribe with Whisper Large V3
    return await this.transcribe({ audioBlob, language });
  }
}
```

**Advanced Features**:
- **Multi-language Support**: 99+ languages including all major Indian languages
- **High Accuracy**: Whisper Large V3 model with 95%+ accuracy for Indian English
- **Audio Optimization**: 16kHz mono recording with noise suppression
- **Fallback System**: Browser Web Speech API when Whisper unavailable

### 5. indicTTSService.ts - Indian Language Text-to-Speech (200+ lines)
**Purpose**: High-quality Indian language speech synthesis
**Implementation**: AI4Bharat integration with client-side optimization

```typescript
export class IndicTTSService {
  private readonly INDIC_TTS_API = 'https://tts.ai4bharat.org/api/v1/synthesize';
  
  async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    // Use AI4Bharat's state-of-the-art Indic TTS
    const response = await fetch(this.INDIC_TTS_API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        input: request.text,
        voice: {
          language_code: request.language,
          name: `${request.language}-${request.speaker}`,
          ssml_gender: request.speaker.toUpperCase()
        },
        audio_config: {
          audio_encoding: 'LINEAR16',
          sample_rate_hertz: 24000,
          speaking_rate: request.speed,
          pitch: request.pitch
        }
      })
    });
    
    return this.processAudioResponse(response);
  }
}
```

**Quality Features**:
- **Native Pronunciation**: Proper Indian language phonetics
- **High Fidelity**: 24kHz audio with natural prosody
- **Voice Options**: Male/female speakers with speed control
- **Efficient Streaming**: Optimized audio delivery and caching

## UI Component Architecture

### Core Components

#### 1. GuidedVoiceForm.tsx
**Purpose**: Main voice form interface with state machine
- Voice controls with real-time visual feedback
- Manual input fallback for accessibility
- API key configuration for Whisper integration
- Progress tracking with step indicators
- Form field updates in real-time

**Key Features**:
- Microphone permission handling
- Audio recording visualization
- Language selection dropdown
- Form preview with editing capabilities

#### 2. PriceInsightsPage.tsx
**Purpose**: Market discovery and analysis interface
- Price range visualization with position indicators
- Nearby mandi comparison tables
- 7-day trend charts with volume data
- Trade recording dialog system
- Buyer connection interface

**Components**:
- Price range slider with confidence indicators
- Market comparison table with sorting
- Historical trend charts
- Buyer profile cards with contact options

#### 3. AIInsightsCard.tsx
**Purpose**: AI response display and interaction
- Price analysis presentation with confidence scores
- Translation results with source/target languages
- Voice playback controls with progress indicators
- Copy-to-clipboard functionality
- Data source attribution

#### 4. IndicTTSShowcase.tsx
**Purpose**: TTS demonstration and testing
- Language selection with native script display
- Text input with character limits
- Audio playback controls with speed adjustment
- Quality comparison between different TTS engines
- Voice selection (male/female options)

#### 5. VoiceAssistantForm.tsx
**Purpose**: Alternative voice interface
- Step-by-step guidance with clear instructions
- Voice/text input toggle options
- Form preview with real-time editing
- Progress indicators and navigation controls

### UI Component Library (shadcn-ui)

**Base Components** (src/components/ui/):
- `button.tsx`: Consistent button styling with variants
- `card.tsx`: Container components with elevation
- `input.tsx`: Form inputs with validation states
- `select.tsx`: Dropdown selections with search
- `dialog.tsx`: Modal dialogs for confirmations
- `badge.tsx`: Status indicators and labels
- `progress.tsx`: Progress bars and indicators
- `toast.tsx`: Notification system
- `tabs.tsx`: Tabbed interfaces
- `table.tsx`: Data tables with sorting

## Hooks and Utilities

### Custom Hooks

#### 1. useGuidedVoice.ts
**Purpose**: React hook for guided voice service integration
- State management for voice form flow
- Speech recognition lifecycle management
- Error handling and retry logic
- Form data synchronization

#### 2. useMandiAI.ts
**Purpose**: React hook for AI service integration
- AI query processing and state management
- Response caching and optimization
- Error boundary integration
- Loading state management

#### 3. useGeolocation.ts
**Purpose**: Location detection and management
- Browser geolocation API integration
- Location permission handling
- Fallback location selection
- Privacy-conscious implementation

### Utility Functions

#### languageUtils.ts
**Purpose**: Language processing and formatting utilities
- Language detection from text/script
- Font selection for different scripts
- Text formatting and normalization
- Language code mapping and conversion

**Key Functions**:
- `detectLanguage()`: Script-based language detection
- `getLanguageFont()`: Appropriate font selection
- `formatText()`: Text normalization for different languages
- `getLanguageDirection()`: RTL/LTR text direction

## Data Flow Architecture

### 1. Voice Input Flow
```
User Speech → Whisper/Web Speech API → Language Detection → 
Text Normalization → Field Validation → State Update → 
Form Preview Update → Confirmation
```

### 2. Price Discovery Flow
```
Form Data → Location Detection → AGMARKNET API Query → 
Price Analysis → Confidence Calculation → AI Reasoning → 
Translation → TTS Generation → UI Display
```

### 3. Negotiation Flow
```
Price Data → Market Analysis → Counter-offer Generation → 
Buyer Matching → Contact Information → Trade Recording → 
Market Intelligence Update
```

## State Management

### React Query Integration
- API response caching with intelligent invalidation
- Background refetching for real-time data
- Optimistic updates for better UX
- Error boundary integration

### Local State Management
- React hooks for component-level state
- Context providers for shared state
- State machines for predictable flows
- Persistent storage for user preferences

## Error Handling Strategy

### Graceful Degradation
- Multiple fallback options for each service
- Progressive enhancement based on browser capabilities
- Offline functionality where possible
- Clear error messages in user's language

### Error Boundaries
- Component-level error isolation
- Service-level error recovery
- User-friendly error reporting
- Automatic retry mechanisms

## Performance Optimization

### Code Splitting
- Route-based code splitting
- Component lazy loading
- Service worker integration
- Bundle size optimization

### Caching Strategy
- API response caching
- Static asset caching
- Browser storage utilization
- CDN integration for assets

## Security Considerations

### API Key Management
- Environment variable configuration
- Client-side key validation
- Rate limiting implementation
- Secure key rotation

### Data Privacy
- Minimal data collection
- Local processing where possible
- User consent management
- GDPR compliance considerations

## Testing Architecture

### Unit Testing (Vitest)
- Service layer testing with mocks
- Component testing with React Testing Library
- Hook testing with custom test utilities
- Utility function testing

### Integration Testing
- API integration testing
- Voice service testing
- End-to-end user flow testing
- Cross-browser compatibility testing

### Test Coverage
- 90%+ code coverage target
- Critical path testing priority
- Edge case handling validation
- Performance regression testing