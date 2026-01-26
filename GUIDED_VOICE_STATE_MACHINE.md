# Guided Voice Form State Machine Implementation

## Overview

This implementation provides a **predictable, reliable, demo-ready** voice-assisted form filling system using a state machine approach. It is **NOT a chatbot** - it's a structured form filling tool.

## State Machine Design

### Fixed State Sequence
```
ASK_NAME → ASK_PRODUCT → ASK_QUANTITY → ASK_QUALITY → ASK_LOCATION → CONFIRM
```

### Key Principles

1. **One Question at a Time**: Each state asks exactly one clear question
2. **One Field at a Time**: Each response fills exactly one form field
3. **No Skipping**: Must progress through states in order
4. **Predictable Behavior**: Same sequence every time
5. **Clear Extraction**: Extract only the relevant field from speech

## Technical Implementation

### State Machine States
- `ASK_NAME`: Asks for user's name
- `ASK_PRODUCT`: Asks what product they're selling
- `ASK_QUANTITY`: Asks for quantity (e.g., "50 kg")
- `ASK_QUALITY`: Asks for quality (good/average/premium)
- `ASK_LOCATION`: Asks for location/mandi
- `CONFIRM`: Reads back all information for confirmation

### Speech Processing Rules

1. **Speech-to-Text**: Uses Whisper (Web Speech API fallback)
2. **Field Extraction**: Extract only the relevant field for current state
3. **Validation**: Validate input format (especially for quality)
4. **Retry Logic**: If unclear, repeat the same question
5. **No Inference**: Don't try to extract multiple fields from one answer

### Multi-Language Support

Supports 5 languages with native questions:
- **Hindi**: आपका नाम क्या है?
- **English**: What is your name?
- **Bengali**: আপনার নাম কি?
- **Tamil**: உங்கள் பெயர் என்ன?
- **Telugu**: మీ పేరు ఏమిటి?

## Usage Example

```typescript
import { guidedVoiceService } from '@/services/guidedVoiceService';

// Start the voice form
await guidedVoiceService.start('english', 'Delhi NCR');

// Listen for state changes
guidedVoiceService.setOnStateChange((state) => {
  console.log('Current state:', state.currentState);
  console.log('Current question:', guidedVoiceService.getCurrentQuestion());
  console.log('Form data:', state.formData);
});

// Handle completion
guidedVoiceService.setOnComplete((formData) => {
  console.log('Form completed:', formData);
  // Process the completed form
});

// Manual field updates (for text input fallback)
guidedVoiceService.updateField('name', 'John Doe');

// Start listening for speech
guidedVoiceService.startListening();
```

## Component Integration

The `GuidedVoiceForm` component provides:

1. **Visual State Indicator**: Shows current step and progress
2. **Live Form Filling**: Updates form fields as values are captured
3. **Manual Input Fallback**: Text input for each field
4. **Language Selection**: Choose language before starting
5. **Debug Information**: Development mode shows state details

## Demo Flow

1. **Select Language**: Choose from 5 supported languages
2. **Start Voice Form**: Click "Start Voice Form" button
3. **Follow Prompts**: Answer each question one by one
4. **See Live Updates**: Watch form fields fill automatically
5. **Confirm Data**: Review and confirm all information
6. **Complete**: Form data is returned to parent component

## Key Features

### Reliability
- Fixed state sequence prevents confusion
- Clear, single-purpose questions
- Robust error handling and retry logic
- Fallback to text input if speech fails

### Predictability
- Same flow every time
- No unexpected state transitions
- Clear visual feedback
- Consistent behavior across languages

### Demo-Ready
- Professional UI with animations
- Real-time progress indication
- Debug information for development
- Comprehensive error handling

## Testing

The implementation includes comprehensive tests covering:
- State machine transitions
- Multi-language support
- Form data integrity
- Error handling
- Speech processing logic

Run tests with:
```bash
npm test -- src/test/guidedVoice.test.ts
```

## Architecture Benefits

1. **Maintainable**: Clear state machine makes logic easy to follow
2. **Extensible**: Easy to add new states or languages
3. **Testable**: Each state can be tested independently
4. **Reliable**: Predictable behavior reduces edge cases
5. **User-Friendly**: Clear progression and feedback

This implementation ensures a smooth, predictable voice form experience that works reliably in demo scenarios while providing fallback options for real-world usage.