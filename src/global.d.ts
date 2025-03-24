declare global {
  interface TeamLibraryAPI {
    getAvailableLibrariesAsync(): Promise<any[]>;
    getComponentMetadataAsync(libraryId: string): Promise<any[]>;
    getStyleMetadataAsync(libraryId: string): Promise<any[]>;
  }
  
  interface VariablesAPI {
    getVariablesByCollection(collectionId: string): Variable[];
  }

  // figma.mixed is a unique symbol
  interface PluginAPI {
    readonly mixed: unique symbol;
  }
}

export {}; 