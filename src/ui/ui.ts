import './styles/main.css';
import { CheckResults, PluginMessage, Fix } from '../shared/types';

// DOM Elements
const tabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const runCheckBtn = document.getElementById('runCheckBtn') as HTMLButtonElement;
const closeBtn = document.getElementById('closeBtn') as HTMLButtonElement;
const exportReportBtn = document.getElementById('exportReportBtn') as HTMLButtonElement;

const loadingState = document.getElementById('loadingState') as HTMLDivElement;
const emptyState = document.getElementById('emptyState') as HTMLDivElement;

// Tab switching
tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    // Remove active class from all tabs
    tabs.forEach(t => t.classList.remove('active'));
    
    // Add active class to clicked tab
    tab.classList.add('active');
    
    // Hide all tab contents
    tabContents.forEach(content => {
      (content as HTMLElement).style.display = 'none';
    });
    
    // Show the selected tab content
    const tabName = tab.getAttribute('data-tab');
    if (tabName) {
      const tabContent = document.getElementById(`${tabName}Tab`);
      if (tabContent) {
        tabContent.style.display = 'block';
      }
    }
  });
});

// Initialize the plugin
document.addEventListener('DOMContentLoaded', () => {
  // Show loading state initially
  loadingState.style.display = 'flex';
  emptyState.style.display = 'none';
  
  // Hide tab content
  tabContents.forEach(content => {
    (content as HTMLElement).style.display = 'none';
  });
});

// Button event listeners
runCheckBtn.addEventListener('click', () => {
  // Show loading state
  loadingState.style.display = 'flex';
  emptyState.style.display = 'none';
  tabContents.forEach(content => {
    (content as HTMLElement).style.display = 'none';
  });
  
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

// Update components table
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
  
  componentResults.forEach(result => {
    const row = document.createElement('tr');
    row.classList.add('issue-row');
    row.dataset.nodeId = result.node.id;
    
    row.innerHTML = `
      <td>${result.node.name}</td>
      <td>${result.message}</td>
      <td>
        <button class="button button-small button-secondary locate-btn">Locate</button>
        ${result.type.startsWith('modified') ? 
          '<button class="button button-small button-secondary fix-btn" data-fix="reset">Reset</button>' : ''}
        ${result.type === 'detached' && result.mainComponentId ? 
          '<button class="button button-small button-secondary fix-btn" data-fix="swap">Swap</button>' : ''}
      </td>
    `;
    
    tableBody.appendChild(row);
  });
  
  // Add click event for locate buttons
  tableBody.querySelectorAll('.locate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const row = target.closest('.issue-row');
      if (row) {
        const nodeId = (row as HTMLElement).dataset.nodeId;
        if (nodeId) {
          parent.postMessage({ pluginMessage: { type: 'highlightNode', payload: { nodeId } } }, '*');
        }
      }
    });
  });
  
  // Add click event for fix buttons
  tableBody.querySelectorAll('.fix-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const row = target.closest('.issue-row');
      if (row) {
        const nodeId = (row as HTMLElement).dataset.nodeId;
        const fixType = (target as HTMLElement).dataset.fix;
        
        if (nodeId && fixType) {
          const fix: Fix = {
            nodeId,
            type: 'component',
            fixType: fixType as any
          };
          
          // If swap, we need to get component key from main component
          if (fixType === 'swap') {
            const componentResult = componentResults.find(r => r.node.id === nodeId);
            if (componentResult && componentResult.mainComponentId) {
              (fix as any).componentKey = componentResult.mainComponentKey;
            }
          }
          
          parent.postMessage({ pluginMessage: { type: 'applyFix', payload: { fix } } }, '*');
        }
      }
    });
  });
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
  
  // Add click event handlers
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
  
  // Add click event handlers
  addTableEventHandlers(tableBody, tokenResults);
}

// Common table event handlers
function addTableEventHandlers(tableBody: HTMLElement, results: any[]): void {
  // Add click event for locate buttons
  tableBody.querySelectorAll('.locate-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const row = target.closest('.issue-row');
      if (row) {
        const nodeId = (row as HTMLElement).dataset.nodeId;
        if (nodeId) {
          parent.postMessage({ pluginMessage: { type: 'highlightNode', payload: { nodeId } } }, '*');
        }
      }
    });
  });
  
  // Add click event for fix buttons
  tableBody.querySelectorAll('.fix-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const row = target.closest('.issue-row');
      if (row) {
        const nodeId = (row as HTMLElement).dataset.nodeId;
        const fixType = (target as HTMLElement).dataset.fix;
        
        if (nodeId) {
          // Find the result for this node
          const result = results.find(r => r.node.id === nodeId);
          
          if (result && result.suggestions && result.suggestions.length > 0) {
            const suggestion = result.suggestions[0];
            
            let fix: any = {
              nodeId,
              type: fixType,
            };
            
            if (fixType === 'style') {
              fix.styleType = result.type;
              fix.style = suggestion;
            } else if (fixType === 'variable') {
              fix.property = result.type === 'missingVariable' ? 
                (result.message.includes('color') ? 'fills' : 'cornerRadius') : 
                'fills'; // Default to fills for other types
              fix.variable = suggestion;
            }
            
            parent.postMessage({ pluginMessage: { type: 'applyFix', payload: { fix } } }, '*');
          }
        }
      }
    });
  });
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

// Handle messages from the plugin
window.onmessage = (event) => {
  const message = event.data.pluginMessage as PluginMessage;
  
  if (!message) return;
  
  if (message.type === 'checkResults') {
    // Hide loading state
    loadingState.style.display = 'none';
    
    const results = message.payload as CheckResults;
    
    // Update summary metrics
    updateSummaryMetrics(results.metrics);
    
    // Update issue counts
    updateIssueCounts(
      results.componentResults.length, 
      results.styleResults.length, 
      results.tokenResults.length
    );
    
    // Update component issues table
    updateComponentsTable(results.componentResults);
    
    // Update style issues table
    updateStylesTable(results.styleResults);
    
    // Update variable issues table
    updateVariablesTable(results.tokenResults);
    
    // Update library select
    updateLibrarySelect(results.libraries);
    
    // Show summary tab by default
    tabs.forEach(t => t.classList.remove('active'));
    const summaryTab = document.querySelector('[data-tab="summary"]');
    if (summaryTab) {
      summaryTab.classList.add('active');
    }
    
    tabContents.forEach(content => {
      (content as HTMLElement).style.display = 'none';
    });
    const summaryTabContent = document.getElementById('summaryTab');
    if (summaryTabContent) {
      summaryTabContent.style.display = 'block';
    }
  }
  else if (message.type === 'exportReportData') {
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