// Helper function to check if a node is visible (not hidden)
export function isNodeVisible(node: SceneNode): boolean {
  return node.visible;
}

// Helper function to traverse the node tree, skipping hidden layers
export function traverseNode(
  node: BaseNode,
  callback: (node: SceneNode) => void,
  shouldSkipChildren?: (node: SceneNode) => boolean
): void {
  // Skip if the node is not visible
  if ('visible' in node && !isNodeVisible(node as SceneNode)) {
    return;
  }

  // Call the callback if the node is a SceneNode
  if ('type' in node) {
    callback(node as SceneNode);
  }

  // Skip children if shouldSkipChildren returns true
  if (shouldSkipChildren && 'type' in node && shouldSkipChildren(node as SceneNode)) {
    return;
  }

  // Traverse children if the node has children
  if ('children' in node) {
    for (const child of (node as any).children) {
      traverseNode(child, callback, shouldSkipChildren);
    }
  }
}

// Helper function to get all nodes in the current selection or the entire page
export function getSelectedNodesOrAllNodes(): SceneNode[] {
  if (figma.currentPage.selection.length > 0) {
    // Create a new array from the readonly selection array
    return [...figma.currentPage.selection];
  } else {
    // Create a new array from the readonly children array
    return [...figma.currentPage.children];
  }
}

// Convert color to hex string
export function colorToHex(color: RGB | RGBA): string {
  const r = Math.round(color.r * 255);
  const g = Math.round(color.g * 255);
  const b = Math.round(color.b * 255);
  
  const rHex = r.toString(16).padStart(2, '0');
  const gHex = g.toString(16).padStart(2, '0');
  const bHex = b.toString(16).padStart(2, '0');
  
  return `#${rHex}${gHex}${bHex}`;
}

// Compare two colors for similarity
export function colorsAreEqual(color1: RGB | RGBA, color2: RGB | RGBA, threshold: number = 0.01): boolean {
  const rDiff = Math.abs((color1.r || 0) - (color2.r || 0));
  const gDiff = Math.abs((color1.g || 0) - (color2.g || 0));
  const bDiff = Math.abs((color1.b || 0) - (color2.b || 0));
  
  // Check alpha if both colors have it
  let aDiff = 0;
  if ('a' in color1 && 'a' in color2) {
    aDiff = Math.abs((color1 as RGBA).a - (color2 as RGBA).a);
  }
  
  return rDiff <= threshold && gDiff <= threshold && bDiff <= threshold && aDiff <= threshold;
}

// Determine the closest color from a list of colors
export function findClosestColor(
  color: RGB | RGBA, 
  colorList: Array<{id: string, color: RGB | RGBA, name: string}>
): {id: string, color: RGB | RGBA, name: string, distance: number} | null {
  if (colorList.length === 0) {
    return null;
  }

  let closest = null;
  let closestDistance = Number.MAX_VALUE;

  for (const item of colorList) {
    const distance = colorDistance(color, item.color);
    if (distance < closestDistance) {
      closestDistance = distance;
      closest = {...item, distance};
    }
  }

  return closest;
}

// Calculate color distance (Euclidean distance in RGB space)
function colorDistance(color1: RGB | RGBA, color2: RGB | RGBA): number {
  const rDiff = (color1.r - color2.r) * (color1.r - color2.r);
  const gDiff = (color1.g - color2.g) * (color1.g - color2.g);
  const bDiff = (color1.b - color2.b) * (color1.b - color2.b);
  
  let aDiff = 0;
  if ('a' in color1 && 'a' in color2) {
    aDiff = ((color1 as RGBA).a - (color2 as RGBA).a) * ((color1 as RGBA).a - (color2 as RGBA).a);
    return Math.sqrt(rDiff + gDiff + bDiff + aDiff);
  }
  
  return Math.sqrt(rDiff + gDiff + bDiff);
}

// Get parent node
export function getParentNode(node: BaseNode): BaseNode | null {
  return node.parent;
}

// Create highlighter rectangle for visualizing errors
export function createHighlighter(node: SceneNode, message: string, color: RGB = {r: 1, g: 0, b: 0}): RectangleNode {
  const highlighter = figma.createRectangle();
  highlighter.name = `[Issue] ${message} - ${node.name}`;
  
  // Position and size
  highlighter.resize(node.width + 4, node.height + 4);
  highlighter.x = node.absoluteTransform[0][2] - 2;
  highlighter.y = node.absoluteTransform[1][2] - 2;
  
  // Appearance
  highlighter.fills = [{ type: 'SOLID', color: {r: 0, g: 0, b: 0}, opacity: 0 }];
  highlighter.strokes = [{ type: 'SOLID', color: color }];
  highlighter.strokeWeight = 2;
  highlighter.dashPattern = [4, 4];
  
  return highlighter;
}

// Serialize node data for UI communication
export function serializeNode(node: SceneNode): any {
  return {
    id: node.id,
    name: node.name,
    type: node.type
  };
}