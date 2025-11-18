// API Base URL
const API_BASE = '/api/v1';

// State
let currentPage = {
    images: 1,
    prompts: 1
};
let currentTab = 'images';
let selectedTags = new Set(); // Track selected tags for filtering
let selectedImages = new Set(); // Track selected images for batch operations
let imageFilters = {
    format: '',
    model: '',
    sampler: ''
};
let promptFilters = {
    type: '',
    dateFrom: '',
    dateTo: '',
    sortBy: 'created_at DESC'
};

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    initializeNavigation();
    initializeTabs();
    initializeModals();
    loadStats();
    loadImages();
    setupEventListeners();
});

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        updateThemeIcon('light');
    } else {
        updateThemeIcon('dark');
    }
}

function toggleTheme() {
    const isDark = document.body.classList.contains('dark-mode');
    if (isDark) {
        document.body.classList.remove('dark-mode');
        document.body.classList.add('light-mode');
        localStorage.setItem('theme', 'light');
        updateThemeIcon('light');
    } else {
        document.body.classList.remove('light-mode');
        document.body.classList.add('dark-mode');
        localStorage.setItem('theme', 'dark');
        updateThemeIcon('dark');
    }
}

function updateThemeIcon(mode) {
    const icon = document.querySelector('.theme-icon');
    if (icon) {
        icon.textContent = mode === 'dark' ? '🌙' : '☀️';
    }
}

// Navigation Management
function initializeNavigation() {
    // Listen for hash changes (browser back/forward)
    window.addEventListener('hashchange', () => {
        const hash = window.location.hash.substring(1); // Remove '#'
        if (hash) {
            switchTab(hash, false); // false = don't update URL (already updated)
        }
    });
    
    // Initialize tab from URL hash on page load
    const hash = window.location.hash.substring(1);
    if (hash && ['images', 'prompts', 'collections', 'tags', 'stats'].includes(hash)) {
        switchTab(hash, false);
    }
}

// Tab Management
function initializeTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName, true); // true = update URL
        });
    });
}

function switchTab(tabName, updateUrl = true) {
    currentTab = tabName;
    
    // Update URL hash if requested
    if (updateUrl) {
        window.history.pushState(null, '', `#${tabName}`);
    }
    
    // Update tab buttons
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
        if (tab.dataset.tab === tabName) {
            tab.classList.add('active');
        }
    });
    
    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
        content.classList.remove('active');
    });
    
    const activeContent = document.getElementById(`${tabName}-tab`);
    if (activeContent) {
        activeContent.classList.add('active');
    }
    
    // Load tab data
    switch(tabName) {
        case 'images':
            loadImages();
            break;
        case 'prompts':
            loadPrompts();
            break;
        case 'collections':
            loadCollections();
            break;
        case 'tags':
            loadTags();
            break;
        case 'stats':
            loadStats();
            break;
    }
}

// Modal Management
function initializeModals() {
    // Close buttons
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const modalId = e.target.dataset.modal;
            closeModal(modalId);
        });
    });
    
    // Close on background click
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal(modal.id);
            }
        });
    });
}

function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// Event Listeners
function setupEventListeners() {
    // Theme toggle
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', toggleTheme);
    }
    
    // Scan button
    const scanBtn = document.getElementById('scan-btn');
    if (scanBtn) {
        scanBtn.addEventListener('click', () => openModal('scan-modal'));
    }
    
    // Scan start
    const scanStartBtn = document.getElementById('scan-start-btn');
    if (scanStartBtn) {
        scanStartBtn.addEventListener('click', startScan);
    }
    
    // Search buttons
    const imageSearchBtn = document.getElementById('image-search-btn');
    if (imageSearchBtn) {
        imageSearchBtn.addEventListener('click', () => {
            const query = document.getElementById('image-search').value;
            searchImages(query);
        });
    }
    
    const promptSearchBtn = document.getElementById('prompt-search-btn');
    if (promptSearchBtn) {
        promptSearchBtn.addEventListener('click', () => {
            const query = document.getElementById('prompt-search').value;
            searchPrompts(query);
        });
    }
    
    // Enter key in search inputs
    document.getElementById('image-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value;
            searchImages(query);
        }
    });
    
    document.getElementById('prompt-search')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = e.target.value;
            searchPrompts(query);
        }
    });
    
    // Export button
    const exportBtn = document.getElementById('export-prompts-btn');
    if (exportBtn) {
        exportBtn.addEventListener('click', exportPrompts);
    }
    
    // Create collection button
    const createCollectionBtn = document.getElementById('create-collection-btn');
    if (createCollectionBtn) {
        createCollectionBtn.addEventListener('click', () => {
            openCreateCollectionModal();
        });
    }
    
    // Collection modal submit handlers
    const createCollectionSubmitBtn = document.getElementById('create-collection-submit-btn');
    if (createCollectionSubmitBtn) {
        createCollectionSubmitBtn.addEventListener('click', submitCreateCollection);
    }
    
    const saveCollectionBtn = document.getElementById('save-collection-btn');
    if (saveCollectionBtn) {
        saveCollectionBtn.addEventListener('click', submitEditCollection);
    }
}

