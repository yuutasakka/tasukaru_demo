// Common styled components
// 頻繁に使用されるUI要素のスタイル定義

import styled from '@emotion/styled';
import { Theme } from './theme';

// Container Components
export const Container = styled.div<{ maxWidth?: keyof Theme['layout']['container'] }>`
  width: 100%;
  max-width: ${props => 
    props.maxWidth 
      ? props.theme.layout.container[props.maxWidth]
      : props.theme.layout.container.xl
  };
  margin: 0 auto;
  padding: 0 ${props => props.theme.spacing[4]};

  @media (max-width: ${props => props.theme.breakpoints.md}) {
    padding: 0 ${props => props.theme.spacing[3]};
  }

  @media (max-width: ${props => props.theme.breakpoints.sm}) {
    padding: 0 ${props => props.theme.spacing[2]};
  }
`;

export const Section = styled.section<{ 
  padding?: keyof Theme['spacing'];
  background?: string;
}>`
  width: 100%;
  padding: ${props => props.theme.spacing[props.padding || '16']} 0;
  background: ${props => props.background || 'transparent'};
`;

// Flex Components
export const Flex = styled.div<{
  direction?: 'row' | 'column';
  align?: 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justify?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  gap?: keyof Theme['spacing'];
  wrap?: boolean;
}>`
  display: flex;
  flex-direction: ${props => props.direction || 'row'};
  align-items: ${props => props.align || 'stretch'};
  justify-content: ${props => props.justify || 'flex-start'};
  gap: ${props => props.gap ? props.theme.spacing[props.gap] : '0'};
  flex-wrap: ${props => props.wrap ? 'wrap' : 'nowrap'};
`;

