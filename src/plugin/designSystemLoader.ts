import { DesignLibrary, StyleInfo, ComponentInfo, VariableInfo } from '../shared/types';
import { DesignSystemTokens } from '../shared/types/tokens';

// Type definitions
interface CachedDesignSystem {
  id: string;
  name: string;
  lastUpdated: number;
  components: ComponentInfo[];
  styles: StyleInfo[];
  variables: VariableInfo[];
  categorizedTokens: {
    colorTokens: VariableInfo[];
    typographyTokens: VariableInfo[];
    spacingTokens: VariableInfo[];
    borderRadiusTokens: VariableInfo[];
    shadowTokens: VariableInfo[];
  };
}

// Local storage key for cached design systems
const DESIGN_SYSTEMS_STORAGE_KEY = 'cachedDesignSystems';

// Load a design system file by its key
export async function loadDesignSystemFile(fileKey: string): Promise<CachedDesignSystem | null> {
  try {
    figma.notify('Loading design system...', { timeout: 60000 });
    
    // Get file from Figma libraries
    const libraries = await figma.teamLibrary.getAvailableLibrariesAsync();
    const library = libraries.find(lib => lib.key === fileKey);
    
    if (!library) {
      figma.notify('Design system file not found', { error: true });
      return null;
    }
    
    // Create a new cached design system
    const designSystem: CachedDesignSystem = {
      id: fileKey,
      name: library.name,
      lastUpdated: Date.now(),
      components: [],
      styles: [],
      variables: [],
      categorizedTokens: {
        colorTokens: [],
        typographyTokens: [],
        spacingTokens: [],
        borderRadiusTokens: [],
        shadowTokens: []
      }
    };
    
    // Load components
    try {
      const componentMetadata = await figma.teamLibrary.getComponentMetadataAsync(fileKey);
      
      for (const component of componentMetadata) {
        designSystem.components.push({
          id: component.key,
          key: component.key,
          name: component.name
        });
      }
    } catch (error) {
      console.error('Error loading components:', error);
    }
    
    // Load styles
    try {
      const styleMetadata = await figma.teamLibrary.getStyleMetadataAsync(fileKey);
      
      for (const style of styleMetadata) {
        designSystem.styles.push({
          id: style.key,
          key: style.key,
          name: style.name,
          type: style.styleType
        });
      }
    } catch (error) {
      console.error('Error loading styles:', error);
    }
    
    // Save to cache and return
    await saveDesignSystemToCache(designSystem);
    return designSystem;
  } catch (error) {
    console.error('Error loading design system file:', error);
    return null;
  }
}

// Save design system to client storage
async function saveDesignSystemToCache(designSystem: CachedDesignSystem): Promise<void> {
  try {
    const existingData = await figma.clientStorage.getAsync(DESIGN_SYSTEMS_STORAGE_KEY) || [];
    const index = existingData.findIndex((ds: CachedDesignSystem) => ds.id === designSystem.id);
    
    if (index >= 0) {
      existingData[index] = designSystem;
    } else {
      existingData.push(designSystem);
    }
    
    await figma.clientStorage.setAsync(DESIGN_SYSTEMS_STORAGE_KEY, existingData);
  } catch (error) {
    console.error('Error saving design system to cache:', error);
  }
}

// Get all cached design systems
export async function getCachedDesignSystems(): Promise<CachedDesignSystem[]> {
  try {
    const cachedSystems = await figma.clientStorage.getAsync(DESIGN_SYSTEMS_STORAGE_KEY) || [];
    return cachedSystems;
  } catch (error) {
    console.error('Error getting cached design systems:', error);
    return [];
  }
}

// Delete a cached design system
export async function deleteDesignSystem(fileKey: string): Promise<void> {
  try {
    const existingData = await figma.clientStorage.getAsync(DESIGN_SYSTEMS_STORAGE_KEY) || [];
    const updatedData = existingData.filter((ds: CachedDesignSystem) => ds.id !== fileKey);
    await figma.clientStorage.setAsync(DESIGN_SYSTEMS_STORAGE_KEY, updatedData);
  } catch (error) {
    console.error('Error deleting design system:', error);
  }
}

// Get a cached design system by ID
export async function getDesignSystemById(fileKey: string): Promise<CachedDesignSystem | null> {
  try {
    const cachedSystems = await getCachedDesignSystems();
    return cachedSystems.find(ds => ds.id === fileKey) || null;
  } catch (error) {
    console.error('Error getting design system by ID:', error);
    return null;
  }
}

// Convert cached design system to format needed by checkers
export function convertToDesignSystemTokens(designSystem: CachedDesignSystem): DesignSystemTokens {
  const fontFamilies = new Set<string>();
  
  // Extract font families from typography tokens
  designSystem.categorizedTokens.typographyTokens.forEach(token => {
    const nameParts = token.name.split('/');
    if (nameParts.length > 1) {
      const possibleFamily = nameParts[1].trim();
      if (possibleFamily) {
        fontFamilies.add(possibleFamily);
      }
    }
  });
  
  // Convert arrays to Maps
  const colorTokensMap = new Map<string, any>();
  const typographyTokensMap = new Map<string, any>();
  const spacingTokensMap = new Map<string, any>();
  const borderRadiusTokensMap = new Map<string, any>();
  const shadowTokensMap = new Map<string, any>();
  
  // Helper function to convert array to map
  const arrayToMap = (array: any[], map: Map<string, any>) => {
    array.forEach(item => {
      if (item && item.id) {
        map.set(item.id, item);
      }
    });
  };
  
  // Convert each token array to a map
  arrayToMap(designSystem.categorizedTokens.colorTokens, colorTokensMap);
  arrayToMap(designSystem.categorizedTokens.typographyTokens, typographyTokensMap);
  arrayToMap(designSystem.categorizedTokens.spacingTokens, spacingTokensMap);
  arrayToMap(designSystem.categorizedTokens.borderRadiusTokens, borderRadiusTokensMap);
  arrayToMap(designSystem.categorizedTokens.shadowTokens, shadowTokensMap);
  
  return {
    colorTokens: colorTokensMap,
    typographyTokens: typographyTokensMap,
    spacingTokens: spacingTokensMap,
    borderRadiusTokens: borderRadiusTokensMap,
    shadowTokens: shadowTokensMap,
    fontFamilies: Array.from(fontFamilies)
  };
} 