// Toast Notifications
function showToast(type, title, message, duration = 5000) {
    const container = document.getElementById('toast-container');
    if (!container) return;
    
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    const icons = {
        success: '✅',
        error: '❌',
        warning: '⚠️',
        info: 'ℹ️'
    };
    
    toast.innerHTML = `
        <span class="toast-icon">${icons[type] || icons.info}</span>
        <div class="toast-content">
            <div class="toast-title">${escapeHtml(title)}</div>
            ${message ? `<div class="toast-message">${escapeHtml(message)}</div>` : ''}
        </div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    
    container.appendChild(toast);
    
    // Auto-remove after duration
    setTimeout(() => {
        if (toast.parentElement) {
            toast.style.animation = 'slideIn 0.3s ease-out reverse';
            setTimeout(() => toast.remove(), 300);
        }
    }, duration);
}

// Loading States
function showLoading(containerId, message = 'Loading...') {
    const container = document.getElementById(containerId);
    if (container) {
        container.innerHTML = `
            <div class="loading-overlay">
                <div class="spinner"></div>
                <span>${escapeHtml(message)}</span>
            </div>
        `;
    }
}

function hideLoading(containerId) {
    const container = document.getElementById(containerId);
    if (container && container.querySelector('.loading-overlay')) {
        // Don't clear if there's already content
        return;
    }
}

// API Calls
async function apiCall(endpoint, options = {}) {
    try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers
            }
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error || `API error: ${response.status}`;
            throw new Error(errorMessage);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        throw error;
    }
}

// Load Statistics
async function loadStats() {
    try {
        const stats = await apiCall('/stats');
        
        document.getElementById('stat-images').textContent = stats.images?.total || 0;
        document.getElementById('stat-prompts').textContent = stats.prompts?.total || 0;
        document.getElementById('stat-tags').textContent = stats.tags?.total || 0;
        document.getElementById('stat-collections').textContent = stats.collections?.total || 0;
        
        // Load detailed stats
        const imageStats = await apiCall('/stats/images');
        const promptStats = await apiCall('/stats/prompts');
        
        const totalSizeMB = Math.round((imageStats.total_size || 0) / 1024 / 1024);
        document.getElementById('stat-total-size').textContent = `${totalSizeMB} MB`;
        document.getElementById('stat-unique-prompts').textContent = promptStats.unique || 0;
    } catch (error) {
        console.error('Failed to load stats:', error);
    }
}

// Load Images
async function loadImages(page = 1) {
    showLoading('images-grid', 'Loading images...');
    try {
        // Build query with tag filters
        let query = `/images?page=${page}&limit=1000`; // Fetch more to filter client-side
        
        // If tags are selected, filter client-side (fetch all and filter)
        // For now, we'll filter client-side since we need to check multiple tags
        const data = await apiCall(query);
        let images = data.images || [];
        
        // Filter by selected tags (client-side for now)
        if (selectedTags.size > 0) {
            const filteredImages = [];
            for (const image of images) {
                try {
                    const tagsData = await apiCall(`/tags/image/${image.id}`);
                    const imageTags = (tagsData.tags || []).map(t => t.name.toLowerCase());
                    // Check if image has all selected tags (AND logic)
                    const hasAllTags = Array.from(selectedTags).every(tag => 
                        imageTags.includes(tag.toLowerCase())
                    );
                    if (hasAllTags) {
                        filteredImages.push(image);
                    }
                } catch (e) {
                    // Skip if tag fetch fails
                }
            }
            images = filteredImages;
        }
        
        // Apply advanced filters
        images = applyImageFiltersToArray(images);
        
        // Paginate filtered results
        const limit = 24;
        const total = images.length;
        const start = (page - 1) * limit;
        const end = Math.min(start + limit, total);
        const paginated = images.slice(start, end);
        
        displayImages(paginated);
        displayPagination('images-pagination', page, {
            page: page,
            limit: limit,
            total: total,
            pages: Math.ceil(total / limit)
        });
        currentPage.images = page;
    } catch (error) {
        console.error('Failed to load images:', error);
        showToast('error', 'Failed to load images', error.message);
        document.getElementById('images-grid').innerHTML = '<div class="loading">Failed to load images</div>';
    }
}

function applyImageFiltersToArray(images) {
    return images.filter(image => {
        // Format filter
        if (imageFilters.format && image.format.toLowerCase() !== imageFilters.format.toLowerCase()) {
            return false;
        }
        
        // Model and sampler filters require metadata lookup
        // For now, we'll do basic filtering - can be enhanced with metadata API
        return true;
    });
}

function applyImageFilters() {
    imageFilters.format = document.getElementById('filter-format').value;
    imageFilters.model = document.getElementById('filter-model').value.trim();
    imageFilters.sampler = document.getElementById('filter-sampler').value.trim();
    loadImages(1);
}

function clearImageFilters() {
    imageFilters.format = '';
    imageFilters.model = '';
    imageFilters.sampler = '';
    document.getElementById('filter-format').value = '';
    document.getElementById('filter-model').value = '';
    document.getElementById('filter-sampler').value = '';
    loadImages(1);
}

function displayImages(images) {
    const grid = document.getElementById('images-grid');
    if (!images || images.length === 0) {
        grid.innerHTML = '<div class="loading">No images found</div>';
        return;
    }
    
    grid.innerHTML = images.map(image => {
        // Try to load thumbnail first, fallback to full image, then placeholder
        let thumbnailContent = '';
        if (image.file_path) {
            // Use thumbnail endpoint first (faster), fallback to full image
            thumbnailContent = `<img src="/api/v1/images/${image.id}/thumbnail" alt="${escapeHtml(image.file_name)}" onerror="this.onerror=null; this.src='/api/v1/images/${image.id}/file'; this.onerror=function(){this.parentElement.innerHTML='<div class=\\'image-placeholder\\'>${image.width && image.height ? image.width + '×' + image.height : 'Image'}</div>';}" style="max-width: 100%; max-height: 200px; object-fit: contain; width: 100%; height: 200px;">`;
        } else {
            thumbnailContent = `<div class="image-placeholder">${image.width && image.height ? `${image.width}×${image.height}` : 'No image'}</div>`;
        }
        
        const isSelected = selectedImages.has(image.id);
        
        return `
        <div class="image-card" data-image-id="${image.id}">
            <div class="image-card-header" style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                <input type="checkbox" class="image-select-checkbox" data-image-id="${image.id}" ${isSelected ? 'checked' : ''} onchange="toggleImageSelection('${image.id}')" onclick="event.stopPropagation();">
                <button class="btn-icon btn-small" onclick="interrogateImage('${image.id}'); event.stopPropagation();" title="Generate prompt with CLIP" style="font-size: 0.9rem; padding: 0.25rem 0.5rem;">🔍 CLIP</button>
            </div>
            <div class="image-thumbnail" onclick="showImageDetail('${image.id}')" style="cursor: pointer;">
                ${thumbnailContent}
            </div>
            <div class="image-info" onclick="showImageDetail('${image.id}')" style="cursor: pointer;">
                <div class="image-name">${escapeHtml(image.file_name)}</div>
                <div class="image-meta">
                    ${formatFileSize(image.file_size)} • ${image.format.toUpperCase()}
                </div>
            </div>
        </div>
    `;
    }).join('');
    
    // Update batch button visibility after rendering
    updateBatchButton();
}

// Load Prompts
async function loadPrompts(page = 1) {
    showLoading('prompts-list', 'Loading prompts...');
    try {
        // Build query with filters
        let query = `/prompts?page=${page}&limit=20&order_by=${encodeURIComponent(promptFilters.sortBy)}`;
        
        if (promptFilters.type) {
            query += `&type=${encodeURIComponent(promptFilters.type)}`;
        }
        if (promptFilters.dateFrom) {
            query += `&date_from=${encodeURIComponent(promptFilters.dateFrom)}`;
        }
        if (promptFilters.dateTo) {
            query += `&date_to=${encodeURIComponent(promptFilters.dateTo)}`;
        }
        
        const data = await apiCall(query);
        displayPrompts(data.prompts || []);
        displayPagination('prompts-pagination', page, data.pagination);
        currentPage.prompts = page;
    } catch (error) {
        console.error('Failed to load prompts:', error);
        showToast('error', 'Failed to load prompts', error.message);
        document.getElementById('prompts-list').innerHTML = '<div class="loading">Failed to load prompts</div>';
    }
}

function applyPromptFilters() {
    promptFilters.type = document.getElementById('filter-prompt-type').value;
    promptFilters.dateFrom = document.getElementById('filter-prompt-date-from').value;
    promptFilters.dateTo = document.getElementById('filter-prompt-date-to').value;
    promptFilters.sortBy = document.getElementById('filter-prompt-sort').value;
    loadPrompts(1);
}

function clearPromptFilters() {
    promptFilters.type = '';
    promptFilters.dateFrom = '';
    promptFilters.dateTo = '';
    promptFilters.sortBy = 'created_at DESC';
    document.getElementById('filter-prompt-type').value = '';
    document.getElementById('filter-prompt-date-from').value = '';
    document.getElementById('filter-prompt-date-to').value = '';
    document.getElementById('filter-prompt-sort').value = 'created_at DESC';
    loadPrompts(1);
}

function displayPrompts(prompts) {
    const list = document.getElementById('prompts-list');
    if (!prompts || prompts.length === 0) {
        list.innerHTML = '<div class="loading">No prompts found</div>';
        return;
    }
    
    // Filter out negative prompts - only filter by prompt_type, not by negative_prompt field
    // The negative_prompt field is metadata about what was excluded, not an indicator that this prompt is negative
    const positivePrompts = prompts.filter(prompt => 
        prompt.prompt_type !== 'negative'
    );
    
    if (positivePrompts.length === 0) {
        list.innerHTML = '<div class="loading">No positive prompts found</div>';
        return;
    }
    
    list.innerHTML = positivePrompts.map(prompt => {
        const date = new Date(prompt.created_at);
        const dateStr = date.toLocaleDateString();
        const timeStr = date.toLocaleTimeString();
        
        return `
        <div class="prompt-card" onclick="showPromptDetail('${prompt.id}')">
            <div class="prompt-text">${escapeHtml(prompt.prompt_text)}</div>
            <div class="prompt-meta">
                <span>Type: ${prompt.prompt_type}</span>
                <span>Date: ${dateStr} ${timeStr}</span>
                <span>Image ID: ${prompt.image_id.substring(0, 8)}...</span>
            </div>
        </div>
        `;
    }).join('');
}

// Search Functions
async function searchImages(query) {
    if (!query) {
        loadImages();
        return;
    }
    
    showLoading('images-grid', 'Searching images...');
    try {
        const data = await apiCall(`/search/images?q=${encodeURIComponent(query)}`);
        displayImages(data.images || []);
        if (data.images && data.images.length === 0) {
            showToast('info', 'No results', 'No images found matching your search');
        }
    } catch (error) {
        console.error('Search failed:', error);
        showToast('error', 'Search failed', error.message);
        document.getElementById('images-grid').innerHTML = '<div class="loading">Search failed</div>';
    }
}

async function searchPrompts(query) {
    if (!query) {
        loadPrompts();
        return;
    }
    
    showLoading('prompts-list', 'Searching prompts...');
    try {
        // Use the correct search endpoint
        const data = await apiCall(`/search/prompts?q=${encodeURIComponent(query)}`);
        displayPrompts(data.prompts || []);
        if (data.prompts && data.prompts.length === 0) {
            showToast('info', 'No results', 'No prompts found matching your search');
        } else if (data.prompts && data.prompts.length > 0) {
            showToast('success', 'Search complete', `Found ${data.prompts.length} prompt(s)`);
        }
    } catch (error) {
        console.error('Search failed:', error);
        showToast('error', 'Search failed', error.message);
        document.getElementById('prompts-list').innerHTML = '<div class="loading">Search failed</div>';
    }
}

// Load Collections
async function loadCollections() {
    showLoading('collections-list', 'Loading collections...');
    try {
        const data = await apiCall('/collections');
        displayCollections(data.collections || []);
    } catch (error) {
        console.error('Failed to load collections:', error);
        showToast('error', 'Failed to load collections', error.message);
        document.getElementById('collections-list').innerHTML = '<div class="loading">Failed to load collections</div>';
    }
}

function displayCollections(collections) {
    const list = document.getElementById('collections-list');
    if (!collections || collections.length === 0) {
        list.innerHTML = '<div class="loading">No collections found. Create one to get started!</div>';
        return;
    }
    
    list.innerHTML = collections.map(collection => {
        // Truncate long folder paths for display
        const folderPath = collection.folder_path || '';
        const displayPath = folderPath.length > 80 
            ? folderPath.substring(0, 77) + '...' 
            : folderPath;
        
        return `
        <div class="collection-card">
            <div class="collection-header">
                <div class="collection-name">${escapeHtml(collection.name)}</div>
                <div class="collection-actions">
                    <button class="btn-icon btn-primary" onclick="interrogateCollection('${collection.id}')" title="Generate CLIP prompts for all images">🔍 CLIP</button>
                    <button class="btn-icon" onclick="exportCollection('${collection.id}', 'json')" title="Export JSON">📥</button>
                    <button class="btn-icon" onclick="exportCollection('${collection.id}', 'markdown')" title="Export Markdown">📄</button>
                    <button class="btn-icon" onclick="editCollection('${collection.id}')" title="Edit">✏️</button>
                    <button class="btn-icon" onclick="deleteCollection('${collection.id}')" title="Delete">🗑️</button>
                </div>
            </div>
            ${collection.description ? `
                <div class="collection-description">${escapeHtml(collection.description)}</div>
            ` : ''}
            ${collection.folder_path ? `
                <div class="collection-meta">
                    <strong>Folder:</strong><br>
                    <span title="${escapeHtml(collection.folder_path)}">${escapeHtml(displayPath)}</span>
                </div>
            ` : ''}
        </div>
        `;
    }).join('');
}

// Load Tags
async function loadTags() {
    try {
        // For now, we'll get tags from images
        // TODO: Implement proper tag listing endpoint
        const images = await apiCall('/images?limit=100');
        const tagMap = new Map();
        
        for (const image of images.images || []) {
            try {
                const tags = await apiCall(`/tags/image/${image.id}`);
                (tags.tags || []).forEach(tag => {
                    const key = `${tag.name}_${tag.tag_type}`;
                    tagMap.set(key, {
                        name: tag.name,
                        type: tag.tag_type,
                        count: (tagMap.get(key)?.count || 0) + 1
                    });
                });
            } catch (e) {
                // Skip if tags fail
            }
        }
        
        displayTags(Array.from(tagMap.values()));
    } catch (error) {
        console.error('Failed to load tags:', error);
        document.getElementById('tags-cloud').innerHTML = '<div class="loading">Failed to load tags</div>';
    }
}

function displayTags(tags) {
    const cloud = document.getElementById('tags-cloud');
    if (!tags || tags.length === 0) {
        cloud.innerHTML = '<div class="loading">No tags found</div>';
        return;
    }
    
    // Filter out negative tags
    const positiveTags = tags.filter(tag => tag.type !== 'negative');
    
    // Sort by count
    positiveTags.sort((a, b) => b.count - a.count);
    
    cloud.innerHTML = positiveTags.map(tag => `
        <span class="tag ${tag.type}" onclick="filterByTag('${escapeHtml(tag.name)}')">
            ${escapeHtml(tag.name)}
            <span class="tag-count">${tag.count}</span>
        </span>
    `).join('');
    
    // Update filter display after loading tags
    updateTagFilterDisplay();
}

// Scan Directory
async function startScan() {
    const path = document.getElementById('scan-path').value;
    const recursive = document.getElementById('scan-recursive').checked;
    
    if (!path) {
        showToast('warning', 'Path required', 'Please enter a directory path');
        return;
    }
    
    const progressDiv = document.getElementById('scan-progress');
    progressDiv.classList.remove('hidden');
    
    try {
        const response = await apiCall('/images/scan', {
            method: 'POST',
            body: JSON.stringify({ path, recursive })
        });
        
        updateScanProgress(response);
        
        // Poll for progress updates (every 2 seconds to reduce server log noise)
        const interval = setInterval(async () => {
            try {
                const status = await apiCall('/images/scan/status');
                if (status.status === 'idle') {
                    clearInterval(interval);
                    showToast('success', 'Scan complete', `Processed ${status.processed || 0} images`);
                    setTimeout(() => {
                        closeModal('scan-modal');
                        loadImages();
                        loadStats();
                    }, 2000);
                } else {
                    updateScanProgress(status);
                }
            } catch (e) {
                clearInterval(interval);
                showToast('error', 'Scan error', 'Failed to get scan status');
            }
        }, 2000); // Increased from 1000ms to 2000ms to reduce log noise
        
    } catch (error) {
        showToast('error', 'Scan failed', error.message);
        progressDiv.classList.add('hidden');
    }
}

function updateScanProgress(progress) {
    const fill = document.getElementById('progress-fill');
    const current = document.getElementById('progress-current');
    const total = document.getElementById('progress-total');
    const status = document.getElementById('scan-status');
    
    if (progress.total_files > 0) {
        const percent = (progress.processed / progress.total_files) * 100;
        fill.style.width = `${percent}%`;
        current.textContent = progress.processed;
        total.textContent = progress.total_files;
        status.textContent = `Processed: ${progress.processed}, Skipped: ${progress.skipped}, Errors: ${progress.errors}`;
    }
}

// Export Prompts
async function exportPrompts(format = 'json') {
    try {
        showLoading('prompts-list', 'Exporting prompts...');
        const response = await fetch(`${API_BASE}/export/prompts?format=${format}`);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompts-export-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'md'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('success', 'Export Complete', `Prompts exported as ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Export failed:', error);
        showToast('error', 'Export Failed', error.message);
    }
}

