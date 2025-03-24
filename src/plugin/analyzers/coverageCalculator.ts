import { traverseNode, isNodeVisible } from '../utils';
import { ComponentCheckResult, StyleCheckResult, TokenCheckResult } from '../../shared/types';

// Interface for coverage metrics
export interface CoverageMetrics {
  // Nodes
  totalNodes: number;
  
  // Components
  libraryComponents: number;
  localComponents: number;
  modifiedComponents: number;
  detachedComponents: number;
  
  // Styles
  nodesWithStyles: number;
  nodesWithoutStyles: number;
  
  // Variables
  nodesWithVariables: number;
  nodesWithoutVariables: number;
  
  // Coverage percentages
  componentCoverage: number;
  styleCoverage: number;
  variableCoverage: number;
  overallCoverage: number;
}

// Calculate coverage metrics for a set of results
export function calculateCoverage(
  nodes: SceneNode[],
  componentResults: ComponentCheckResult[],
  styleResults: StyleCheckResult[],
  tokenResults: TokenCheckResult[]
): CoverageMetrics {
  // Initial metrics
  const metrics: CoverageMetrics = {
    totalNodes: 0,
    libraryComponents: 0,
    localComponents: 0,
    modifiedComponents: 0,
    detachedComponents: 0,
    
    nodesWithStyles: 0,
    nodesWithoutStyles: 0,
    
    nodesWithVariables: 0,
    nodesWithoutVariables: 0,
    
    componentCoverage: 0,
    styleCoverage: 0,
    variableCoverage: 0,
    overallCoverage: 0
  };
  
  // Set of nodes already processed to avoid double counting
  const processedNodes = new Set<string>();
  
  // Count all visible nodes and check each for styles, variables
  for (const rootNode of nodes) {
    traverseNode(
      rootNode,
      (node: SceneNode) => {
        // Skip if already processed
        if (processedNodes.has(node.id)) return;
        processedNodes.add(node.id);
        
        metrics.totalNodes++;
        
        // Count component instances
        if (node.type === 'INSTANCE') {
          const instance = node as InstanceNode;
          if (instance.mainComponent?.remote) {
            metrics.libraryComponents++;
          } else if (instance.mainComponent) {
            metrics.localComponents++;
          }
        }
        
        // Count nodes with styles
        const hasStyles = 
          ('fillStyleId' in node && node.fillStyleId && typeof node.fillStyleId !== 'symbol') ||
          ('strokeStyleId' in node && node.strokeStyleId && typeof node.strokeStyleId !== 'symbol') ||
          ('effectStyleId' in node && node.effectStyleId && typeof node.effectStyleId !== 'symbol') ||
          (node.type === 'TEXT' && node.textStyleId && typeof node.textStyleId !== 'symbol');
        
        if (hasStyles) {
          metrics.nodesWithStyles++;
        } else if (
          ('fills' in node && node.fills && typeof node.fills !== 'symbol' && (node.fills as Paint[]).length > 0) ||
          ('strokes' in node && node.strokes && typeof node.strokes !== 'symbol' && (node.strokes as Paint[]).length > 0) ||
          ('effects' in node && node.effects && typeof node.effects !== 'symbol' && (node.effects as Effect[]).length > 0) ||
          (node.type === 'TEXT')
        ) {
          metrics.nodesWithoutStyles++;
        }
        
        // Count nodes with variables
        const hasVariables = 'boundVariables' in node && 
                           node.boundVariables && 
                           Object.keys(node.boundVariables).length > 0;
        
        if (hasVariables) {
          metrics.nodesWithVariables++;
        } else {
          // Only count as missing variables if the node has properties that could use variables
          if (
            ('cornerRadius' in node && node.cornerRadius && node.cornerRadius !== 0 && typeof node.cornerRadius !== 'symbol') ||
            ('fills' in node && node.fills && typeof node.fills !== 'symbol' && (node.fills as Paint[]).some(f => f.type === 'SOLID')) ||
            ('strokes' in node && node.strokes && typeof node.strokes !== 'symbol' && (node.strokes as Paint[]).some(s => s.type === 'SOLID'))
          ) {
            metrics.nodesWithoutVariables++;
          }
        }
      },
      (node: SceneNode) => {
        // Skip children of library components to avoid counting their internals
        if (node.type === 'INSTANCE' && (node as InstanceNode).mainComponent?.remote) {
          return true;
        }
        return false;
      }
    );
  }
  
  // Process component results to count modified/detached components
  for (const result of componentResults) {
    if (result.type === 'detached') {
      metrics.detachedComponents++;
      // Correct the libraryComponents count
      metrics.libraryComponents--;
    } 
    else if (result.type.startsWith('modified')) {
      // Only count each modified component once
      if (!processedNodes.has('modified-' + result.node.id)) {
        processedNodes.add('modified-' + result.node.id);
        metrics.modifiedComponents++;
      }
    }
  }
  
  // Calculate coverage percentages
  if (metrics.libraryComponents + metrics.localComponents + metrics.detachedComponents > 0) {
    metrics.componentCoverage = (metrics.libraryComponents / 
      (metrics.libraryComponents + metrics.localComponents + metrics.detachedComponents)) * 100;
  }
  
  if (metrics.nodesWithStyles + metrics.nodesWithoutStyles > 0) {
    metrics.styleCoverage = (metrics.nodesWithStyles / 
      (metrics.nodesWithStyles + metrics.nodesWithoutStyles)) * 100;
  }
  
  if (metrics.nodesWithVariables + metrics.nodesWithoutVariables > 0) {
    metrics.variableCoverage = (metrics.nodesWithVariables / 
      (metrics.nodesWithVariables + metrics.nodesWithoutVariables)) * 100;
  }
  
  // Calculate overall coverage as weighted average
  const totalMetrics = 
    metrics.libraryComponents + metrics.localComponents + metrics.detachedComponents +
    metrics.nodesWithStyles + metrics.nodesWithoutStyles +
    metrics.nodesWithVariables + metrics.nodesWithoutVariables;
    
  const compliantMetrics = 
    metrics.libraryComponents + 
    metrics.nodesWithStyles + 
    metrics.nodesWithVariables;
  
  if (totalMetrics > 0) {
    metrics.overallCoverage = (compliantMetrics / totalMetrics) * 100;
  }
  
  return metrics;
}

