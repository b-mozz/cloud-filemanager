package handlers

import(
	"encoding/json"
    "fmt"
    "io"
    "net/http"
    "cloud-filemanager/internal/models"
    "cloud-filemanager/internal/storage"

    "github.com/gorilla/mux"
)

// FileHandler handles all file-related HTTP requests
type FileHandler struct {
    localStorage   storage.Storage //using the Storage interface
    memoryStorage  storage.Storage //using the Storage interface
}

// NewFileHandler creates a new file handler with both storage types
func NewFileHandler(localStorage, memoryStorage storage.Storage) *FileHandler {
    return &FileHandler{
        localStorage:   localStorage,
        memoryStorage:  memoryStorage,
    }
}

//getStorage selects the appropriate storage based on the type
func (fh *FileHandler) getStorage(storageType string) storage.Storage{
	if storageType == "memory"{
		return fh.memoryStorage
	}else {
		return fh.localStorage
	}
}







