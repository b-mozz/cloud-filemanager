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
    uploadsDir := "uploads"
    if err := os.MkdirAll(uploadsDir, 0755); err != nil {
        log.Fatal("Failed to create uploads directory:", err)
    }

    localStorage := storage.NewLocalStorage(uploadsDir)
    memoryStorage := storage.NewInMemoryStorage()
    fileHandler := handlers.NewFileHandler(localStorage, memoryStorage)

    r := mux.NewRouter()

    // CORS middleware
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

    // API routes
    api := r.PathPrefix("/api").Subrouter()
    api.HandleFunc("/files", fileHandler.HandleListFiles).Methods("GET")
    api.HandleFunc("/files/{filename}", fileHandler.HandleDownload).Methods("GET")
    api.HandleFunc("/files/{filename}", fileHandler.HandleDelete).Methods("DELETE")
    api.HandleFunc("/upload", fileHandler.HandleUpload).Methods("POST")

    // Serve static files
    r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", 
        http.FileServer(http.Dir("./web/static/"))))
    
    // Serve index.html for root
    r.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
        http.ServeFile(w, r, "./web/index.html")
    })

    log.Println("Server starting on http://localhost:8080")
    log.Fatal(http.ListenAndServe(":8080", r))
}


