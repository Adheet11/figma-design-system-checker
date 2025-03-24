import './styles/main.css';
import { CheckResults, PluginMessage, Fix } from '../shared/types';

// Define global window interface for our properties
declare global {
  interface Window {
    currentResults?: {
      componentResults: any[];
      styleResults: any[];
      tokenResults: any[];
    };
  }
}

// DOM Elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const runCheckBtn = document.getElementById('runCheckBtn') as HTMLButtonElement;
const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
const exportReportBtn = document.getElementById('exportReportBtn') as HTMLButtonElement;

const loadingState = document.getElementById('loadingState') as HTMLDivElement;
const emptyState = document.getElementById('emptyState') as HTMLDivElement;

// Add message handler
window.onmessage = (event) => {
  const message = event.data.pluginMessage as PluginMessage;
  
  if (!message) return;
  
  if (message.type === "error") {
    // Display error in UI
    showErrorMessage(message.payload.message);
    return;
  }
  
  if (message.type === "checkResults") {
    // Hide loading state
    setLoading(false);
    
    // Get results
    const results = message.payload as CheckResults;
    
    // Store results for filtering
    window.currentResults = {
      componentResults: results.componentResults,
      styleResults: results.styleResults,
      tokenResults: results.tokenResults
    };
    
    // Update metrics
    updateSummaryMetrics(results.metrics);
    
    // Update issue counts
    updateIssueCounts(
      results.componentResults.length,
      results.styleResults.length,
      results.tokenResults.length
    );
    
    // Update tables
    updateComponentsTable(results.componentResults);
    updateStylesTable(results.styleResults);
    updateVariablesTable(results.tokenResults);
    
    // Update library select
    updateLibrarySelect(results.libraries);
    
    // Show summary tab
    showTab('summary');
  } else if (message.type === "fixApplied") {
    // Show notification of successful fix
    const payload = message.payload;
    showSuccessMessage(`Fixed ${payload.fixType} on "${payload.nodeName}"`);
  } else if (message.type === "batchFixComplete") {
    // Show batch fix results
    const payload = message.payload;
    showSuccessMessage(`Applied ${payload.successCount} of ${payload.totalFixes} fixes successfully. ${payload.failCount} fixes failed.`);
    setLoading(false);
  } else if (message.type === "exportReportData") {
    // Create download link for report data
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(message.payload);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "design-system-report.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  }
};

// Add error display function
function showErrorMessage(message: string) {
  const errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.style.display = 'block';
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      errorContainer.style.display = 'none';
    }, 5000);
  }
}

// Add success message function
function showSuccessMessage(message: string) {
  const errorContainer = document.getElementById('errorContainer');
  if (errorContainer) {
    errorContainer.textContent = message;
    errorContainer.classList.add('success');
    errorContainer.style.display = 'block';
    
    // Auto-hide after 3 seconds
    setTimeout(() => {
      errorContainer.style.display = 'none';
      errorContainer.classList.remove('success');
    }, 3000);
  }
}

// Add loading state function
function setLoading(isLoading: boolean) {
  const loadingState = document.getElementById('loadingState');
  const content = document.getElementById('content');
  
  if (loadingState && content) {
    if (isLoading) {
      loadingState.style.display = 'flex';
      content.classList.add('disabled');
    } else {
      loadingState.style.display = 'none';
      content.classList.remove('disabled');
    }
  }
}

// Helper function to show a specific tab
function showTab(tabName: string) {
  // Remove active class from all tabs
  tabs.forEach(t => t.classList.remove('active'));
  
  // Add active class to selected tab
  const selectedTab = document.querySelector(`.tab[data-tab="${tabName}"]`);
  if (selectedTab) {
    selectedTab.classList.add('active');
  }
  
  // Hide all tab contents
  tabContents.forEach(content => {
    (content as HTMLElement).style.display = 'none';
  });
  
  // Show the selected tab content
  const tabContent = document.getElementById(`${tabName}Tab`);
  if (tabContent) {
    tabContent.style.display = 'block';
  }
}

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const tabName = tab.getAttribute('data-tab');
    if (tabName) {
      showTab(tabName);
    }
  });
});