// Detail Views
async function showImageDetail(imageId) {
    openModal('image-modal');
    const content = document.getElementById('image-detail-content');
    content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Loading image details...</span></div>';
    
    try {
        // Load image details
        const image = await apiCall(`/images/${imageId}`);
        
        // Load prompts for this image
        let promptsHtml = '<div class="loading-overlay"><div class="spinner"></div><span>Loading prompts...</span></div>';
        try {
            const promptsData = await apiCall(`/prompts/image/${imageId}`);
            const prompts = promptsData.prompts || [];
            const positivePrompts = prompts.filter(p => p.prompt_type !== 'negative' && !p.negative_prompt);
            
            if (positivePrompts.length > 0) {
                promptsHtml = positivePrompts.map(p => `
                    <div class="prompt-item" onclick="showPromptDetail('${p.id}')">
                        <div class="prompt-text">${escapeHtml(p.prompt_text)}</div>
                        <div class="prompt-meta">Type: ${p.prompt_type}</div>
                    </div>
                `).join('');
            } else {
                promptsHtml = '<div class="loading">No prompts found</div>';
            }
        } catch (e) {
            promptsHtml = '<div class="loading">Failed to load prompts</div>';
        }
        
        // Load tags for this image
        let tagsHtml = '';
        try {
            const tagsData = await apiCall(`/tags/image/${imageId}`);
            const tags = tagsData.tags || [];
            const positiveTags = tags.filter(t => t.tag_type !== 'negative');
            
            tagsHtml = `
                <div class="tags-section">
                    <h3>Tags</h3>
                    <div class="tags-list" id="image-tags-list-${imageId}">
                        ${positiveTags.length > 0 ? positiveTags.map(t => `
                            <span class="tag tag-${t.tag_type}">
                                ${escapeHtml(t.name)}
                                <button class="tag-remove" onclick="removeTagFromImage('${imageId}', '${t.id}', '${escapeHtml(t.name)}')" title="Remove tag">×</button>
                            </span>
                        `).join('') : '<div class="loading" style="color: var(--text-secondary);">No tags</div>'}
                    </div>
                    <div class="add-tag-controls" style="margin-top: 1rem; display: flex; gap: 0.5rem; align-items: center;">
                        <input type="text" id="new-tag-name-${imageId}" class="input-full" placeholder="Tag name" style="flex: 1; padding: 0.5rem;">
                        <select id="new-tag-type-${imageId}" class="select-input" style="padding: 0.5rem;">
                            <option value="style">Style</option>
                            <option value="subject">Subject</option>
                            <option value="technique">Technique</option>
                            <option value="quality">Quality</option>
                            <option value="model">Model</option>
                            <option value="custom">Custom</option>
                        </select>
                        <button class="btn-primary" onclick="addTagToImage('${imageId}')" style="padding: 0.5rem 1rem;">Add Tag</button>
                    </div>
                </div>
            `;
        } catch (e) {
            // Tags are optional, fail silently
            tagsHtml = '<div class="tags-section"><h3>Tags</h3><div class="loading">Failed to load tags</div></div>';
        }
        
        // Load metadata
        let metadataHtml = '';
        try {
            const metadataData = await apiCall(`/metadata/image/${imageId}`);
            const metadata = metadataData.metadata || [];
            if (metadata.length > 0) {
                metadataHtml = `
                    <div class="metadata-section">
                        <h3>Metadata</h3>
                        <dl class="metadata-list">
                            ${metadata.map(m => `
                                <dt>${escapeHtml(m.key)}</dt>
                                <dd>${escapeHtml(String(m.value || ''))}</dd>
                            `).join('')}
                        </dl>
                    </div>
                `;
            }
        } catch (e) {
            // Metadata is optional, fail silently
        }
        
        content.innerHTML = `
            <div class="image-detail-view">
                <div class="image-detail-header">
                    <img src="/api/v1/images/${image.id}/file" alt="${escapeHtml(image.file_name)}" 
                         style="max-width: 100%; max-height: 500px; object-fit: contain; border-radius: 8px;">
                </div>
                <div class="image-detail-info">
                    <h3>${escapeHtml(image.file_name)}</h3>
                    <div class="detail-grid">
                        <div class="detail-item">
                            <strong>Format:</strong> ${image.format.toUpperCase()}
                        </div>
                        <div class="detail-item">
                            <strong>Size:</strong> ${formatFileSize(image.file_size)}
                        </div>
                        ${image.width && image.height ? `
                            <div class="detail-item">
                                <strong>Dimensions:</strong> ${image.width} × ${image.height}
                            </div>
                        ` : ''}
                        <div class="detail-item">
                            <strong>Path:</strong> <code>${escapeHtml(image.file_path)}</code>
                        </div>
                        <div class="detail-item">
                            <strong>Created:</strong> ${new Date(image.created_at).toLocaleString()}
                        </div>
                    </div>
                    ${tagsHtml}
                    <div class="prompts-section">
                        <h3>Prompts</h3>
                        ${promptsHtml}
                    </div>
                    ${metadataHtml}
                </div>
            </div>
        `;
        
        document.getElementById('image-modal-title').textContent = image.file_name;
        
        // Show footer with delete button
        const footer = document.getElementById('image-modal-footer');
        if (footer) {
            footer.style.display = 'flex';
            const deleteBtn = document.getElementById('delete-image-btn');
            if (deleteBtn) {
                deleteBtn.onclick = () => deleteImage(image.id);
            }
        }
    } catch (error) {
        console.error('Failed to load image details:', error);
        showToast('error', 'Failed to load image details', error.message);
        content.innerHTML = '<div class="loading">Failed to load image details</div>';
    }
}

