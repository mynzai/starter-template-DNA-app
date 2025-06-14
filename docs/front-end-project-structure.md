# Frontend Project Structure

## Multi-Framework Organization

```
packages/
├── ui-core/              # Shared design system
│   ├── tokens/           # Design tokens
│   ├── icons/           # Icon library
│   └── assets/          # Shared assets
├── components/          # Cross-platform components
│   ├── ai/             # AI-specific components
│   ├── forms/          # Form components
│   └── navigation/     # Navigation patterns
├── flutter-ui/         # Flutter-specific implementations
├── react-native-ui/    # React Native components
├── web-ui/            # Next.js/React components
└── tauri-ui/          # Tauri desktop components
```

## Framework-Specific Structures

- **Flutter:** Widget-based with provider pattern
- **React Native:** Component-based with hooks
- **Next.js:** App router with server components
- **Tauri:** Hybrid Rust backend + web frontend
