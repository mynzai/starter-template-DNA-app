# Cross-Platform Design System Specification

## Design Tokens

### Color System

```typescript
const tokens = {
  primary: {
    50: '#eff6ff', // Light backgrounds
    500: '#3b82f6', // Primary actions
    900: '#1e3a8a', // Dark text
  },
  semantic: {
    success: '#059669',
    warning: '#d97706',
    error: '#dc2626',
    info: '#0284c7',
  },
};
```

### Typography Scale

- **Display:** 48px/56px (Hero headings)
- **H1:** 36px/44px (Page titles)
- **H2:** 24px/32px (Section headers)
- **Body:** 16px/24px (Default text)
- **Small:** 14px/20px (Secondary text)

### Spacing System

- **Base:** 4px grid system
- **Scale:** 4, 8, 12, 16, 24, 32, 48, 64px
- **Component padding:** 16px default
- **Section spacing:** 48px vertical

## Component Adaptations

### Button Component

**Flutter Implementation:**

```dart
ElevatedButton(
  style: ElevatedButton.styleFrom(
    backgroundColor: DesignTokens.primary[500],
    minimumSize: Size(120, 44),
  ),
  child: Text('Primary Action')
)
```

**React/React Native:**

```tsx
<Button variant="primary" size="medium" className="min-w-[120px] h-11">
  Primary Action
</Button>
```

### Platform-Specific Adaptations

#### iOS/Material Differences

- **iOS:** Rounded corners (8px), system blue
- **Material:** 4px corners, elevation shadows
- **Web:** Hover states, focus outlines

#### Navigation Patterns

- **Mobile:** Bottom tabs, stack navigation
- **Web:** Top navigation, breadcrumbs
- **Desktop:** Sidebar navigation, menu bars

## Responsive Breakpoints

- **Mobile:** 0-767px
- **Tablet:** 768-1023px
- **Desktop:** 1024px+

## Accessibility Standards

- **Minimum touch targets:** 44x44px
- **Color contrast:** 4.5:1 for normal text
- **Focus indicators:** 2px outline
- **Screen reader:** Semantic HTML/proper ARIA

## Platform Implementation Guide

### Flutter

- Use `Theme.of(context)` for tokens
- `MaterialApp` with custom theme
- Adaptive widgets for platform differences

### React Native

- StyleSheet with design tokens
- Platform-specific styling with `Platform.select`
- React Navigation for consistent patterns

### Web (React)

- CSS custom properties for tokens
- Tailwind CSS utility classes
- CSS Grid/Flexbox for layouts

## Component Library Structure

```
design-system/
├── tokens/           # Design tokens
├── components/       # Shared components
│   ├── Button/
│   ├── Input/
│   ├── Card/
│   └── Modal/
├── platforms/        # Platform adaptations
│   ├── flutter/
│   ├── react-native/
│   └── web/
└── docs/            # Storybook documentation
```

## Testing Strategy

- Visual regression tests for all components
- Cross-platform rendering validation
- Accessibility automated testing
- Performance benchmarks per platform
