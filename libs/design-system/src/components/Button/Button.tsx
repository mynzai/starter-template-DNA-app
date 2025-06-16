import React, { forwardRef } from 'react';
import { motion, MotionProps } from 'framer-motion';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';
import { Loader2 } from 'lucide-react';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground hover:bg-primary/90',
        destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        link: 'text-primary underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-10 px-4 py-2',
        sm: 'h-9 rounded-md px-3',
        lg: 'h-11 rounded-md px-8',
        xl: 'h-12 rounded-lg px-10 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  fullWidth?: boolean;
  // Motion props
  whileHover?: MotionProps['whileHover'];
  whileTap?: MotionProps['whileTap'];
  animate?: MotionProps['animate'];
  initial?: MotionProps['initial'];
  exit?: MotionProps['exit'];
  transition?: MotionProps['transition'];
}

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      leftIcon,
      rightIcon,
      fullWidth = false,
      children,
      disabled,
      whileHover = { scale: 1.02 },
      whileTap = { scale: 0.98 },
      animate,
      initial,
      exit,
      transition = { duration: 0.2 },
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : motion.button;
    
    const isDisabled = disabled || loading;
    
    const buttonContent = (
      <>
        {loading && (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        )}
        {!loading && leftIcon && (
          <span className="mr-2 flex items-center">{leftIcon}</span>
        )}
        {loading && loadingText ? loadingText : children}
        {!loading && rightIcon && (
          <span className="ml-2 flex items-center">{rightIcon}</span>
        )}
      </>
    );

    if (asChild) {
      return (
        <Slot
          className={cn(
            buttonVariants({ variant, size, className }),
            fullWidth && 'w-full'
          )}
          ref={ref}
          {...props}
        >
          {buttonContent}
        </Slot>
      );
    }

    return (
      <Comp
        className={cn(
          buttonVariants({ variant, size, className }),
          fullWidth && 'w-full'
        )}
        ref={ref}
        disabled={isDisabled}
        whileHover={!isDisabled ? whileHover : undefined}
        whileTap={!isDisabled ? whileTap : undefined}
        animate={animate}
        initial={initial}
        exit={exit}
        transition={transition}
        {...props}
      >
        {buttonContent}
      </Comp>
    );
  }
);

Button.displayName = 'Button';

export { Button, buttonVariants };
export type { ButtonProps };
