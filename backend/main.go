package main

import (
	"encoding/json"
	"flag"
	//"fmt"
	"errors"
	ipfs "github.com/ipfs/go-ipfs-api"
	"log"
	"mime"
	"net/http"
	"os"
	"path"
	"strings"
)

var Config = struct {
	BindAddress string
}{}

func init() {
	flag.StringVar(&Config.BindAddress, "port", ":8000", "the address to bind to")
	flag.Parse()
}

type ErrorMessage struct {
	Error string `json:"error"`
}

func NewErrorMessage(s string) ErrorMessage {
	return ErrorMessage{
		Error: s,
	}
}

func (e ErrorMessage) toJSON() []byte {
	b, err := json.Marshal(e)
	if err != nil {
		panic(err)
	}
	return b
}

// CORSWrapper sets the Access-Control-Allow-Origin to let remote site
// use this content. Since this is pretty easy to serve, we don't
// worry about DDOS
func CORSWrapper(f func(http.ResponseWriter, *http.Request)) func(w http.ResponseWriter, r *http.Request) {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", "*")
		if r.Method == "POST" { //do mesage verification/filtering/censoring, etc...
			filter := true
			if !filter {
				w.WriteHeader(http.StatusBadRequest)
				w.Write(NewErrorMessage("this server doesn't support sending messages").toJSON())
				return
			}
		}
		f(w, r)
	}
}

func main() {
	YourIp = "/ip4/173.178.130.146/tcp/4001"
	sh := ipfs.NewLocalShell()
	if sh == nil {
		panic("couldn't create local shell handle")
	}

	ll := NewLinkedList(sh, "hash")

	ll.AddFilter(func(items *[]Item) error {
		for _, v := range *items {
			if v.Type == "video" {
				return errors.New("video forbidden")
			}

		}
		return nil
	})

	fileServer := http.FileServer(http.Dir("./"))

	http.HandleFunc("/thread", CORSWrapper(ll.Handler()))
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Add("Content-Typ", mime.TypeByExtension(path.Ext(r.URL.Path)))
		fileServer.ServeHTTP(w, r)
	})

	//err := http.ListenAndServe(Config.BindAddress, nil)
	err := http.ListenAndServeTLS(Config.BindAddress, "/home/terramorpha/keys/fullchain.pem", "/home/terramorpha/keys/privkey.pem", nil)
	if err != nil {
		log.Fatal("couldn't listen:", err)
		return
	}
}

func serve(w http.ResponseWriter, r *http.Request) {
	r.URL.Path = "." + r.URL.Path
	if r.URL.Path == "./" {
		r.URL.Path = "./index.html"
	}
	//fmt.Println(r.URL)

	if strings.Contains(r.URL.Path, "/../") {
		http.NotFound(w, r)
		return
	}
	f, err := os.Open(r.URL.Path)
	if err != nil {
		http.NotFound(w, r)
		return
	}
	stat, err := f.Stat()
	if err != nil {
		http.NotFound(w, r)
		return
	}
	defer f.Close()
	http.ServeContent(w, r, path.Base(r.URL.Path), stat.ModTime(), f)
}