// Create a visual coverage report
export function createCoverageReport(metrics: CoverageMetrics, parentFrame: FrameNode): void {
  // Create report frame
  const reportFrame = figma.createFrame();
  reportFrame.name = 'Design System Coverage Report';
  reportFrame.resize(320, 400);
  reportFrame.fills = [{ type: 'SOLID', color: { r: 1, g: 1, b: 1 } }];
  reportFrame.cornerRadius = 8;
  reportFrame.x = parentFrame.x + parentFrame.width + 40;
  reportFrame.y = parentFrame.y;
  
  // Add header
  const header = figma.createFrame();
  header.name = 'Header';
  header.resize(320, 60);
  header.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.9, b: 0.9 } }];
  header.x = 0;
  header.y = 0;
  reportFrame.appendChild(header);
  
  // Add title
  const title = figma.createText();
  title.characters = 'Design System Coverage';
  title.fontSize = 18;
  title.x = 16;
  title.y = 16;
  title.fontName = { family: 'Inter', style: 'Medium' };
  header.appendChild(title);
  
  // Add overall coverage indicator
  const overall = figma.createFrame();
  overall.name = 'Overall Coverage';
  overall.resize(288, 80);
  overall.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
  overall.cornerRadius = 4;
  overall.x = 16;
  overall.y = 76;
  reportFrame.appendChild(overall);
  
  const overallTitle = figma.createText();
  overallTitle.characters = 'Overall Coverage';
  overallTitle.fontSize = 14;
  overallTitle.x = 16;
  overallTitle.y = 16;
  overallTitle.fontName = { family: 'Inter', style: 'Medium' };
  overall.appendChild(overallTitle);
  
  const overallValue = figma.createText();
  overallValue.characters = `${metrics.overallCoverage.toFixed(1)}%`;
  overallValue.fontSize = 24;
  overallValue.x = 16;
  overallValue.y = 40;
  overallValue.fontName = { family: 'Inter', style: 'Bold' };
  
  // Set color based on coverage
  if (metrics.overallCoverage < 50) {
    overallValue.fills = [{ type: 'SOLID', color: { r: 0.9, g: 0.3, b: 0.3 } }];
  } else if (metrics.overallCoverage < 80) {
    overallValue.fills = [{ type: 'SOLID', color: { r: 1, g: 0.6, b: 0.1 } }];
  } else {
    overallValue.fills = [{ type: 'SOLID', color: { r: 0.3, g: 0.7, b: 0.3 } }];
  }
  
  overall.appendChild(overallValue);
  
  // Create metrics grid
  const metricsFrame = figma.createFrame();
  metricsFrame.name = 'Metrics';
  metricsFrame.resize(288, 228);
  metricsFrame.fills = [];
  metricsFrame.layoutMode = 'VERTICAL';
  metricsFrame.primaryAxisSizingMode = 'AUTO';
  metricsFrame.counterAxisSizingMode = 'FIXED';
  metricsFrame.itemSpacing = 8;
  metricsFrame.x = 16;
  metricsFrame.y = 172;
  reportFrame.appendChild(metricsFrame);
  
  // Add metrics
  addMetricRow(metricsFrame, 'Component Coverage', `${metrics.componentCoverage.toFixed(1)}%`, getColorForCoverage(metrics.componentCoverage));
  addMetricRow(metricsFrame, 'Library Components', metrics.libraryComponents.toString(), { r: 0, g: 0, b: 0 });
  addMetricRow(metricsFrame, 'Local Components', metrics.localComponents.toString(), { r: 0, g: 0, b: 0 });
  addMetricRow(metricsFrame, 'Modified Components', metrics.modifiedComponents.toString(), { r: 0, g: 0, b: 0 });
  addMetricRow(metricsFrame, 'Style Coverage', `${metrics.styleCoverage.toFixed(1)}%`, getColorForCoverage(metrics.styleCoverage));
  addMetricRow(metricsFrame, 'Variable Coverage', `${metrics.variableCoverage.toFixed(1)}%`, getColorForCoverage(metrics.variableCoverage));
  addMetricRow(metricsFrame, 'Total Nodes', metrics.totalNodes.toString(), { r: 0, g: 0, b: 0 });
}

