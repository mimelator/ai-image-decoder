// API Base URL
const API_BASE = '/api/v1';

// State
let currentPage = {
    images: 1,
    prompts: 1
};
let currentTab = 'images';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
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

// Tab Management
function initializeTabs() {
    const tabs = document.querySelectorAll('.nav-tab');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            switchTab(tabName);
        });
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    
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
            // TODO: Implement create collection modal
            alert('Create collection feature coming soon!');
        });
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
            throw new Error(`API error: ${response.status}`);
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
    try {
        const data = await apiCall(`/images?page=${page}&limit=24`);
        displayImages(data.images || []);
        displayPagination('images-pagination', page, data.pagination);
        currentPage.images = page;
    } catch (error) {
        console.error('Failed to load images:', error);
        document.getElementById('images-grid').innerHTML = '<div class="loading">Failed to load images</div>';
    }
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
        
        return `
        <div class="image-card" onclick="showImageDetail('${image.id}')">
            <div class="image-thumbnail">
                ${thumbnailContent}
            </div>
            <div class="image-info">
                <div class="image-name">${escapeHtml(image.file_name)}</div>
                <div class="image-meta">
                    ${formatFileSize(image.file_size)} • ${image.format.toUpperCase()}
                </div>
            </div>
        </div>
    `;
    }).join('');
}

// Load Prompts
async function loadPrompts(page = 1) {
    try {
        const data = await apiCall(`/prompts?page=${page}&limit=20`);
        displayPrompts(data.prompts || []);
        displayPagination('prompts-pagination', page, data.pagination);
        currentPage.prompts = page;
    } catch (error) {
        console.error('Failed to load prompts:', error);
        document.getElementById('prompts-list').innerHTML = '<div class="loading">Failed to load prompts</div>';
    }
}

function displayPrompts(prompts) {
    const list = document.getElementById('prompts-list');
    if (!prompts || prompts.length === 0) {
        list.innerHTML = '<div class="loading">No prompts found</div>';
        return;
    }
    
    // Filter out negative prompts
    const positivePrompts = prompts.filter(prompt => 
        prompt.prompt_type !== 'negative' && !prompt.negative_prompt
    );
    
    list.innerHTML = positivePrompts.map(prompt => `
        <div class="prompt-card" onclick="showPromptDetail('${prompt.id}')">
            <div class="prompt-text">${escapeHtml(prompt.prompt_text)}</div>
            <div class="prompt-meta">
                <span>Image ID: ${prompt.image_id.substring(0, 8)}...</span>
                <span>Type: ${prompt.prompt_type}</span>
            </div>
        </div>
    `).join('');
}

// Search Functions
async function searchImages(query) {
    if (!query) {
        loadImages();
        return;
    }
    
    try {
        const data = await apiCall(`/search/images?q=${encodeURIComponent(query)}`);
        displayImages(data.images || []);
    } catch (error) {
        console.error('Search failed:', error);
    }
}

async function searchPrompts(query) {
    if (!query) {
        loadPrompts();
        return;
    }
    
    try {
        const data = await apiCall(`/prompts/search?q=${encodeURIComponent(query)}`);
        displayPrompts(data.prompts || []);
    } catch (error) {
        console.error('Search failed:', error);
    }
}

// Load Collections
async function loadCollections() {
    try {
        const data = await apiCall('/collections');
        displayCollections(data.collections || []);
    } catch (error) {
        console.error('Failed to load collections:', error);
        document.getElementById('collections-list').innerHTML = '<div class="loading">Failed to load collections</div>';
    }
}

function displayCollections(collections) {
    const list = document.getElementById('collections-list');
    if (!collections || collections.length === 0) {
        list.innerHTML = '<div class="loading">No collections found. Create one to get started!</div>';
        return;
    }
    
    list.innerHTML = collections.map(collection => `
        <div class="collection-card">
            <div class="collection-name">${escapeHtml(collection.name)}</div>
            ${collection.description ? `
                <div class="collection-description">${escapeHtml(collection.description)}</div>
            ` : ''}
            <div class="collection-meta">
                ${collection.folder_path ? `Folder: ${escapeHtml(collection.folder_path)}` : ''}
            </div>
        </div>
    `).join('');
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
}

// Scan Directory
async function startScan() {
    const path = document.getElementById('scan-path').value;
    const recursive = document.getElementById('scan-recursive').checked;
    
    if (!path) {
        alert('Please enter a directory path');
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
        
        // Poll for progress updates
        const interval = setInterval(async () => {
            try {
                const status = await apiCall('/images/scan/status');
                if (status.status === 'idle') {
                    clearInterval(interval);
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
            }
        }, 1000);
        
    } catch (error) {
        alert(`Scan failed: ${error.message}`);
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
async function exportPrompts() {
    try {
        const response = await fetch(`${API_BASE}/export/prompts?format=markdown`);
        const text = await response.text();
        
        const blob = new Blob([text], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `prompts-export-${new Date().toISOString().split('T')[0]}.md`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    } catch (error) {
        alert(`Export failed: ${error.message}`);
    }
}

// Detail Views
async function showImageDetail(imageId) {
    // TODO: Implement image detail modal
    alert(`Image detail for ${imageId} - Coming soon!`);
}

async function showPromptDetail(promptId) {
    // TODO: Implement prompt detail modal
    alert(`Prompt detail for ${promptId} - Coming soon!`);
}

function filterByTag(tagName) {
    // TODO: Implement tag filtering
    alert(`Filter by tag: ${tagName} - Coming soon!`);
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

