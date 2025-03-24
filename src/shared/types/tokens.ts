/**
 * Type definitions for design tokens
 */

// Interface for token information when working with numerical values
export interface TokenInfo {
  id: string;
  name: string;
  value: number;
}

// Interface for design system tokens for checking
export interface DesignSystemTokens {
  colorTokens: Map<string, Variable>;
  typographyTokens: Map<string, Variable>;
  spacingTokens: Map<string, Variable>;
  borderRadiusTokens: Map<string, Variable>;
  shadowTokens: Map<string, Variable>;
  fontFamilies?: string[]; // Approved font families
}

// Interface for token checking results
export interface TokenCheckResult {
  node: {
    id: string;
    name: string;
    type: string;
  };
  type: string; // 'color', 'spacing', 'typography', etc.
  message: string;
  value: string;
  property?: string;
  suggestions?: TokenSuggestion[];
}

// Interface for token suggestions
export interface TokenSuggestion {
  name: string;
  id: string;
  value: string;
  distance?: number; // For color suggestions, how close the match is
} 