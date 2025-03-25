// UI Logic

// Store current state 
let currentState = {
  activeTab: 'summary',
  checkResults: null,
  selectedDesignSystem: null,
  cachedDesignSystems: []
};

// DOM Elements
const runCheckBtn = document.getElementById('runCheckBtn');
const closeBtn = document.getElementById('closeBtn');
const loadDesignSystemBtn = document.getElementById('loadDesignSystemBtn');
const designSystemUrlInput = document.getElementById('designSystemUrlInput');
const loadingState = document.getElementById('loadingState');
const emptyState = document.getElementById('emptyState');
const noDesignSystemsState = document.getElementById('noDesignSystemsState');
const designSystemList = document.getElementById('designSystemList');

// Initialize the UI
function initUI() {
  console.log('Initializing UI...');
  showSection('loadingState');
  
  // Initialize tabs
  setupTabs();
  
  // Initialize event listeners
  setupEventListeners();
  
  // Send init message to plugin
  parent.postMessage({ pluginMessage: { type: 'init' } }, '*');
}

function setupTabs() {
  const tabs = document.querySelectorAll('.tabs .tab');
  const tabContents = document.querySelectorAll('.tab-content');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      tabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Get the tab's data-tab attribute
      const tabName = tab.getAttribute('data-tab');
      currentState.activeTab = tabName;
      
      // Hide all tab content
      tabContents.forEach(content => {
        content.style.display = 'none';
      });
      
      // Show the selected tab content
      const selectedTabContent = document.getElementById(`${tabName}Tab`);
      if (selectedTabContent) {
        selectedTabContent.style.display = 'block';
      }
    });
  });
}

function setupEventListeners() {
  // Run check button
  runCheckBtn.addEventListener('click', () => {
    showSection('loadingState');
    
    // Get settings
    const scope = document.querySelector('input[name="scanScope"]:checked')?.value || 'selection';
    const includeHidden = document.getElementById('includeHidden').checked;
    const visualizeIssues = document.getElementById('visualizeIssues').checked;
    const generateReport = document.getElementById('generateReport').checked;
    const limitProcessingTime = document.getElementById('limitProcessingTime').checked;
    
    // Send message to plugin
    parent.postMessage({
      pluginMessage: {
        type: 'checkDesignSystem',
        payload: {
          options: {
            scope,
            includeHidden,
            visualize: visualizeIssues,
            generateReport,
            limitProcessingTime
          }
        }
      }
    }, '*');
  });
  
  // Close button
  closeBtn.addEventListener('click', () => {
    parent.postMessage({ pluginMessage: { type: 'close' } }, '*');
  });
  
  // Load design system button
  loadDesignSystemBtn.addEventListener('click', () => {
    const input = designSystemUrlInput.value.trim();
    if (!input) {
      showError('Please enter a valid Figma file URL or key');
      return;
    }
    
    // Extract file key from URL or use input as key
    let fileKey = input;
    if (input.includes('figma.com/file/')) {
      const match = input.match(/figma\.com\/file\/([a-zA-Z0-9]+)/);
      if (match && match[1]) {
        fileKey = match[1];
      }
    }
    
    // Send message to plugin
    showSection('loadingState');
    loadingState.querySelector('p').textContent = 'Loading design system...';
    
    parent.postMessage({
      pluginMessage: {
        type: 'loadDesignSystem',
        payload: {
          fileKey
        }
      }
    }, '*');
    
    // Clear input
    designSystemUrlInput.value = '';
  });
}

// Utility Functions
function showSection(sectionId) {
  // Hide all main sections
  loadingState.style.display = 'none';
  emptyState.style.display = 'none';
  
  // Show the requested section
  const section = document.getElementById(sectionId);
  if (section) {
    section.style.display = 'flex';
  }
}

function showError(message) {
  const errorContainer = document.getElementById('errorContainer');
  errorContainer.textContent = message;
  errorContainer.style.display = 'block';
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    errorContainer.style.display = 'none';
  }, 5000);
}

