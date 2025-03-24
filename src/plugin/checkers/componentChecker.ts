// Interface for component checking results
export interface ComponentCheckResult {
    node: SceneNode;
    type: string; // 'detached', 'modified', 'nonLibrary'
    message: string;
    details?: string;
    mainComponent?: ComponentNode | null;
  }
  
  // Check if a component instance is properly used
  export function checkComponent(node: SceneNode): ComponentCheckResult[] {
    const results: ComponentCheckResult[] = [];
    
    // Only check instance nodes
    if (node.type !== 'INSTANCE') {
      return results;
    }
    
    const instance = node as InstanceNode;
    
    // Check if the instance has been detached
    if (!instance.mainComponent) {
      results.push({
        node: instance,
        type: 'detached',
        message: 'Instance has been detached from main component',
        details: 'This component is no longer linked to its main component'
      });
      return results;
    }
    
    // Check if the component is from a library
    // This assumes components not in a team library should be flagged
    if (!instance.mainComponent.remote) {
      results.push({
        node: instance,
        type: 'nonLibrary',
        message: 'Component is not from team library',
        details: `Using local component: ${instance.mainComponent.name}`,
        mainComponent: instance.mainComponent
      });
    }
    
    // Check for overrides (modifications) to the instance
    checkForOverrides(instance, results);
    
    return results;
  }
  
  // Check for overrides in a component instance
  function checkForOverrides(instance: InstanceNode, results: ComponentCheckResult[]): void {
    // Check if the instance has overridden properties
    if (instance.overrides && instance.overrides.length > 0) {
      // Get the overridden properties
      const overriddenProps = instance.overrides.map(override => 
        override.overriddenFields.join(', ')
      );
      
      // Group overrides by type for clearer reporting
      const textOverrides = instance.overrides.filter(override => 
        override.overriddenFields.includes('characters') ||
        override.overriddenFields.includes('textStyleId') ||
        override.overriddenFields.includes('fontName') ||
        override.overriddenFields.includes('fontSize') ||
        override.overriddenFields.includes('letterSpacing') ||
        override.overriddenFields.includes('lineHeight') ||
        override.overriddenFields.includes('textCase')
      );
      
      const styleOverrides = instance.overrides.filter(override => 
        override.overriddenFields.includes('fillStyleId') ||
        override.overriddenFields.includes('strokeStyleId') ||
        override.overriddenFields.includes('effectStyleId')
      );
      
      const sizeOverrides = instance.overrides.filter(override => 
        override.overriddenFields.includes('width') ||
        override.overriddenFields.includes('height') ||
        override.overriddenFields.includes('constrainProportions')
      );
      
      const layoutOverrides = instance.overrides.filter(override => 
        override.overriddenFields.includes('itemSpacing') ||
        override.overriddenFields.includes('paddingLeft') ||
        override.overriddenFields.includes('paddingRight') ||
        override.overriddenFields.includes('paddingTop') ||
        override.overriddenFields.includes('paddingBottom') ||
        override.overriddenFields.includes('layoutMode') ||
        override.overriddenFields.includes('primaryAxisAlignItems') ||
        override.overriddenFields.includes('counterAxisAlignItems')
      );
      
      // Add results for each type of override
      if (textOverrides.length > 0) {
        results.push({
          node: instance,
          type: 'modified-text',
          message: 'Component text properties have been modified',
          details: `Modified text properties on ${textOverrides.length} layer(s)`,
          mainComponent: instance.mainComponent
        });
      }
      
      if (styleOverrides.length > 0) {
        results.push({
          node: instance,
          type: 'modified-style',
          message: 'Component styles have been modified',
          details: `Modified styles on ${styleOverrides.length} layer(s)`,
          mainComponent: instance.mainComponent
        });
      }
      
      if (sizeOverrides.length > 0) {
        results.push({
          node: instance,
          type: 'modified-size',
          message: 'Component size has been modified',
          details: `Size changes on ${sizeOverrides.length} layer(s)`,
          mainComponent: instance.mainComponent
        });
      }
      
      if (layoutOverrides.length > 0) {
        results.push({
          node: instance,
          type: 'modified-layout',
          message: 'Component layout has been modified',
          details: `Layout changes on ${layoutOverrides.length} layer(s)`,
          mainComponent: instance.mainComponent
        });
      }
      
      // Report any other overrides not covered by the above categories
      const otherOverrides = instance.overrides.filter(override => 
        !textOverrides.includes(override) &&
        !styleOverrides.includes(override) &&
        !sizeOverrides.includes(override) &&
        !layoutOverrides.includes(override)
      );
      
      if (otherOverrides.length > 0) {
        results.push({
          node: instance,
          type: 'modified-other',
          message: 'Component has other modifications',
          details: `Other modifications on ${otherOverrides.length} layer(s)`,
          mainComponent: instance.mainComponent
        });
      }
    }
    
    // Check if component properties have been changed
    if (instance.componentProperties) {
      const changedProps = [];
      
      for (const [key, prop] of Object.entries(instance.componentProperties)) {
        // Skip properties that are meant to be changed (variants)
        if (prop.type === 'VARIANT') continue;
        
        // Check if instance property differs from main component default
        const mainComponentProp = instance.mainComponent?.componentPropertyDefinitions[key];
        if (mainComponentProp && prop.value !== mainComponentProp.defaultValue) {
          changedProps.push(key);
        }
      }
      
      if (changedProps.length > 0) {
        results.push({
          node: instance,
          type: 'modified-properties',
          message: 'Component properties have been changed',
          details: `Changed properties: ${changedProps.join(', ')}`,
          mainComponent: instance.mainComponent
        });
      }
    }
  }