// Initialize the plugin
document.addEventListener('DOMContentLoaded', () => {
  // Show loading state initially
  setLoading(true);
  emptyState.style.display = 'none';
  
  // Initialize filter controls
  initFilterControls();
  
  // Store results globally for filtering
  window.currentResults = {
    componentResults: [],
    styleResults: [],
    tokenResults: []
  };
});

// Button event listeners
runCheckBtn.addEventListener('click', () => {
  // Show loading state
  setLoading(true);
  emptyState.style.display = 'none';
  
  // Get options from settings
  const options = {
    visualize: (document.getElementById('visualizeIssues') as HTMLInputElement)?.checked,
    generateReport: (document.getElementById('generateReport') as HTMLInputElement)?.checked,
    includeHidden: (document.getElementById('includeHidden') as HTMLInputElement)?.checked
  };
  
  // Run the check
  parent.postMessage({ pluginMessage: { type: 'checkDesignSystem', payload: { options } } }, '*');
});

closeBtn.addEventListener('click', () => {
  parent.postMessage({ pluginMessage: { type: 'close' } }, '*');
});

exportReportBtn.addEventListener('click', () => {
  // Get metrics
  const metrics = {
    overallCoverage: document.getElementById('overallCoverage')?.textContent,
    componentCoverage: document.getElementById('componentCoverage')?.textContent,
    styleCoverage: document.getElementById('styleCoverage')?.textContent,
    variableCoverage: document.getElementById('variableCoverage')?.textContent,
    totalNodes: document.getElementById('totalNodes')?.textContent,
    componentIssues: document.getElementById('componentIssues')?.textContent,
    styleIssues: document.getElementById('styleIssues')?.textContent,
    variableIssues: document.getElementById('variableIssues')?.textContent,
    totalIssues: document.getElementById('totalIssues')?.textContent
  };
  
  parent.postMessage({ pluginMessage: { type: 'exportReport', payload: { metrics } } }, '*');
});

// Helper function to set progress bar class based on percentage
function setProgressClass(element: HTMLElement, percentage: number): void {
  element.classList.remove('low', 'medium', 'high');
  
  if (percentage < 50) {
    element.classList.add('low');
  } else if (percentage < 80) {
    element.classList.add('medium');
  } else {
    element.classList.add('high');
  }
}

// Update summary metrics
function updateSummaryMetrics(metrics: any): void {
  // Set values
  setElementText('overallCoverage', `${metrics.overallCoverage.toFixed(1)}%`);
  setElementText('componentCoverage', `${metrics.componentCoverage.toFixed(1)}%`);
  setElementText('styleCoverage', `${metrics.styleCoverage.toFixed(1)}%`);
  setElementText('variableCoverage', `${metrics.variableCoverage.toFixed(1)}%`);
  setElementText('totalNodes', metrics.totalNodes.toString());
  
  // Set progress bars
  const overallProgress = document.getElementById('overallProgress');
  const componentProgress = document.getElementById('componentProgress');
  const styleProgress = document.getElementById('styleProgress');
  const variableProgress = document.getElementById('variableProgress');
  
  if (overallProgress) {
    overallProgress.style.width = `${metrics.overallCoverage}%`;
    setProgressClass(overallProgress, metrics.overallCoverage);
  }
  
  if (componentProgress) {
    componentProgress.style.width = `${metrics.componentCoverage}%`;
    setProgressClass(componentProgress, metrics.componentCoverage);
  }
  
  if (styleProgress) {
    styleProgress.style.width = `${metrics.styleCoverage}%`;
    setProgressClass(styleProgress, metrics.styleCoverage);
  }
  
  if (variableProgress) {
    variableProgress.style.width = `${metrics.variableCoverage}%`;
    setProgressClass(variableProgress, metrics.variableCoverage);
  }
}

// Helper to set text content safely
function setElementText(id: string, text: string): void {
  const element = document.getElementById(id);
  if (element) {
    element.textContent = text;
  }
}

// Update issue counts
function updateIssueCounts(componentIssues: number, styleIssues: number, variableIssues: number): void {
  const totalIssues = componentIssues + styleIssues + variableIssues;
  
  setElementText('componentIssues', componentIssues.toString());
  setElementText('styleIssues', styleIssues.toString());
  setElementText('variableIssues', variableIssues.toString());
  setElementText('totalIssues', totalIssues.toString());
}

