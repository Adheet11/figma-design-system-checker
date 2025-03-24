import { ComponentCheckResult } from '../../shared/types';

// Check if a component instance is properly used
export function checkComponent(instance: InstanceNode): ComponentCheckResult[] {
  const results: ComponentCheckResult[] = [];
  
  // Check if component is from a library
  const isFromLibrary = isComponentFromLibrary(instance);
  
  // Check for detached component 
  if (!instance.mainComponent) {
    results.push({
      node: instance,
      type: 'detached',
      message: 'Component is detached from its main component',
      details: 'Detached components lose their connection to the design system'
    });
  }
  // Check for non-library component
  else if (!isFromLibrary && instance.mainComponent) {
    results.push({
      node: instance,
      type: 'nonLibrary',
      message: 'Component is not from a team library',
      details: 'Using team library components improves consistency',
      mainComponent: instance.mainComponent
    });
  }
  // Check for overrides
  else if (instance.mainComponent) {
    checkForOverrides(instance, results);
  }
  
  return results;
}

// Check for overrides in a component instance
function checkForOverrides(instance: InstanceNode, results: ComponentCheckResult[]): void {
  // Check for overrides that violate design system rules
  
  // Get all overridden properties
  const overriddenProperties = getOverriddenProperties(instance);
  
  // Only report if there are overrides
  if (overriddenProperties.length > 0 && instance.mainComponent) {
    // Add check for size modifications
    if (instance.width !== instance.mainComponent.width || 
        instance.height !== instance.mainComponent.height) {
      
      // Only flag if not using constraints that allow resizing
      if (instance.constraints.horizontal === "SCALE" && 
          instance.constraints.vertical === "SCALE") {
        results.push({
          node: instance,
          type: 'modified-size',
          message: 'Component size has been modified',
          details: `Size changed from ${instance.mainComponent.width}×${instance.mainComponent.height} to ${instance.width}×${instance.height}`,
          mainComponent: instance.mainComponent
        });
      }
    }
    
    // Check for significant style overrides
    if (hasSignificantStyleOverrides(instance, overriddenProperties)) {
      results.push({
        node: instance,
        type: 'modified-styles',
        message: 'Component has significant style overrides',
        details: `${overriddenProperties.length} properties have been overridden`,
        mainComponent: instance.mainComponent
      });
    }
    
    // Add check for forbidden overrides based on design system rules
    checkForbiddenOverrides(instance, results);
  }
}

function checkForbiddenOverrides(instance: InstanceNode, results: ComponentCheckResult[]): void {
  // Check for overrides that should never happen according to design system rules
  if (!instance.mainComponent) return;
  
  // Example: Check if a button component has its border radius changed
  if (instance.name.toLowerCase().includes('button')) {
    // Find all rectangle shapes in the instance
    const rectangles = findAllRectanglesInInstance(instance);
    
    // Check if any rectangle has a modified corner radius
    for (const rect of rectangles) {
      // Use type assertion and safer property access
      const cornerRadius = (rect as any).cornerRadius;
      const boundCornerRadius = (rect as any).boundVariables?.cornerRadius;
      
      if (cornerRadius !== undefined && cornerRadius !== boundCornerRadius) {
        results.push({
          node: instance,
          type: 'modified-forbidden',
          message: 'Button component has modified corner radius',
          details: 'Button corner radii should be standardized across the design system',
          mainComponent: instance.mainComponent
        });
        break;
      }
    }
  }
  
  // Example: Check if a card component has its shadow modified
  if (instance.name.toLowerCase().includes('card')) {
    // Find nodes with effects
    const nodesWithEffects = findNodesWithEffects(instance);
    
    // Check if any effect is overridden
    for (const node of nodesWithEffects) {
      // Use type assertion to safely access effects property
      const nodeWithEffects = node as any;
      
      if (nodeWithEffects.effects && 
          nodeWithEffects.effects.length > 0 && 
          !nodeWithEffects.effectStyleId) {
        results.push({
          node: instance,
          type: 'modified-forbidden',
          message: 'Card component has modified shadow',
          details: 'Card shadows should use the design system standard elevation tokens',
          mainComponent: instance.mainComponent
        });
        break;
      }
    }
  }
}

