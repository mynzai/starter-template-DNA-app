# Frontend API Interaction

## AI Service Integration

```typescript
class AIService {
  async streamChat(message: string): Promise<ReadableStream<string>> {
    return fetch('/api/chat/stream', {
      method: 'POST',
      body: JSON.stringify({ message }),
      headers: { 'Content-Type': 'application/json' },
    }).then(response => response.body);
  }
}
```

## Framework Implementations

- **Flutter:** http + dio for streaming
- **React Native:** fetch with TextDecoder
- **Next.js:** Server-Sent Events + fetch
- **Tauri:** Rust backend bridge + web fetch

## Error Handling

- Network timeouts with retry logic
- Graceful fallbacks for AI service failures
- User-friendly error messages
- Offline state management
