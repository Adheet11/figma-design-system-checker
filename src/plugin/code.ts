import { traverseNode, isNodeVisible, getSelectedNodesOrAllNodes, createHighlighter } from './utils';
import { checkFills, checkStrokes, checkTextStyles, checkEffects, StyleCheckResult as PluginStyleCheckResult, StyleSuggestion as PluginStyleSuggestion } from './checkers/styleChecker';
import { checkVariables, checkMissingVariables, detectDesignSystemTokens } from './checkers/tokenChecker';
import { checkComponent, ComponentCheckResult as PluginComponentCheckResult } from './checkers/componentChecker';
import { calculateCoverage, createCoverageReport } from './analyzers/coverageCalculator';
import { detectTeamLibraries, detectLocalStyleLibraries } from './analyzers/libraryDetector';
import { 
  PluginMessage, 
  CheckResults, 
  Fix, 
  ComponentCheckResult as UIComponentCheckResult, 
  StyleCheckResult, 
  TokenCheckResult, 
  StyleSuggestion,
  TokenSuggestion
} from '../shared/types';

// Main plugin function
figma.showUI(__html__, { width: 500, height: 600 });

// Handle plugin initialization
figma.ui.onmessage = async (msg: PluginMessage) => {
  if (msg.type === 'checkDesignSystem') {
    // Show loading message
    figma.notify('Analyzing design system usage...', { timeout: 10000 });
    
    // Start the analysis
    await runDesignSystemCheck(msg.payload?.options);
    
  } else if (msg.type === 'highlightNode') {
    const nodeId = msg.payload.nodeId;
    const node = figma.getNodeById(nodeId) as SceneNode;
    
    if (node) {
      // Select and scroll to the node
      figma.currentPage.selection = [node];
      figma.viewport.scrollAndZoomIntoView([node]);
    }
    
  } else if (msg.type === 'applyFix') {
    await applyFix(msg.payload.fix);
    
    // Re-run check after applying a fix
    await runDesignSystemCheck();
    
  } else if (msg.type === 'exportReport') {
    exportCoverageReport(msg.payload.metrics);
    
  } else if (msg.type === 'close') {
    figma.closePlugin();
  }
};

// Run the design system check
async function runDesignSystemCheck(options?: any): Promise<void> {
  try {
    // Get selected nodes or all nodes if nothing is selected
    const nodes = getSelectedNodesOrAllNodes();
    
    // Detect design system libraries
    const teamLibraries = await detectTeamLibraries();
    const localLibraries = detectLocalStyleLibraries();
    const allLibraries = [...teamLibraries, ...localLibraries];
    
    // Get design system tokens
    const designTokens = await detectDesignSystemTokens();
    
    // Store all results
    const componentResults: PluginComponentCheckResult[] = [];
    const styleResults: PluginStyleCheckResult[] = [];
    const tokenResults: TokenCheckResult[] = [];
    
    // Process all nodes
    for (const node of nodes) {
      processNode(node, componentResults, styleResults, tokenResults, designTokens);
    }
    
    // Convert results to UI format
    const componentResultsForUI = convertComponentResults(componentResults);
    const styleResultsForUI = convertStyleResults(styleResults);
    
    // Calculate coverage metrics
    const metrics = calculateCoverage(nodes, componentResultsForUI, styleResultsForUI, tokenResults);
    
    // Visualize issues if enabled
    if (options?.visualize) {
      visualizeIssues(componentResultsForUI, styleResultsForUI, tokenResults);
    }
    
    // Generate visual report if enabled
    if (options?.generateReport && nodes.length > 0) {
      // Find a suitable parent frame
      let parentNode = nodes[0];
      if ('parent' in parentNode && parentNode.parent && parentNode.parent.type === 'FRAME') {
        parentNode = parentNode.parent as FrameNode;
      } else if (parentNode.type !== 'FRAME') {
        // Create a new frame if needed
        const frame = figma.createFrame();
        frame.name = 'Design System Report Frame';
        frame.resize(600, 400);
        parentNode = frame;
      }
      
      createCoverageReport(metrics, parentNode as FrameNode);
    }
    
    // Send results to UI
    figma.ui.postMessage({
      type: 'checkResults',
      payload: {
        componentResults: componentResultsForUI,
        styleResults: styleResultsForUI,
        tokenResults,
        metrics,
        libraries: allLibraries
      } as CheckResults
    });
    
    figma.notify('Design system check complete!');
    
  } catch (error) {
    console.error('Error during design system check:', error);
    figma.notify('Error running design system check', { error: true });
  }
}

