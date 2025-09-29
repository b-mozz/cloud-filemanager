// ============================================
// GLOBAL VARIABLES
// ============================================

var currentStorage = 'local';
var allFiles = [];
var isUploading = false;

// ============================================
// INITIALIZATION - Runs when page loads
// ============================================

document.addEventListener('DOMContentLoaded', function() {
    console.log('File manager initialized');
    setupEventListeners();

    // Wait a bit to ensure all elements are ready, then load files
    setTimeout(function() {
        loadFiles();
    }, 100);
});

// ============================================
// EVENT LISTENERS SETUP
// ============================================

function setupEventListeners() {
    // Storage type dropdown
    var storageSelect = document.getElementById('storageType');
    storageSelect.addEventListener('change', function() {
        currentStorage = storageSelect.value;
        console.log('Storage changed to:', currentStorage);
        loadFiles();
    });

    // Refresh button
    var refreshBtn = document.getElementById('refreshBtn');
    refreshBtn.addEventListener('click', function() {
        console.log('Refreshing files...');
        loadFiles();
    });

    // File input and browse button
    var fileInput = document.getElementById('fileInput');
    var browseBtn = document.getElementById('browseBtn');

    browseBtn.addEventListener('click', function() {
        fileInput.click();
    });

    fileInput.addEventListener('change', function() {
        var files = fileInput.files;
        if (files.length > 0) {
            console.log('Files selected:', files.length);
            handleFileUpload(files);
        }
    });

    // Drag and drop zone
    var dropZone = document.getElementById('dropZone');

    dropZone.addEventListener('dragover', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', function(e) {
        e.preventDefault();
        e.stopPropagation();
        dropZone.classList.remove('drag-over');

        var files = e.dataTransfer.files;
        if (files.length > 0) {
            console.log('Files dropped:', files.length);
            handleFileUpload(files);
        }
    });

    // Search input
    var searchInput = document.getElementById('searchInput');
    searchInput.addEventListener('input', function() {
        var query = searchInput.value.trim();
        console.log('Searching for:', query);
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
    console.log('Loading files from', currentStorage, 'storage...');

    var url = '/api/files?storage=' + currentStorage;
    console.log('Request URL:', url);

    fetch(url)
        .then(function(response) {
            console.log('Response status:', response.status);
            console.log('Response ok:', response.ok);

            if (!response.ok) {
                throw new Error('Failed to load files (Status: ' + response.status + ')');
            }
            return response.json();
        })
        .then(function(files) {
            console.log('Raw response:', files);
            console.log('Files loaded:', files ? files.length : 'null/undefined');

            // Log each file for debugging
            if (files && Array.isArray(files)) {
                console.log('Individual files:');
                for (var i = 0; i < files.length; i++) {
                    console.log('File', i + ':', files[i]);
                }
            }

            // Handle null or undefined response
            if (!files || !Array.isArray(files)) {
                console.log('Converting non-array response to empty array');
                files = [];
            }

            allFiles = files;
            console.log('About to display', files.length, 'files...');
            displayFiles(files);
            updateFileCount(files.length);
        })
        .catch(function(error) {
            console.error('Error loading files:', error);
            showNotification('Failed to load files: ' + error.message, 'error');

            // Show empty state on error
            allFiles = [];
            displayFiles([]);
            updateFileCount(0);
        });
}

// ============================================
// DISPLAY FILES IN TABLE
// ============================================

function displayFiles(files) {
    var filesList = document.getElementById('filesList');
    var filesTable = document.getElementById('filesTable');
    var emptyState = document.getElementById('emptyState');

    console.log('Displaying files:', files ? files.length : 'null/undefined');

    // Check if elements exist
    if (!filesList || !filesTable || !emptyState) {
        console.error('Required DOM elements not found!', {
            filesList: !!filesList,
            filesTable: !!filesTable,
            emptyState: !!emptyState
        });
        return;
    }

    // Clear existing content
    filesList.innerHTML = '';

    // Show empty state if no files
    if (!files || files.length === 0) {
        filesTable.style.display = 'none';
        emptyState.style.display = 'block';
        emptyState.hidden = false;
        console.log('No files to display - showing empty state');
        return;
    }

    // Show table and hide empty state
    filesTable.style.display = 'table';
    emptyState.style.display = 'none';
    emptyState.hidden = true;

    // Create rows for each file
    for (var i = 0; i < files.length; i++) {
        var file = files[i];
        var row = createFileRow(file);
        filesList.appendChild(row);
    }

    console.log('Successfully displayed', files.length, 'files');
}

// ============================================
// CREATE TABLE ROW FOR A FILE
// ============================================

function createFileRow(file) {
    var row = document.createElement('tr');

    // File name column
    var nameCell = document.createElement('td');
    nameCell.className = 'file-name';
    nameCell.textContent = file.name;
    row.appendChild(nameCell);

    // File size column
    var sizeCell = document.createElement('td');
    sizeCell.className = 'file-size';
    sizeCell.textContent = formatFileSize(file.size);
    row.appendChild(sizeCell);

    // Modified date column
    var dateCell = document.createElement('td');
    dateCell.className = 'file-date';
    dateCell.textContent = formatDate(file.modTime);
    row.appendChild(dateCell);

    // Actions column
    var actionsCell = document.createElement('td');
    actionsCell.className = 'file-actions';

    // Download button
    var downloadBtn = document.createElement('button');
    downloadBtn.className = 'btn btn-sm';
    downloadBtn.textContent = 'Download';
    downloadBtn.onclick = function() {
        downloadFile(file.name);
    };

    // Delete button
    var deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn btn-sm btn-danger';
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
// FILE UPLOAD HANDLING
// ============================================

function handleFileUpload(files) {
    if (isUploading) {
        showNotification('Upload already in progress, please wait...', 'warning');
        return;
    }

    if (!files || files.length === 0) {
        return;
    }

    console.log('Starting upload of', files.length, 'files');
    isUploading = true;
    showUploadProgress(true);

    // Upload files one by one
    uploadFilesSequentially(files, 0);
}

function uploadFilesSequentially(files, index) {
    // All files uploaded
    if (index >= files.length) {
        console.log('All files uploaded successfully');
        isUploading = false;
        showUploadProgress(false);
        clearFileInput();
        loadFiles(); // Refresh the file list
        return;
    }

    var file = files[index];
    console.log('Uploading file', (index + 1), 'of', files.length, ':', file.name);

    uploadSingleFile(file, function(success) {
        if (success) {
            // Move to next file
            uploadFilesSequentially(files, index + 1);
        } else {
            // Stop on error
            console.log('Upload stopped due to error');
            isUploading = false;
            showUploadProgress(false);
            clearFileInput();
        }
    });
}

function uploadSingleFile(file, callback) {
    var formData = new FormData();
    formData.append('file', file);
    formData.append('storage', currentStorage);

    // Update progress text
    var progressText = document.getElementById('progressText');
    progressText.textContent = 'Uploading ' + file.name + '...';

    fetch('/api/upload', {
        method: 'POST',
        body: formData
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Upload failed (Status: ' + response.status + ')');
        }
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            console.log('Successfully uploaded:', file.name);
            showNotification('Uploaded: ' + file.name, 'success');
            callback(true);
        } else {
            throw new Error(data.message || 'Upload failed');
        }
    })
    .catch(function(error) {
        console.error('Upload error for', file.name + ':', error);
        showNotification('Failed to upload ' + file.name + ': ' + error.message, 'error');
        callback(false);
    });
}

