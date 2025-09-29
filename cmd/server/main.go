package main

import (
    "log"
    "net/http"
    "os"

    "cloud-filemanager/internal/handlers"
    "cloud-filemanager/internal/storage"

    "github.com/gorilla/mux"
)

func main() {
    // Create uploads directory if it doesn't exist
    uploadsDir := "uploads"
    if err := os.MkdirAll(uploadsDir, 0755); err != nil {
        log.Fatal("Failed to create uploads directory:", err)
    }

    // Initialize storage implementations
    localStorage := storage.NewLocalStorage(uploadsDir)
    memoryStorage := storage.NewInMemoryStorage()

    // Initialize handlers
    fileHandler := handlers.NewFileHandler(localStorage, memoryStorage)

    // Setup router
    r := mux.NewRouter()

	// Simple home page
	r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/html")
    w.Write([]byte(`
        <h1>Cloud File Manager API</h1>
        <p>Server is running!</p>
        <h2>Available Endpoints:</h2>
        <ul>
            <li>GET <a href="/api/files?storage=local">/api/files?storage=local</a> - List files</li>
            <li>GET /api/files/{filename}?storage=local - Download file</li>
            <li>POST /api/upload - Upload file</li>
            <li>DELETE /api/files/{filename}?storage=local - Delete file</li>
        </ul>
    `))
	})

    // API routes
    api := r.PathPrefix("/api").Subrouter()
    api.HandleFunc("/files", fileHandler.HandleListFiles).Methods("GET")
    api.HandleFunc("/files/{filename}", fileHandler.HandleDownload).Methods("GET")
    api.HandleFunc("/files/{filename}", fileHandler.HandleDelete).Methods("DELETE")
    api.HandleFunc("/upload", fileHandler.HandleUpload).Methods("POST")

    // Basic CORS headers (for now)
    r.Use(func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            w.Header().Set("Access-Control-Allow-Origin", "*")
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
            
            if r.Method == "OPTIONS" {
                w.WriteHeader(http.StatusOK)
                return
            }
            
            next.ServeHTTP(w, r)
        })
    })

    log.Println("Server starting on http://localhost:8080")
    log.Println("API endpoints:")
    log.Println("  GET    /api/files?storage=local")
    log.Println("  GET    /api/files/{filename}?storage=local")
    log.Println("  DELETE /api/files/{filename}?storage=local")
    log.Println("  POST   /api/upload")
    
    log.Fatal(http.ListenAndServe(":8080", r))
}


