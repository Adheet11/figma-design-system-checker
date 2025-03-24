import { StyleSuggestion } from '../../shared/types';
import { colorToHex, findClosestColor } from '../utils';

// Interface for token checking results
export interface TokenCheckResult {
  node: SceneNode;
  type: string; // 'color', 'spacing', 'typography', etc.
  message: string;
  value: string;
  suggestions?: TokenSuggestion[];
}

// Interface for token suggestions
export interface TokenSuggestion {
  name: string;
  id: string;
  value: string;
  distance?: number; // For color suggestions, how close the match is
}

// Interface to store design system tokens for checking
export interface DesignSystemTokens {
  colorTokens: Map<string, Variable>; // Collection ID -> Variable
  typographyTokens: Map<string, Variable>;
  spacingTokens: Map<string, Variable>;
  borderRadiusTokens: Map<string, Variable>;
  shadowTokens: Map<string, Variable>;
  // Add more token types as needed
}

// Function to detect all design system tokens in the file
export function detectDesignSystemTokens(): DesignSystemTokens {
  const designSystemTokens: DesignSystemTokens = {
    colorTokens: new Map(),
    typographyTokens: new Map(),
    spacingTokens: new Map(),
    borderRadiusTokens: new Map(),
    shadowTokens: new Map()
  };

  // Get all variable collections
  const collections = figma.variables.getLocalVariableCollections();
  
  // Process each collection
  for (const collection of collections) {
    // Check if this is a design system collection
    // You may customize this logic based on your design system naming conventions
    const isDesignSystem = collection.name.includes('Design System') || 
                           collection.name.includes('Tokens') || 
                           collection.name.includes('DS');
    
    if (isDesignSystem) {
      // Get variables from this collection
      const variables = figma.variables.getVariablesByCollection(collection.id);
      
      // Categorize variables by their naming convention or mode
      for (const variable of variables) {
        const name = variable.name.toLowerCase();
        
        // Categorize based on naming conventions
        if (name.includes('color') || name.includes('fill') || name.includes('background') || 
           variable.resolvedType === 'COLOR') {
          designSystemTokens.colorTokens.set(variable.id, variable);
        } 
        else if (name.includes('spacing') || name.includes('space') || name.includes('gap') || 
                name.includes('padding') || name.includes('margin')) {
          designSystemTokens.spacingTokens.set(variable.id, variable);
        }
        else if (name.includes('radius') || name.includes('corner')) {
          designSystemTokens.borderRadiusTokens.set(variable.id, variable);
        }
        else if (name.includes('shadow') || name.includes('elevation')) {
          designSystemTokens.shadowTokens.set(variable.id, variable);
        }
        else if (name.includes('type') || name.includes('font') || name.includes('text') || 
                name.includes('typography')) {
          designSystemTokens.typographyTokens.set(variable.id, variable);
        }
      }
    }
  }
  
  return designSystemTokens;
}

// Check if a node is using variables
export function checkVariables(node: SceneNode, designTokens: DesignSystemTokens): TokenCheckResult[] {
  const results: TokenCheckResult[] = [];
  
  // Skip if node doesn't have boundVariables
  if (!('boundVariables' in node) || !node.boundVariables) {
    return results;
  }
  
  // These are properties that might have variables bound to them
  const variableProperties = [
    'fills', 'strokes', 'effects', 'layoutGrids', 'opacity',
    'cornerRadius', 'topLeftRadius', 'topRightRadius', 'bottomLeftRadius', 'bottomRightRadius',
    'paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom',
    'itemSpacing', 'counterAxisSpacing',
    'strokeWeight', 'strokeTopWeight', 'strokeRightWeight', 'strokeBottomWeight', 'strokeLeftWeight',
  ];
  
  // Check if node is using design system variables
  for (const prop of variableProperties) {
    // Use type assertion to tell TypeScript this property access is valid
    const boundVars = node.boundVariables as Record<string, any>;
    if (prop in boundVars) {
      // For array properties like fills, strokes
      if (Array.isArray(boundVars[prop])) {
        for (const binding of boundVars[prop]) {
          checkVariableBinding(node, prop, binding.id, designTokens, results);
        }
      } 
      // For singular properties
      else {
        const binding = boundVars[prop];
        checkVariableBinding(node, prop, binding.id, designTokens, results);
      }
    }
  }
  
  return results;
}

