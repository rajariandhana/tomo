package handler

import (
	"net/http"

	"github.com/ralfazza/tomo/pkg"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	pkg.SetCORS(w)
	if r.Method == http.MethodOptions {
		w.WriteHeader(http.StatusNoContent)
		return
	}
	if r.Method != http.MethodPost {
		http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
		return
	}
	pkg.HandleStart(w, r)
}
