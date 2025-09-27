package main

import(
	"fmt"
	"log"
	"net/http"
)

func main() {
	fmt.Println("Starting server...")
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request){
		fmt.Fprintf(w,  "Welcome to my Could File Manager!")
	})
	fmt.Println("Server will start on http://localhost:8080")
    fmt.Println("Press Ctrl+C to stop the server")

	log.Fatal(http.ListenAndServe(":8080", nil))
}