// Check a specific variable binding against design system tokens
function checkVariableBinding(
  node: SceneNode, 
  property: string, 
  variableId: string, 
  designTokens: DesignSystemTokens, 
  results: TokenCheckResult[]
): void {
  const variable = figma.variables.getVariableById(variableId);
  
  if (!variable) return;
  
  // Get the variable collection
  const collection = figma.variables.getVariableCollectionById(variable.variableCollectionId);
  if (!collection) return;
  
  // Check if this variable is from a design system collection
  const isDesignSystemCollection = collection.name.includes('Design System') || 
                                  collection.name.includes('Tokens') || 
                                  collection.name.includes('DS');
  
  // If not from design system, suggest alternatives
  if (!isDesignSystemCollection) {
    let suggestions: TokenSuggestion[] = [];
    
    // Get the current value of the variable
    const modeId = collection.modes[0].modeId; // Use the first mode as default
    const value = variable.valuesByMode[modeId];
    
    // Find alternative tokens based on property
    if (property === 'fills' || property === 'strokes') {
      if (variable.resolvedType === 'COLOR') {
        suggestions = findAlternativeColorTokens(value as RGBA, designTokens.colorTokens);
      }
    } 
    else if (property.includes('Radius')) {
      suggestions = findAlternativeTokensByValue(value, designTokens.borderRadiusTokens);
    }
    else if (property.includes('padding') || property.includes('Spacing') || property === 'itemSpacing') {
      suggestions = findAlternativeTokensByValue(value, designTokens.spacingTokens);
    }
    
    results.push({
      node,
      type: 'variable',
      message: `Using non-design system variable for ${property}`,
      value: `${variable.name} (${collection.name})`,
      suggestions
    });
  }
}

// Find alternative color tokens
function findAlternativeColorTokens(color: RGB | RGBA, colorTokens: Map<string, Variable>): TokenSuggestion[] {
  const suggestions: TokenSuggestion[] = [];
  const colorsList: Array<{id: string, color: RGBA, name: string}> = [];
  
  // Ensure we have RGBA by adding alpha=1 if missing
  const targetColor: RGBA = 'a' in color ? color as RGBA : { ...color, a: 1 };
  
  // Extract colors from tokens
  for (const [id, variable] of colorTokens) {
    const modeId = Object.keys(variable.valuesByMode)[0]; // Use first mode
    const value = variable.valuesByMode[modeId];
    
    if (typeof value === 'object' && 'r' in value) {
      // Ensure we have RGBA by adding alpha=1 if missing
      const tokenColor: RGBA = 'a' in value ? value as RGBA : { ...value as RGB, a: 1 };
      
      colorsList.push({
        id,
        color: tokenColor,
        name: variable.name
      });
    }
  }
  
  // Find closest color match
  const closestColor = findClosestColor(targetColor, colorsList);
  
  if (closestColor) {
    suggestions.push({
      name: closestColor.name,
      id: closestColor.id,
      value: colorToHex(closestColor.color),
      distance: closestColor.distance
    });
  }
  
  return suggestions;
}

// Find alternative tokens by exact value match (for spacing, radius, etc.)
function findAlternativeTokensByValue(value: any, tokens: Map<string, Variable>): TokenSuggestion[] {
  const suggestions: TokenSuggestion[] = [];
  
  for (const [id, variable] of tokens) {
    const modeId = Object.keys(variable.valuesByMode)[0]; // Use first mode
    const tokenValue = variable.valuesByMode[modeId];
    
    // For numbers, allow a small tolerance
    if (typeof value === 'number' && typeof tokenValue === 'number') {
      if (Math.abs(value - tokenValue) < 0.1) {
        suggestions.push({
          name: variable.name,
          id,
          value: tokenValue.toString()
        });
      }
    }
    // For exact matches on other types
    else if (value === tokenValue) {
      suggestions.push({
        name: variable.name,
        id,
        value: JSON.stringify(tokenValue)
      });
    }
  }
  
  return suggestions;
}

