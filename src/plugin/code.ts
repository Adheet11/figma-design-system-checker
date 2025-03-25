import { traverseNode, isNodeVisible, getSelectedNodesOrAllNodes, createHighlighter } from './utils';
import { checkFills, checkStrokes, checkTextStyles, checkEffects } from './checkers/styleChecker';
import { checkVariables, checkMissingVariables, detectDesignSystemTokens } from './checkers/tokenChecker';
import { checkComponent } from './checkers/componentChecker';
import { calculateCoverage, createCoverageReport } from './analyzers/coverageCalculator';
import { detectTeamLibraries, detectLocalStyleLibraries } from './analyzers/libraryDetector';
import { 
  loadDesignSystemFile, 
  getCachedDesignSystems, 
  getDesignSystemById,
  deleteDesignSystem,
  convertToDesignSystemTokens
} from './designSystemLoader';
import { 
  PluginMessage, 
  CheckResults, 
  Fix, 
  ComponentCheckResult,
  StyleCheckResult, 
  StyleSuggestion,
  TokenSuggestion,
  ComponentCheckResult as UIComponentCheckResult
} from '../shared/types';
import { TokenCheckResult } from '../shared/types/tokens';

// Plugin settings
const PLUGIN_UI_WIDTH = 560;
const PLUGIN_UI_HEIGHT = 640;
const BATCH_SIZE = 50;
const PROCESSING_TIME_LIMIT = 60000; // 60 seconds max processing time

// Active design system ID
let activeDesignSystemId: string | null = null;

// Main plugin function
figma.showUI(__html__, { width: PLUGIN_UI_WIDTH, height: PLUGIN_UI_HEIGHT });

// Handle plugin initialization
figma.ui.onmessage = async (msg: PluginMessage) => {
  try {
    if (msg.type === 'init') {
      // Initialize the plugin
      const cachedSystems = await getCachedDesignSystems();
      const storedActiveId = await figma.clientStorage.getAsync('activeDesignSystemId');
      
      activeDesignSystemId = storedActiveId || null;
      
      // Send cached design systems to UI
      figma.ui.postMessage({
        type: 'designSystemsLoaded',
        payload: {
          systems: cachedSystems,
          activeId: activeDesignSystemId
        }
      });
      
    } else if (msg.type === 'loadDesignSystem') {
      // Load a design system
      const fileKey = msg.payload.fileKey;
      const designSystem = await loadDesignSystemFile(fileKey);
      
      if (designSystem) {
        // Set as active design system
        activeDesignSystemId = designSystem.id;
        await figma.clientStorage.setAsync('activeDesignSystemId', activeDesignSystemId);
        
        // Send updated design systems to UI
        const cachedSystems = await getCachedDesignSystems();
        figma.ui.postMessage({
          type: 'designSystemsLoaded',
          payload: {
            systems: cachedSystems,
            activeId: activeDesignSystemId
          }
        });
      }
      
    } else if (msg.type === 'setActiveDesignSystem') {
      // Set active design system
      activeDesignSystemId = msg.payload.id;
      await figma.clientStorage.setAsync('activeDesignSystemId', activeDesignSystemId);
      
      figma.ui.postMessage({
        type: 'activeDesignSystemChanged',
        payload: {
          activeId: activeDesignSystemId
        }
      });
      
    } else if (msg.type === 'deleteDesignSystem') {
      // Delete a design system
      await deleteDesignSystem(msg.payload.id);
      
      // If deleted was active, clear active
      if (activeDesignSystemId === msg.payload.id) {
        activeDesignSystemId = null;
        await figma.clientStorage.setAsync('activeDesignSystemId', null);
      }
      
      // Send updated design systems to UI
      const cachedSystems = await getCachedDesignSystems();
      figma.ui.postMessage({
        type: 'designSystemsLoaded',
        payload: {
          systems: cachedSystems,
          activeId: activeDesignSystemId
        }
      });
      
    } else if (msg.type === 'checkDesignSystem') {
      // Show loading message
      figma.notify('Analyzing design system usage...', { timeout: 10000 });
      
      // Check if scope is specified
      const scope = msg.payload?.options?.scope || 'selection';
      const scanHidden = msg.payload?.options?.includeHidden || false;
      
      // Start the analysis
      await runDesignSystemCheck(msg.payload?.options, scope, scanHidden);
      
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
      
      // Re-run check after applying a fix - use current scope
      await runDesignSystemCheck(undefined, 'current', false);
      
    } else if (msg.type === 'applyBatchFixes') {
      await applyBatchFixes(msg.payload.fixes);
      
    } else if (msg.type === 'exportReport') {
      exportCoverageReport(msg.payload.metrics);
      
    } else if (msg.type === 'close') {
      figma.closePlugin();
    }
  } catch (error: any) {
    console.error("Error handling message:", error);
    figma.notify("An unexpected error occurred", { error: true });
    
    // Send error to UI for display
    figma.ui.postMessage({
      type: "error",
      payload: { message: error.message || "Unknown error" }
    });
  }
};