async function deleteImage(imageId) {
    if (!confirm('Are you sure you want to delete this image from the database? This will remove all associated prompts and metadata, but will not delete the file from disk.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/images/${imageId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Delete failed' }));
            throw new Error(errorData.error || 'Delete failed');
        }
        
        showToast('success', 'Image Deleted', 'Image removed from database');
        closeModal('image-modal');
        
        // Reload images list if on images tab
        if (currentTab === 'images') {
            loadImages(currentPage.images);
        }
        
        // Reload stats
        loadStats();
    } catch (error) {
        console.error('Failed to delete image:', error);
        showToast('error', 'Delete Failed', error.message);
    }
}

async function addTagToImage(imageId) {
    const tagNameInput = document.getElementById(`new-tag-name-${imageId}`);
    const tagTypeSelect = document.getElementById(`new-tag-type-${imageId}`);
    
    if (!tagNameInput || !tagTypeSelect) {
        showToast('error', 'Error', 'Tag input fields not found');
        return;
    }
    
    const tagName = tagNameInput.value.trim();
    const tagType = tagTypeSelect.value;
    
    if (!tagName) {
        showToast('warning', 'Invalid Input', 'Please enter a tag name');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/tags/image/${imageId}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                tag_name: tagName,
                tag_type: tagType
            })
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to add tag' }));
            throw new Error(errorData.error || 'Failed to add tag');
        }
        
        // Clear input
        tagNameInput.value = '';
        
        // Reload tags for this image
        const tagsData = await apiCall(`/tags/image/${imageId}`);
        const tags = tagsData.tags || [];
        const positiveTags = tags.filter(t => t.tag_type !== 'negative');
        
        // Update tags list
        const tagsList = document.getElementById(`image-tags-list-${imageId}`);
        if (tagsList) {
            tagsList.innerHTML = positiveTags.length > 0 
                ? positiveTags.map(t => `
                    <span class="tag tag-${t.tag_type}">
                        ${escapeHtml(t.name)}
                        <button class="tag-remove" onclick="removeTagFromImage('${imageId}', '${t.id}', '${escapeHtml(t.name)}')" title="Remove tag">×</button>
                    </span>
                `).join('')
                : '<div class="loading" style="color: var(--text-secondary);">No tags</div>';
        }
        
        showToast('success', 'Tag Added', `Added tag: ${tagName}`);
    } catch (error) {
        console.error('Failed to add tag:', error);
        showToast('error', 'Failed to Add Tag', error.message);
    }
}

