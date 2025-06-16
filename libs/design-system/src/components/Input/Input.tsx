import React, { forwardRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import { cn } from '../../utils/cn';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  success?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  variant?: 'default' | 'filled' | 'flushed';
  inputSize?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  showPasswordToggle?: boolean;
}

const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type,
      label,
      error,
      success,
      helperText,
      leftIcon,
      rightIcon,
      variant = 'default',
      inputSize = 'md',
      fullWidth = false,
      showPasswordToggle = false,
      disabled,
      id,
      ...props
    },
    ref
  ) => {
    const [showPassword, setShowPassword] = useState(false);
    const [isFocused, setIsFocused] = useState(false);
    
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const isPassword = type === 'password';
    const actualType = isPassword && showPassword ? 'text' : type;
    
    const hasError = Boolean(error);
    const hasSuccess = Boolean(success) && !hasError;
    
    const baseClasses = cn(
      'flex w-full rounded-md border bg-background text-sm transition-colors',
      'file:border-0 file:bg-transparent file:text-sm file:font-medium',
      'placeholder:text-muted-foreground',
      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
      'disabled:cursor-not-allowed disabled:opacity-50',
      {
        // Variants
        'border-input focus-visible:ring-ring': variant === 'default',
        'border-0 bg-muted focus-visible:ring-ring': variant === 'filled',
        'border-0 border-b-2 border-border bg-transparent rounded-none focus-visible:border-ring focus-visible:ring-0':
          variant === 'flushed',
        
        // Sizes
        'h-9 px-3 py-1': inputSize === 'sm',
        'h-10 px-3 py-2': inputSize === 'md',
        'h-11 px-4 py-3': inputSize === 'lg',
        
        // States
        'border-destructive focus-visible:ring-destructive': hasError,
        'border-success focus-visible:ring-success': hasSuccess,
        
        // Width
        'w-full': fullWidth,
      }
    );
    
    const iconClasses = cn(
      'text-muted-foreground',
      {
        'h-4 w-4': inputSize === 'sm',
        'h-4 w-4': inputSize === 'md',
        'h-5 w-5': inputSize === 'lg',
      }
    );

    const inputElement = (
      <div className="relative flex items-center">
        {leftIcon && (
          <div className="absolute left-3 flex items-center pointer-events-none">
            <span className={iconClasses}>{leftIcon}</span>
          </div>
        )}
        
        <input
          type={actualType}
          className={cn(
            baseClasses,
            {
              'pl-10': leftIcon,
              'pr-10': rightIcon || (isPassword && showPasswordToggle),
              'pr-16': rightIcon && isPassword && showPasswordToggle,
            }
          )}
          ref={ref}
          id={inputId}
          disabled={disabled}
          onFocus={(e) => {
            setIsFocused(true);
            props.onFocus?.(e);
          }}
          onBlur={(e) => {
            setIsFocused(false);
            props.onBlur?.(e);
          }}
          {...props}
        />
        
        <div className="absolute right-3 flex items-center gap-2">
          {isPassword && showPasswordToggle && (
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="text-muted-foreground hover:text-foreground transition-colors"
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className={iconClasses} />
              ) : (
                <Eye className={iconClasses} />
              )}
            </button>
          )}
          
          {rightIcon && (
            <span className={iconClasses}>{rightIcon}</span>
          )}
          
          {hasError && (
            <AlertCircle className={cn(iconClasses, 'text-destructive')} />
          )}
          
          {hasSuccess && (
            <CheckCircle className={cn(iconClasses, 'text-success')} />
          )}
        </div>
      </div>
    );

    return (
      <div className={cn('grid gap-2', fullWidth && 'w-full')}>
        {label && (
          <motion.label
            htmlFor={inputId}
            className={cn(
              'text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
              {
                'text-destructive': hasError,
                'text-success': hasSuccess,
              }
            )}
            animate={{
              scale: isFocused ? 1.02 : 1,
            }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}
        
        <motion.div
          animate={{
            scale: isFocused ? 1.01 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {inputElement}
        </motion.div>
        
        <AnimatePresence>
          {(error || success || helperText) && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.2 }}
              className="grid gap-1"
            >
              {error && (
                <p className="text-sm text-destructive">{error}</p>
              )}
              {success && !error && (
                <p className="text-sm text-success">{success}</p>
              )}
              {helperText && !error && !success && (
                <p className="text-sm text-muted-foreground">{helperText}</p>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };
export type { InputProps };
