import { StyleSuggestion } from '../../shared/types';
import { colorToHex, findClosestColor, isNodeVisible } from '../utils';
import { TokenInfo, DesignSystemTokens, TokenCheckResult, TokenSuggestion } from '../../shared/types/tokens';

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
      suggestions = findAlternativeTokensByValue(value as number, designTokens.borderRadiusTokens);
    }
    else if (property.includes('padding') || property.includes('Spacing') || property === 'itemSpacing') {
      suggestions = findAlternativeTokensByValue(value as number, designTokens.spacingTokens);
    }
    
    results.push({
      node: {
        id: node.id,
        name: node.name,
        type: node.type
      },
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
function findAlternativeTokensByValue(value: number, tokenCollection: Map<string, Variable> | TokenInfo[]): TokenSuggestion[] {
  const suggestions: TokenSuggestion[] = [];
  
  // Return empty array if tokenCollection is null or empty
  if (!tokenCollection || (tokenCollection instanceof Map && tokenCollection.size === 0) || 
      (Array.isArray(tokenCollection) && tokenCollection.length === 0)) {
    return suggestions;
  }
  
  // Convert Map to TokenInfo array if necessary
  const tokenArray: TokenInfo[] = tokenCollection instanceof Map 
    ? convertVariableMapToTokenInfoArray(tokenCollection) 
    : tokenCollection;
  
  // Find tokens with exact or close values
  const exactMatches = tokenArray.filter(token => token.value === value);
  
  if (exactMatches.length > 0) {
    return exactMatches.map(token => ({
      name: token.name,
      id: token.id,
      value: token.value.toString(),
      distance: 0
    }));
  }
  
  // Find the closest matches if no exact match
  const closeMatches = tokenArray
    .map(token => ({
      token,
      distance: Math.abs(token.value - value)
    }))
    .filter(match => match.distance / value < 0.1)  // Within 10% of the target value
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 3);  // Get top 3 closest matches
  
  return closeMatches.map(match => ({
    name: match.token.name,
    id: match.token.id,
    value: match.token.value.toString(),
    distance: match.distance
  }));
}

// Find nodes not using variables that should be
export function checkMissingVariables(node: SceneNode, designTokens: DesignSystemTokens): TokenCheckResult[] {
  const results: TokenCheckResult[] = [];
  
  // Skip if node is hidden or if we don't check this node type
  if (!isNodeVisible(node) || !shouldCheckNodeType(node.type)) {
    return results;
  }
  
  // Check color usage
  if ('fills' in node && node.fills && typeof node.fills !== 'symbol') {
    checkMissingColorVariables(node, designTokens, results, 'fills');
  }
  
  if ('strokes' in node && node.strokes && typeof node.strokes !== 'symbol') {
    checkMissingColorVariables(node, designTokens, results, 'strokes');
  }
  
  // Check radius usage
  if ('cornerRadius' in node && typeof node.cornerRadius === 'number' && node.cornerRadius > 0) {
    checkMissingRadiusVariables(node, designTokens, results);
  }
  
  // Add spacing and layout token checks
  if ('itemSpacing' in node && typeof node.itemSpacing === 'number') {
    // Convert spacing tokens to array
    const spacingTokenArray = convertVariableMapToTokenInfoArray(designTokens.spacingTokens);
    
    // Check if the spacing matches a design token
    const suggestions = findAlternativeTokensByValue(node.itemSpacing, spacingTokenArray);
    
    // See if there's a bound variable for this property
    const hasBoundVariable = 'boundVariables' in node && 
                            node.boundVariables && 
                          (node.boundVariables as any).itemSpacing;
    
    if (suggestions.length > 0 && !hasBoundVariable) {
      results.push({
        node: {
          id: node.id,
          name: node.name,
          type: node.type
        },
        type: 'missingVariable',
        message: 'Layout spacing should use a spacing token',
        value: node.itemSpacing.toString(),
        suggestions
      });
    }
  }
  
  // Add padding token checks
  if ('paddingLeft' in node || 'paddingRight' in node || 
      'paddingTop' in node || 'paddingBottom' in node) {
      
    checkPaddingVariables(node, designTokens, results);
  }
  
  // Check for missing text variables
  if (node.type === 'TEXT') {
    checkMissingTextVariables(node, designTokens, results);
  }
  
  return results;
}

// Check padding variables against spacing tokens
function checkPaddingVariables(node: SceneNode, designTokens: DesignSystemTokens, results: TokenCheckResult[]): void {
  // Define the padding properties to check
  const paddingProps = ['paddingLeft', 'paddingRight', 'paddingTop', 'paddingBottom'];
  
  // Convert spacing tokens to array
  const spacingTokenArray = convertVariableMapToTokenInfoArray(designTokens.spacingTokens);
  
  // Check each padding property
  for (const prop of paddingProps) {
    if (prop in node && typeof (node as any)[prop] === 'number' && (node as any)[prop] > 0) {
      const value = (node as any)[prop];
      
      // Check if the variable is bound to this property
      const hasBoundVariable = 'boundVariables' in node && 
                              node.boundVariables && 
                              (node.boundVariables as any)[prop];
      
      if (!hasBoundVariable) {
        // Find matching spacing tokens
        const suggestions = findAlternativeTokensByValue(value, spacingTokenArray);
        
        if (suggestions.length > 0) {
          results.push({
            node: {
              id: node.id,
              name: node.name,
              type: node.type
            },
            type: 'missingVariable',
            message: `${formatPropertyName(prop)} should use a spacing token`,
            value: value.toString(),
            property: prop,
            suggestions
          });
        }
      }
    }
  }
}

// Improved function to check for missing text variables
function checkMissingTextVariables(node: TextNode, designTokens: DesignSystemTokens, results: TokenCheckResult[]): void {
  // Skip if node already has a text style
  if (node.textStyleId) {
    return;
  }
  
  // Convert typography tokens to array
  const typographyTokenArray = convertVariableMapToTokenInfoArray(designTokens.typographyTokens);
  
  // Text properties to check
  const textProps = [
    { prop: 'fontSize', message: 'Font size' },
    { prop: 'lineHeight', message: 'Line height' },
    { prop: 'letterSpacing', message: 'Letter spacing' }
  ];
  
  // Check each text property
  for (const { prop, message } of textProps) {
    if (prop in node && typeof (node as any)[prop] === 'number' && (node as any)[prop] > 0) {
      const value = (node as any)[prop];
      
      // Check if a variable is bound to this property
      const hasBoundVariable = 'boundVariables' in node && 
                              node.boundVariables && 
                              (node.boundVariables as any)[prop];
      
      if (!hasBoundVariable) {
        // Find matching tokens
        const suggestions = findAlternativeTokensByValue(value, typographyTokenArray);
        
        if (suggestions.length > 0) {
          results.push({
            node: {
              id: node.id,
              name: node.name,
              type: node.type
            },
            type: 'missingVariable',
            message: `${message} should use a typography token`,
            value: value.toString(),
            property: prop,
            suggestions
          });
        }
      }
    }
  }
  
  // Also check for font family and weight consistency
  if (node.fontName && typeof node.fontName !== 'symbol' && 
      !('boundVariables' in node && node.boundVariables && (node.boundVariables as any).fontName)) {
    // Extract approved font families from design system
    const fontFamilies = designTokens.fontFamilies || [];
    
    // Check if the font family is consistent with the design system
    const isFontFamilyApproved = fontFamilies.includes(node.fontName.family);
    
    if (!isFontFamilyApproved && fontFamilies.length > 0) {
      results.push({
        node: {
          id: node.id,
          name: node.name,
          type: node.type
        },
        type: 'missingVariable',
        message: 'Font family not from design system',
        value: `${node.fontName.family} ${node.fontName.style}`,
        property: 'fontName',
        suggestions: []  // Could suggest approved font families
      });
    }
  }
}

// Check for missing color variables in fills or strokes
function checkMissingColorVariables(
  node: SceneNode,
  designTokens: DesignSystemTokens,
  results: TokenCheckResult[],
  property: 'fills' | 'strokes'
): void {
  // Safely access fills or strokes property
  if (!(property in node)) return;
  
  const paints = property === 'fills' ? 
    ('fills' in node ? node.fills : null) : 
    ('strokes' in node ? node.strokes : null);
    
  if (!paints || typeof paints === 'symbol') return;
  
  const styleId = property === 'fills' ? 
    ('fillStyleId' in node ? node.fillStyleId : null) : 
    ('strokeStyleId' in node ? node.strokeStyleId : null);
  
  // If a style is already applied, we don't need to suggest variables
  if (styleId) return;
  
  // Check if variable is bound to this property
  const hasBoundVariable = 'boundVariables' in node && 
                          node.boundVariables && 
                          (node.boundVariables as any)[property];
  
  if (hasBoundVariable) return;
  
  // Check each paint
  for (const paint of paints as Paint[]) {
    if (paint.visible === false) continue;
    
    if (paint.type === 'SOLID') {
      // Find matching color tokens
      const suggestions = findAlternativeColorTokens(paint.color, designTokens.colorTokens);
      
      if (suggestions.length > 0) {
        // Convert color to hex for display
        const rgba: RGBA = { ...(paint.color as RGB), a: 1 };
        const colorHex = colorToHex(rgba);
        
        results.push({
          node: {
            id: node.id,
            name: node.name, 
            type: node.type
          },
          type: 'missingVariable',
          message: `${property === 'fills' ? 'Fill' : 'Stroke'} color should use a variable token`,
          value: colorHex,
          property,
          suggestions
        });
      }
    }
  }
}

// Check for missing radius variables
function checkMissingRadiusVariables(
  node: SceneNode,
  designTokens: DesignSystemTokens,
  results: TokenCheckResult[]
): void {
  // Safely check if node has cornerRadius property
  if (!('cornerRadius' in node)) return;
  
  const cornerRadius = (node as any).cornerRadius;
  if (typeof cornerRadius !== 'number' || cornerRadius === 0) return;
  
  // Check if a variable is bound to cornerRadius
  const hasBoundVariable = 'boundVariables' in node && 
                          node.boundVariables && 
                          (node.boundVariables as any).cornerRadius;
  
  if (hasBoundVariable) return;
  
  // Convert border radius tokens map to an array of token infos
  const radiusTokenArray = convertVariableMapToTokenInfoArray(designTokens.borderRadiusTokens);
  
  // Find matching radius tokens
  const suggestions = findAlternativeTokensByValue(cornerRadius, radiusTokenArray);
  
  if (suggestions.length > 0) {
    results.push({
      node: {
        id: node.id,
        name: node.name,
        type: node.type
      },
      type: 'missingVariable',
      message: 'Border radius should use a variable token',
      value: cornerRadius.toString(),
      property: 'cornerRadius',
      suggestions
    });
  }
}

// Helper to format property names for display
function formatPropertyName(prop: string): string {
  // Convert camelCase to Title Case with spaces
  return prop
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase());
}