// Handle messages from the plugin
window.onmessage = event => {
  const message = event.data.pluginMessage;
  
  if (!message) return;
  
  console.log('Received message:', message.type);
  
  switch (message.type) {
    case 'designSystemsLoaded':
      handleDesignSystemsLoaded(message.payload);
      break;
      
    case 'activeDesignSystemChanged':
      handleActiveDesignSystemChanged(message.payload);
      break;
      
    case 'checkResults':
      handleCheckResults(message.payload);
      break;
      
    case 'error':
      showError(message.payload.message);
      showSection('emptyState');
      break;
      
    case 'exportReportData':
      // Handle report data
      break;
      
    case 'batchFixComplete':
      // Handle batch fix completion
      break;
  }
};

// Handle design systems loaded
function handleDesignSystemsLoaded(payload) {
  currentState.cachedDesignSystems = payload.systems || [];
  currentState.selectedDesignSystem = payload.activeId;
  
  // Update UI
  updateDesignSystemsList();
  
  // Show appropriate section
  if (loadingState.style.display !== 'none') {
    showSection('emptyState');
  }
}

// Handle active design system changed
function handleActiveDesignSystemChanged(payload) {
  currentState.selectedDesignSystem = payload.activeId;
  
  // Update UI
  updateDesignSystemsList();
}

// Update design systems list in the UI
function updateDesignSystemsList() {
  const listContainer = document.querySelector('.design-system-list');
  
  // Clear existing items
  listContainer.innerHTML = '';
  
  if (currentState.cachedDesignSystems.length === 0) {
    noDesignSystemsState.style.display = 'flex';
    designSystemList.style.display = 'none';
    return;
  }
  
  // Show design systems list, hide empty state
  noDesignSystemsState.style.display = 'none';
  designSystemList.style.display = 'block';
  
  // Populate list
  currentState.cachedDesignSystems.forEach(ds => {
    const isActive = ds.id === currentState.selectedDesignSystem;
    
    const item = document.createElement('div');
    item.className = `design-system-item ${isActive ? 'active' : ''}`;
    
    const lastUpdated = new Date(ds.lastUpdated).toLocaleString();
    
    item.innerHTML = `
      <div class="ds-info">
        <h4>${ds.name}</h4>
        <div class="ds-meta">
          <span>Last updated: ${lastUpdated}</span>
          <span>Components: ${ds.components.length}</span>
          <span>Styles: ${ds.styles.length}</span>
        </div>
      </div>
      <div class="ds-actions">
        ${isActive ? 
          '<span class="badge active">Active</span>' :
          `<button class="button button-small set-active-btn" data-id="${ds.id}">Set Active</button>`
        }
        <button class="button button-small button-danger delete-ds-btn" data-id="${ds.id}">Delete</button>
      </div>
    `;
    
    listContainer.appendChild(item);
  });
  
  // Add event listeners for set active and delete buttons
  document.querySelectorAll('.set-active-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dsId = btn.getAttribute('data-id');
      parent.postMessage({
        pluginMessage: {
          type: 'setActiveDesignSystem',
          payload: { id: dsId }
        }
      }, '*');
    });
  });
  
  document.querySelectorAll('.delete-ds-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const dsId = btn.getAttribute('data-id');
      parent.postMessage({
        pluginMessage: {
          type: 'deleteDesignSystem',
          payload: { id: dsId }
        }
      }, '*');
    });
  });
}

// Handle check results
function handleCheckResults(results) {
  currentState.checkResults = results;
  showSection('emptyState');
  
  // Update Summary Tab
  updateSummaryTab(results);
  
  // Update Components Tab
  updateComponentsTab(results.componentResults);
  
  // Update Styles Tab
  updateStylesTab(results.styleResults);
  
  // Update Variables Tab
  updateVariablesTab(results.tokenResults);
  
  // Show active tab
  document.querySelector(`.tab[data-tab="${currentState.activeTab}"]`).click();
}

