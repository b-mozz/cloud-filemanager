// File Manager Application
// Handles file upload, download, delete, and listing operations
// Supports both local and in-memory storage backends

class FileManager {
    constructor() {
        this.apiBase = '/api';
        this.currentStorage = 'local';
        this.files = [];
        this.init();
    }

    // Initialize application event listeners and load initial data
    init() {
        this.bindEventListeners();
        this.loadFiles();
    }

    // Set up all DOM event listeners
    bindEventListeners() {
        // Storage type selector
        const storageSelect = document.getElementById('storageType');
        storageSelect.addEventListener('change', (e) => {
            this.currentStorage = e.target.value;
            this.loadFiles();
        });

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        refreshBtn.addEventListener('click', () => this.loadFiles());

        // File input and drag-drop functionality
        const fileInput = document.getElementById('fileInput');
        const dropZone = document.getElementById('dropZone');
        const browseBtn = document.getElementById('browseBtn');

        browseBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => this.handleFileSelect(e.target.files));

        // Drag and drop events
        dropZone.addEventListener('dragover', this.handleDragOver.bind(this));
        dropZone.addEventListener('dragleave', this.handleDragLeave.bind(this));
        dropZone.addEventListener('drop', this.handleDrop.bind(this));

        // Search functionality
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', (e) => this.filterFiles(e.target.value));