// Update functions for tables using event delegation
function addTableEventHandlers(tableBody: HTMLElement, results: any[]): void {
  // Fix issue with the locate buttons where event binding might not persist
  tableBody.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    
    // Use event delegation instead of individual event handlers
    if (target.classList.contains('locate-btn')) {
      const row = target.closest('.issue-row');
      if (row) {
        const nodeId = (row as HTMLElement).dataset.nodeId;
        if (nodeId) {
          parent.postMessage({ pluginMessage: { type: 'highlightNode', payload: { nodeId } } }, '*');
        }
      }
    } else if (target.classList.contains('fix-btn')) {
      handleFixButtonClick(target, results);
    } else if (target.classList.contains('preview-btn')) {
      const row = target.closest('.issue-row');
      if (row) {
        const nodeId = (row as HTMLElement).dataset.nodeId;
        if (nodeId) {
          const result = results.find(r => r.node.id === nodeId);
          if (result) {
            showFixPreview(result, getFixType(result));
          }
        }
      }
    }
  });
}

function handleFixButtonClick(target: HTMLElement, results: any[]) {
  const row = target.closest('.issue-row');
  if (!row) return;
  
  const nodeId = (row as HTMLElement).dataset.nodeId;
  const fixType = target.dataset.fix;
  
  if (!nodeId || !fixType) return;
  
  // Find the result for this node
  const result = results.find(r => r.node.id === nodeId);
  if (!result) return;
  
  // Show preview instead of applying immediately
  showFixPreview(result, getFixType(result));
}

function createFixObject(result: any, fixType: string): Fix {
  // Base fix object
  const fix: any = {
    nodeId: result.node.id,
    type: getFixType(result),
    fixType: fixType
  };
  
  // Add additional properties based on the type
  if (fix.type === 'component') {
    if (fixType === 'swap' && result.mainComponentKey) {
      fix.componentKey = result.mainComponentKey;
    }
  } else if (fix.type === 'style') {
    fix.styleType = result.type;
    if (result.suggestions && result.suggestions.length > 0) {
      fix.style = result.suggestions[0];
    }
  } else if (fix.type === 'variable') {
    fix.property = result.property;
    if (result.suggestions && result.suggestions.length > 0) {
      fix.variable = result.suggestions[0];
    }
  }
  
  return fix as Fix;
}

function getFixType(result: any): string {
  if (result.type === 'detached' || result.type.startsWith('modified') || 
      result.type === 'nonLibrary' || result.type.includes('component')) {
    return 'component';
  } else if (result.type === 'fill' || result.type === 'stroke' || 
             result.type === 'effect' || result.type === 'text') {
    return 'style';
  } else {
    return 'variable';
  }
}