// ============================================
// FILE DOWNLOAD
// ============================================

function downloadFile(filename) {
    console.log('Downloading file:', filename);

    var url = '/api/files/' + encodeURIComponent(filename) + '?storage=' + currentStorage;

    // Create temporary link to trigger download
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showNotification('Download started: ' + filename, 'success');
}

// ============================================
// FILE DELETE
// ============================================

function deleteFile(filename) {
    var confirmDelete = confirm('Are you sure you want to delete "' + filename + '"?');
    if (!confirmDelete) {
        return;
    }

    console.log('Deleting file:', filename);

    var url = '/api/files/' + encodeURIComponent(filename) + '?storage=' + currentStorage;

    fetch(url, {
        method: 'DELETE'
    })
    .then(function(response) {
        if (!response.ok) {
            throw new Error('Delete failed (Status: ' + response.status + ')');
        }
        return response.json();
    })
    .then(function(data) {
        if (data.success) {
            console.log('Successfully deleted:', filename);
            showNotification('Deleted: ' + filename, 'success');
            loadFiles(); // Refresh file list
        } else {
            throw new Error(data.message || 'Delete failed');
        }
    })
    .catch(function(error) {
        console.error('Delete error for', filename + ':', error);
        showNotification('Failed to delete ' + filename + ': ' + error.message, 'error');
    });
}