// Find nodes not using variables that should be
export function checkMissingVariables(node: SceneNode, designTokens: DesignSystemTokens): TokenCheckResult[] {
  const results: TokenCheckResult[] = [];
  
  // Check for missing color variables in fills
  if ('fills' in node && node.fills && typeof node.fills !== 'symbol') {
    const fills = node.fills as Paint[];
    
    // If there's no fill style ID and no bound variable for fills
    if (('fillStyleId' in node) && !node.fillStyleId && 
        (!('boundVariables' in node) || !node.boundVariables?.fills)) {
      
      // Check solid fills
      for (const fill of fills) {
        if (fill.visible === false) continue;
        
        if (fill.type === 'SOLID') {
          const suggestions = findAlternativeColorTokens(fill.color, designTokens.colorTokens);
          
          if (suggestions.length > 0) {
            // Fix RGB to RGBA conversion for the fill color
            const fillRgba: RGBA = { 
              ...(fill.color as RGB), 
              a: 1 
            };
            const fillHex = colorToHex(fillRgba);
            
            results.push({
              node,
              type: 'missingVariable',
              message: 'Color should use a variable token',
              value: fillHex,
              suggestions
            });
          }
        }
      }
    }
  }
  
  // Check for missing color variables in strokes
  if ('strokes' in node && node.strokes && typeof node.strokes !== 'symbol') {
    const strokes = node.strokes as Paint[];
    
    // If there's no stroke style ID and no bound variable for strokes
    if (('strokeStyleId' in node) && !node.strokeStyleId && 
        (!('boundVariables' in node) || !node.boundVariables?.strokes)) {
      
      // Check solid strokes
      for (const stroke of strokes) {
        if (stroke.visible === false) continue;
        
        if (stroke.type === 'SOLID') {
          const suggestions = findAlternativeColorTokens(stroke.color, designTokens.colorTokens);
          
          if (suggestions.length > 0) {
            // Fix RGB to RGBA conversion for the stroke color
            const strokeRgba: RGBA = { 
              ...(stroke.color as RGB), 
              a: 1 
            };
            const strokeHex = colorToHex(strokeRgba);
            
            results.push({
              node,
              type: 'missingVariable',
              message: 'Stroke color should use a variable token',
              value: strokeHex,
              suggestions
            });
          }
        }
      }
    }
  }
  
  // Check for missing border radius variables
  if ('cornerRadius' in node && node.cornerRadius && typeof node.cornerRadius !== 'symbol') {
    // If no bound variable for cornerRadius
    if (!('boundVariables' in node) || !node.boundVariables) {
      const suggestions = findAlternativeTokensByValue(node.cornerRadius, designTokens.borderRadiusTokens);
      
      if (suggestions.length > 0) {
        results.push({
          node,
          type: 'missingVariable',
          message: 'Border radius should use a variable token',
          value: node.cornerRadius.toString(),
          suggestions
        });
      }
    } else {
      // Use type assertion to safely check cornerRadius property
      const boundVars = node.boundVariables as Record<string, any>;
      if (!boundVars.cornerRadius) {
        const suggestions = findAlternativeTokensByValue(node.cornerRadius, designTokens.borderRadiusTokens);
        
        if (suggestions.length > 0) {
          results.push({
            node,
            type: 'missingVariable',
            message: 'Border radius should use a variable token',
            value: node.cornerRadius.toString(),
            suggestions
          });
        }
      }
    }
  }
  
  // You can add more checks for other properties like spacing, etc.
  
  return results;
}