// Update the table update functions to use the new event handling
function updateComponentsTable(componentResults: any[]): void {
  const tableBody = document.getElementById('componentsTableBody');
  const emptyState = document.getElementById('componentsEmpty');
  
  if (!tableBody || !emptyState) return;
  
  tableBody.innerHTML = '';
  
  if (componentResults.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  // Use our new row creation function for consistency
  componentResults.forEach(result => {
    const row = createComponentResultRow(result);
    tableBody.appendChild(row);
  });
  
  // Add event handlers
  addTableEventHandlers(tableBody, componentResults);
}

// Update styles table
function updateStylesTable(styleResults: any[]): void {
  const tableBody = document.getElementById('stylesTableBody');
  const emptyState = document.getElementById('stylesEmpty');
  
  if (!tableBody || !emptyState) return;
  
  tableBody.innerHTML = '';
  
  if (styleResults.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  styleResults.forEach(result => {
    const row = document.createElement('tr');
    row.classList.add('issue-row');
    row.dataset.nodeId = result.node.id;
    
    let actionCell = `<button class="button button-small button-secondary locate-btn">Locate</button>`;
    
    // Add fix buttons if there are suggestions
    if (result.suggestions && result.suggestions.length > 0) {
      // Just show the first suggestion as a fix button
      const suggestion = result.suggestions[0];
      actionCell += `
        <button class="button button-small button-secondary fix-btn" data-fix="style">Apply ${suggestion.name}</button>
      `;
    }
    
    row.innerHTML = `
      <td>${result.node.name}</td>
      <td>${result.message}</td>
      <td>${result.value}</td>
      <td>${actionCell}</td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add event handlers
  addTableEventHandlers(tableBody, styleResults);
}

// Update variables table
function updateVariablesTable(tokenResults: any[]): void {
  const tableBody = document.getElementById('variablesTableBody');
  const emptyState = document.getElementById('variablesEmpty');
  
  if (!tableBody || !emptyState) return;
  
  tableBody.innerHTML = '';
  
  if (tokenResults.length === 0) {
    emptyState.style.display = 'block';
    return;
  }
  
  emptyState.style.display = 'none';
  
  tokenResults.forEach(result => {
    const row = document.createElement('tr');
    row.classList.add('issue-row');
    row.dataset.nodeId = result.node.id;
    
    let actionCell = `<button class="button button-small button-secondary locate-btn">Locate</button>`;
    
    // Add fix buttons if there are suggestions
    if (result.suggestions && result.suggestions.length > 0) {
      // Just show the first suggestion as a fix button
      const suggestion = result.suggestions[0];
      actionCell += `
        <button class="button button-small button-secondary fix-btn" data-fix="variable">Apply ${suggestion.name}</button>
      `;
    }
    
    row.innerHTML = `
      <td>${result.node.name}</td>
      <td>${result.message}</td>
      <td>${result.value}</td>
      <td>${actionCell}</td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add event handlers
  addTableEventHandlers(tableBody, tokenResults);
}

// Update library select
function updateLibrarySelect(libraries: any[]): void {
  const librarySelect = document.getElementById('librarySelect') as HTMLSelectElement;
  
  if (!librarySelect) return;
  
  librarySelect.innerHTML = '';
  
  libraries.forEach(library => {
    const option = document.createElement('option');
    option.value = library.id;
    option.textContent = `${library.name} (${library.components.length} components, ${library.styles.length} styles)`;
    option.selected = true;
    librarySelect.appendChild(option);
  });
}

// Add Fix Preview function
function showFixPreview(result: any, fixType: string) {
  const previewContainer = document.getElementById('fixPreviewContainer');
  if (!previewContainer) return;
  
  // Clear previous preview
  previewContainer.innerHTML = '';
  
  // Create preview content based on fix type
  let previewContent = '';
  
  if (fixType === 'style') {
    const suggestion = result.suggestions && result.suggestions.length > 0 ? result.suggestions[0] : null;
    if (suggestion) {
      previewContent = `
        <div class="preview-header">Style Fix Preview</div>
        <div class="preview-content">
          <div class="preview-row">
            <div class="preview-label">Current Value:</div>
            <div class="preview-value">${result.value}</div>
          </div>
          <div class="preview-row">
            <div class="preview-label">Suggested Style:</div>
            <div class="preview-value">${suggestion.name} (${suggestion.source})</div>
          </div>
          ${suggestion.value.startsWith('#') ? 
            `<div class="preview-color-sample" style="background-color: ${suggestion.value}"></div>` : ''}
        </div>
        <div class="preview-actions">
          <button class="button button-primary apply-preview-btn" data-fix="${fixType}" data-node-id="${result.node.id}">
            Apply Fix
          </button>
          <button class="button button-secondary close-preview-btn">
            Cancel
          </button>
        </div>
      `;
    }
  } else if (fixType === 'variable') {
    const suggestion = result.suggestions && result.suggestions.length > 0 ? result.suggestions[0] : null;
    if (suggestion) {
      previewContent = `
        <div class="preview-header">Variable Fix Preview</div>
        <div class="preview-content">
          <div class="preview-row">
            <div class="preview-label">Current Value:</div>
            <div class="preview-value">${result.value}</div>
          </div>
          <div class="preview-row">
            <div class="preview-label">Suggested Variable:</div>
            <div class="preview-value">${suggestion.name}</div>
          </div>
        </div>
        <div class="preview-actions">
          <button class="button button-primary apply-preview-btn" data-fix="${fixType}" data-node-id="${result.node.id}">
            Apply Fix
          </button>
          <button class="button button-secondary close-preview-btn">
            Cancel
          </button>
        </div>
      `;
    }
  } else if (fixType === 'component') {
    previewContent = `
      <div class="preview-header">Component Fix Preview</div>
      <div class="preview-content">
        <div class="preview-row">
          <div class="preview-label">Issue:</div>
          <div class="preview-value">${result.message}</div>
        </div>
        ${result.details ? 
          `<div class="preview-row">
            <div class="preview-label">Details:</div>
            <div class="preview-value">${result.details}</div>
          </div>` : ''}
        ${result.mainComponentName ? 
          `<div class="preview-row">
            <div class="preview-label">Main Component:</div>
            <div class="preview-value">${result.mainComponentName}</div>
          </div>` : ''}
      </div>
      <div class="preview-actions">
        ${result.type.startsWith('modified') ? 
          `<button class="button button-primary apply-preview-btn" data-fix="reset" data-node-id="${result.node.id}">
            Reset to Main Component
          </button>` : ''}
        ${result.type === 'detached' && result.mainComponentId ? 
          `<button class="button button-primary apply-preview-btn" data-fix="swap" data-node-id="${result.node.id}">
            Swap to Component
          </button>` : ''}
        <button class="button button-secondary close-preview-btn">
          Cancel
        </button>
      </div>
    `;
  }
  
  previewContainer.innerHTML = previewContent;
  previewContainer.style.display = 'block';
  
  // Add event listeners to buttons
  const applyBtn = previewContainer.querySelector('.apply-preview-btn');
  const closeBtn = previewContainer.querySelector('.close-preview-btn');
  
  if (applyBtn) {
    applyBtn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const nodeId = target.dataset.nodeId;
      const fixType = target.dataset.fix;
      
      if (nodeId && fixType) {
        // Find the result for this node
        const resultToFix = result;
        
        // Show loading state
        target.textContent = 'Applying...';
        (target as HTMLButtonElement).disabled = true;
        
        // Create and send the fix request
        const fix = createFixObject(resultToFix, fixType);
        parent.postMessage({ pluginMessage: { type: 'applyFix', payload: { fix } } }, '*');
        
        // Hide preview
        previewContainer.style.display = 'none';
      }
    });
  }
  
  if (closeBtn) {
    closeBtn.addEventListener('click', () => {
      previewContainer.style.display = 'none';
    });
  }
}

// Add filter functions
function applyFilters() {
  const severityFilter = (document.getElementById('severityFilter') as HTMLSelectElement).value;
  const typeFilter = (document.getElementById('typeFilter') as HTMLSelectElement).value;
  const sortBy = (document.getElementById('sortBy') as HTMLSelectElement).value;
  const groupBy = (document.getElementById('groupBy') as HTMLSelectElement).value;
  
  // Get current results from our state
  if (!window.currentResults) return;
  
  // Apply to component results
  const filteredComponentResults = filterResults(window.currentResults.componentResults, severityFilter, typeFilter);
  const sortedComponentResults = sortResults(filteredComponentResults, sortBy);
  
  if (groupBy === 'none') {
    updateComponentsTable(sortedComponentResults);
  } else {
    updateComponentsTableWithGroups(sortedComponentResults, groupBy);
  }
  
  // We could do the same for style and variable results as well
}

function filterResults(results: any[], severity: string, type: string): any[] {
  return results.filter(result => {
    if (severity !== 'all') {
      // Map message type to severity
      const resultSeverity = getSeverity(result);
      if (resultSeverity !== severity) return false;
    }
    
    if (type !== 'all' && result.type !== type) return false;
    
    return true;
  });
}

function sortResults(results: any[], sortBy: string): any[] {
  return [...results].sort((a, b) => {
    if (sortBy === 'severity') {
      return getSeverityWeight(a) - getSeverityWeight(b);
    } else if (sortBy === 'type') {
      return a.type.localeCompare(b.type);
    } else if (sortBy === 'name') {
      return a.node.name.localeCompare(b.node.name);
    }
    return 0;
  });
}

function getSeverity(result: any): string {
  // Map result types to severity levels
  if (result.type === 'detached' || 
      result.type === 'missingVariable' ||
      result.type === 'modified-forbidden') {
    return 'high';
  } else if (result.type.startsWith('modified') ||
             result.type === 'fill' ||
             result.type === 'stroke') {
    return 'medium';
  } else {
    return 'low';
  }
}

function getSeverityWeight(result: any): number {
  const severity = getSeverity(result);
  switch (severity) {
    case 'high': return 1;
    case 'medium': return 2;
    case 'low': return 3;
    default: return 4;
  }
}

function groupResults(results: any[], groupBy: string): Record<string, any[]> {
  const groups: Record<string, any[]> = {};
  
  results.forEach(result => {
    let groupKey;
    
    if (groupBy === 'type') {
      groupKey = result.type;
    } else if (groupBy === 'severity') {
      groupKey = getSeverity(result);
    } else if (groupBy === 'component') {
      // Group by component name or ID for component results
      groupKey = result.node.name;
    } else {
      groupKey = 'ungrouped';
    }
    
    if (!groups[groupKey]) {
      groups[groupKey] = [];
    }
    
    groups[groupKey].push(result);
  });
  
  return groups;
}

function updateComponentsTableWithGroups(results: any[], groupBy: string) {
  const tableBody = document.getElementById('componentsTableBody');
  if (!tableBody) return;
  
  tableBody.innerHTML = '';
  
  const groups = groupResults(results, groupBy);
  
  // Sort group keys for consistent order
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    // Special sort for severity groups
    if (groupBy === 'severity') {
      const severityOrder: Record<string, number> = { 'high': 1, 'medium': 2, 'low': 3 };
      return (severityOrder[a] || 99) - (severityOrder[b] || 99);
    }
    return a.localeCompare(b);
  });
  
  for (const groupName of sortedGroupKeys) {
    const groupResults = groups[groupName];
    
    // Add group header
    const groupRow = document.createElement('tr');
    groupRow.classList.add('group-header');
    
    let displayGroupName = groupName;
    // Format the group name
    if (groupBy === 'severity') {
      displayGroupName = groupName.charAt(0).toUpperCase() + groupName.slice(1) + ' Severity';
    } else if (groupBy === 'type') {
      displayGroupName = formatGroupType(groupName);
    }
    
    groupRow.innerHTML = `
      <td colspan="3" class="group-title">
        ${displayGroupName} (${groupResults.length} items)
        <button class="button button-small button-secondary group-toggle">Collapse</button>
      </td>
    `;
    tableBody.appendChild(groupRow);
    
    // Add group items
    const groupContainer = document.createElement('tbody');
    groupContainer.classList.add('group-items');
    
    groupResults.forEach(result => {
      const row = createComponentResultRow(result);
      groupContainer.appendChild(row);
    });
    
    tableBody.appendChild(groupContainer);
    
    // Add event handler for group toggle
    const toggleBtn = groupRow.querySelector('.group-toggle');
    if (toggleBtn) {
      toggleBtn.addEventListener('click', () => {
        const isCollapsed = groupContainer.classList.toggle('collapsed');
        toggleBtn.textContent = isCollapsed ? 'Expand' : 'Collapse';
      });
    }
  }
  
  // Add event handlers
  addTableEventHandlers(tableBody, results);
}