// Process a single node and its children
function processNode(
  node: SceneNode, 
  componentResults: PluginComponentCheckResult[], 
  styleResults: PluginStyleCheckResult[],
  tokenResults: TokenCheckResult[],
  designTokens: any
): void {
  // Skip processing if node is not visible
  if (!isNodeVisible(node)) {
    return;
  }
  
  // Check component usage
  if (node.type === 'INSTANCE') {
    const componentChecks = checkComponent(node);
    componentResults.push(...componentChecks);
  }
  
  // Check style usage
  const fillChecks = checkFills(node);
  const strokeChecks = checkStrokes(node);
  const textChecks = checkTextStyles(node);
  const effectChecks = checkEffects(node);
  
  styleResults.push(...fillChecks, ...strokeChecks, ...textChecks, ...effectChecks);
  
  // Check variable/token usage
  const variableChecks = checkVariables(node, designTokens);
  const missingVariableChecks = checkMissingVariables(node, designTokens);
  
  tokenResults.push(...variableChecks, ...missingVariableChecks);
  
  // Recursively process children
  if ('children' in node) {
    for (const child of node.children) {
      processNode(child as SceneNode, componentResults, styleResults, tokenResults, designTokens);
    }
  }
}

// Visualize issues by creating highlighters
function visualizeIssues(
  componentResults: UIComponentCheckResult[], 
  styleResults: StyleCheckResult[],
  tokenResults: TokenCheckResult[]
): void {
  // Remove any existing highlighters
  const existingHighlighters = figma.currentPage.findAll(node => 
    node.type === 'RECTANGLE' && node.name.startsWith('[Issue]')
  );
  
  for (const highlighter of existingHighlighters) {
    highlighter.remove();
  }
  
  // Create group for highlighters
  const highlighterGroup = figma.createFrame();
  highlighterGroup.name = 'Design System Issues';
  highlighterGroup.fills = [];
  highlighterGroup.locked = true;
  highlighterGroup.expanded = false;
  
  // Highlight component issues
  for (const result of componentResults) {
    const node = figma.getNodeById(result.node.id) as SceneNode;
    if (node) {
      const highlighter = createHighlighter(
        node, 
        result.message, 
        { r: 1, g: 0, b: 0 } // Red for component issues
      );
      highlighterGroup.appendChild(highlighter);
    }
  }
  
  // Highlight style issues
  for (const result of styleResults) {
    const node = figma.getNodeById(result.node.id) as SceneNode;
    if (node) {
      const highlighter = createHighlighter(
        node, 
        result.message, 
        { r: 1, g: 0.6, b: 0 } // Orange for style issues
      );
      highlighterGroup.appendChild(highlighter);
    }
  }
  
  // Highlight token issues
  for (const result of tokenResults) {
    const node = figma.getNodeById(result.node.id) as SceneNode;
    if (node) {
      const highlighter = createHighlighter(
        node, 
        result.message,
        { r: 1, g: 0.8, b: 0 } // Yellow for token issues
      );
      highlighterGroup.appendChild(highlighter);
    }
  }
  
  // If no issues, remove empty group
  if (highlighterGroup.children.length === 0) {
    highlighterGroup.remove();
  }
}

// Apply a suggested fix for an issue
async function applyFix(fix: Fix): Promise<void> {
  try {
    const node = figma.getNodeById(fix.nodeId) as SceneNode;
    
    if (!node) {
      figma.notify('Node not found', { error: true });
      return;
    }
    
    // Apply style fix
    if (fix.type === 'style') {
      await applyStyleFix(node, fix);
    }
    // Apply variable fix
    else if (fix.type === 'variable') {
      await applyVariableFix(node, fix);
    }
    // Apply component fix
    else if (fix.type === 'component') {
      await applyComponentFix(node, fix);
    }
    
    figma.notify('Fix applied successfully!');
    
  } catch (error) {
    console.error('Error applying fix:', error);
    figma.notify('Error applying fix', { error: true });
  }
}