async function removeTagFromImage(imageId, tagId, tagName) {
    if (!confirm(`Remove tag "${tagName}" from this image?`)) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE}/tags/image/${imageId}/${tagId}`, {
            method: 'DELETE'
        });
        
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Failed to remove tag' }));
            throw new Error(errorData.error || 'Failed to remove tag');
        }
        
        // Reload tags for this image
        const tagsData = await apiCall(`/tags/image/${imageId}`);
        const tags = tagsData.tags || [];
        const positiveTags = tags.filter(t => t.tag_type !== 'negative');
        
        // Update tags list
        const tagsList = document.getElementById(`image-tags-list-${imageId}`);
        if (tagsList) {
            tagsList.innerHTML = positiveTags.length > 0 
                ? positiveTags.map(t => `
                    <span class="tag tag-${t.tag_type}">
                        ${escapeHtml(t.name)}
                        <button class="tag-remove" onclick="removeTagFromImage('${imageId}', '${t.id}', '${escapeHtml(t.name)}')" title="Remove tag">×</button>
                    </span>
                `).join('')
                : '<div class="loading" style="color: var(--text-secondary);">No tags</div>';
        }
        
        showToast('success', 'Tag Removed', `Removed tag: ${tagName}`);
    } catch (error) {
        console.error('Failed to remove tag:', error);
        showToast('error', 'Failed to Remove Tag', error.message);
    }
}

async function showPromptDetail(promptId) {
    openModal('prompt-modal');
    const content = document.getElementById('prompt-detail-content');
    content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div><span>Loading prompt details...</span></div>';
    
    try {
        const prompt = await apiCall(`/prompts/${promptId}`);
        
        // Load image details
        let imageHtml = '';
        try {
            const image = await apiCall(`/images/${prompt.image_id}`);
            imageHtml = `
                <div class="prompt-image-link">
                    <a href="#" onclick="showImageDetail('${image.id}'); closeModal('prompt-modal'); return false;">
                        <img src="/api/v1/images/${image.id}/thumbnail" alt="${escapeHtml(image.file_name)}" 
                             style="max-width: 200px; max-height: 200px; object-fit: contain; border-radius: 4px;">
                        <div>${escapeHtml(image.file_name)}</div>
                    </a>
                </div>
            `;
        } catch (e) {
            imageHtml = '<div class="loading">Image not found</div>';
        }
        
        // Load metadata for the image
        let metadataHtml = '';
        try {
            const metadataData = await apiCall(`/metadata/image/${prompt.image_id}`);
            const metadata = metadataData.metadata || [];
            const relevantMetadata = metadata.filter(m => 
                ['model', 'seed', 'steps', 'cfg_scale', 'sampler', 'size'].includes(m.key.toLowerCase())
            );
            
            if (relevantMetadata.length > 0) {
                metadataHtml = `
                    <div class="metadata-section">
                        <h3>Generation Parameters</h3>
                        <dl class="metadata-list">
                            ${relevantMetadata.map(m => `
                                <dt>${escapeHtml(m.key)}</dt>
                                <dd>${escapeHtml(String(m.value || ''))}</dd>
                            `).join('')}
                        </dl>
                    </div>
                `;
            }
        } catch (e) {
            // Metadata is optional
        }
        
        content.innerHTML = `
            <div class="prompt-detail-view">
                ${imageHtml}
                <div class="prompt-detail-content">
                    <div class="prompt-text-large">
                        ${escapeHtml(prompt.prompt_text)}
                    </div>
                    ${prompt.negative_prompt ? `
                        <div class="negative-prompt-section">
                            <h4>Negative Prompt</h4>
                            <div class="negative-prompt-text">${escapeHtml(prompt.negative_prompt)}</div>
                        </div>
                    ` : ''}
                    <div class="prompt-meta-detail">
                        <div class="detail-item">
                            <strong>Type:</strong> ${prompt.prompt_type}
                        </div>
                        <div class="detail-item">
                            <strong>Created:</strong> ${new Date(prompt.created_at).toLocaleString()}
                        </div>
                        <div class="detail-item">
                            <strong>Image ID:</strong> <code>${prompt.image_id}</code>
                        </div>
                    </div>
                    ${metadataHtml}
                    <div class="prompt-actions">
                        <button class="btn-secondary" onclick="copyPromptText('${prompt.id}')">Copy Prompt</button>
                        <button class="btn-secondary" onclick="exportPrompt('${prompt.id}')">Export</button>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Failed to load prompt details:', error);
        showToast('error', 'Failed to load prompt details', error.message);
        content.innerHTML = '<div class="loading">Failed to load prompt details</div>';
    }
}

