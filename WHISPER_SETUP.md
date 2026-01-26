# Whisper Large V3 Integration Setup

## Overview

The guided voice form now supports **Whisper Large V3** from Hugging Face for superior speech recognition accuracy, especially for Indian languages.

## Setup Instructions

### 1. Get Hugging Face API Key

1. Go to [Hugging Face](https://huggingface.co/)
2. Create an account or sign in
3. Go to [Settings > Access Tokens](https://huggingface.co/settings/tokens)
4. Create a new token with "Read" permissions
5. Copy the token (starts with `hf_`)

### 2. Configure Environment Variable

Add your API key to your `.env` file:

```bash
VITE_HUGGINGFACE_API_KEY=hf_your_token_here
```

### 3. Alternative: Runtime Configuration

You can also set the API key at runtime through the UI:
1. Start the guided voice form
2. Click "Configure Whisper API Key for better accuracy"
3. Enter your Hugging Face API key
4. Click "Set Key"

## Features

### Whisper Large V3 Benefits
- **Higher Accuracy**: Especially for Indian languages (Hindi, Bengali, Tamil, Telugu)
- **Better Noise Handling**: Works well in noisy environments
- **Multilingual Support**: Automatic language detection
- **Long-form Audio**: Can handle longer speech segments

### Fallback Support
- Automatically falls back to browser Web Speech API if Whisper is unavailable
- Users can toggle between Whisper and browser speech recognition
- Graceful error handling with clear user feedback

## Technical Details

### Audio Processing
- Records audio in WebM format with Opus codec
- Converts to WAV for Whisper compatibility
- Uses 16kHz sample rate (Whisper's preferred format)
- Mono audio with noise suppression enabled

### API Integration
- Uses Hugging Face Inference API
- Model: `openai/whisper-large-v3`
- Supports transcription in 90+ languages
- Returns confidence scores and detected language

### Language Mapping
```typescript
const languageMap = {
  'hindi': 'hi',
  'english': 'en', 
  'bengali': 'bn',
  'tamil': 'ta',
  'telugu': 'te'
  // ... more languages
};
```

## Usage in Code

```typescript
import { whisperService } from '@/services/whisperService';

// Set API key
whisperService.setApiKey('hf_your_token_here');

// Record and transcribe
const result = await whisperService.recordAndTranscribe(5000, 'hi');
if (result.success) {
  console.log('Transcription:', result.text);
  console.log('Confidence:', result.confidence);
}

// Direct transcription from audio blob
const transcription = await whisperService.transcribe({
  audioBlob: audioBlob,
  language: 'hi',
  task: 'transcribe'
});
```

## Error Handling

The service handles various error scenarios:
- **No API Key**: Falls back to browser speech recognition
- **Model Loading**: Shows "Model is loading" message
- **Network Issues**: Clear error messages with retry suggestions
- **Audio Access**: Graceful microphone permission handling

## Performance Considerations

- **First Request**: May take 10-20 seconds as model loads
- **Subsequent Requests**: Much faster (2-5 seconds)
- **Audio Duration**: 5-second recordings for optimal balance of accuracy and speed
- **Bandwidth**: Requires internet connection for Whisper API calls

## Demo Experience

With Whisper Large V3 configured:
1. **Better Accuracy**: Especially noticeable with Indian language names and product terms
2. **Consistent Results**: More reliable transcription across different speakers
3. **Professional Feel**: Higher quality speech recognition enhances demo credibility

## Troubleshooting

### Common Issues

1. **"Model is loading" error**
   - Wait 30-60 seconds and try again
   - Hugging Face models auto-sleep and need time to wake up

2. **API key not working**
   - Verify the key starts with `hf_`
   - Check token permissions include "Read"
   - Ensure no extra spaces in the key

3. **Audio not recording**
   - Check microphone permissions
   - Try refreshing the page
   - Verify HTTPS connection (required for microphone access)

4. **Poor transcription quality**
   - Speak clearly and at moderate pace
   - Reduce background noise
   - Try recording closer to microphone

### Fallback Mode

If Whisper fails, the system automatically uses browser speech recognition:
- Click the toggle to switch modes manually
- Browser mode works offline but with lower accuracy
- Best for testing and development

This integration provides a professional-grade speech recognition experience while maintaining reliability through intelligent fallbacks.