// Helper function to get all overridden properties
function getOverriddenProperties(instance: InstanceNode): string[] {
  const overrides: string[] = [];
  
  // Check for overridden texts
  const textNodes = findAllTextNodesInInstance(instance);
  for (const node of textNodes) {
    // Safe check for properties
    const mainComponentNode = (node as any).mainComponent;
    if (mainComponentNode && node.characters !== mainComponentNode.characters) {
      overrides.push('text');
    }
  }
  
  // Check for overridden fills
  const nodesWithFills = findNodesWithFills(instance);
  for (const node of nodesWithFills) {
    // Type assertions for safer property access
    const mainComponentNode = (node as any).mainComponent;
    const nodeFills = ('fills' in node) ? node.fills : undefined;
    const mainComponentFills = mainComponentNode ? mainComponentNode.fills : undefined;
    
    if (mainComponentNode && 
        JSON.stringify(nodeFills) !== JSON.stringify(mainComponentFills)) {
      overrides.push('fills');
    }
  }
  
  // Check for overridden strokes
  const nodesWithStrokes = findNodesWithStrokes(instance);
  for (const node of nodesWithStrokes) {
    // Type assertions for safer property access
    const mainComponentNode = (node as any).mainComponent;
    const nodeStrokes = ('strokes' in node) ? node.strokes : undefined;
    const mainComponentStrokes = mainComponentNode ? mainComponentNode.strokes : undefined;
    
    if (mainComponentNode && 
        JSON.stringify(nodeStrokes) !== JSON.stringify(mainComponentStrokes)) {
      overrides.push('strokes');
    }
  }
  
  return overrides;
}

// Helper function to check if there are significant style overrides
function hasSignificantStyleOverrides(instance: InstanceNode, overrides: string[]): boolean {
  // Consider it significant if there are more than 2 overridden properties
  return overrides.length > 2;
}

// Helper to find all rectangles in an instance
function findAllRectanglesInInstance(instance: InstanceNode): RectangleNode[] {
  const rectangles: RectangleNode[] = [];
  
  function traverseForRectangles(node: any) {
    if (node.type === 'RECTANGLE') {
      rectangles.push(node);
    }
    
    if ('children' in node) {
      for (const child of node.children) {
        traverseForRectangles(child);
      }
    }
  }
  
  traverseForRectangles(instance);
  return rectangles;
}

// Helper to find all text nodes in an instance
function findAllTextNodesInInstance(instance: InstanceNode): TextNode[] {
  const textNodes: TextNode[] = [];
  
  function traverseForTextNodes(node: any) {
    if (node.type === 'TEXT') {
      textNodes.push(node);
    }
    
    if ('children' in node) {
      for (const child of node.children) {
        traverseForTextNodes(child);
      }
    }
  }
  
  traverseForTextNodes(instance);
  return textNodes;
}

// Helper to find nodes with fills
function findNodesWithFills(instance: InstanceNode): SceneNode[] {
  const nodes: SceneNode[] = [];
  
  function traverseForFills(node: any) {
    if ('fills' in node && node.fills && node.fills.length > 0) {
      nodes.push(node);
    }
    
    if ('children' in node) {
      for (const child of node.children) {
        traverseForFills(child);
      }
    }
  }
  
  traverseForFills(instance);
  return nodes;
}

// Helper to find nodes with strokes
function findNodesWithStrokes(instance: InstanceNode): SceneNode[] {
  const nodes: SceneNode[] = [];
  
  function traverseForStrokes(node: any) {
    if ('strokes' in node && node.strokes && node.strokes.length > 0) {
      nodes.push(node);
    }
    
    if ('children' in node) {
      for (const child of node.children) {
        traverseForStrokes(child);
      }
    }
  }
  
  traverseForStrokes(instance);
  return nodes;
}

// Helper to find nodes with effects
function findNodesWithEffects(instance: InstanceNode): SceneNode[] {
  const nodes: SceneNode[] = [];
  
  function traverseForEffects(node: any) {
    if ('effects' in node && node.effects && node.effects.length > 0) {
      nodes.push(node);
    }
    
    if ('children' in node) {
      for (const child of node.children) {
        traverseForEffects(child);
      }
    }
  }
  
  traverseForEffects(instance);
  return nodes;
}

// Determines if component is from a library
function isComponentFromLibrary(instance: InstanceNode): boolean {
  if (!instance.mainComponent) return false;
  
  const mainComponent = instance.mainComponent;
  // Check if the component is from a library
  return mainComponent.remote !== null;
}