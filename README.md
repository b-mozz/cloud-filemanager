# Cloud File Manager

A learning project exploring file chunking, cloud storage patterns, and in-memory caching with Go and vanilla JavaScript.

## Purpose

Learning objectives:
- File chunking techniques
- AWS S3 integration (planned)
- In-memory storage for caching
- Clean storage architecture

## Features

- **Dual Storage**: Local filesystem + in-memory storage
- **File Operations**: Upload, download, delete, list
- **Storage Switching**: Toggle between backends
- **Web Interface**: Drag-and-drop file management

## Quick Start

```bash
# Run locally (after cloning the repo ofcourse)
go run cmd/server/main.go 

# Or with Docker
docker build -t cloud-filemanager .
docker run -p 8080:8080 -v $(pwd)/uploads:/app/uploads cloud-filemanager
```

Open `http://localhost:8080`

## API

- `GET /api/files?storage={local|memory}` - List files
- `POST /api/upload` - Upload file
- `GET /api/files/{filename}?storage={local|memory}` - Download
- `DELETE /api/files/{filename}?storage={local|memory}` - Delete

## Architecture

Pluggable storage interface:
```go
type Storage interface {
    SaveFile(filename string, data io.Reader) error
    GetFile(filename string) (io.ReadCloser, error)
    DeleteFile(filename string) error
    ListFiles() ([]models.FileInfo, error)
}
```

Current implementations:
- **LocalStorage**: Filesystem persistence
- **InMemoryStorage**: Fast caching (planned for future text editor project)

## Future Plans

- AWS S3 backend with file chunking
- Enhanced in-memory caching strategies
- Integration with upcoming Notebook project