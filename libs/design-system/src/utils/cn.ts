import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * Utility function to merge Tailwind CSS classes with clsx and tailwind-merge
 * 
 * This function combines the power of clsx for conditional class names
 * and tailwind-merge for intelligent Tailwind CSS class merging.
 * 
 * @param inputs - Class values that can be strings, objects, arrays, etc.
 * @returns Merged class string
 * 
 * @example
 * ```tsx
 * cn('px-2 py-1', 'px-4') // 'py-1 px-4' (px-4 overrides px-2)
 * cn('bg-red-500', { 'bg-blue-500': isActive }) // conditional classes
 * cn(['bg-red-500', 'text-white'], 'hover:bg-red-600') // array support
 * ```
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Utility function to create component variant classes with proper merging
 * 
 * @param base - Base classes that are always applied
 * @param variants - Conditional variant classes
 * @returns Function that merges base and variant classes
 * 
 * @example
 * ```tsx
 * const buttonClasses = createVariant(
 *   'px-4 py-2 rounded-md font-medium',
 *   {
 *     primary: 'bg-blue-500 text-white',
 *     secondary: 'bg-gray-200 text-gray-900'
 *   }
 * );
 * 
 * buttonClasses('primary', 'hover:scale-105') // merged classes
 * ```
 */
export function createVariant<T extends Record<string, string>>(
  base: string,
  variants: T
) {
  return function(
    variant: keyof T,
    ...additional: ClassValue[]
  ) {
    return cn(base, variants[variant], ...additional);
  };
}

/**
 * Utility to conditionally apply classes based on component state
 * 
 * @param condition - Boolean condition
 * @param truthyClasses - Classes to apply when condition is true
 * @param falsyClasses - Classes to apply when condition is false
 * @returns Class string based on condition
 * 
 * @example
 * ```tsx
 * conditionalClass(isActive, 'bg-blue-500', 'bg-gray-200')
 * conditionalClass(hasError, 'border-red-500 text-red-700')
 * ```
 */
export function conditionalClass(
  condition: boolean,
  truthyClasses: ClassValue,
  falsyClasses?: ClassValue
) {
  return cn(condition ? truthyClasses : falsyClasses);
}

/**
 * Utility to merge theme-specific classes
 * 
 * @param lightClasses - Classes for light theme
 * @param darkClasses - Classes for dark theme  
 * @param baseClasses - Base classes applied to both themes
 * @returns Merged class string with theme support
 * 
 * @example
 * ```tsx
 * themeClasses(
 *   'bg-white text-black',
 *   'dark:bg-gray-900 dark:text-white',
 *   'rounded-lg p-4'
 * )
 * ```
 */
export function themeClasses(
  lightClasses: ClassValue,
  darkClasses: ClassValue,
  baseClasses?: ClassValue
) {
  return cn(baseClasses, lightClasses, darkClasses);
}
