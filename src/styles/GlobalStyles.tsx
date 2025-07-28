import React from 'react';
import { Global, css } from '@emotion/react';
import { Theme } from './theme';

export const GlobalStyles: React.FC = () => (
  <Global
    styles={(theme: Theme) => css`
      /* Reset and Base Styles */
      *,
      *::before,
      *::after {
        box-sizing: border-box;
      }

      html {
        font-family: ${theme.typography.fonts.primary};
        line-height: ${theme.typography.lineHeights.normal};
        -webkit-font-smoothing: antialiased;
        -moz-osx-font-smoothing: grayscale;
      }

      body {
        margin: 0;
        padding: 0;
        background-color: ${theme.colors.neutral.white};
        color: ${theme.colors.neutral.gray[700]};
        font-size: ${theme.typography.sizes.base};
        overflow-x: hidden;
      }

      /* Focus styles for accessibility */
      :focus-visible {
        outline: 2px solid ${theme.colors.primary[500]};
        outline-offset: 2px;
        border-radius: ${theme.radii.sm};
      }

      /* Smooth scrolling */
      html {
        scroll-behavior: smooth;
      }

      /* Remove default button styles */
      button {
        background: none;
        border: none;
        padding: 0;
        font: inherit;
        cursor: pointer;
        outline: inherit;
      }

      /* Link styles */
      a {
        color: ${theme.colors.primary[600]};
        text-decoration: none;
        transition: color ${theme.transitions.fast};
      }

      a:hover {
        color: ${theme.colors.primary[700]};
      }

      /* Utility classes */
      .sr-only {
        position: absolute;
        width: 1px;
        height: 1px;
        padding: 0;
        margin: -1px;
        overflow: hidden;
        clip: rect(0, 0, 0, 0);
        white-space: nowrap;
        border: 0;
      }

      /* Animation for loading spinner */
      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .spin {
        animation: spin 1s linear infinite;
      }

      /* Diagnosis focus animation from existing styles */
      .diagnosis-focus-animation {
        animation: diagnosisFocus 1.5s ease-in-out;
        transform-origin: center;
      }
      
      @keyframes diagnosisFocus {
        0% {
          transform: scale(1);
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        25% {
          transform: scale(1.05);
          box-shadow: 0 20px 40px rgba(59, 130, 246, 0.3);
        }
        50% {
          transform: scale(1.03);
          box-shadow: 0 25px 50px rgba(59, 130, 246, 0.4);
        }
        100% {
          transform: scale(1);
          box-shadow: 0 10px 20px rgba(59, 130, 246, 0.2);
        }
      }

      /* Responsive typography */
      @media (max-width: ${theme.breakpoints.md}) {
        html {
          font-size: 14px;
        }
      }

      @media (max-width: ${theme.breakpoints.sm}) {
        html {
          font-size: 13px;
        }
      }
    `}
  />
);

export default GlobalStyles;