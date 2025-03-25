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
  colorTokens: Map<string, any>;
  typographyTokens: Map<string, any>;
  spacingTokens: Map<string, any>;
  borderRadiusTokens: Map<string, any>;
  shadowTokens: Map<string, any>;
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

// Interface for cached design system
export interface CachedDesignSystem {
  id: string;
  name: string;
  lastUpdated: number;
  components: any[];
  styles: any[];
  variables: any[];
  categorizedTokens: {
    colorTokens: any[];
    typographyTokens: any[];
    spacingTokens: any[];
    borderRadiusTokens: any[];
    shadowTokens: any[];
  };
  fontFamilies?: string[];
} 