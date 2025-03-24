// Style checking related types
export interface StyleCheckResult {
  node: {
    id: string;
    name: string;
    type: string;
  };
  type: string; // 'fill', 'stroke', 'effect', 'text'
  message: string;
  value: string;
  suggestions?: StyleSuggestion[];
}

export interface StyleSuggestion {
  name: string;
  id: string;
  value: string;
  source: string; // 'Local', 'Remote', 'Library'
}

// Token/variable checking related types
export interface TokenCheckResult {
  node: {
    id: string;
    name: string;
    type: string;
  };
  type: string; // 'color', 'spacing', 'typography', etc.
  message: string;
  value: string;
  suggestions?: TokenSuggestion[];
}

export interface TokenSuggestion {
  name: string;
  id: string;
  value: string;
  distance?: number; // For color suggestions, how close the match is
}

// Component checking related types
export interface ComponentCheckResult {
  node: {
    id: string;
    name: string;
    type: string;
  };
  type: string; // 'detached', 'modified', 'nonLibrary'
  message: string;
  details?: string;
  mainComponentId?: string;
  mainComponentName?: string;
  mainComponent?: ComponentNode | null;
}

// Coverage metrics
export interface CoverageMetrics {
  totalNodes: number;
  libraryComponents: number;
  localComponents: number;
  modifiedComponents: number;
  detachedComponents: number;
  nodesWithStyles: number;
  nodesWithoutStyles: number;
  nodesWithVariables: number;
  nodesWithoutVariables: number;
  componentCoverage: number;
  styleCoverage: number;
  variableCoverage: number;
  overallCoverage: number;
}

// Design library related types
export interface DesignLibrary {
  id: string;
  name: string;
  components: ComponentInfo[];
  styles: StyleInfo[];
  variables: VariableInfo[];
}

export interface ComponentInfo {
  id: string;
  key: string;
  name: string;
}

export interface StyleInfo {
  id: string;
  key: string;
  name: string;
  type: string; // 'PAINT', 'TEXT', 'EFFECT', 'GRID'
}

export interface VariableInfo {
  id: string;
  name: string;
  resolvedType: string;
  collectionName: string;
}

// Plugin message types
export interface PluginMessage {
  type: string;
  payload?: any;
}

// Check results to send to UI
export interface CheckResults {
  componentResults: ComponentCheckResult[];
  styleResults: StyleCheckResult[];
  tokenResults: TokenCheckResult[];
  metrics: CoverageMetrics;
  libraries: DesignLibrary[];
}

// Fix types
export type StyleFix = {
  nodeId: string;
  type: 'style';
  styleType: string; // 'fill', 'stroke', 'effect', 'text'
  style: StyleSuggestion;
};

export type VariableFix = {
  nodeId: string;
  type: 'variable';
  property: string;
  variable: TokenSuggestion;
};

export type ComponentFix = {
  nodeId: string;
  type: 'component';
  fixType: 'reset' | 'swap';
  componentKey?: string;
};

export type Fix = StyleFix | VariableFix | ComponentFix;