# Frontend State Management

## Framework-Specific Patterns

### Flutter - Riverpod

```dart
final aiChatProvider = StateNotifierProvider<ChatState, List<Message>>(
  (ref) => ChatNotifier(ref.read(aiServiceProvider))
);
```

### React Native - Redux Toolkit

```typescript
const chatSlice = createSlice({
  name: 'chat',
  initialState: { messages: [], isStreaming: false },
  reducers: { addMessage, startStreaming, stopStreaming },
});
```

### Next.js - Zustand

```typescript
const useChatStore = create<ChatState>(set => ({
  messages: [],
  addMessage: message =>
    set(state => ({
      messages: [...state.messages, message],
    })),
}));
```

## Shared State Patterns

- AI conversation history
- User authentication state
- Theme and preferences
- Real-time connection status
