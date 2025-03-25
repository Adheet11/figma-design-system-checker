// This file is intentionally empty to avoid conflicts with Figma's type definitions

// Add TeamLibraryAPI and VariablesAPI interface definitions
declare namespace figma {
  /**
   * The plugin API interfaces
   */
  const teamLibrary: {
    getAvailableLibrariesAsync(): Promise<any[]>;
    getComponentMetadataAsync(libraryId: string): Promise<any[]>;
    getStyleMetadataAsync(libraryId: string): Promise<any[]>;
  };

  const variables: {
    getVariablesByCollection(collectionId: string): any[];
    getVariableById(id: string): any | null;
    getVariableCollectionById(id: string): any | null;
    getLocalVariableCollections(): any[];
    getLocalVariables(): any[];
  };
}

export {}; 