function formatGroupType(type: string): string {
  // Convert type names to more readable format
  // For example: "modified-size" -> "Modified Size"
  return type
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function createComponentResultRow(result: any): HTMLTableRowElement {
  const row = document.createElement('tr');
  row.classList.add('issue-row');
  row.dataset.nodeId = result.node.id;
  
  // Add severity class for styling
  row.classList.add(`severity-${getSeverity(result)}`);
  
  row.innerHTML = `
    <td>${result.node.name}</td>
    <td>${result.message}</td>
    <td>
      <button class="button button-small button-secondary locate-btn">Locate</button>
      ${result.type.startsWith('modified') ? 
        '<button class="button button-small button-secondary fix-btn" data-fix="reset">Reset</button>' : ''}
      ${result.type === 'detached' && result.mainComponentId ? 
        '<button class="button button-small button-secondary fix-btn" data-fix="swap">Swap</button>' : ''}
      ${(result.suggestions && result.suggestions.length > 0) ? 
        '<button class="button button-small button-secondary preview-btn">Preview</button>' : ''}
    </td>
  `;
  
  return row;
}

// Initialize the filter controls
function initFilterControls() {
  const filterElements = [
    document.getElementById('severityFilter'),
    document.getElementById('typeFilter'),
    document.getElementById('sortBy'),
    document.getElementById('groupBy')
  ];
  
  filterElements.forEach(element => {
    if (element) {
      element.addEventListener('change', applyFilters);
    }
  });
}