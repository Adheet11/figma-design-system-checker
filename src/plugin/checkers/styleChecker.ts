import { colorToHex, colorsAreEqual, findClosestColor } from '../utils';
import { StyleCheckResult, StyleSuggestion } from '../../shared/types';

// Check if a node's fill is using a style
export function checkFills(node: SceneNode): StyleCheckResult[] {
  const results: StyleCheckResult[] = [];
  
  // Skip nodes without fills
  if (!('fills' in node) || typeof node.fills === 'symbol') {
    return results;
  }
  
  // If fills is empty or not visible, skip
  if (!node.fills || node.fills.length === 0 || !node.visible) {
    return results;
  }
  
  // Get all visible fills
  const visibleFills = (node.fills as readonly Paint[]).filter(fill => fill.visible !== false);
  if (visibleFills.length === 0) {
    return results;
  }
  
  // Check if there's a fill style applied
  if (!node.fillStyleId && visibleFills.length > 0) {
    // Check each fill for potential suggestions
    for (const fill of visibleFills) {
      if (fill.type === 'SOLID' && !node.fillStyleId) {
        // Convert color to hex
        const rgbColor = fill.color as RGB;
        const hexColor = colorToHex({ r: rgbColor.r, g: rgbColor.g, b: rgbColor.b, a: 1 });
        
        // Create result with suggestion
        results.push({
          node: {
            id: node.id,
            name: node.name,
            type: node.type
          },
          type: 'fill',
          message: 'Node has fill without a style',
          value: hexColor,
          suggestions: []  // Suggestions will be added later
        });
      }
    }
  }
  
  // Add check for mixed fills that should be consistent
  if ('fills' in node && typeof node.fills !== 'symbol' && node.fills.length > 1) {
    // Check if multiple fills of the same type are used without a style
    const solidFills = (node.fills as readonly Paint[]).filter(fill => fill.type === 'SOLID' && fill.visible !== false);
    
    if (solidFills.length > 1 && !node.fillStyleId) {
      results.push({
        node: {
          id: node.id,
          name: node.name,
          type: node.type
        },
        type: 'fill',
        message: 'Multiple solid fills without a style',
        value: `${solidFills.length} solid fills`,
        suggestions: []  // Suggestions will be added later
      });
    }
  }
  
  return results;
}

// Find styles that match a given fill
function findMatchingFillStyles(fill: Paint): StyleSuggestion[] {
  const suggestions: StyleSuggestion[] = [];
  
  if (fill.type !== 'SOLID') {
    return suggestions;
  }
  
  // Get all local paint styles
  const paintStyles = figma.getLocalPaintStyles();
  
  for (const style of paintStyles) {
    // Only check styles with exactly one paint
    if (style.paints.length !== 1) continue;
    
    const stylePaint = style.paints[0];
    
    if (stylePaint.type === 'SOLID' && colorsAreEqual(stylePaint.color, fill.color)) {
      // Convert RGB to RGBA for color hex value
      const styleRgba: RGBA = { ...(stylePaint.color as RGB), a: 1 };
      
      suggestions.push({
        name: style.name,
        id: style.id,
        value: colorToHex(styleRgba),
        source: 'Local'
      });
    }
  }
  
  return suggestions;
}

// Check if a node's stroke is using a style
export function checkStrokes(node: SceneNode): StyleCheckResult[] {
  const results: StyleCheckResult[] = [];
  
  // Skip if node doesn't have strokes
  if (!('strokes' in node) || !node.strokes) {
    return results;
  }
  
  // Skip if node is using mixed strokes
  if (typeof node.strokes === 'symbol') {
    return results;
  }
  
  // Check if the node has a stroke style
  if ('strokeStyleId' in node && !node.strokeStyleId) {
    const strokes = node.strokes as Paint[];
    
    // Skip if there are no visible strokes
    if (strokes.length === 0 || !strokes.some(stroke => stroke.visible !== false)) {
      return results;
    }
    
    // Check each stroke
    for (const stroke of strokes) {
      if (stroke.visible === false) continue;
      
      if (stroke.type === 'SOLID') {
        // Convert RGB to RGBA
        const strokeRgba: RGBA = { ...(stroke.color as RGB), a: 1 };
        const strokeColor = colorToHex(strokeRgba);
        
        // Find local styles that match this stroke
        const suggestions = findMatchingFillStyles(stroke);
        
        results.push({
          node: {
            id: node.id,
            name: node.name,
            type: node.type
          },
          type: 'stroke',
          message: 'Missing stroke style',
          value: strokeColor,
          suggestions
        });
      }
    }
  }
  
  return results;
}

