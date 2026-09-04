package handler

import (
	"fmt"
	"net/http"

	"github.com/ralfazza/tomo/internal"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	internal.SetCORS(w)
	fmt.Fprint(w, "Hello world")
}