// Helper to add a metric row
function addMetricRow(parent: FrameNode, label: string, value: string, color: RGB): void {
  const row = figma.createFrame();
  row.name = label;
  row.resize(288, 28);
  row.fills = [{ type: 'SOLID', color: { r: 0.95, g: 0.95, b: 0.95 } }];
  row.cornerRadius = 4;
  row.layoutMode = 'HORIZONTAL';
  row.counterAxisAlignItems = 'CENTER';
  row.primaryAxisSizingMode = 'FIXED';
  row.counterAxisSizingMode = 'AUTO';
  row.paddingLeft = 12;
  row.paddingRight = 12;
  parent.appendChild(row);
  
  const labelText = figma.createText();
  labelText.characters = label;
  labelText.fontSize = 12;
  labelText.fontName = { family: 'Inter', style: 'Regular' };
  row.appendChild(labelText);
  
  const valueText = figma.createText();
  valueText.characters = value;
  valueText.fontSize = 12;
  valueText.fontName = { family: 'Inter', style: 'Medium' };
  valueText.fills = [{ type: 'SOLID', color: color }];
  valueText.layoutAlign = 'STRETCH';
  valueText.textAlignHorizontal = 'RIGHT';
  row.appendChild(valueText);
}

// Helper to get color based on coverage
function getColorForCoverage(coverage: number): RGB {
  if (coverage < 50) {
    return { r: 0.9, g: 0.3, b: 0.3 };
  } else if (coverage < 80) {
    return { r: 1, g: 0.6, b: 0.1 };
  } else {
    return { r: 0.3, g: 0.7, b: 0.3 };
  }
}

// Check if the node has a style applied
export function hasStyle(node: SceneNode): boolean {
  return Boolean(
    ('fillStyleId' in node && node.fillStyleId && typeof node.fillStyleId !== 'symbol') ||
    ('strokeStyleId' in node && node.strokeStyleId && typeof node.strokeStyleId !== 'symbol') ||
    ('effectStyleId' in node && node.effectStyleId && typeof node.effectStyleId !== 'symbol') ||
    (node.type === 'TEXT' && node.textStyleId && typeof node.textStyleId !== 'symbol')
  );
}

// Check if the node has a custom style that's not using a library style
export function hasCustomStyle(node: SceneNode): boolean {
  return Boolean(
    ('fills' in node && node.fills && typeof node.fills !== 'symbol' && (node.fills as Paint[]).length > 0) ||
    ('strokes' in node && node.strokes && typeof node.strokes !== 'symbol' && (node.strokes as Paint[]).length > 0) ||
    ('effects' in node && node.effects && typeof node.effects !== 'symbol' && (node.effects as Effect[]).length > 0) ||
    (node.type === 'TEXT' && node.fontSize && node.fontName)
  );
}