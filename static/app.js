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
        const data = await apiCall(`/images?page=${page}&limit=24`);
        displayImages(data.images || []);
        displayPagination('images-pagination', page, data.pagination);
        currentPage.images = page;
    } catch (error) {
        console.error('Failed to load images:', error);
        showToast('error', 'Failed to load images', error.message);
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
    showLoading('prompts-list', 'Loading prompts...');
    try {
        const data = await apiCall(`/prompts?page=${page}&limit=20`);
        displayPrompts(data.prompts || []);
        displayPagination('prompts-pagination', page, data.pagination);
        currentPage.prompts = page;
    } catch (error) {
        console.error('Failed to load prompts:', error);
        showToast('error', 'Failed to load prompts', error.message);
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
        const data = await apiCall(`/prompts/search?q=${encodeURIComponent(query)}`);
        displayPrompts(data.prompts || []);
        if (data.prompts && data.prompts.length === 0) {
            showToast('info', 'No results', 'No prompts found matching your search');
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
            <div class="collection-name">${escapeHtml(collection.name)}</div>
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
async function exportPrompts() {
    try {
        showToast('info', 'Exporting', 'Preparing export...');
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
        showToast('success', 'Export complete', 'Prompts exported successfully');
    } catch (error) {
        showToast('error', 'Export failed', error.message);
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
            
            if (positiveTags.length > 0) {
                tagsHtml = `
                    <div class="tags-section">
                        <h3>Tags</h3>
                        <div class="tags-list">
                            ${positiveTags.map(t => `<span class="tag tag-${t.tag_type}">${escapeHtml(t.name)}</span>`).join('')}
                        </div>
                    </div>
                `;
            }
        } catch (e) {
            // Tags are optional, fail silently
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
    } catch (error) {
        console.error('Failed to load image details:', error);
        showToast('error', 'Failed to load image details', error.message);
        content.innerHTML = '<div class="loading">Failed to load image details</div>';
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
    // TODO: Implement export functionality
    showToast('info', 'Export', 'Export functionality coming soon');
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

