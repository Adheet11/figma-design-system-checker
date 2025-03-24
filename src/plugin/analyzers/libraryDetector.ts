// Interface for storing available design libraries
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
  
  // Get available team libraries in the current file
  export async function detectTeamLibraries(): Promise<DesignLibrary[]> {
    const libraries: DesignLibrary[] = [];
    
    // Load available libraries
    try {
      const availableLibraries = await figma.teamLibrary.getAvailableLibrariesAsync();
      
      for (const library of availableLibraries) {
        // Test if this is a design system library based on naming conventions
        const isDesignSystem = library.name.includes('Design System') || 
                             library.name.includes('DS') || 
                             library.name.includes('Tokens') ||
                             library.name.includes('Components');
        
        if (isDesignSystem) {
          libraries.push({
            id: library.key,
            name: library.name,
            components: [],
            styles: [],
            variables: []
          });
        }
      }
      
      // Load component details for each library
      for (const library of libraries) {
        await loadLibraryComponents(library);
        await loadLibraryStyles(library);
      }
    } catch (error) {
      console.error('Error detecting libraries:', error);
    }
    
    return libraries;
  }
  
  // Load components from a team library
  async function loadLibraryComponents(library: DesignLibrary): Promise<void> {
    try {
      const componentMetadata = await figma.teamLibrary.getComponentMetadataAsync(library.id);
      
      for (const component of componentMetadata) {
        library.components.push({
          id: component.key,
          key: component.key,
          name: component.name
        });
      }
    } catch (error) {
      console.error(`Error loading components for library ${library.name}:`, error);
    }
  }
  
  // Load styles from a team library
  async function loadLibraryStyles(library: DesignLibrary): Promise<void> {
    try {
      const styleMetadata = await figma.teamLibrary.getStyleMetadataAsync(library.id);
      
      for (const style of styleMetadata) {
        library.styles.push({
          id: style.key,
          key: style.key,
          name: style.name,
          type: style.styleType
        });
      }
    } catch (error) {
      console.error(`Error loading styles for library ${library.name}:`, error);
    }
  }
  
  // Detect local style libraries
  export function detectLocalStyleLibraries(): DesignLibrary[] {
    const libraries: DesignLibrary[] = [];
    
    // Check if the current file appears to be a design system file
    const paintStyles = figma.getLocalPaintStyles();
    const textStyles = figma.getLocalTextStyles();
    const effectStyles = figma.getLocalEffectStyles();
    const gridStyles = figma.getLocalGridStyles();
    const collections = figma.variables.getLocalVariableCollections();
    
    // If this file has a significant number of styles/components, it might be a design system
    const hasSignificantStyles = 
      paintStyles.length + textStyles.length + effectStyles.length + gridStyles.length > 30;
    
    const hasSignificantComponents = 
      figma.root.findAllWithCriteria({ types: ['COMPONENT', 'COMPONENT_SET'] }).length > 10;
    
    const hasVariableCollections = collections.length > 0;
    
    if (hasSignificantStyles || hasSignificantComponents || hasVariableCollections) {
      const library: DesignLibrary = {
        id: 'local',
        name: figma.root.name,
        components: [],
        styles: [],
        variables: []
      };
      
      // Add components
      const components = figma.root.findAllWithCriteria({ types: ['COMPONENT'] });
      for (const component of components) {
        library.components.push({
          id: component.id,
          key: component.key,
          name: component.name
        });
      }
      
      // Add styles
      for (const style of paintStyles) {
        library.styles.push({
          id: style.id,
          key: style.key,
          name: style.name,
          type: 'PAINT'
        });
      }
      
      for (const style of textStyles) {
        library.styles.push({
          id: style.id,
          key: style.key,
          name: style.name,
          type: 'TEXT'
        });
      }
      
      for (const style of effectStyles) {
        library.styles.push({
          id: style.id,
          key: style.key,
          name: style.name,
          type: 'EFFECT'
        });
      }
      
      for (const style of gridStyles) {
        library.styles.push({
          id: style.id,
          key: style.key,
          name: style.name,
          type: 'GRID'
        });
      }
      
      // Add variables
      for (const collection of collections) {
        const variables = figma.variables.getVariablesByCollection(collection.id);
        
        for (const variable of variables) {
          library.variables.push({
            id: variable.id,
            name: variable.name,
            resolvedType: variable.resolvedType,
            collectionName: collection.name
          });
        }
      }
      
      libraries.push(library);
    }
    
    return libraries;
  }
  
  // Categorize a design library's variables into token types
  export function categorizeLibraryTokens(library: DesignLibrary): {
    colorTokens: VariableInfo[],
    typographyTokens: VariableInfo[],
    spacingTokens: VariableInfo[],
    borderRadiusTokens: VariableInfo[],
    shadowTokens: VariableInfo[]
  } {
    const result = {
      colorTokens: [] as VariableInfo[],
      typographyTokens: [] as VariableInfo[],
      spacingTokens: [] as VariableInfo[],
      borderRadiusTokens: [] as VariableInfo[],
      shadowTokens: [] as VariableInfo[]
    };
    
    for (const variable of library.variables) {
      const name = variable.name.toLowerCase();
      
      // Categorize based on naming conventions and resolved type
      if (name.includes('color') || name.includes('fill') || name.includes('background') || 
          variable.resolvedType === 'COLOR') {
        result.colorTokens.push(variable);
      } 
      else if (name.includes('spacing') || name.includes('space') || name.includes('gap') || 
               name.includes('padding') || name.includes('margin')) {
        result.spacingTokens.push(variable);
      }
      else if (name.includes('radius') || name.includes('corner')) {
        result.borderRadiusTokens.push(variable);
      }
      else if (name.includes('shadow') || name.includes('elevation')) {
        result.shadowTokens.push(variable);
      }
      else if (name.includes('type') || name.includes('font') || name.includes('text') || 
               name.includes('typography')) {
        result.typographyTokens.push(variable);
      }
    }
    
    return result;
  }