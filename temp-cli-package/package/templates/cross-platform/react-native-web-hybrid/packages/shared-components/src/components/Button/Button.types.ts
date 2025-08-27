import { ReactNode } from 'react';
import { TouchableOpacityProps } from 'react-native';

export interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  /**
   * Button content
   */
  children: ReactNode;
  
  /**
   * Button variant
   * @default 'primary'
   */
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  
  /**
   * Button size
   * @default 'md'
   */
  size?: 'sm' | 'md' | 'lg';
  
  /**
   * Show loading state
   * @default false
   */
  loading?: boolean;
  
  /**
   * Disable button
   * @default false
   */
  disabled?: boolean;
  
  /**
   * Make button full width
   * @default false
   */
  fullWidth?: boolean;
  
  /**
   * Icon to show on the left
   */
  leftIcon?: ReactNode;
  
  /**
   * Icon to show on the right
   */
  rightIcon?: ReactNode;
  
  /**
   * Press handler
   */
  onPress?: () => void;
}