function copyPromptText(promptId) {
    const promptText = document.querySelector('.prompt-text-large')?.textContent;
    if (promptText) {
        navigator.clipboard.writeText(promptText).then(() => {
            showToast('success', 'Copied!', 'Prompt text copied to clipboard');
        }).catch(() => {
            showToast('error', 'Failed to copy', 'Could not copy to clipboard');
        });
    }
}

function exportPrompt(promptId) {
    // Export single prompt - could open detail modal with export option
    showPromptDetail(promptId);
}

function filterByTag(tagName) {
    const normalizedTag = tagName.toLowerCase();
    
    // Toggle tag selection
    if (selectedTags.has(normalizedTag)) {
        selectedTags.delete(normalizedTag);
    } else {
        selectedTags.add(normalizedTag);
    }
    
    // Navigate to Images tab to see filtered results
    switchTab('images', true);
    
    // Update UI to show active filters
    updateTagFilterDisplay();
    
    // Reload images with new filter
    loadImages(1);
}

function updateTagFilterDisplay() {
    // Update tag cloud to show selected tags
    const tagElements = document.querySelectorAll('.tag');
    tagElements.forEach(el => {
        const tagName = el.textContent.trim().split('\n')[0].toLowerCase();
        if (selectedTags.has(tagName)) {
            el.classList.add('tag-selected');
        } else {
            el.classList.remove('tag-selected');
        }
    });
    
    // Show active filters
    const filtersContainer = document.getElementById('active-filters');
    if (!filtersContainer) {
        // Create filters container if it doesn't exist
        const imagesTab = document.getElementById('images-tab');
        if (imagesTab) {
            const filtersDiv = document.createElement('div');
            filtersDiv.id = 'active-filters';
            filtersDiv.className = 'active-filters';
            filtersDiv.style.marginBottom = '1rem';
            imagesTab.insertBefore(filtersDiv, imagesTab.firstChild);
        }
    }
    
    if (selectedTags.size > 0) {
        const filtersHtml = `
            <div class="active-filters-bar">
                <span>Active filters:</span>
                ${Array.from(selectedTags).map(tag => `
                    <span class="filter-tag">
                        ${escapeHtml(tag)}
                        <button onclick="removeTagFilter('${escapeHtml(tag)}')" class="filter-remove">×</button>
                    </span>
                `).join('')}
                <button onclick="clearTagFilters()" class="btn-secondary btn-small">Clear all</button>
            </div>
        `;
        document.getElementById('active-filters').innerHTML = filtersHtml;
    } else {
        if (document.getElementById('active-filters')) {
            document.getElementById('active-filters').innerHTML = '';
        }
    }
}

function removeTagFilter(tagName) {
    selectedTags.delete(tagName.toLowerCase());
    updateTagFilterDisplay();
    loadImages(1);
}

function clearTagFilters() {
    selectedTags.clear();
    updateTagFilterDisplay();
    loadImages(1);
}