// Check if a text node is using a text style
export function checkTextStyles(node: SceneNode): StyleCheckResult[] {
  const results: StyleCheckResult[] = [];
  
  // Skip if node is not a text node
  if (node.type !== 'TEXT') {
    return results;
  }
  
  // Check if the text node has a text style
  if (!node.textStyleId) {
    // Create a description of the current text properties
    const fontName = typeof node.fontName === 'symbol' ? 'Mixed fonts' : `${node.fontName.family} ${node.fontName.style}`;
    const fontSize = typeof node.fontSize === 'symbol' ? 'Mixed sizes' : `${node.fontSize}px`;
    const textValue = `${fontName}, ${fontSize}`;
    
    // Find local text styles that might match
    const suggestions = findMatchingTextStyles(node);
    
    results.push({
      node: {
        id: node.id,
        name: node.name,
        type: node.type
      },
      type: 'text',
      message: 'Missing text style',
      value: textValue,
      suggestions
    });
  }
  
  return results;
}

// Find text styles that match a given text node
function findMatchingTextStyles(textNode: TextNode): StyleSuggestion[] {
  const suggestions: StyleSuggestion[] = [];
  
  // Skip if the text node has mixed properties
  if (typeof textNode.fontName === 'symbol' || typeof textNode.fontSize === 'symbol') {
    return suggestions;
  }
  
  // Get all local text styles
  const textStyles = figma.getLocalTextStyles();
  
  for (const style of textStyles) {
    if (style.fontName.family === textNode.fontName.family && 
        style.fontName.style === textNode.fontName.style &&
        style.fontSize === textNode.fontSize) {
      
      suggestions.push({
        name: style.name,
        id: style.id,
        value: `${style.fontName.family} ${style.fontName.style}, ${style.fontSize}px`,
        source: 'Local'
      });
    }
  }
  
  return suggestions;
}

// Check if a node's effect is using a style
export function checkEffects(node: SceneNode): StyleCheckResult[] {
  const results: StyleCheckResult[] = [];
  
  // Skip if node doesn't have effects
  if (!('effects' in node) || !node.effects) {
    return results;
  }
  
  // Skip if node is using mixed effects
  if (typeof node.effects === 'symbol') {
    return results;
  }
  
  // Check if the node has an effect style
  if ('effectStyleId' in node && !node.effectStyleId) {
    const effectArray = [...node.effects];
    checkEffectStyles(node, effectArray, results);
  }
  
  return results;
}

// Find effect styles that match given effects
function findMatchingEffectStyles(effects: Effect[]): StyleSuggestion[] {
  const suggestions: StyleSuggestion[] = [];
  
  // Get available effect styles in the document
  const effectStyles = figma.getLocalEffectStyles();
  
  for (const style of effectStyles) {
    const styleEffects = [...style.effects]; // Use spread to convert readonly array
    
    // Check if the style effects match the node effects
    if (effectsAreEqual(effects, styleEffects)) {
      suggestions.push({
        name: style.name,
        id: style.id,
        value: getEffectDescription(styleEffects),
        source: 'Local'
      });
    }
  }
  
  return suggestions;
}

// Compare two sets of effects for equality
function effectsAreEqual(effects1: Effect[], effects2: Effect[]): boolean {
  if (effects1.length !== effects2.length) {
    return false;
  }
  
  return effects1.every((effect1, index) => {
    const effect2 = effects2[index];
    
    // Check if effect types match
    if (effect1.type !== effect2.type) {
      return false;
    }
    
    // Check common properties
    if (effect1.visible !== effect2.visible) {
      return false;
    }
    
    // Check specific properties based on effect type
    if (effect1.type === 'DROP_SHADOW' || effect1.type === 'INNER_SHADOW') {
      const shadow1 = effect1 as DropShadowEffect | InnerShadowEffect;
      const shadow2 = effect2 as DropShadowEffect | InnerShadowEffect;
      
      return (
        shadow1.radius === shadow2.radius &&
        shadow1.offset.x === shadow2.offset.x &&
        shadow1.offset.y === shadow2.offset.y &&
        shadow1.spread === shadow2.spread &&
        colorsAreEqual(shadow1.color, shadow2.color)
      );
    } else if (effect1.type === 'LAYER_BLUR' || effect1.type === 'BACKGROUND_BLUR') {
      const blur1 = effect1 as BlurEffect;
      const blur2 = effect2 as BlurEffect;
      
      return blur1.radius === blur2.radius;
    }
    
    return true;
  });
}

