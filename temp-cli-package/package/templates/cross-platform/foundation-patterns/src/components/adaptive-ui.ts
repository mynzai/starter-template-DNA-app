/**
 * Cross-Platform Adaptive UI Component System
 * Provides components that automatically adapt to platform-specific UI conventions
 */

import { platformDetector, Platform } from '../abstractions/platform.js';

export interface AdaptiveComponentProps {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  disabled?: boolean;
  loading?: boolean;
  children?: any;
  style?: any;
  className?: string;
  testID?: string;
  accessibilityLabel?: string;
  accessibilityHint?: string;
  accessibilityRole?: string;
}

export interface PlatformTheme {
  colors: {
    primary: string;
    secondary: string;
    background: string;
    surface: string;
    text: string;
    textSecondary: string;
    border: string;
    error: string;
    warning: string;
    success: string;
    info: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
  };
  typography: {
    fontFamily: string;
    fontSize: {
      xs: number;
      sm: number;
      md: number;
      lg: number;
      xl: number;
    };
    fontWeight: {
      normal: string;
      medium: string;
      bold: string;
    };
    lineHeight: {
      tight: number;
      normal: number;
      loose: number;
    };
  };
  borderRadius: {
    none: number;
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  shadows: {
    none: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  animation: {
    duration: {
      fast: number;
      normal: number;
      slow: number;
    };
    easing: {
      linear: string;
      ease: string;
      easeIn: string;
      easeOut: string;
      easeInOut: string;
    };
  };
}

/**
 * Platform-specific theme configurations
 */
export class PlatformThemes {
  static getTheme(platform: Platform): PlatformTheme {
    switch (platform) {
      case 'react-native':
        return this.getReactNativeTheme();
      case 'flutter':
        return this.getFlutterTheme();
      case 'tauri':
        return this.getTauriTheme();
      case 'nextjs':
      case 'sveltekit':
      case 'web':
        return this.getWebTheme();
      default:
        return this.getDefaultTheme();
    }
  }
  
  private static getReactNativeTheme(): PlatformTheme {
    return {
      colors: {
        primary: '#007AFF',
        secondary: '#5856D6',
        background: '#FFFFFF',
        surface: '#F2F2F7',
        text: '#000000',
        textSecondary: '#3C3C43',
        border: '#C6C6C8',
        error: '#FF3B30',
        warning: '#FF9500',
        success: '#34C759',
        info: '#007AFF',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
      },
      typography: {
        fontFamily: 'System',
        fontSize: {
          xs: 12,
          sm: 14,
          md: 16,
          lg: 18,
          xl: 24,
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          bold: '700',
        },
        lineHeight: {
          tight: 1.2,
          normal: 1.5,
          loose: 1.8,
        },
      },
      borderRadius: {
        none: 0,
        sm: 4,
        md: 8,
        lg: 12,
        full: 9999,
      },
      shadows: {
        none: 'none',
        sm: '0 1px 2px rgba(0,0,0,0.1)',
        md: '0 2px 4px rgba(0,0,0,0.1)',
        lg: '0 4px 8px rgba(0,0,0,0.1)',
        xl: '0 8px 16px rgba(0,0,0,0.1)',
      },
      animation: {
        duration: {
          fast: 150,
          normal: 250,
          slow: 500,
        },
        easing: {
          linear: 'linear',
          ease: 'ease',
          easeIn: 'ease-in',
          easeOut: 'ease-out',
          easeInOut: 'ease-in-out',
        },
      },
    };
  }
  
  private static getFlutterTheme(): PlatformTheme {
    return {
      colors: {
        primary: '#2196F3',
        secondary: '#03DAC6',
        background: '#FFFFFF',
        surface: '#FAFAFA',
        text: '#212121',
        textSecondary: '#757575',
        border: '#E0E0E0',
        error: '#F44336',
        warning: '#FF9800',
        success: '#4CAF50',
        info: '#2196F3',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
      },
      typography: {
        fontFamily: 'Roboto',
        fontSize: {
          xs: 12,
          sm: 14,
          md: 16,
          lg: 20,
          xl: 24,
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          bold: '700',
        },
        lineHeight: {
          tight: 1.2,
          normal: 1.4,
          loose: 1.6,
        },
      },
      borderRadius: {
        none: 0,
        sm: 4,
        md: 8,
        lg: 16,
        full: 9999,
      },
      shadows: {
        none: 'none',
        sm: '0 1px 3px rgba(0,0,0,0.12)',
        md: '0 2px 6px rgba(0,0,0,0.16)',
        lg: '0 4px 12px rgba(0,0,0,0.16)',
        xl: '0 8px 24px rgba(0,0,0,0.16)',
      },
      animation: {
        duration: {
          fast: 200,
          normal: 300,
          slow: 600,
        },
        easing: {
          linear: 'linear',
          ease: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
          easeIn: 'cubic-bezier(0.4, 0.0, 1, 1)',
          easeOut: 'cubic-bezier(0.0, 0.0, 0.2, 1)',
          easeInOut: 'cubic-bezier(0.4, 0.0, 0.2, 1)',
        },
      },
    };
  }
  
  private static getTauriTheme(): PlatformTheme {
    return {
      colors: {
        primary: '#0078d4',
        secondary: '#6b73ff',
        background: '#ffffff',
        surface: '#f3f2f1',
        text: '#323130',
        textSecondary: '#605e5c',
        border: '#edebe9',
        error: '#d13438',
        warning: '#ffb900',
        success: '#107c10',
        info: '#0078d4',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
      },
      typography: {
        fontFamily: 'Segoe UI, -apple-system, BlinkMacSystemFont, sans-serif',
        fontSize: {
          xs: 11,
          sm: 13,
          md: 15,
          lg: 18,
          xl: 24,
        },
        fontWeight: {
          normal: '400',
          medium: '600',
          bold: '700',
        },
        lineHeight: {
          tight: 1.2,
          normal: 1.4,
          loose: 1.6,
        },
      },
      borderRadius: {
        none: 0,
        sm: 2,
        md: 4,
        lg: 8,
        full: 9999,
      },
      shadows: {
        none: 'none',
        sm: '0 1px 2px rgba(0,0,0,0.08)',
        md: '0 2px 4px rgba(0,0,0,0.1)',
        lg: '0 4px 8px rgba(0,0,0,0.12)',
        xl: '0 8px 16px rgba(0,0,0,0.14)',
      },
      animation: {
        duration: {
          fast: 167,
          normal: 333,
          slow: 500,
        },
        easing: {
          linear: 'linear',
          ease: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
          easeIn: 'cubic-bezier(0.1, 0.7, 1.0, 0.1)',
          easeOut: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
          easeInOut: 'cubic-bezier(0.1, 0.9, 0.2, 1)',
        },
      },
    };
  }
  
  private static getWebTheme(): PlatformTheme {
    return {
      colors: {
        primary: '#3b82f6',
        secondary: '#8b5cf6',
        background: '#ffffff',
        surface: '#f8fafc',
        text: '#1e293b',
        textSecondary: '#64748b',
        border: '#e2e8f0',
        error: '#ef4444',
        warning: '#f59e0b',
        success: '#10b981',
        info: '#3b82f6',
      },
      spacing: {
        xs: 4,
        sm: 8,
        md: 16,
        lg: 24,
        xl: 32,
      },
      typography: {
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        fontSize: {
          xs: 12,
          sm: 14,
          md: 16,
          lg: 18,
          xl: 24,
        },
        fontWeight: {
          normal: '400',
          medium: '500',
          bold: '700',
        },
        lineHeight: {
          tight: 1.25,
          normal: 1.5,
          loose: 1.75,
        },
      },
      borderRadius: {
        none: 0,
        sm: 4,
        md: 6,
        lg: 8,
        full: 9999,
      },
      shadows: {
        none: 'none',
        sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        md: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
        lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
        xl: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
      },
      animation: {
        duration: {
          fast: 150,
          normal: 300,
          slow: 500,
        },
        easing: {
          linear: 'linear',
          ease: 'cubic-bezier(0.4, 0, 0.2, 1)',
          easeIn: 'cubic-bezier(0.4, 0, 1, 1)',
          easeOut: 'cubic-bezier(0, 0, 0.2, 1)',
          easeInOut: 'cubic-bezier(0.4, 0, 0.2, 1)',
        },
      },
    };
  }
  
  private static getDefaultTheme(): PlatformTheme {
    return this.getWebTheme();
  }
}

/**
 * Adaptive Button Component
 */
export class AdaptiveButton {
  static create(props: AdaptiveComponentProps & {
    onPress?: () => void;
    onClick?: () => void;
    title?: string;
  }) {
    const platform = platformDetector.detectPlatform();
    const theme = PlatformThemes.getTheme(platform);
    
    switch (platform) {
      case 'react-native':
        return this.createReactNativeButton(props, theme);
      case 'flutter':
        return this.createFlutterButton(props, theme);
      case 'tauri':
      case 'nextjs':
      case 'sveltekit':
      case 'web':
        return this.createWebButton(props, theme);
      default:
        return this.createWebButton(props, theme);
    }
  }
  
  private static createReactNativeButton(props: any, theme: PlatformTheme) {
    return {
      component: 'TouchableOpacity',
      props: {
        style: {
          backgroundColor: this.getButtonBackground(props.variant, theme),
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          borderRadius: theme.borderRadius.md,
          alignItems: 'center',
          justifyContent: 'center',
          opacity: props.disabled ? 0.6 : 1,
          ...props.style,
        },
        onPress: props.onPress,
        disabled: props.disabled,
        testID: props.testID,
        accessibilityLabel: props.accessibilityLabel,
        accessibilityHint: props.accessibilityHint,
        accessibilityRole: 'button',
      },
      children: {
        component: 'Text',
        props: {
          style: {
            color: this.getButtonTextColor(props.variant, theme),
            fontSize: this.getButtonFontSize(props.size, theme),
            fontWeight: theme.typography.fontWeight.medium,
            fontFamily: theme.typography.fontFamily,
          },
        },
        children: props.title || props.children,
      },
    };
  }
  
  private static createFlutterButton(props: any, theme: PlatformTheme) {
    return {
      component: 'ElevatedButton',
      props: {
        onPressed: props.disabled ? null : props.onPress,
        style: {
          backgroundColor: this.getButtonBackground(props.variant, theme),
          foregroundColor: this.getButtonTextColor(props.variant, theme),
          padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
          shape: {
            borderRadius: theme.borderRadius.md,
          },
        },
      },
      children: {
        component: 'Text',
        props: {
          style: {
            fontSize: this.getButtonFontSize(props.size, theme),
            fontWeight: theme.typography.fontWeight.medium,
          },
        },
        children: props.title || props.children,
      },
    };
  }
  
  private static createWebButton(props: any, theme: PlatformTheme) {
    return {
      component: 'button',
      props: {
        type: 'button',
        onClick: props.onClick || props.onPress,
        disabled: props.disabled,
        className: props.className,
        'data-testid': props.testID,
        'aria-label': props.accessibilityLabel,
        style: {
          backgroundColor: this.getButtonBackground(props.variant, theme),
          color: this.getButtonTextColor(props.variant, theme),
          padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
          borderRadius: `${theme.borderRadius.md}px`,
          border: props.variant === 'outline' ? `1px solid ${theme.colors.border}` : 'none',
          fontSize: `${this.getButtonFontSize(props.size, theme)}px`,
          fontWeight: theme.typography.fontWeight.medium,
          fontFamily: theme.typography.fontFamily,
          cursor: props.disabled ? 'not-allowed' : 'pointer',
          opacity: props.disabled ? 0.6 : 1,
          transition: `all ${theme.animation.duration.fast}ms ${theme.animation.easing.ease}`,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          textDecoration: 'none',
          outline: 'none',
          ...props.style,
        },
      },
      children: props.title || props.children,
    };
  }
  
  private static getButtonBackground(variant: string, theme: PlatformTheme): string {
    switch (variant) {
      case 'primary':
        return theme.colors.primary;
      case 'secondary':
        return theme.colors.secondary;
      case 'outline':
        return 'transparent';
      case 'ghost':
        return 'transparent';
      default:
        return theme.colors.primary;
    }
  }
  
  private static getButtonTextColor(variant: string, theme: PlatformTheme): string {
    switch (variant) {
      case 'primary':
      case 'secondary':
        return '#ffffff';
      case 'outline':
      case 'ghost':
        return theme.colors.text;
      default:
        return '#ffffff';
    }
  }
  
  private static getButtonFontSize(size: string, theme: PlatformTheme): number {
    switch (size) {
      case 'xs':
        return theme.typography.fontSize.xs;
      case 'sm':
        return theme.typography.fontSize.sm;
      case 'md':
        return theme.typography.fontSize.md;
      case 'lg':
        return theme.typography.fontSize.lg;
      case 'xl':
        return theme.typography.fontSize.xl;
      default:
        return theme.typography.fontSize.md;
    }
  }
}

/**
 * Adaptive Input Component
 */
export class AdaptiveInput {
  static create(props: AdaptiveComponentProps & {
    value?: string;
    onChangeText?: (text: string) => void;
    onChange?: (event: any) => void;
    placeholder?: string;
    secureTextEntry?: boolean;
    type?: string;
    multiline?: boolean;
    numberOfLines?: number;
  }) {
    const platform = platformDetector.detectPlatform();
    const theme = PlatformThemes.getTheme(platform);
    
    switch (platform) {
      case 'react-native':
        return this.createReactNativeInput(props, theme);
      case 'flutter':
        return this.createFlutterInput(props, theme);
      case 'tauri':
      case 'nextjs':
      case 'sveltekit':
      case 'web':
        return this.createWebInput(props, theme);
      default:
        return this.createWebInput(props, theme);
    }
  }
  
  private static createReactNativeInput(props: any, theme: PlatformTheme) {
    return {
      component: 'TextInput',
      props: {
        value: props.value,
        onChangeText: props.onChangeText,
        placeholder: props.placeholder,
        secureTextEntry: props.secureTextEntry,
        multiline: props.multiline,
        numberOfLines: props.numberOfLines,
        editable: !props.disabled,
        testID: props.testID,
        accessibilityLabel: props.accessibilityLabel,
        accessibilityHint: props.accessibilityHint,
        style: {
          borderWidth: 1,
          borderColor: theme.colors.border,
          borderRadius: theme.borderRadius.md,
          paddingHorizontal: theme.spacing.md,
          paddingVertical: theme.spacing.sm,
          fontSize: theme.typography.fontSize.md,
          fontFamily: theme.typography.fontFamily,
          color: theme.colors.text,
          backgroundColor: theme.colors.background,
          opacity: props.disabled ? 0.6 : 1,
          ...props.style,
        },
      },
    };
  }
  
  private static createFlutterInput(props: any, theme: PlatformTheme) {
    return {
      component: 'TextField',
      props: {
        controller: props.controller,
        decoration: {
          hintText: props.placeholder,
          border: {
            borderRadius: theme.borderRadius.md,
            borderSide: {
              color: theme.colors.border,
              width: 1,
            },
          },
          contentPadding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
        },
        obscureText: props.secureTextEntry,
        maxLines: props.multiline ? props.numberOfLines : 1,
        enabled: !props.disabled,
        style: {
          fontSize: theme.typography.fontSize.md,
          fontFamily: theme.typography.fontFamily,
          color: theme.colors.text,
        },
      },
    };
  }
  
  private static createWebInput(props: any, theme: PlatformTheme) {
    const isTextarea = props.multiline;
    
    return {
      component: isTextarea ? 'textarea' : 'input',
      props: {
        type: isTextarea ? undefined : (props.secureTextEntry ? 'password' : (props.type || 'text')),
        value: props.value,
        onChange: props.onChange || ((e: any) => props.onChangeText?.(e.target.value)),
        placeholder: props.placeholder,
        disabled: props.disabled,
        rows: isTextarea ? props.numberOfLines : undefined,
        'data-testid': props.testID,
        'aria-label': props.accessibilityLabel,
        className: props.className,
        style: {
          width: '100%',
          border: `1px solid ${theme.colors.border}`,
          borderRadius: `${theme.borderRadius.md}px`,
          padding: `${theme.spacing.sm}px ${theme.spacing.md}px`,
          fontSize: `${theme.typography.fontSize.md}px`,
          fontFamily: theme.typography.fontFamily,
          color: theme.colors.text,
          backgroundColor: theme.colors.background,
          outline: 'none',
          transition: `border-color ${theme.animation.duration.fast}ms ${theme.animation.easing.ease}`,
          resize: isTextarea ? 'vertical' : 'none',
          minHeight: isTextarea ? `${theme.typography.fontSize.md * theme.typography.lineHeight.normal * (props.numberOfLines || 3)}px` : 'auto',
          opacity: props.disabled ? 0.6 : 1,
          cursor: props.disabled ? 'not-allowed' : 'text',
          ...props.style,
        },
        onFocus: (e: any) => {
          e.target.style.borderColor = theme.colors.primary;
        },
        onBlur: (e: any) => {
          e.target.style.borderColor = theme.colors.border;
        },
      },
    };
  }
}

/**
 * Adaptive Card Component
 */
export class AdaptiveCard {
  static create(props: AdaptiveComponentProps & {
    elevation?: number;
    padding?: keyof PlatformTheme['spacing'];
  }) {
    const platform = platformDetector.detectPlatform();
    const theme = PlatformThemes.getTheme(platform);
    
    const shadowStyle = this.getShadowStyle(props.elevation || 1, theme);
    const paddingValue = props.padding ? theme.spacing[props.padding] : theme.spacing.md;
    
    switch (platform) {
      case 'react-native':
        return {
          component: 'View',
          props: {
            style: {
              backgroundColor: theme.colors.surface,
              borderRadius: theme.borderRadius.lg,
              padding: paddingValue,
              ...shadowStyle,
              ...props.style,
            },
            testID: props.testID,
            accessibilityRole: 'group',
          },
          children: props.children,
        };
      
      case 'flutter':
        return {
          component: 'Card',
          props: {
            elevation: props.elevation || 1,
            shape: {
              borderRadius: theme.borderRadius.lg,
            },
            child: {
              component: 'Padding',
              props: {
                padding: paddingValue,
              },
              children: props.children,
            },
          },
        };
      
      default:
        return {
          component: 'div',
          props: {
            className: props.className,
            'data-testid': props.testID,
            style: {
              backgroundColor: theme.colors.surface,
              borderRadius: `${theme.borderRadius.lg}px`,
              padding: `${paddingValue}px`,
              border: `1px solid ${theme.colors.border}`,
              ...shadowStyle,
              ...props.style,
            },
          },
          children: props.children,
        };
    }
  }
  
  private static getShadowStyle(elevation: number, theme: PlatformTheme) {
    const shadowKeys = Object.keys(theme.shadows) as Array<keyof typeof theme.shadows>;
    const shadowKey = shadowKeys[Math.min(elevation, shadowKeys.length - 1)];
    
    return {
      boxShadow: theme.shadows[shadowKey],
    };
  }
}

/**
 * Responsive Design Utilities
 */
export class ResponsiveUtils {
  static getBreakpoints() {
    return {
      xs: 0,
      sm: 576,
      md: 768,
      lg: 992,
      xl: 1200,
      xxl: 1400,
    };
  }
  
  static getCurrentBreakpoint(): string {
    if (typeof window === 'undefined') return 'md';
    
    const width = window.innerWidth;
    const breakpoints = this.getBreakpoints();
    
    if (width >= breakpoints.xxl) return 'xxl';
    if (width >= breakpoints.xl) return 'xl';
    if (width >= breakpoints.lg) return 'lg';
    if (width >= breakpoints.md) return 'md';
    if (width >= breakpoints.sm) return 'sm';
    return 'xs';
  }
  
  static isBreakpoint(breakpoint: string): boolean {
    return this.getCurrentBreakpoint() === breakpoint;
  }
  
  static isBreakpointUp(breakpoint: string): boolean {
    const breakpoints = this.getBreakpoints();
    const current = this.getCurrentBreakpoint();
    
    return breakpoints[current as keyof typeof breakpoints] >= breakpoints[breakpoint as keyof typeof breakpoints];
  }
  
  static isBreakpointDown(breakpoint: string): boolean {
    const breakpoints = this.getBreakpoints();
    const current = this.getCurrentBreakpoint();
    
    return breakpoints[current as keyof typeof breakpoints] <= breakpoints[breakpoint as keyof typeof breakpoints];
  }
  
  static createResponsiveValue<T>(values: Partial<Record<string, T>>): T | undefined {
    const breakpoint = this.getCurrentBreakpoint();
    const breakpoints = Object.keys(this.getBreakpoints()).reverse();
    
    // Find the largest breakpoint that has a value and is smaller than or equal to current
    for (const bp of breakpoints) {
      if (values[bp] !== undefined && this.isBreakpointUp(bp)) {
        return values[bp];
      }
    }
    
    // Fallback to the smallest available value
    const firstBreakpoint = Object.keys(values)[0];
    return firstBreakpoint ? values[firstBreakpoint] : undefined;
  }
}

/**
 * Accessibility Utilities
 */
export class AccessibilityUtils {
  static createAccessibilityProps(props: {
    label?: string;
    hint?: string;
    role?: string;
    state?: any;
  }) {
    const platform = platformDetector.detectPlatform();
    
    switch (platform) {
      case 'react-native':
        return {
          accessibilityLabel: props.label,
          accessibilityHint: props.hint,
          accessibilityRole: props.role as any,
          accessibilityState: props.state,
        };
      
      case 'web':
      case 'nextjs':
      case 'sveltekit':
        return {
          'aria-label': props.label,
          'aria-describedby': props.hint,
          role: props.role,
          'aria-disabled': props.state?.disabled,
          'aria-selected': props.state?.selected,
          'aria-checked': props.state?.checked,
        };
      
      default:
        return {
          semanticLabel: props.label,
          tooltip: props.hint,
        };
    }
  }
  
  static announceForScreenReader(message: string): void {
    const platform = platformDetector.detectPlatform();
    
    switch (platform) {
      case 'react-native':
        try {
          const { AccessibilityInfo } = require('react-native');
          AccessibilityInfo.announceForAccessibility(message);
        } catch {
          // AccessibilityInfo not available
        }
        break;
      
      case 'web':
      case 'nextjs':
      case 'sveltekit':
        // Create a temporary element for screen reader announcement
        const announcement = document.createElement('div');
        announcement.setAttribute('aria-live', 'polite');
        announcement.setAttribute('aria-atomic', 'true');
        announcement.style.position = 'absolute';
        announcement.style.left = '-10000px';
        announcement.style.width = '1px';
        announcement.style.height = '1px';
        announcement.style.overflow = 'hidden';
        announcement.textContent = message;
        
        document.body.appendChild(announcement);
        
        setTimeout(() => {
          document.body.removeChild(announcement);
        }, 1000);
        break;
    }
  }
}

// Export component factory
export function createAdaptiveComponent(type: 'button' | 'input' | 'card', props: any) {
  switch (type) {
    case 'button':
      return AdaptiveButton.create(props);
    case 'input':
      return AdaptiveInput.create(props);
    case 'card':
      return AdaptiveCard.create(props);
    default:
      throw new Error(`Unknown component type: ${type}`);
  }
}

// Export current theme
export const currentTheme = PlatformThemes.getTheme(platformDetector.detectPlatform());