// Apply a style fix
async function applyStyleFix(node: SceneNode, fix: any): Promise<void> {
  // Check if we need to import a remote style
  if (fix.style.source !== 'Local') {
    try {
      // Import the style from the library
      const style = await figma.importStyleByKeyAsync(fix.style.key);
      
      // Apply the style based on type
      if (fix.styleType === 'fill' && 'fillStyleId' in node) {
        node.fillStyleId = style.id;
      }
      else if (fix.styleType === 'stroke' && 'strokeStyleId' in node) {
        node.strokeStyleId = style.id;
      }
      else if (fix.styleType === 'effect' && 'effectStyleId' in node) {
        node.effectStyleId = style.id;
      }
      else if (fix.styleType === 'text' && node.type === 'TEXT') {
        node.textStyleId = style.id;
      }
    } catch (error) {
      console.error('Error importing style:', error);
      throw new Error('Failed to import style from library');
    }
  } else {
    // Apply local style
    if (fix.styleType === 'fill' && 'fillStyleId' in node) {
      node.fillStyleId = fix.style.id;
    }
    else if (fix.styleType === 'stroke' && 'strokeStyleId' in node) {
      node.strokeStyleId = fix.style.id;
    }
    else if (fix.styleType === 'effect' && 'effectStyleId' in node) {
      node.effectStyleId = fix.style.id;
    }
    else if (fix.styleType === 'text' && node.type === 'TEXT') {
      node.textStyleId = fix.style.id;
    }
  }
}

// Apply a variable fix
async function applyVariableFix(node: SceneNode, fix: any): Promise<void> {
  const variable = figma.variables.getVariableById(fix.variable.id);
  
  if (!variable) {
    throw new Error('Variable not found');
  }
  
  // Apply the variable based on the property
  switch (fix.property) {
    case 'fills':
      if ('fills' in node) {
        (node as any).setBoundVariable('fills', 0, variable);
      }
      break;
    case 'strokes':
      if ('strokes' in node) {
        (node as any).setBoundVariable('strokes', 0, variable);
      }
      break;
    case 'cornerRadius':
      if ('cornerRadius' in node) {
        (node as any).setBoundVariable('cornerRadius', variable);
      }
      break;
    case 'topLeftRadius':
    case 'topRightRadius':
    case 'bottomLeftRadius':
    case 'bottomRightRadius':
      if (fix.property in node) {
        (node as any).setBoundVariable(fix.property, variable);
      }
      break;
    default:
      throw new Error(`Unsupported property: ${fix.property}`);
  }
}

// Apply a component fix
async function applyComponentFix(node: SceneNode, fix: any): Promise<void> {
  if (node.type !== 'INSTANCE') {
    throw new Error('Node is not an instance');
  }
  
  if (fix.fixType === 'reset') {
    // Reset component overrides
    node.resetOverrides();
  }
  else if (fix.fixType === 'swap') {
    // Swap with a component from library
    try {
      const mainComponent = await figma.importComponentByKeyAsync(fix.componentKey);
      const newInstance = mainComponent.createInstance();
      
      // Copy position and size
      newInstance.x = node.x;
      newInstance.y = node.y;
      newInstance.resize(node.width, node.height);
      
      // Insert in same position in layer order
      if (node.parent) {
        const index = node.parent.children.indexOf(node);
        node.parent.insertChild(index, newInstance);
      }
      
      // Remove old instance
      node.remove();
    } catch (error) {
      console.error('Error swapping component:', error);
      throw new Error('Failed to swap component');
    }
  }
}

// Export coverage report as a JSON file
function exportCoverageReport(metrics: any): void {
  figma.ui.postMessage({
    type: 'exportReportData',
    payload: JSON.stringify(metrics, null, 2)
  });
}

// Initialize plugin
async function initPlugin(): Promise<void> {
  // Check which command was used
  if (figma.command === 'check-design-system') {
    await runDesignSystemCheck({ visualize: true });
  } else if (figma.command === 'configure-settings') {
    // Just keep the plugin open for settings configuration
  } else {
    // Default behavior - run check without visualization
    await runDesignSystemCheck();
  }
}

// Start plugin
initPlugin();

// Convert internal plugin ComponentCheckResult to the format expected by the UI
function convertComponentResults(results: PluginComponentCheckResult[]): UIComponentCheckResult[] {
  return results.map(result => ({
    node: {
      id: result.node.id,
      name: result.node.name,
      type: result.node.type
    },
    type: result.type,
    message: result.message,
    details: result.details,
    mainComponent: result.mainComponent,
    mainComponentId: result.mainComponent?.id,
    mainComponentName: result.mainComponent?.name
  }));
}

// Convert plugin StyleCheckResult to UI format
function convertStyleResults(results: PluginStyleCheckResult[]): StyleCheckResult[] {
  return results.map(result => ({
    node: {
      id: result.node.id,
      name: result.node.name,
      type: result.node.type
    },
    type: result.type,
    message: result.message,
    value: result.value,
    suggestions: result.suggestions?.map(suggestion => ({
      name: suggestion.name,
      id: suggestion.id,
      value: suggestion.value,
      source: suggestion.source
    }))
  }));
}