// ============================================
// GLOBAL VARIABLES
// ============================================

var currentStorage = 'local';
var allFiles = [];

// ============================================
// INITIALIZATION - Runs when page loads
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('File manager loaded');
    setupEventListeners();
    loadFiles();
});

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    // Storage selector
    var storageSelect = document.getElementById('storageType');
    storageSelect.addEventListener('change', function() {
        currentStorage = storageSelect.value;
        loadFiles();
    });
    
    // Refresh button
    var refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', function() {
        loadFiles();
    });
    
    // Browse button and file input
    var browseBtn = document.getElementById('browseBtn');
    var fileInput = document.getElementById('fileInput');
    
    browseBtn.addEventListener('click', function() {
        fileInput.click();
    });
    
    fileInput.addEventListener('change', function() {
        var files = fileInput.files;
        if (files.length > 0) {
            uploadFiles(files);
        }
    });
    
    // Drag and drop
    var dropZone = document.getElementById('dropZone');
    
    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });
    
    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
    });
    
    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        dropZone.classList.remove('drag-over');
        var files = e.dataTransfer.files;
        if (files.length > 0) {
            uploadFiles(files);
        }
    });
    
    // Search input
    var searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        var query = searchInput.value;
        filterFiles(query);
    });
    
    // Notification close button
    var notificationClose = document.getElementById('notificationClose');
    notificationClose.addEventListener('click', function() {
        hideNotification();
    });
}

// ============================================
// LOAD FILES FROM SERVER
// ============================================

function loadFiles() {
    var url = '/api/files?storage=' + currentStorage;
    
    fetch(url)
        .then(function(response) {
            if (!response.ok) {
                throw new Error('Failed to load files');
            }
            return response.json();
        })
        .then(function(files) {
            if (!files) {
                files = [];
            }
            allFiles = files;
            displayFiles(files);
            updateFileCount(files.length);
        })
        .catch(function(error) {
            console.error('Error:', error);
            showNotification('Failed to load files', 'error');
        });
}

// ============================================
// DISPLAY FILES IN TABLE
// ============================================

function displayFiles(files) {
    var filesList = document.getElementById('filesList');
    var filesTable = document.getElementById('filesTable');
    var emptyState = document.getElementById('emptyState');
    
    // Clear existing content
    filesList.innerHTML = '';
    
    // Show empty state if no files
    if (files.length === 0) {
        filesTable.style.display = 'none';
        emptyState.hidden = false;
        return;
    }
    
    // Show table, hide empty state
    filesTable.style.display = 'table';
    emptyState.hidden = true;
    
    // Create a row for each file
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var row = createFileRow(file);
        filesList.appendChild(row);
    }
}

// ============================================
// CREATE HTML ROW FOR A FILE
// ============================================

function createFileRow(file) {
    var row = document.createElement('tr');
    
    // Column 1: File name
    var nameCell = document.createElement('td');
    nameCell.textContent = file.name;
    row.appendChild(nameCell);
    
    // Column 2: File size
    var sizeCell = document.createElement('td');
    sizeCell.textContent = formatFileSize(file.size);
    row.appendChild(sizeCell);
    
    // Column 3: Modified date
    var dateCell = document.createElement('td');
    dateCell.textContent = formatDate(file.modTime);
    row.appendChild(dateCell);
    
    // Column 4: Actions (download/delete buttons)
    var actionsCell = document.createElement('td');
    actionsCell.className = 'file-actions';
    
    var downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-primary';
    downloadBtn.textContent = 'Download';
    downloadBtn.onclick = function() {
        downloadFile(file.name);
    };
    
    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-danger';
    deleteBtn.textContent = 'Delete';
    deleteBtn.onclick = function() {
        deleteFile(file.name);
    };
    
    actionsCell.appendChild(downloadBtn);
    actionsCell.appendChild(deleteBtn);
    row.appendChild(actionsCell);
    
    return row;
}

// ============================================
// UPLOAD FILES
// ============================================

function uploadFiles(files) {
    showUploadProgress(true);
    
    // Upload each file one by one
    for (var i = 0; i < files.length; i++) {
        uploadSingleFile(files[i]);
    }
}

function uploadSingleFile(file) {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('storage', currentStorage);
    
    var progressText = document.getElementById('progressText');
    progressText.textContent = 'Uploading ' + file.name + '...';
    
    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            showNotification('Uploaded ' + file.name, 'success');
            loadFiles();
        } else {
            showNotification('Failed to upload ' + file.name, 'error');
        }
    })
    .catch(function(error) {
        console.error('Upload error:', error);
        showNotification('Error uploading ' + file.name, 'error');
    })
    .finally(function() {
        showUploadProgress(false);
        // Clear file input
        document.getElementById('fileInput').value = '';
    });
}

// ============================================
// DOWNLOAD FILE
// ============================================

function downloadFile(filename) {
    var url = '/api/files/' + encodeURIComponent(filename) + '?storage=' + currentStorage;
    window.location.href = url;
    showNotification('Downloading ' + filename, 'success');
}

// ============================================
// DELETE FILE
// ============================================

function deleteFile(filename) {
    var confirmDelete = confirm('Delete ' + filename + '?');
    if (!confirmDelete) {
        return;
    }
    
    var url = '/api/files/' + encodeURIComponent(filename) + '?storage=' + currentStorage;
    
    fetch(url, {
        method: 'DELETE'
    })
    .then(function(response) {
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            showNotification('Deleted ' + filename, 'success');
            loadFiles();
        } else {
            showNotification('Failed to delete ' + filename, 'error');
        }
    })
    .catch(function(error) {
        console.error('Delete error:', error);
        showNotification('Error deleting file', 'error');
    });
}

// ============================================
// FILTER FILES (SEARCH)
// ============================================

function filterFiles(query) {
    if (!query) {
        displayFiles(allFiles);
        return;
    }
    
    query = query.toLowerCase();
    var filtered = [];
    
    for (var i = 0; i < allFiles.length; i++) {
        var filename = allFiles[i].name.toLowerCase();
        if (filename.indexOf(query) !== -1) {
            filtered.push(allFiles[i]);
        }
    }
    
    displayFiles(filtered);
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function formatFileSize(bytes) {
    if (bytes === 0) {
        return '0 Bytes';
    }
    
    var k = 1024;
    var sizes = ['Bytes', 'KB', 'MB', 'GB'];
    var i = Math.floor(Math.log(bytes) / Math.log(k));
    var size = bytes / Math.pow(k, i);
    
    return Math.round(size * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) {
        return 'Unknown';
    }
    
    var date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function updateFileCount(count) {
    var fileCount = document.getElementById('fileCount');
    var text = count + ' file';
    if (count !== 1) {
        text = text + 's';
    }
    fileCount.textContent = text;
}

// ============================================
// UI FEEDBACK FUNCTIONS
// ============================================

function showUploadProgress(show) {
    var progress = document.getElementById('uploadProgress');
    progress.hidden = !show;
}

function showNotification(message, type) {
    var notification = document.getElementById('notification');
    var notificationText = document.getElementById('notificationText');
    
    notificationText.textContent = message;
    notification.className = 'notification ' + type;
    notification.hidden = false;
    
    // Auto-hide after 3 seconds
    setTimeout(function() {
        hideNotification();
    }, 3000);
}

function hideNotification() {
    var notification = document.getElementById('notification');
    notification.hidden = true;
}