function checkEffectStyles(node: SceneNode, effects: Effect[], results: StyleCheckResult[]): void {
  // Skip if there are no effects
  if (effects.length === 0) {
    return;
  }
  
  // Create a basic description of the effects
  const effectTypes = effects.map(effect => {
    if (effect.type === 'DROP_SHADOW') return 'Drop Shadow';
    if (effect.type === 'INNER_SHADOW') return 'Inner Shadow';
    if (effect.type === 'LAYER_BLUR') return 'Layer Blur';
    if (effect.type === 'BACKGROUND_BLUR') return 'Background Blur';
    return effect.type;
  });
  
  const effectValue = effectTypes.join(', ');
  
  // Find local styles that match these effects
  const suggestions = findMatchingEffectStyles(effects);
  
  results.push({
    node: {
      id: node.id,
      name: node.name,
      type: node.type
    },
    type: 'effect',
    message: 'Missing effect style',
    value: effectValue,
    suggestions
  });
}

function getEffectDescription(effects: Effect[]): string {
  // Implement the logic to create a readable description of the effects
  // This is a placeholder and should be replaced with the actual implementation
  return effects.map(effect => effect.type).join(', ');
}

// Add function to check style consistency
export function checkStyleConsistency(node: SceneNode): StyleCheckResult[] {
  const results: StyleCheckResult[] = [];
  
  // Check for text styles used inappropriately based on context
  if (node.type === 'TEXT' && node.textStyleId) {
    const textStyle = figma.getStyleById(node.textStyleId as string);
    if (textStyle) {
      // Check if heading style is used for long text
      if (textStyle.name.includes('Heading') && node.characters.length > 100) {
        results.push({
          node: {
            id: node.id,
            name: node.name,
            type: node.type
          },
          type: 'text',
          message: 'Heading style used for long text block',
          value: textStyle.name,
          suggestions: []  // Could suggest body text styles
        });
      }
      
      // Check if body style is used for very short text
      if (textStyle.name.includes('Body') && node.characters.length < 5) {
        results.push({
          node: {
            id: node.id,
            name: node.name,
            type: node.type
          },
          type: 'text',
          message: 'Body style used for very short text',
          value: textStyle.name,
          suggestions: []  // Could suggest label styles
        });
      }
    }
  }
  
  // Check for mixed style usage within a frame
  if ('children' in node && node.type === 'FRAME') {
    checkMixedStylesInFrame(node as FrameNode, results);
  }
  
  return results;
}

// Helper function to check for mixed styles in a frame
function checkMixedStylesInFrame(frame: FrameNode, results: StyleCheckResult[]): void {
  // Check for mixed text styles in a paragraph
  const textNodes = frame.findAll(node => node.type === 'TEXT') as TextNode[];
  if (textNodes.length > 1) {
    const textStyles = new Set(textNodes.map(node => node.textStyleId).filter(Boolean));
    if (textStyles.size > 2) {
      results.push({
        node: {
          id: frame.id,
          name: frame.name,
          type: frame.type
        },
        type: 'mixed-styles',
        message: 'Frame contains mixed text styles',
        value: `${textStyles.size} different text styles`,
        suggestions: []
      });
    }
  }
  
  // Check for mixed fill styles in a component or section
  const nodesWithFills = frame.findAll(node => 
    'fills' in node && 
    (node as any).fills?.length > 0 && 
    (node as any).fillStyleId
  ) as SceneNode[];
  
  if (nodesWithFills.length > 1) {
    const fillStyles = new Set(nodesWithFills.map((node: any) => node.fillStyleId).filter(Boolean));
    if (fillStyles.size > 3) {  // Allow some variation but flag excessive use
      results.push({
        node: {
          id: frame.id,
          name: frame.name,
          type: frame.type
        },
        type: 'mixed-styles',
        message: 'Frame contains too many different fill styles',
        value: `${fillStyles.size} different fill styles`,
        suggestions: []
      });
    }
  }
}