        // Notification close button
        const notificationClose = document.getElementById('notificationClose');
        notificationClose.addEventListener('click', () => this.hideNotification());
    }

    // Handle drag over event for file drop zone
    handleDragOver(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('dropZone').classList.add('drag-over');
    }

    // Handle drag leave event for file drop zone
    handleDragLeave(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('dropZone').classList.remove('drag-over');
    }

    // Handle file drop event
    handleDrop(e) {
        e.preventDefault();
        e.stopPropagation();
        document.getElementById('dropZone').classList.remove('drag-over');

        const files = Array.from(e.dataTransfer.files);
        this.handleFileSelect(files);
    }

    // Process selected files for upload
    handleFileSelect(files) {
        if (files.length === 0) return;

        Array.from(files).forEach(file => {
            this.uploadFile(file);
        });
    }

    // Upload a single file to the server
    async uploadFile(file) {
        const formData = new FormData();
        formData.append('file', file);

        // Add storage type parameter
        const url = `${this.apiBase}/upload?storage=${this.currentStorage}`;

        try {
            this.showUploadProgress(true);

            const response = await fetch(url, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                this.showNotification(`File "${file.name}" uploaded successfully`, 'success');
                this.loadFiles(); // Refresh file list
            } else {
                const error = await response.text();
                this.showNotification(`Upload failed: ${error}`, 'error');
            }
        } catch (error) {
            this.showNotification(`Upload error: ${error.message}`, 'error');
        } finally {
            this.showUploadProgress(false);
        }
    }

    // Load files from the server based on current storage type
    async loadFiles() {
        try {
            const url = `${this.apiBase}/files?storage=${this.currentStorage}`;
            const response = await fetch(url);

            if (response.ok) {
                this.files = await response.json() || [];
                this.renderFiles(this.files);
                this.updateFileCount(this.files.length);
            } else {
                this.showNotification('Failed to load files', 'error');
            }
        } catch (error) {
            this.showNotification(`Error loading files: ${error.message}`, 'error');
        }
    }

    // Filter files based on search query
    filterFiles(query) {
        if (!query.trim()) {
            this.renderFiles(this.files);
            return;
        }

        const filtered = this.files.filter(file =>
            file.name.toLowerCase().includes(query.toLowerCase())
        );
        this.renderFiles(filtered);
    }

    // Render files in the table
    renderFiles(files) {
        const filesList = document.getElementById('filesList');
        const emptyState = document.getElementById('emptyState');
        const filesTable = document.getElementById('filesTable');

        if (files.length === 0) {
            filesTable.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }

        filesTable.style.display = 'table';
        emptyState.style.display = 'none';

        filesList.innerHTML = files.map(file => `
            <tr>
                <td class="file-name">
                    <span class="file-icon">${this.getFileIcon(file.name)}</span>
                    ${file.name}
                </td>
                <td class="file-size">${this.formatFileSize(file.size)}</td>
                <td class="file-date">${this.formatDate(file.modified)}</td>
                <td class="file-actions">
                    <button class="btn btn-sm" onclick="fileManager.downloadFile('${file.name}')">
                        Download
                    </button>
                    <button class="btn btn-sm btn-danger" onclick="fileManager.deleteFile('${file.name}')">
                        Delete
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Download a file from the server
    async downloadFile(filename) {
        try {
            const url = `${this.apiBase}/files/${encodeURIComponent(filename)}?storage=${this.currentStorage}`;
            const response = await fetch(url);

            if (response.ok) {
                const blob = await response.blob();
                const downloadUrl = window.URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = downloadUrl;
                link.download = filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                window.URL.revokeObjectURL(downloadUrl);

                this.showNotification(`File "${filename}" downloaded`, 'success');
            } else {
                this.showNotification('Download failed', 'error');
            }
        } catch (error) {
            this.showNotification(`Download error: ${error.message}`, 'error');
        }
    }

    // Delete a file from the server
    async deleteFile(filename) {
        if (!confirm(`Are you sure you want to delete "${filename}"?`)) {
            return;
        }

        try {
            const url = `${this.apiBase}/files/${encodeURIComponent(filename)}?storage=${this.currentStorage}`;
            const response = await fetch(url, {
                method: 'DELETE'
            });

            if (response.ok) {
                this.showNotification(`File "${filename}" deleted`, 'success');
                this.loadFiles(); // Refresh file list
            } else {
                this.showNotification('Delete failed', 'error');
            }
        } catch (error) {
            this.showNotification(`Delete error: ${error.message}`, 'error');
        }
    }

    // Show or hide upload progress indicator
    showUploadProgress(show) {
        const progressElement = document.getElementById('uploadProgress');
        progressElement.hidden = !show;
    }

    // Display notification message to user
    showNotification(message, type = 'info') {
        const notification = document.getElementById('notification');
        const notificationText = document.getElementById('notificationText');

        notificationText.textContent = message;
        notification.className = `notification ${type}`;
        notification.hidden = false;

        // Auto-hide success notifications after 3 seconds
        if (type === 'success') {
            setTimeout(() => this.hideNotification(), 3000);
        }
    }

    // Hide notification
    hideNotification() {
        document.getElementById('notification').hidden = true;
    }

    // Update file count display
    updateFileCount(count) {
        const fileCount = document.getElementById('fileCount');
        fileCount.textContent = `${count} file${count !== 1 ? 's' : ''}`;
    }

    // Get appropriate icon for file type using simple text symbols
    getFileIcon(filename) {
        const extension = filename.split('.').pop().toLowerCase();
        const iconMap = {
            // Images
            'jpg': '[IMG]', 'jpeg': '[IMG]', 'png': '[IMG]', 'gif': '[IMG]', 'svg': '[IMG]',
            // Documents
            'pdf': '[PDF]', 'doc': '[DOC]', 'docx': '[DOC]', 'txt': '[TXT]',
            // Code files
            'js': '[JS]', 'html': '[HTML]', 'css': '[CSS]', 'json': '[JSON]',
            'py': '[PY]', 'java': '[JAVA]', 'cpp': '[CPP]', 'c': '[C]',
            // Archives
            'zip': '[ZIP]', 'rar': '[RAR]', 'tar': '[TAR]', 'gz': '[GZ]',
            // Media
            'mp4': '[VID]', 'avi': '[VID]', 'mp3': '[AUD]', 'wav': '[AUD]'
        };
        return iconMap[extension] || '[FILE]';
    }

    // Format file size in human-readable format
    formatFileSize(bytes) {
        if (bytes === 0) return '0 B';

        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));

        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    }

    // Format date for display
    formatDate(dateString) {
        if (!dateString) return 'Unknown';

        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    }
}

// Initialize the file manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.fileManager = new FileManager();
});