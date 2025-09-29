package storage

import(
	"bytes"
	"fmt"
	"io"
	"sync"
	"time"
	"path/filepath"
	"cloud-filemanager/internal/models"

)

// MemoryFile represents a file stored in memory
type MemoryFile struct{
	Name string
	Data []byte
	Size int64
	ModTime time.Time

}

//InMemoryStorage implements a simple in-memory storage system
type InMemoryStorage struct{

	//A map to hold files
	//Key: string, File path
	//value: MemoryFile pointer
	files map[string]*MemoryFile 

	//to protect concurrent access to the files map
	mutex sync.RWMutex

}

//constructor function to create a new InMemoryStorage instance
func NewInMemoryStorage() *InMemoryStorage{
	return &InMemoryStorage{
		files: make(map[string]*MemoryFile),
	}
}


//function to get storage type
func(ims *InMemoryStorage) GetStorageType() string{
	return "memory"
}

//function to save a file in memory
func(ims *InMemoryStorage) SaveFile(fileName string, src io.Reader) error{

	//security check: prevent directory traversal attacks
		if filepath.IsAbs(fileName) || fileName == ".." || filepath.Clean(fileName) != fileName{
		return fmt.Errorf("invalid file name: %s", fileName)
	}

	//locking
	ims.mutex.Lock() //lock for writing
	defer ims.mutex.Unlock() //ensure unlock after operation

	//to check file already exists
	//we ignore Key with _
	//we checks for value only (exists)
	if _, exists := ims.files[fileName]; exists{
		return fmt.Errorf("%s already exists.", fileName)
	}

	// Read all data from source into memory
    data, err := io.ReadAll(src)
    if err != nil {
        return fmt.Errorf("failed to read file data: %w", err)
    }

    // Simulate cloud storage limitations (100MB max)
    if len(data) > 100*1024*1024 {
        return fmt.Errorf("file too large: maximum 100MB allowed")
    }

	//store file in our InMemoryStorage
	ims.files[fileName] = &MemoryFile{
		Name: fileName, 
		Data: data,
		Size: int64(len(data)),
		ModTime: time.Now(),
	}

	return nil

}

//function to get a file from memory
func(ims *InMemoryStorage) GetFile(fileName string) (io.ReadCloser, error){
	//security check: prevent directory traversal attacks
	if filepath.IsAbs(fileName) || fileName == ".." || filepath.Clean(fileName) != fileName{
		return nil, fmt.Errorf("invalid file name: %s", fileName)
	}	
	//locking
	ims.mutex.RLock() //lock for reading (shared access)
	defer ims.mutex.RUnlock() //ensure unlock after operation

	//check if file exists
	file, exists := ims.files[fileName]
	if !exists{
		return nil, fmt.Errorf("file not found: %s", fileName)
	}

	//return a ReadCloser for the file data
	return io.NopCloser(bytes.NewReader(file.Data)), nil	
}

//delete a file from memory
func (mcs *InMemoryStorage) DeleteFile(filename string) error {
    mcs.mutex.Lock()         // EXCLUSIVE access (modifying)
    defer mcs.mutex.Unlock()

    if _, exists := mcs.files[filename]; !exists {
        return fmt.Errorf("file not found: %s", filename)
    }

    delete(mcs.files, filename) // Built-in Go function
    return nil
}

//LocalStorage implements a simple local file storage system
func (mcs *InMemoryStorage) ListFiles() ([]models.FileInfo, error) {
    mcs.mutex.RLock()         // SHARED access (reading)
    defer mcs.mutex.RUnlock()

    var files []models.FileInfo
    for _, file := range mcs.files {    // Iterate over map values
        fileInfo := models.FileInfo{
            Name:    file.Name,
            Size:    file.Size,
            Path:    fmt.Sprintf("memory://%s", file.Name), // Special memory path
            IsDir:   false,        // Files in memory are never directories
            ModTime: file.ModTime,
        }
        files = append(files, fileInfo)
    }

    return files, nil
}

// Clear removes all files from memory (useful for testing)
func (ims *InMemoryStorage) Clear() {
    ims.mutex.Lock()
    defer ims.mutex.Unlock()
    ims.files = make(map[string]*MemoryFile)
}


