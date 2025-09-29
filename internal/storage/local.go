package storage

import(
	"os"
	"io"
	"fmt"
	"sync"
	"path/filepath"
	"cloud-filemanager/internal/models"
)

type LocalStorage struct{
	basePath string //base directory for storing files
	mutex sync.RWMutex //to protect concurrent access
}

func NewLocalStorage(path string) *LocalStorage{
	return &LocalStorage{basePath: path} //initialize with base path
}

func(ls *LocalStorage) GetStorageType() string{
	return "Local"
}

func(ls *LocalStorage) SaveFile(fileName string, src io.Reader) error{ //return type error
	
	ls.mutex.Lock() //lock for writing
	defer ls.mutex.Unlock() //ensure unlock after operation
	
	//security check: prevent directory traversal attacks
	if filepath.IsAbs(fileName) || fileName == ".." || filepath.Clean(fileName) != fileName{
		return fmt.Errorf("invalid file name: %s", fileName)
	}

	//fullpath where the file will be saved
	fullPath := filepath.Join(ls.basePath, fileName)

	//now we need to check if the file already exists
	if _, err := os.Stat(fullPath); err == nil{
		return fmt.Errorf("File already exists %s", fileName)
	}

	//create the file
	destination, err := os.Create(fullPath)
	if err != nil{
		return fmt.Errorf("failed to create file: %w", err)
	}
	defer destination.Close() //ensure the file is closed after operation

	//copy data from src to the destination file
	_, err = io.Copy(destination, src)
	if err != nil{
		return fmt.Errorf("failed to save file: %w", err)
	}

	return nil
}

//access the file and return a reader
func(ls *LocalStorage) GetFile(filename string) (io.ReadCloser, error){

	//security check: prevent directory traversal attacks
	if filepath.IsAbs(filename) || filename == ".." || filepath.Clean(filename) != filename{
		return nil, fmt.Errorf("invalid file name: %s", filename)
	}

	fullPath := filepath.Join(ls.basePath, filename) //full path to the file

	//opening the file / accessing the file
	file, err := os.Open(fullPath)
	if err != nil{
		if os.IsNotExist(err){
		return nil, fmt.Errorf("%s does not exist", filename)
		}
		return nil, fmt.Errorf("failed to open file: %w", err)
	}

	return file, nil //return the file reader



}

//removing file from Local storage
//nothing to post,so only return value is error
func(ls *LocalStorage) DeleteFile(filename string) error{
	//security check: prevent directory traversal attacks
	if filepath.IsAbs(filename) || filename == ".." || filepath.Clean(filename) != filename{
		return fmt.Errorf("invalid file name: %s", filename)
	}

	//full path to the file
	fullPath := filepath.Join(ls.basePath, filename)

	//delete the file
	err := os.Remove(fullPath)
	if err != nil{
		if os.IsNotExist(err){
			return fmt.Errorf("%s does not exist", filename)
		}
		return fmt.Errorf("failed to delete file: %w", err)
	}
	
	return nil //successful deletion
}


//listing files in the local storage
func(ls *LocalStorage) ListFiles() ([]models.FileInfo, error){

	//we need to read the base directory
	entries, err := os.ReadDir(ls.basePath) //returns a list, --> entries
	if err != nil{
		return nil, fmt.Errorf("Failed to read directory: %w", err)
	}

	//now we need to convert these entries to a slice of models.FileInfo
	var files []models.FileInfo
	for _, entry := range entries{
		info, err := entry.Info() //getting detailed info about each file
		if err != nil{
			return nil, fmt.Errorf("failed to get file info: %w", err)
		}
		
		fileInfo := models.FileInfo{
        Name:    entry.Name(),
        Size:    info.Size(),
        Path:    filepath.Join(ls.basePath, entry.Name()),
        IsDir:   entry.IsDir(),
        ModTime: info.ModTime(),
    	}

		files = append(files, fileInfo) //adding to the slice


	}

	return files, nil //returning the list of files



}



