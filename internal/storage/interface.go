package storage

import(
	"io"
	"cloud-filemanager/internal/models"
)


//this defines what any storage system must be able to do
type Storage interface{

	SaveFile(filename string, src io.Reader) error //saves data from src to a file named filename
	GetFile(filename string) (io.ReadCloser, error) //retrieves a file and returns a reader to access its content

	// DeleteFile removes a file
    DeleteFile(filename string) error
    
    // ListFiles returns information about all stored files
    ListFiles() ([]models.FileInfo, error)
    
    // GetStorageType returns a string describing this storage type
    GetStorageType() string



}


