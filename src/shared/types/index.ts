// Main types index file
export * from './tokens';

// Design Library types
export interface DesignLibrary {
  id: string;
  key: string;
  name: string;
  type: string;
}

export interface StyleInfo {
  id: string;
  key: string;
  name: string;
  type: string;
}

export interface ComponentInfo {
  id: string;
  key: string;
  name: string;
}

export interface VariableInfo {
  id: string;
  name: string;
  resolvedType: string;
  collectionName?: string;
}

// Style check types
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

// Component check types
export interface ComponentCheckResult {
  node: SceneNode;
  type: string; // 'detached', 'modified', 'nonLibrary'
  message: string;
  details?: string;
  mainComponent?: ComponentNode | null;
  mainComponentId?: string;
  mainComponentName?: string;
}

// Token suggestion
export interface TokenSuggestion {
  name: string;
  id: string;
  value: string;
  distance?: number;
}

// Plugin message types
export interface PluginMessage {
  type: string;
  payload?: any;
}

// Unified check results
export interface CheckResults {
  styleResults: StyleCheckResult[];
  componentResults: ComponentCheckResult[];
  tokenResults: any[]; // Using TokenCheckResult from tokens.ts
  coverage?: any;
  libraries?: any[];
}

// Fix types
export interface Fix {
  type: string;
  nodeId: string;
  property: string;
  value: any;
  styleId?: string;
} 