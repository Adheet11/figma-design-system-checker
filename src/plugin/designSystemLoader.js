// Design System Loader
// Provides functionality for loading and managing design system resources

/**
 * Loads a design system file by its key
 * @param {string} fileKey The file key of the design system
 * @returns {Promise<object|null>} The loaded design system or null if not found
 */
export async function loadDesignSystemFile(fileKey) {
  try {
    figma.notify('Loading design system...', { timeout: 60000 });
    
    const libraries = await figma.teamLibrary.getAvailableLibrariesAsync();
    const library = libraries.find(lib => lib.key === fileKey);
    
    if (!library) {
      figma.notify('Design system file not found', { error: true });
      return null;
    }
    
    // Create a new cached design system
    const designSystem = {
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

/**
 * Save design system to client storage
 * @param {object} designSystem The design system to save
 */
async function saveDesignSystemToCache(designSystem) {
  try {
    const DESIGN_SYSTEMS_STORAGE_KEY = 'cachedDesignSystems';
    const existingData = await figma.clientStorage.getAsync(DESIGN_SYSTEMS_STORAGE_KEY) || [];
    const index = existingData.findIndex(ds => ds.id === designSystem.id);
    
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

/**
 * Get all cached design systems
 * @returns {Promise<object[]>} Array of cached design systems
 */
export async function getCachedDesignSystems() {
  try {
    const DESIGN_SYSTEMS_STORAGE_KEY = 'cachedDesignSystems';
    const cachedSystems = await figma.clientStorage.getAsync(DESIGN_SYSTEMS_STORAGE_KEY) || [];
    return cachedSystems;
  } catch (error) {
    console.error('Error getting cached design systems:', error);
    return [];
  }
}

/**
 * Delete a cached design system
 * @param {string} fileKey The file key of the design system to delete
 */
export async function deleteDesignSystem(fileKey) {
  try {
    const DESIGN_SYSTEMS_STORAGE_KEY = 'cachedDesignSystems';
    const existingData = await figma.clientStorage.getAsync(DESIGN_SYSTEMS_STORAGE_KEY) || [];
    const updatedData = existingData.filter(ds => ds.id !== fileKey);
    await figma.clientStorage.setAsync(DESIGN_SYSTEMS_STORAGE_KEY, updatedData);
  } catch (error) {
    console.error('Error deleting design system:', error);
  }
}

/**
 * Get a cached design system by ID
 * @param {string} fileKey The file key of the design system
 * @returns {Promise<object|null>} The design system or null if not found
 */
export async function getDesignSystemById(fileKey) {
  try {
    const cachedSystems = await getCachedDesignSystems();
    return cachedSystems.find(ds => ds.id === fileKey) || null;
  } catch (error) {
    console.error('Error getting design system by ID:', error);
    return null;
  }
}

/**
 * Convert cached design system to format needed by checkers
 * @param {object} designSystem The design system to convert
 * @returns {object} Formatted design system tokens
 */
export function convertToDesignSystemTokens(designSystem) {
  const fontFamilies = new Set();
  
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
  
  return {
    colorTokens: designSystem.categorizedTokens.colorTokens,
    typographyTokens: designSystem.categorizedTokens.typographyTokens,
    spacingTokens: designSystem.categorizedTokens.spacingTokens,
    borderRadiusTokens: designSystem.categorizedTokens.borderRadiusTokens,
    shadowTokens: designSystem.categorizedTokens.shadowTokens,
    fontFamilies: Array.from(fontFamilies)
  };
} 