// Get nodes based on scope
function getNodesForScope(scope: string): SceneNode[] {
  if (scope === 'selection' && figma.currentPage.selection.length > 0) {
    return [...figma.currentPage.selection];
  } else if (scope === 'page' || 
            (scope === 'selection' && figma.currentPage.selection.length === 0)) {
    return [...figma.currentPage.children];
  } else if (scope === 'document') {
    // Get all nodes from all pages (slower)
    const allNodes: SceneNode[] = [];
    for (const page of figma.root.children) {
      allNodes.push(...page.children);
    }
    return allNodes;
  }
  
  // Default to current page
  return [...figma.currentPage.children];
}

// Run the design system check
async function runDesignSystemCheck(options?: any, scope: string = 'selection', scanHidden: boolean = false): Promise<void> {
  try {
    // Check if we have an active design system
    let designSystem = null;
    let designTokens = null;
    
    if (activeDesignSystemId) {
      designSystem = await getDesignSystemById(activeDesignSystemId);
      
      if (designSystem) {
        // Convert to format needed by checkers
        designTokens = convertToDesignSystemTokens(designSystem);
      } else {
        // If no design system loaded, fallback to detecting tokens
        designTokens = await detectDesignSystemTokens();
      }
    } else {
      // If no design system loaded, fallback to detecting tokens
      designTokens = await detectDesignSystemTokens();
    }
    
    // Get nodes based on scope
    const nodes = getNodesForScope(scope);
    
    // Show progress notification
    figma.notify(`Analyzing design system usage (${scope} scope)...`, { timeout: 10000 });
    
    // Detect local libraries
    const localStyleLibraries = detectLocalStyleLibraries();
    let allLibraries = [...localStyleLibraries];
    
    // Only detect team libraries if no design system is loaded or if explicitly requested
    if (!designSystem || (options && options.includeTeamLibraries)) {
      const teamLibraries = await detectTeamLibraries();
      allLibraries = [...allLibraries, ...teamLibraries];
    }
    
    // For large files, process in batches with improved performance
    let processedNodes = 0;
    let totalNodes = 0;
    
    // Count total nodes first (but with a limit to avoid performance issues)
    const nodeCountLimit = 1000;
    for (const node of nodes) {
      totalNodes += countNodes(node, nodeCountLimit);
      
      // If we hit the limit, just use the limit as an estimate
      if (totalNodes >= nodeCountLimit) {
        totalNodes = nodeCountLimit;
        break;
      }
    }
    
    // Store all results
    const componentResults: ComponentCheckResult[] = [];
    const styleResults: StyleCheckResult[] = [];
    const tokenResults: TokenCheckResult[] = [];
    
    // Process each node and its children in batches with a processing limit
    const nodeBatchSize = BATCH_SIZE; // Process nodes in each batch
    const startTime = Date.now();
    
    for (const node of nodes) {
      await processBatches(
        node, 
        componentResults, 
        styleResults, 
        tokenResults, 
        designTokens, 
        nodeBatchSize, 
        (processed) => {
          processedNodes += processed;
          // Update progress
          const progressPercent = Math.min(100, Math.round((processedNodes / totalNodes) * 100));
          figma.notify(`Analyzing design system usage: ${progressPercent}%`, { timeout: 10000 });
        },
        scanHidden,
        startTime,
        PROCESSING_TIME_LIMIT
      );
      
      // Check if we've exceeded time limit
      if (Date.now() - startTime > PROCESSING_TIME_LIMIT) {
        figma.notify('Analysis stopped due to time limit - partial results shown', { timeout: 5000 });
        break;
      }
    }
    
    // Convert results to UI format
    const componentResultsForUI = convertComponentResults(componentResults);
    const styleResultsForUI = convertStyleResults(styleResults);
    
    // Calculate coverage metrics
    const metrics = calculateCoverage(nodes, componentResultsForUI, styleResultsForUI, tokenResults);
    
    // Update the coverage metrics with scope information
    if (!metrics.scopeType) {
      // Define these properties if they don't exist
      Object.assign(metrics, {
        scopeType: scope,
        processingTime: Date.now() - startTime,
        nodesProcessed: processedNodes,
        totalNodesEstimate: totalNodes
      });
    } else {
      // Update existing properties
      metrics.scopeType = scope;
      metrics.processingTime = Date.now() - startTime;
      metrics.nodesProcessed = processedNodes;
      metrics.totalNodesEstimate = totalNodes;
    }
    
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
        libraries: allLibraries,
        activeDesignSystem: designSystem
      } as CheckResults
    });
    
    figma.notify('Design system check complete!');
    
  } catch (error) {
    console.error('Error during design system check:', error);
    figma.notify('Error running design system check', { error: true });
  }
}

