package handlers

import (
	"cloud-filemanager/internal/models"
	"cloud-filemanager/internal/storage"
	"encoding/json"
	"fmt"
	"io"
	"net/http"

	"github.com/gorilla/mux"
)

// FileHandler handles all file-related HTTP requests
type FileHandler struct {
	localStorage  storage.Storage //using the Storage interface
	memoryStorage storage.Storage //using the Storage interface
}

// NewFileHandler creates a new file handler with both storage types
func NewFileHandler(localStorage, memoryStorage storage.Storage) *FileHandler {
	return &FileHandler{
		localStorage:  localStorage,
		memoryStorage: memoryStorage,
	}
}

// getStorage selects the appropriate storage based on the type
func (fh *FileHandler) getStorage(storageType string) storage.Storage {
	if storageType == "memory" {
		return fh.memoryStorage
	} else {
		return fh.localStorage
	}
}

// list files handler
// HandleListFiles returns a list of all files in the specified storage
// GET /api/files?storage=local  or  GET /api/files?storage=memory
func (fh *FileHandler) HandleListFiles(w http.ResponseWriter, r *http.Request) {
	// Get storage type from query parameter
	storageType := r.URL.Query().Get("storage")
	if storageType == "" {
		storageType = "local" // Default to local
	}

	// Get the appropriate storage
	selectedStorage := fh.getStorage(storageType)

	// List files from storage
	files, err := selectedStorage.ListFiles()
	if err != nil {
		fh.writeErrorResponse(w, http.StatusInternalServerError, "Failed to list files", err)
		return
	}

	// Send JSON response
	w.Header().Set("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(files); err != nil {
		fh.writeErrorResponse(w, http.StatusInternalServerError, "Failed to encode response", err)
		return
	}
}

// HandleDownload sends a file to the client for download
// GET /api/files/{filename}?storage=local
func (fh *FileHandler) HandleDownload(w http.ResponseWriter, r *http.Request) {
    // Extract filename from URL path
    vars := mux.Vars(r) //question: why can't we use r.Url.Query().get() here? answer:The filename is part of the URL path, not a query parameter. Path parameter: /api/files/{filename} - the filename is embedded in the URL path itself. Query parameter: /api/files/myfile.txt?storage=local - storage is a query parameter after the ?
    filename := vars["filename"] 
    
    if filename == "" {
        fh.writeErrorResponse(w, http.StatusBadRequest, "Filename is required", nil)
        return
    }

    // Get storage type from query parameter
    storageType := r.URL.Query().Get("storage")
    selectedStorage := fh.getStorage(storageType)
    
    // Get file from storage
    file, err := selectedStorage.GetFile(filename)
    if err != nil {
        fh.writeErrorResponse(w, http.StatusNotFound, "File not found", err)
        return
    }
    defer file.Close()

    // Set headers to trigger browser download
    w.Header().Set("Content-Disposition", fmt.Sprintf("attachment; filename=%s", filename))
    w.Header().Set("Content-Type", "application/octet-stream")

    // Stream file to client
    if _, err := io.Copy(w, file); err != nil { //question: w.Header() already downloaded the file, why do we need to Stream(what does it mean?) again?
        // Can't change response status at this point, just log
        fmt.Printf("Error streaming file: %v\n", err)
    }
}

// delete file handler
// DELETE /api/files/{filename}?storage=local  or  DELETE /api/files/{filename}?storage=memory
func (fh *FileHandler) HandleDelete(w http.ResponseWriter, r *http.Request) {
    vars := mux.Vars(r)
    filename := vars["filename"] //extracts the filename from the URL path
    
	// Validate filename
    if filename == "" {
        fh.writeErrorResponse(w, http.StatusBadRequest, "Filename is required", nil)
        return
    }

	// Get storage type from query parameter
    storageType := r.URL.Query().Get("storage")
	
	// Get the appropriate storage
    selectedStorage := fh.getStorage(storageType)
    
	//error handling and deleting a file
    err := selectedStorage.DeleteFile(filename)
    if err != nil {
        fh.writeErrorResponse(w, http.StatusNotFound, "Failed to delete file", err)
        return
    }

    response := models.UploadResponse{
        Success:  true,
        Message:  "File deleted successfully",
        Filename: filename,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response) //elaborative comment: json.NewEncoder(w).Encode(response) encodes the response struct to JSON format and writes it directly to the http.ResponseWriter (w), which sends it back to the client as the HTTP response body.
}

// HandleUpload saves an uploaded file to storage
// POST /api/upload
// Note: File uploads use multipart/form-data instead of URL parameters because
// binary file data cannot be sent through URLs. The form contains both the file
// and metadata like storage type.
func (fh *FileHandler) HandleUpload(w http.ResponseWriter, r *http.Request) {
    // Limit upload size to 32MB
    r.ParseMultipartForm(32 << 20)

    // Get the uploaded file
    file, header, err := r.FormFile("file")
    if err != nil {
        fh.writeErrorResponse(w, http.StatusBadRequest, "Failed to get file from request", err)
        return
    }
    defer file.Close()

    // Get storage type from form
    storageType := r.FormValue("storage")
    if storageType == "" {
        storageType = "local"
    }

    selectedStorage := fh.getStorage(storageType)

    // Save file to storage
    err = selectedStorage.SaveFile(header.Filename, file)
    if err != nil {
        fh.writeErrorResponse(w, http.StatusInternalServerError, "Failed to save file", err)
        return
    }

    response := models.UploadResponse{
        Success:  true,
        Message:  fmt.Sprintf("File uploaded successfully to %s storage", storageType),
        Filename: header.Filename,
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(response)
}



// writeErrorResponse sends a JSON error response
func (fh *FileHandler) writeErrorResponse(w http.ResponseWriter, statusCode int, message string, err error) {
    errorResponse := models.ErrorResponse{
        Error:   message,
        Code:    statusCode,
        Message: message,
    }

    if err != nil {
        errorResponse.Message = fmt.Sprintf("%s: %v", message, err)
    }

    w.Header().Set("Content-Type", "application/json")
    w.WriteHeader(statusCode)
    json.NewEncoder(w).Encode(errorResponse)
}
