package handler

import (
	"fmt"
	"net/http"

	"github.com/ralfazza/tomo/pkg"
)

func Handler(w http.ResponseWriter, r *http.Request) {
	pkg.SetCORS(w)
	fmt.Fprint(w, "Hello world")
}
