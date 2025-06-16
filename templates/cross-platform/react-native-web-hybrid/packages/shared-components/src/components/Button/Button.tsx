import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator } from 'react-native';
import styled, { css } from 'styled-components/native';
import { useTheme } from '../../theme/useTheme';
import { Platform } from '../../utils/Platform';
import type { ButtonProps } from './Button.types';

const StyledButton = styled(TouchableOpacity)<{
  variant: ButtonProps['variant'];
  size: ButtonProps['size'];
  fullWidth: boolean;
  disabled: boolean;
}>`
  flex-direction: row;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.spacing.sm}px;
  padding: ${({ size, theme }) => {
    switch (size) {
      case 'sm':
        return `${theme.spacing.xs}px ${theme.spacing.sm}px`;
      case 'lg':
        return `${theme.spacing.md}px ${theme.spacing.lg}px`;
      default:
        return `${theme.spacing.sm}px ${theme.spacing.md}px`;
    }
  }};
  
  ${({ variant, theme, disabled }) => {
    if (disabled) {
      return css`
        background-color: ${theme.colors.gray[300]};
        opacity: 0.6;
      `;
    }
    
    switch (variant) {
      case 'secondary':
        return css`
          background-color: ${theme.colors.gray[100]};
          border: 1px solid ${theme.colors.gray[300]};
        `;
      case 'outline':
        return css`
          background-color: transparent;
          border: 1px solid ${theme.colors.primary[500]};
        `;
      case 'ghost':
        return css`
          background-color: transparent;
        `;
      case 'danger':
        return css`
          background-color: ${theme.colors.red[500]};
        `;
      default:
        return css`
          background-color: ${theme.colors.primary[500]};
        `;
    }
  }}
  
  ${({ fullWidth }) =>
    fullWidth &&
    css`
      width: 100%;
    `}
  
  ${Platform.isWeb &&
    css`
      cursor: pointer;
      transition: all 0.2s ease;
      
      &:hover {
        opacity: 0.8;
        transform: translateY(-1px);
      }
      
      &:active {
        transform: translateY(0);
      }
    `}
`;

const ButtonText = styled(Text)<{
  variant: ButtonProps['variant'];
  size: ButtonProps['size'];
}>`
  font-weight: 600;
  text-align: center;
  
  ${({ size, theme }) => {
    switch (size) {
      case 'sm':
        return css`
          font-size: ${theme.typography.fontSize.sm}px;
          line-height: ${theme.typography.lineHeight.sm}px;
        `;
      case 'lg':
        return css`
          font-size: ${theme.typography.fontSize.lg}px;
          line-height: ${theme.typography.lineHeight.lg}px;
        `;
      default:
        return css`
          font-size: ${theme.typography.fontSize.base}px;
          line-height: ${theme.typography.lineHeight.base}px;
        `;
    }
  }}
  
  ${({ variant, theme }) => {
    switch (variant) {
      case 'secondary':
        return css`
          color: ${theme.colors.gray[700]};
        `;
      case 'outline':
        return css`
          color: ${theme.colors.primary[500]};
        `;
      case 'ghost':
        return css`
          color: ${theme.colors.primary[500]};
        `;
      case 'danger':
        return css`
          color: ${theme.colors.white};
        `;
      default:
        return css`
          color: ${theme.colors.white};
        `;
    }
  }}
`;

const LoadingIndicator = styled(ActivityIndicator)`
  margin-right: ${({ theme }) => theme.spacing.xs}px;
`;

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  onPress,
  testID,
  accessibilityLabel,
  ...props
}) => {
  const theme = useTheme();
  
  const isDisabled = disabled || loading;
  
  const handlePress = React.useCallback(() => {
    if (!isDisabled && onPress) {
      onPress();
    }
  }, [isDisabled, onPress]);
  
  return (
    <StyledButton
      variant={variant}
      size={size}
      fullWidth={fullWidth}
      disabled={isDisabled}
      onPress={handlePress}
      testID={testID}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{
        disabled: isDisabled,
        busy: loading,
      }}
      {...props}
    >
      {loading && (
        <LoadingIndicator
          size="small"
          color={
            variant === 'outline' || variant === 'ghost'
              ? theme.colors.primary[500]
              : theme.colors.white
          }
        />
      )}
      
      {leftIcon && !loading && leftIcon}
      
      <ButtonText variant={variant} size={size}>
        {children}
      </ButtonText>
      
      {rightIcon && !loading && rightIcon}
    </StyledButton>
  );
};

Button.displayName = 'Button';