// Update summary tab with check results
function updateSummaryTab(results) {
  const {
    metrics,
    libraries,
    activeDesignSystem
  } = results;
  
  if (!metrics) return;
  
  // Update coverage percentages
  document.getElementById('overallCoverage').textContent = `${Math.round(metrics.overallCoverage)}%`;
  document.getElementById('componentCoverage').textContent = `${Math.round(metrics.componentCoverage)}%`;
  document.getElementById('styleCoverage').textContent = `${Math.round(metrics.styleCoverage)}%`;
  document.getElementById('variableCoverage').textContent = `${Math.round(metrics.variableCoverage)}%`;
  
  // Update progress bars
  document.getElementById('overallCoverageBar').style.width = `${metrics.overallCoverage}%`;
  document.getElementById('componentCoverageBar').style.width = `${metrics.componentCoverage}%`;
  document.getElementById('styleCoverageBar').style.width = `${metrics.styleCoverage}%`;
  document.getElementById('variableCoverageBar').style.width = `${metrics.variableCoverage}%`;
  
  // Update totals
  document.getElementById('totalNodes').textContent = metrics.totalNodes;
  document.getElementById('libraryComponents').textContent = metrics.libraryComponents;
  document.getElementById('localComponents').textContent = metrics.localComponents;
  document.getElementById('detachedComponents').textContent = metrics.detachedComponents;
  
  // Update detected libraries section
  updateLibrariesSection(libraries, activeDesignSystem);
  
  // Update processing metadata
  const metadataContainer = document.querySelector('.analysis-metadata');
  if (metadataContainer) {
    const scopeText = metrics.scopeType === 'selection' ? 'Selected Elements' : 
                     metrics.scopeType === 'page' ? 'Current Page' : 'Entire Document';
    
    const processingTime = metrics.processingTime ? 
                          `${(metrics.processingTime / 1000).toFixed(1)}s` : 'Unknown';
    
    const nodesProcessed = metrics.nodesProcessed || 'Unknown';
    
    metadataContainer.innerHTML = `
      <div><strong>Scope:</strong> ${scopeText}</div>
      <div><strong>Time:</strong> ${processingTime}</div>
      <div><strong>Nodes Processed:</strong> ${nodesProcessed}</div>
    `;
  }
}

// Update libraries section with design system info
function updateLibrariesSection(libraries, activeDesignSystem) {
  const librariesContainer = document.getElementById('detectedLibraries');
  if (!librariesContainer) return;
  
  librariesContainer.innerHTML = '';
  
  // Add active design system first if exists
  if (activeDesignSystem) {
    const dsItem = document.createElement('div');
    dsItem.className = 'library-item';
    dsItem.innerHTML = `
      <div class="library-name">${activeDesignSystem.name} <span class="badge active">Active Design System</span></div>
      <div class="library-meta">
        <span>Components: ${activeDesignSystem.components.length}</span>
        <span>Styles: ${activeDesignSystem.styles.length}</span>
        <span>Variables: ${activeDesignSystem.variables.length}</span>
      </div>
    `;
    librariesContainer.appendChild(dsItem);
  }
  
  // Add other libraries
  if (libraries && libraries.length > 0) {
    libraries.forEach(lib => {
      // Skip if it's the same as the active design system
      if (activeDesignSystem && lib.id === activeDesignSystem.id) {
        return;
      }
      
      const libItem = document.createElement('div');
      libItem.className = 'library-item';
      libItem.innerHTML = `
        <div class="library-name">${lib.name}</div>
        <div class="library-meta">
          <span>${lib.type || 'Library'}</span>
        </div>
      `;
      librariesContainer.appendChild(libItem);
    });
  }
  
  // If no libraries found
  if (librariesContainer.children.length === 0) {
    librariesContainer.innerHTML = '<p>No libraries detected.</p>';
  }
}

// Updates for each tab (implementation depends on your existing code)
function updateComponentsTab(componentResults) {
  // Implement based on your existing code
}

function updateStylesTab(styleResults) {
  // Implement based on your existing code
}

function updateVariablesTab(tokenResults) {
  // Implement based on your existing code
}

// Initialize the UI when the document is loaded
document.addEventListener('DOMContentLoaded', initUI); 