// Count the total number of nodes in a node and its children, with limit
function countNodes(node: SceneNode, limit: number, count: number = 0): number {
  count += 1; // Count this node
  
  // If we've reached the limit, return immediately
  if (count >= limit) {
    return count;
  }
  
  // If node has children, count them too (up to the limit)
  if ('children' in node) {
    for (const child of node.children) {
      count = countNodes(child as SceneNode, limit, count);
      if (count >= limit) break;
    }
  }
  
  return count;
}

// Process nodes in batches to avoid UI freezing, with time limit
async function processBatches(
  node: SceneNode, 
  componentResults: ComponentCheckResult[], 
  styleResults: StyleCheckResult[], 
  tokenResults: TokenCheckResult[],
  designTokens: any,
  batchSize: number,
  progressCallback: (processed: number) => void,
  scanHidden: boolean,
  startTime: number,
  timeLimit: number
): Promise<void> {
  let nodesToProcess: SceneNode[] = [node];
  let processedInBatch = 0;
  let totalProcessed = 0;
  
  while (nodesToProcess.length > 0) {
    const currentNode = nodesToProcess.shift()!;
    
    // Skip hidden nodes if not scanning hidden
    if (!scanHidden && !isNodeVisible(currentNode)) {
      continue;
    }
    
    // Process the current node
    processNode(currentNode, componentResults, styleResults, tokenResults, designTokens);
    processedInBatch++;
    totalProcessed++;
    
    // If node has children, add them to the list
    if ('children' in currentNode) {
      nodesToProcess = [...nodesToProcess, ...currentNode.children];
    }
    
    // Check if we've exceeded time limit
    if (Date.now() - startTime > timeLimit) {
      if (processedInBatch > 0) {
        progressCallback(processedInBatch);
      }
      return;
    }
    
    // If we've processed enough nodes in this batch, yield to the UI
    if (processedInBatch >= batchSize) {
      progressCallback(processedInBatch);
      processedInBatch = 0;
      // Yield to UI thread
      await new Promise(resolve => setTimeout(resolve, 0));
    }
  }
  
  // Report any remaining processed nodes
  if (processedInBatch > 0) {
    progressCallback(processedInBatch);
  }
}