// ============================================
// SEARCH AND FILTER
// ============================================

function filterFiles(query) {
    if (!query) {
        // Show all files if no search query
        displayFiles(allFiles);
        return;
    }

    query = query.toLowerCase();
    var filteredFiles = [];

    // Filter files by name
    for (var i = 0; i < allFiles.length; i++) {
        var filename = allFiles[i].name.toLowerCase();
        if (filename.indexOf(query) !== -1) {
            filteredFiles.push(allFiles[i]);
        }
    }

    console.log('Filtered', filteredFiles.length, 'files for query:', query);
    displayFiles(filteredFiles);
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) {
        return '0 B';
    }

    var sizes = ['B', 'KB', 'MB', 'GB'];
    var k = 1024;
    var i = Math.floor(Math.log(bytes) / Math.log(k));

    if (i >= sizes.length) {
        i = sizes.length - 1;
    }

    var size = bytes / Math.pow(k, i);
    return Math.round(size * 100) / 100 + ' ' + sizes[i];
}

function formatDate(dateString) {
    if (!dateString) {
        return 'Unknown';
    }

    try {
        var date = new Date(dateString);
        if (isNaN(date.getTime())) {
            return 'Invalid Date';
        }

        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit'
        });
    } catch (error) {
        console.error('Date formatting error:', error);
        return 'Invalid Date';
    }
}

function updateFileCount(count) {
    var fileCount = document.getElementById('fileCount');
    var text = count + ' file';
    if (count !== 1) {
        text += 's';
    }
    fileCount.textContent = text;
}

function clearFileInput() {
    var fileInput = document.getElementById('fileInput');
    fileInput.value = '';
}

// ============================================
// UI FEEDBACK FUNCTIONS
// ============================================

function showUploadProgress(show) {
    var progressElement = document.getElementById('uploadProgress');
    if (progressElement) {
        progressElement.hidden = !show;

        if (!show) {
            // Reset progress text
            var progressText = document.getElementById('progressText');
            if (progressText) {
                progressText.textContent = 'Uploading...';
            }
        }
    }
}

function showNotification(message, type) {
    var notification = document.getElementById('notification');
    var notificationText = document.getElementById('notificationText');

    if (!notification || !notificationText) {
        console.log('Notification elements not found');
        return;
    }

    notificationText.textContent = message;
    notification.className = 'notification ' + (type || 'info');
    notification.hidden = false;

    console.log('Notification:', type, '-', message);

    // Auto-hide success notifications after 3 seconds
    if (type === 'success') {
        setTimeout(function() {
            hideNotification();
        }, 3000);
    }
}

function hideNotification() {
    var notification = document.getElementById('notification');
    if (notification) {
        notification.hidden = true;
    }
}