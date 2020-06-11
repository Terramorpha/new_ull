package main

import (
	"bufio"
	"encoding/json"
	"fmt"
	ipfs "github.com/ipfs/go-ipfs-api"
	"net/http"
	"os"
	"strings"
	"sync"
	"log"
)

type Link struct {
	Cid string `json:"/"`
}

type Node struct {
	Items Link  `json:"items"`
	Next  *Link `json:"next"`
}

type Item struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

type Error struct {
	ErrorMessage string `json:"error"`
}

func toJson(v interface{}) string {
	b, err := json.Marshal(v)
	if err != nil {
		panic(err)
	}
	return string(b)
}

func (n Node) json() string {
	return toJson(n)
}

//173.178.130.146
var YourIp = "/dns/terramorpha.tech/tcp/4001"

const EncodingKind = "dag-cbor"

type LinkedList struct {
	hashFile string
	shell    *ipfs.Shell
	filters  []func(*[]Item) error
}

type HashList struct {
	fileName string
	file     *os.File
	hashes   []string
}

func NewHashList(fileName string) *HashList {
	o := new(HashList)
	o.fileName = fileName
	o.file = nil
	o.hashes = []string{}

	file, err := os.OpenFile(fileName, os.O_RDWR|os.O_APPEND|os.O_CREATE, 0666)
	if err != nil {
		fmt.Println("couldn't open old hash file:", err)
		return o
	}
	o.file = file
	bufread := bufio.NewReader(file)
	for line, _, err := bufread.ReadLine(); err == nil; line, _, err = bufread.ReadLine() {
		str := string(line)
		if strings.HasPrefix(str, "#") || str == "" {
			continue
		}
		o.hashes = append([]string{str}, o.hashes...)

	}
	fmt.Println("o.hashes", o.hashes)
	
	return o
}

func (hl *HashList) AddHash(hash string) {
	if hl.file == nil {
		file, err := os.Create(hl.fileName)
		if err != nil {
			panic(err)
		}

		hl.file = file
	}
	fmt.Fprintf(hl.file, "%s\n", hash)
	
	hl.hashes = append([]string{hash}, hl.hashes...)
}

// NewLinkedList takes an IPFS shell, a file name and returns an instance of a Linkedlist
func NewLinkedList(sh *ipfs.Shell, lastHash string) *LinkedList {

	o := new(LinkedList)
	o.hashFile = lastHash
	o.shell = sh
	return o
}

func (ll *LinkedList) Handler() func(w http.ResponseWriter, r *http.Request) {

	m := sync.RWMutex{}
	hashList := NewHashList(ll.hashFile)

	return func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case "GET":
			m.RLock()
			defer m.RUnlock()

			var addr *string = nil
			id, err := ll.shell.ID()
			if err != nil {
				log.Printf("error getting node ID: %v\n", err)
			}else {
				addrTemp := fmt.Sprintf("%s/ipfs/%s", YourIp, id.ID)
				addr = &addrTemp
			}

			enc := json.NewEncoder(w)

			if len(hashList.hashes) == 0 {
				enc.Encode(struct {
					Hash        *string  `json:"hash"`
					OtherHashes []string `json:"other_hashes"`
					Addr        *string  `json:"address"`
				}{
					Hash: nil, Addr: addr, OtherHashes: []string{},
				})
			}else {
				enc.Encode(struct {
					Hash        *string  `json:"hash"`
					OtherHashes []string `json:"other_hashes"`
					Addr        *string  `json:"address"`
				}{
					Hash: &hashList.hashes[0], Addr: addr, OtherHashes: hashList.hashes[1:],
				})
			}

		case "POST":
			dec := json.NewDecoder(r.Body)
			content := []Item{}
			dec.Decode(&content)
			if len(content) == 0 {
				w.WriteHeader(http.StatusBadRequest)
				return
			}

			for _, filter := range ll.filters {
				//fmt.Println(content)
				err := filter(&content)
				if err != nil {
					error := toJson(Error{
						ErrorMessage: err.Error(),
					})
					w.WriteHeader(http.StatusBadRequest)
					w.Write([]byte(error))
					return
				}
			}
			m.Lock()
			defer m.Unlock()

			//put in dag the list
			itemsHash, err := ll.shell.DagPut(toJson(content), "json", EncodingKind)
			if err != nil {
				panic(err)
			}

			var next *Link = nil
			if len(hashList.hashes) != 0 {
				next = &Link{Cid: hashList.hashes[0]}
			}

			o := Node{
				Items: Link{Cid: itemsHash}, Next: next,
			}
			h, err := ll.shell.DagPut(o.json(), "json", EncodingKind)
			if err != nil {
				panic(err)
			}
			fmt.Println("hash:", h)
			hashList.AddHash(h)

			enc := json.NewEncoder(w)
			enc.Encode(struct {
				Hash *string `json:"hash"`
			}{Hash: &h})
		default:
			http.NotFound(w, r)
		}
	}
}


// Filter is a function type used to modify a received MessageItem List
// arbitrarily.
type Filter func(items *[]Item) error

// AddFilter is used to deny certain messages
//
// It takes a predicate that will analyse all the items in the message and
// return an error if this message is incorrect.
//
// This function can be chained
func (ll *LinkedList) AddFilter(filter Filter) *LinkedList {
	ll.filters = append(ll.filters, filter)
	return ll
}
