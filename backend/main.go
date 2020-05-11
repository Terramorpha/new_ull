package main

import (
	"encoding/hex"
	"encoding/json"
	"flag"
	//"fmt"
	"crypto/sha256"
	"errors"
	"fmt"
	ipfs "github.com/ipfs/go-ipfs-api"
	"log"
	"mime"
	"net/http"
	"os"
	"path"
	"strings"
)

var Config = struct {
	BindAddress  string
	IsHttps      bool
	CertFile     string
	KeyFile      string
	HashFile     string
	TripCodeSalt string
}{}

func init() {

	flag.StringVar(&Config.BindAddress, "port", ":8000", "the address to bind to")
	flag.BoolVar(&Config.IsHttps, "https", true, "wether to use https or not")
	flag.StringVar(&Config.CertFile, "certfile", "/home/terramorpha/keys/fullchain.pem", "the fullchain.pem file to use")
	flag.StringVar(&Config.KeyFile, "keyfile", "/home/terramorpha/keys/privkey.pem", "the privkey.pem file to use")
	flag.StringVar(&Config.HashFile, "hashfile", "hash", "the file in which to store all message hashes")
	flag.StringVar(&Config.TripCodeSalt, "salt", "", "the salt to use for creating TripCodes")
	flag.Parse()
	if Config.TripCodeSalt == "" {
		log.Fatal("tripcode salt must not be empty")
	}

	Config.TripCodeSalt = strings.Trim(Config.TripCodeSalt, " \n\r\t")
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

/*

	export class TripCodeItem {
		static type_name: string = "tripcode";
		type: string = "tripcode";
		data: string;
		constructor(code: string) {
			this.data = code;
		}
	}

*/

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

	ll.AddFilter(func(items *[]Item) error {
		for _, v := range *items {
			if v.Type == "tripcode" {
				str, ok := v.Data.(string)
				if !ok {
					return errors.New("tripcode not a string")
				}
				if len(str) == 0 {
					return errors.New("tripcodes must not be empty")
				}
			}
		}
		return nil
	})

	ll.AddFilter(func(items *[]Item) error {

		for i := range *items {
			val := &(*items)[i]
			if val.Type == "tripcode" {
				log.Printf("%#+v\n", val)
				str, ok := val.Data.(string)
				if !ok {
					panic(fmt.Sprintf("could not turn %#+v into string", val.Data))
				}
				bs := sha256.Sum256([]byte(str + Config.TripCodeSalt))
				hashStr := hex.EncodeToString(bs[:])
				val.Data = hashStr

				log.Printf("%#+v\n", val)
				//tripcode, ok :=
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

	if Config.IsHttps {
		log.Println("using https")
		err := http.ListenAndServeTLS(Config.BindAddress, Config.CertFile, Config.KeyFile, nil)
		if err != nil {
			log.Fatal("error:", err)
			return
		}

	} else {
		log.Println("using http")
		err := http.ListenAndServe(Config.BindAddress, nil)
		if err != nil {
			log.Fatal("error:", err)
		}
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
