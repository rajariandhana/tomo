package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"github.com/joho/godotenv"
	"github.com/ralfazza/tomo/internal"
)

func main() {
	_ = godotenv.Load()
	_ = godotenv.Load("../.env")

	mux := http.NewServeMux()

	mux.HandleFunc("GET /api/hello", func(w http.ResponseWriter, r *http.Request) {
		internal.SetCORS(w)
		fmt.Fprint(w, "Hello world")
	})
	mux.HandleFunc("POST /api/start", func(w http.ResponseWriter, r *http.Request) {
		internal.SetCORS(w)
		internal.HandleStart(w, r)
	})
	mux.HandleFunc("POST /api/send", func(w http.ResponseWriter, r *http.Request) {
		internal.SetCORS(w)
		internal.HandleSend(w, r)
	})
	mux.HandleFunc("OPTIONS /api/start", func(w http.ResponseWriter, r *http.Request) {
		internal.SetCORS(w)
		w.WriteHeader(http.StatusNoContent)
	})
	mux.HandleFunc("OPTIONS /api/send", func(w http.ResponseWriter, r *http.Request) {
		internal.SetCORS(w)
		w.WriteHeader(http.StatusNoContent)
	})

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("tomo backend listening on :%s", port)
	if err := http.ListenAndServe(":"+port, mux); err != nil {
		log.Fatal(err)
	}
}