// Pagination
function displayPagination(containerId, currentPage, pagination) {
    const container = document.getElementById(containerId);
    if (!pagination || pagination.pages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    const pages = [];
    const maxPages = 10;
    let start = Math.max(1, currentPage - Math.floor(maxPages / 2));
    let end = Math.min(pagination.pages, start + maxPages - 1);
    
    if (end - start < maxPages - 1) {
        start = Math.max(1, end - maxPages + 1);
    }
    
    if (start > 1) {
        pages.push(`<button onclick="loadPage('${containerId}', 1)">1</button>`);
        if (start > 2) pages.push('<span>...</span>');
    }
    
    for (let i = start; i <= end; i++) {
        pages.push(`<button class="${i === currentPage ? 'active' : ''}" onclick="loadPage('${containerId}', ${i})">${i}</button>`);
    }
    
    if (end < pagination.pages) {
        if (end < pagination.pages - 1) pages.push('<span>...</span>');
        pages.push(`<button onclick="loadPage('${containerId}', ${pagination.pages})">${pagination.pages}</button>`);
    }
    
    container.innerHTML = pages.join('');
}

function loadPage(containerId, page) {
    if (containerId === 'images-pagination') {
        loadImages(page);
    } else if (containerId === 'prompts-pagination') {
        loadPrompts(page);
    }
}

// Utility Functions
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Collection Management Functions
function openCreateCollectionModal() {
    document.getElementById('collection-name').value = '';
    document.getElementById('collection-description').value = '';
    document.getElementById('collection-folder-path').value = '';
    openModal('create-collection-modal');
}

async function submitCreateCollection() {
    const name = document.getElementById('collection-name').value.trim();
    const description = document.getElementById('collection-description').value.trim() || null;
    const folderPath = document.getElementById('collection-folder-path').value.trim() || null;
    
    if (!name) {
        showToast('error', 'Validation Error', 'Collection name is required');
        return;
    }
    
    try {
        showLoading('collections-list', 'Creating collection...');
        const data = await apiCall('/collections', {
            method: 'POST',
            body: JSON.stringify({
                name,
                description,
                folder_path: folderPath
            })
        });
        
        closeModal('create-collection-modal');
        showToast('success', 'Collection Created', `Collection "${name}" created successfully`);
        loadCollections();
    } catch (error) {
        console.error('Failed to create collection:', error);
        showToast('error', 'Failed to create collection', error.message);
    }
}

async function editCollection(collectionId) {
    try {
        const collection = await apiCall(`/collections/${collectionId}`);
        document.getElementById('edit-collection-id').value = collection.id;
        document.getElementById('edit-collection-name').value = collection.name || '';
        document.getElementById('edit-collection-description').value = collection.description || '';
        openModal('edit-collection-modal');
    } catch (error) {
        console.error('Failed to load collection:', error);
        showToast('error', 'Failed to load collection', error.message);
    }
}

async function submitEditCollection() {
    const id = document.getElementById('edit-collection-id').value;
    const name = document.getElementById('edit-collection-name').value.trim();
    const description = document.getElementById('edit-collection-description').value.trim() || null;
    
    if (!name) {
        showToast('error', 'Validation Error', 'Collection name is required');
        return;
    }
    
    try {
        showLoading('collections-list', 'Updating collection...');
        const data = await apiCall(`/collections/${id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name,
                description
            })
        });
        
        closeModal('edit-collection-modal');
        showToast('success', 'Collection Updated', `Collection "${name}" updated successfully`);
        loadCollections();
    } catch (error) {
        console.error('Failed to update collection:', error);
        showToast('error', 'Failed to update collection', error.message);
    }
}

async function deleteCollection(collectionId) {
    if (!confirm('Are you sure you want to delete this collection? This action cannot be undone.')) {
        return;
    }
    
    try {
        showLoading('collections-list', 'Deleting collection...');
        await apiCall(`/collections/${collectionId}`, {
            method: 'DELETE'
        });
        
        showToast('success', 'Collection Deleted', 'Collection deleted successfully');
        loadCollections();
    } catch (error) {
        console.error('Failed to delete collection:', error);
        showToast('error', 'Failed to delete collection', error.message);
    }
}

async function exportImages(format = 'json') {
    try {
        showLoading('images-grid', 'Exporting images...');
        const response = await fetch(`${API_BASE}/export/images?format=${format}`);
        if (!response.ok) throw new Error('Export failed');
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `images-export-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'md'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('success', 'Export Complete', `Images exported as ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Export failed:', error);
        showToast('error', 'Export Failed', error.message);
    }
}

async function exportCollection(collectionId, format = 'json') {
    try {
        // Get collection name for filename
        const collectionData = await apiCall(`/collections/${collectionId}`);
        const collectionName = collectionData.name || 'collection';
        const safeName = collectionName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        
        showToast('info', 'Exporting...', 'Preparing collection export...');
        const response = await fetch(`${API_BASE}/export/collection/${collectionId}?format=${format}`);
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Export failed' }));
            throw new Error(errorData.error || 'Export failed');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${safeName}-export-${new Date().toISOString().split('T')[0]}.${format === 'json' ? 'json' : 'md'}`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
        
        showToast('success', 'Export Complete', `Collection exported as ${format.toUpperCase()}`);
    } catch (error) {
        console.error('Collection export failed:', error);
        showToast('error', 'Export Failed', error.message);
    }
}

// CLIP Interrogation Functions
async function interrogateImage(imageId) {
    try {
        showToast('info', 'CLIP Interrogation', 'Generating prompt... This may take 10-30 seconds.');
        
        const result = await apiCall(`/images/${imageId}/interrogate`, {
            method: 'POST',
            body: JSON.stringify({ model: 'clip' })
        });
        
        showToast('success', 'CLIP Interrogation Complete', `Generated prompt: ${result.prompt.substring(0, 100)}...`);
        
        // Reload prompts to show the new one
        if (currentTab === 'prompts') {
            loadPrompts(currentPage.prompts);
        }
        
        // Show the prompt in a modal or alert
        const promptText = result.prompt || 'No prompt generated';
        alert(`CLIP Generated Prompt:\n\n${promptText}`);
        
    } catch (error) {
        console.error('CLIP interrogation failed:', error);
        showToast('error', 'CLIP Interrogation Failed', error.message);
    }
}

async function batchInterrogateImages() {
    if (selectedImages.size === 0) {
        showToast('warning', 'No Images Selected', 'Please select at least one image to interrogate.');
        return;
    }
    
    if (!confirm(`Interrogate ${selectedImages.size} image(s) with CLIP? This may take several minutes.`)) {
        return;
    }
    
    try {
        const batchBtn = document.getElementById('batch-clip-btn');
        batchBtn.disabled = true;
        batchBtn.textContent = `🔍 Processing... (${selectedImages.size})`;
        
        showToast('info', 'Batch CLIP Interrogation', `Processing ${selectedImages.size} images...`);
        
        const result = await apiCall('/clip/interrogate/batch', {
            method: 'POST',
            body: JSON.stringify({
                image_ids: Array.from(selectedImages),
                model: 'clip'
            })
        });
        
        batchBtn.disabled = false;
        updateBatchButton();
        
        showToast('success', 'Batch Complete', 
            `Successfully processed ${result.successful} of ${result.total} images. ${result.failed} failed.`);
        
        // Clear selection
        selectedImages.clear();
        updateBatchButton();
        displayImages(await getCurrentImages());
        
        // Reload prompts if on prompts tab
        if (currentTab === 'prompts') {
            loadPrompts(currentPage.prompts);
        }
        
        // Show detailed results
        if (result.failed > 0) {
            const failedResults = result.results.filter(r => !r.success);
            console.warn('Failed interrogations:', failedResults);
        }
        
    } catch (error) {
        console.error('Batch CLIP interrogation failed:', error);
        showToast('error', 'Batch Interrogation Failed', error.message);
        const batchBtn = document.getElementById('batch-clip-btn');
        if (batchBtn) {
            batchBtn.disabled = false;
            updateBatchButton();
        }
    }
}

function toggleImageSelection(imageId) {
    if (selectedImages.has(imageId)) {
        selectedImages.delete(imageId);
    } else {
        selectedImages.add(imageId);
    }
    updateBatchButton();
}

function toggleSelectAll() {
    // Get all visible image IDs
    const checkboxes = document.querySelectorAll('.image-select-checkbox');
    const allSelected = Array.from(checkboxes).every(cb => cb.checked);
    
    checkboxes.forEach(checkbox => {
        const imageId = checkbox.dataset.imageId;
        checkbox.checked = !allSelected;
        if (!allSelected) {
            selectedImages.add(imageId);
        } else {
            selectedImages.delete(imageId);
        }
    });
    
    updateBatchButton();
}

function updateBatchButton() {
    const batchBtn = document.getElementById('batch-clip-btn');
    const countSpan = document.getElementById('selected-count');
    
    if (selectedImages.size > 0) {
        batchBtn.style.display = 'inline-block';
        if (countSpan) {
            countSpan.textContent = selectedImages.size;
        }
    } else {
        batchBtn.style.display = 'none';
    }
}

async function getCurrentImages() {
    try {
        const query = `/images?page=${currentPage.images}&limit=50`;
        const data = await apiCall(query);
        return data.images || [];
    } catch (error) {
        console.error('Failed to get current images:', error);
        return [];
    }
}

// Collection CLIP Interrogation
async function interrogateCollection(collectionId) {
    try {
        // Get collection info first
        const collection = await apiCall(`/collections/${collectionId}`);
        
        if (!confirm(`Generate CLIP prompts for all images in collection "${collection.name}"? This may take several minutes depending on the number of images.`)) {
            return;
        }
        
        showToast('info', 'CLIP Interrogation Started', `Processing collection "${collection.name}"...`);
        
        const result = await apiCall(`/collections/${collectionId}/interrogate`, {
            method: 'POST',
            body: JSON.stringify({ model: 'clip' })
        });
        
        showToast('success', 'Collection CLIP Complete', 
            `Successfully processed ${result.successful} of ${result.total} images. ${result.failed} failed.`);
        
        // Reload prompts if on prompts tab
        if (currentTab === 'prompts') {
            loadPrompts(currentPage.prompts);
        }
        
        // Show detailed results if there were failures
        if (result.failed > 0) {
            const failedResults = result.results.filter(r => !r.success);
            console.warn('Failed interrogations:', failedResults);
            
            // Show a summary of failures
            const errorSummary = failedResults.slice(0, 5).map(r => 
                `Image ${r.image_id.substring(0, 8)}: ${r.error || 'Unknown error'}`
            ).join('\n');
            
            if (failedResults.length > 5) {
                alert(`Some images failed CLIP interrogation:\n\n${errorSummary}\n\n... and ${failedResults.length - 5} more. Check console for details.`);
            } else {
                alert(`Some images failed CLIP interrogation:\n\n${errorSummary}`);
            }
        }
        
    } catch (error) {
        console.error('Collection CLIP interrogation failed:', error);
        showToast('error', 'Collection CLIP Failed', error.message);
    }
}

// Interrogate all collections that need CLIP
window.interrogateAllCollections = async function interrogateAllCollections() {
    try {
        // First, check which collections need CLIP
        const needingClip = await apiCall('/clip/collections/needing-inspection');
        
        if (!needingClip.collections || needingClip.collections.length === 0) {
            showToast('info', 'All Collections Inspected', 'All collections already have CLIP-generated prompts.');
            return;
        }
        
        const totalImages = needingClip.collections.reduce((sum, c) => sum + (c.image_count || 0), 0);
        const collectionNames = needingClip.collections.map(c => c.name).join(', ');
        
        if (!confirm(`Generate CLIP prompts for ${needingClip.total} collection(s) with ${totalImages} total images?\n\nCollections: ${collectionNames}\n\nThis may take a very long time. Continue?`)) {
            return;
        }
        
        const btn = document.getElementById('clip-all-collections-btn');
        if (btn) {
            btn.disabled = true;
            btn.textContent = '🔍 Processing...';
        }
        
        showToast('info', 'Batch CLIP Started', `Processing ${needingClip.total} collections...`);
        
        const result = await apiCall('/clip/interrogate/all-collections', {
            method: 'POST',
            body: JSON.stringify({ model: 'clip' })
        });
        
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔍 CLIP All Collections';
        }
        
        showToast('success', 'Batch CLIP Complete', 
            `Processed ${result.collections_processed} collections. ${result.total_successful} images successful, ${result.total_failed} failed.`);
        
        // Reload prompts if on prompts tab
        if (currentTab === 'prompts') {
            loadPrompts(currentPage.prompts);
        }
        
        // Reload collections to update status
        loadCollections();
        
        // Show detailed results
        if (result.results && result.results.length > 0) {
            const resultsSummary = result.results.map(r => 
                `${r.collection_name}: ${r.successful || 0} successful, ${r.failed || 0} failed`
            ).join('\n');
            
            console.log('Collection CLIP results:', result.results);
            
            if (result.total_failed > 0) {
                alert(`Batch CLIP Results:\n\n${resultsSummary}\n\nCheck console for detailed results.`);
            }
        }
        
    } catch (error) {
        console.error('Batch collection CLIP failed:', error);
        showToast('error', 'Batch CLIP Failed', error.message);
        
        const btn = document.getElementById('clip-all-collections-btn');
        if (btn) {
            btn.disabled = false;
            btn.textContent = '🔍 CLIP All Collections';
        }
    }
}

