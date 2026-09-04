package handler

import (
	"net/http"

	"github.com/ralfazza/tomo/internal"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	internal.SetCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	internal.HandleSend(w, r)
}