// Process a single node and its children
function processNode(
  node: SceneNode, 
  componentResults: ComponentCheckResult[], 
  styleResults: StyleCheckResult[],
  tokenResults: TokenCheckResult[],
  designTokens: any
): void {
  try {
    // Check component usage
    if (node.type === 'INSTANCE') {
      const componentChecks = checkComponent(node);
      componentResults.push(...componentChecks);
    }
    
    // Check style usage - wrap in try/catch for each check to avoid failures
    try {
      const fillChecks = checkFills(node);
      styleResults.push(...fillChecks);
    } catch (error) {
      console.warn(`Error checking fills for ${node.name}:`, error);
    }
    
    try {
      const strokeChecks = checkStrokes(node);
      styleResults.push(...strokeChecks);
    } catch (error) {
      console.warn(`Error checking strokes for ${node.name}:`, error);
    }
    
    try {
      const textChecks = checkTextStyles(node);
      styleResults.push(...textChecks);
    } catch (error) {
      console.warn(`Error checking text styles for ${node.name}:`, error);
    }
    
    try {
      const effectChecks = checkEffects(node);
      styleResults.push(...effectChecks);
    } catch (error) {
      console.warn(`Error checking effects for ${node.name}:`, error);
    }
    
    // Check variable/token usage
    try {
      if (designTokens) {
        const variableChecks = checkVariables(node, designTokens);
        tokenResults.push(...variableChecks);
      }
    } catch (error) {
      console.warn(`Error checking variables for ${node.name}:`, error);
    }
    
    try {
      if (designTokens) {
        const missingVariableChecks = checkMissingVariables(node, designTokens);
        tokenResults.push(...missingVariableChecks);
      }
    } catch (error) {
      console.warn(`Error checking missing variables for ${node.name}:`, error);
    }
  } catch (error) {
    console.warn(`Error processing node ${node.name}:`, error);
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
    await runDesignSystemCheck({ visualize: true }, 'page', false);
  } else if (figma.command === 'configure-settings') {
    // Just keep the plugin open for settings configuration
  } else {
    // Default behavior - check for cached design systems
    const cachedSystems = await getCachedDesignSystems();
    const storedActiveId = await figma.clientStorage.getAsync('activeDesignSystemId');
    
    activeDesignSystemId = storedActiveId || null;
    
    // Send cached design systems to UI
    figma.ui.postMessage({
      type: 'designSystemsLoaded',
      payload: {
        systems: cachedSystems,
        activeId: activeDesignSystemId
      }
    });
  }
}

// Convert component results to UI format
function convertComponentResults(results: ComponentCheckResult[]): UIComponentCheckResult[] {
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

// Convert plugin results to UI results
function convertStyleResults(results: StyleCheckResult[]): StyleCheckResult[] {
  return results.map(result => {
    return {
      node: {
        id: result.node.id,
        name: result.node.name,
        type: result.node.type
      },
      type: result.type,
      message: result.message,
      value: result.value,
      suggestions: result.suggestions?.map((suggestion: StyleSuggestion) => ({
        name: suggestion.name,
        id: suggestion.id,
        value: suggestion.value,
        source: suggestion.source
      }))
    };
  });
}

// Batch fix implementation
async function applyBatchFixes(fixes: Fix[]): Promise<void> {
  // Show progress notification
  figma.notify(`Applying ${fixes.length} fixes...`, { timeout: 10000 });
  
  let successCount = 0;
  let failCount = 0;
  
  // Process fixes in smaller batches to avoid UI freezing
  const BATCH_SIZE = 10;
  for (let i = 0; i < fixes.length; i += BATCH_SIZE) {
    const batch = fixes.slice(i, i + BATCH_SIZE);
    
    for (const fix of batch) {
      try {
        await applyFix(fix);
        successCount++;
      } catch (error) {
        console.error(`Error applying fix ${i}:`, error);
        failCount++;
      }
    }
    
    // Update progress
    figma.notify(`Applied ${i + batch.length} of ${fixes.length} fixes...`, { timeout: 10000 });
    
    // Allow UI to update
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  
  // Final notification
  figma.notify(`Applied ${successCount} fixes successfully. ${failCount} fixes failed.`);
  
  // Send summary to UI
  figma.ui.postMessage({
    type: 'batchFixComplete',
    payload: {
      totalFixes: fixes.length,
      successCount,
      failCount
    }
  });
}

// Start plugin
initPlugin();