// Helper to determine if we should check this node type
function shouldCheckNodeType(nodeType: string): boolean {
  // Skip checking for specific node types
  const skippedTypes = [
    'CONNECTOR',
    'SHAPE_WITH_TEXT',
    'STICKY',
    'CODE_BLOCK',
    'WIDGET'
  ];
  
  return !skippedTypes.includes(nodeType);
}

// Add a helper function to convert Map to TokenInfo array
function convertVariableMapToTokenInfoArray(variableMap: Map<string, Variable>): TokenInfo[] {
  const result: TokenInfo[] = [];
  
  if (!variableMap) {
    return result;
  }
  
  for (const [id, variable] of variableMap.entries()) {
    if (!variable || !variable.valuesByMode) continue;
    
    try {
      // Get the first mode ID (default mode)
      const modeIds = Object.keys(variable.valuesByMode);
      if (modeIds.length === 0) continue;
      
      const modeId = modeIds[0];
      const value = variable.valuesByMode[modeId];
      
      // Only add numerical values
      if (typeof value === 'number' && value > 0) {
        result.push({
          id,
          name: variable.name,
          value: value
        });
      }
    } catch (error) {
      console.warn(`Error processing variable in convertVariableMapToTokenInfoArray:`, error);
    }
  }
  
  return result;
}