// Button Components
export const Button = styled.button<{
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
  disabled?: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-family: ${props => props.theme.typography.fonts.primary};
  font-weight: ${props => props.theme.typography.weights.medium};
  border-radius: ${props => props.theme.radii.md};
  transition: all ${props => props.theme.transitions.fast};
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  opacity: ${props => props.disabled ? 0.6 : 1};
  white-space: nowrap;
  text-decoration: none;
  border: 1px solid transparent;

  /* Size variants */
  ${props => {
    switch (props.size) {
      case 'sm':
        return `
          padding: ${props.theme.spacing[2]} ${props.theme.spacing[3]};
          font-size: ${props.theme.typography.sizes.sm};
          min-height: 36px;
        `;
      case 'lg':
        return `
          padding: ${props.theme.spacing[4]} ${props.theme.spacing[6]};
          font-size: ${props.theme.typography.sizes.lg};
          min-height: 48px;
        `;
      default:
        return `
          padding: ${props.theme.spacing[3]} ${props.theme.spacing[5]};
          font-size: ${props.theme.typography.sizes.base};
          min-height: 42px;
        `;
    }
  }}

  /* Width */
  width: ${props => props.fullWidth ? '100%' : 'auto'};

  /* Color variants */
  ${props => {
    const { colors } = props.theme;
    switch (props.variant) {
      case 'primary':
        return `
          background: ${colors.primary[600]};
          color: ${colors.neutral.white};
          &:hover:not(:disabled) {
            background: ${colors.primary[700]};
            transform: translateY(-1px);
            box-shadow: ${props.theme.shadows.md};
          }
          &:active:not(:disabled) {
            transform: translateY(0);
            background: ${colors.primary[800]};
          }
        `;
      case 'secondary':
        return `
          background: ${colors.neutral.gray[100]};
          color: ${colors.neutral.gray[700]};
          &:hover:not(:disabled) {
            background: ${colors.neutral.gray[200]};
          }
        `;
      case 'outline':
        return `
          background: transparent;
          color: ${colors.primary[600]};
          border-color: ${colors.primary[600]};
          &:hover:not(:disabled) {
            background: ${colors.primary[50]};
            border-color: ${colors.primary[700]};
          }
        `;
      case 'ghost':
        return `
          background: transparent;
          color: ${colors.primary[600]};
          &:hover:not(:disabled) {
            background: ${colors.primary[50]};
          }
        `;
      default:
        return `
          background: ${colors.primary[600]};
          color: ${colors.neutral.white};
          &:hover:not(:disabled) {
            background: ${colors.primary[700]};
          }
        `;
    }
  }}

  &:focus-visible {
    outline: 2px solid ${props => props.theme.colors.primary[500]};
    outline-offset: 2px;
  }
`;

// Typography Components
export const Heading = styled.h1<{
  level?: 1 | 2 | 3 | 4 | 5 | 6;
  size?: keyof Theme['typography']['sizes'];
  weight?: keyof Theme['typography']['weights'];
  color?: string;
  align?: 'left' | 'center' | 'right';
  margin?: keyof Theme['spacing'];
}>`
  font-family: ${props => props.theme.typography.fonts.heading};
  font-weight: ${props => 
    props.weight 
      ? props.theme.typography.weights[props.weight]
      : props.theme.typography.weights.bold
  };
  color: ${props => props.color || props.theme.colors.neutral.gray[900]};
  text-align: ${props => props.align || 'left'};
  margin: ${props => 
    props.margin 
      ? `0 0 ${props.theme.spacing[props.margin]} 0`
      : '0 0 1rem 0'
  };
  line-height: ${props => props.theme.typography.lineHeights.tight};

  font-size: ${props => {
    if (props.size) {
      return props.theme.typography.sizes[props.size];
    }
    
    switch (props.level) {
      case 1: return props.theme.typography.sizes['5xl'];
      case 2: return props.theme.typography.sizes['4xl'];
      case 3: return props.theme.typography.sizes['3xl'];
      case 4: return props.theme.typography.sizes['2xl'];
      case 5: return props.theme.typography.sizes.xl;
      case 6: return props.theme.typography.sizes.lg;
      default: return props.theme.typography.sizes['3xl'];
    }
  }};

  @media (max-width: ${props => props.theme.breakpoints.md}) {
    font-size: ${props => {
      if (props.size) {
        return props.theme.typography.sizes[props.size];
      }
      
      switch (props.level) {
        case 1: return props.theme.typography.sizes['4xl'];
        case 2: return props.theme.typography.sizes['3xl'];
        case 3: return props.theme.typography.sizes['2xl'];
        case 4: return props.theme.typography.sizes.xl;
        case 5: return props.theme.typography.sizes.lg;
        case 6: return props.theme.typography.sizes.base;
        default: return props.theme.typography.sizes['2xl'];
      }
    }};
  }
`;

export const Text = styled.p<{
  size?: keyof Theme['typography']['sizes'];
  weight?: keyof Theme['typography']['weights'];
  color?: string;
  align?: 'left' | 'center' | 'right';
  lineHeight?: keyof Theme['typography']['lineHeights'];
}>`
  font-family: ${props => props.theme.typography.fonts.primary};
  font-size: ${props => 
    props.size 
      ? props.theme.typography.sizes[props.size]
      : props.theme.typography.sizes.base
  };
  font-weight: ${props => 
    props.weight 
      ? props.theme.typography.weights[props.weight]
      : props.theme.typography.weights.normal
  };
  color: ${props => props.color || props.theme.colors.neutral.gray[700]};
  text-align: ${props => props.align || 'left'};
  line-height: ${props => 
    props.lineHeight 
      ? props.theme.typography.lineHeights[props.lineHeight]
      : props.theme.typography.lineHeights.normal
  };
  margin: 0;
`;

// Card Component
export const Card = styled.div<{
  padding?: keyof Theme['spacing'];
  shadow?: keyof Theme['shadows'];
  radius?: keyof Theme['radii'];
  background?: string;
}>`
  background: ${props => props.background || props.theme.colors.neutral.white};
  border-radius: ${props => 
    props.radius 
      ? props.theme.radii[props.radius]
      : props.theme.radii.lg
  };
  box-shadow: ${props => 
    props.shadow 
      ? props.theme.shadows[props.shadow]
      : props.theme.shadows.md
  };
  padding: ${props => 
    props.padding 
      ? props.theme.spacing[props.padding]
      : props.theme.spacing[6]
  };
  transition: box-shadow ${props => props.theme.transitions.fast};

  &:hover {
    box-shadow: ${props => props.theme.shadows.lg};
  }
`;

// Loading Spinner
export const LoadingSpinner = styled.div<{
  size?: number;
  color?: string;
}>`
  width: ${props => props.size || 50}px;
  height: ${props => props.size || 50}px;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-top: 3px solid ${props => props.color || props.theme.colors.primary[500]};
  border-radius: 50%;
  animation: spin 1s linear infinite;
`;

// Input Components
export const Input = styled.input<{
  variant?: 'default' | 'error';
  size?: 'sm' | 'md' | 'lg';
}>`
  width: 100%;
  font-family: ${props => props.theme.typography.fonts.primary};
  font-size: ${props => props.theme.typography.sizes.base};
  border-radius: ${props => props.theme.radii.md};
  border: 1px solid ${props => 
    props.variant === 'error' 
      ? props.theme.colors.semantic.error
      : props.theme.colors.neutral.gray[300]
  };
  transition: all ${props => props.theme.transitions.fast};

  padding: ${props => {
    switch (props.size) {
      case 'sm': return `${props.theme.spacing[2]} ${props.theme.spacing[3]}`;
      case 'lg': return `${props.theme.spacing[4]} ${props.theme.spacing[4]}`;
      default: return `${props.theme.spacing[3]} ${props.theme.spacing[4]}`;
    }
  }};

  &:focus {
    outline: none;
    border-color: ${props => props.theme.colors.primary[500]};
    box-shadow: 0 0 0 3px ${props => props.theme.colors.primary[100]};
  }

  &::placeholder {
    color: ${props => props.theme.colors.neutral.gray[400]};
  }

  &:disabled {
    background-color: ${props => props.theme.colors.neutral.gray[50]};
    cursor: not-allowed;
  }
`;