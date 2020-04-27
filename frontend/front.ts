
declare var MediaRecorder: any;

let IS_NATIVE_NODE = false;
let IS_READONLY = false;
const gateway = "https://ipfs.io/ipfs/";
//const gateway = "ipfs://";
const days = ["Sunday", "Monday","Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];
const isChrome = !!(window as any).chrome && (!!(window as any).chrome.webstore || !!(window as any).chrome.runtime);
const post = {
	send: document.getElementById("post_send") as HTMLButtonElement,
	text: document.getElementById("post_text") as HTMLTextAreaElement,
};





class ListNode {
	next: Ipfs.CID | null;
	items: Ipfs.CID;
	async getItems(ipfsnode: IpfsNode): Promise<Ull.Item[]> {
		const values = await ipfsnode.dag.get(this.items);
		//const Link = new (window as any).Ipfs.Link(this.items);
		//console.log(Link);
		//const resp = await ipfsnode.dag.put(values, {
		//	format: Link.codec,
		//	hashAlg: "sha2-256",
		//});
		//console.log(resp);
		//console.log(values);
		return values.value;
	}

	async getNext(ipfsnode: IpfsNode): Promise<ListNode | null> {
		if (this.next) {
			const val = await ipfsnode.dag.get(this.next);
			return new ListNode(val.value.next, val.value.items);
		}

		
	}
	constructor(next: Ipfs.CID|null, items: Ipfs.CID) {
		this.next = null;
		//console.log("next:::::", next);
		//console.log("items:::::", items);
		if (next)
			this.next = next;
		this.items = items;
	}
}

async function getListNodeFromHash(ipfsnode: IpfsNode, hash: Ipfs.CID): Promise<ListNode> {
	const value = await ipfsnode.dag.get(hash);
	//console.log("value:::::", value);

	return new ListNode(value.value.next ? createCidFromForeignCid(value.value.next):null, createCidFromForeignCid(value.value.items));
}

function filterItems(items: Ull.Item[], view: MessageView): Ull.Item[] {
	let o: Ull.Item[] = [];
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		//console.log(item);

		if (item.type === Ull.TextItem.type_name) {
			let m: Ull.TextItem = item;
			if (m.data == "") continue;
		}
		if (item.type === Ull.CodeItem.type_name) {
			let c: Ull.CodeItem = item;
			if (c.data.content == "") continue;
		}
		if (item.type === Ull.ImageItem.type_name) {
			let c: Ull.ImageItem = item;
			let failed = false;
			try  {
				new Ipfs.CID(c.data["/"]);
			}catch (err) {
				failed = true;
			}
			
			if (failed) {
				alert( c.data["/"] +  " is not a valid hash" );
				return [];
			}
		}
		if (item.type === Ull.LinkItem.type_name) {
			//console.log("data", item);
			const val = view.msgReferences.map[item.data["/"]];
			//console.log("val:::::", val);
			if (!val) {
				if (!confirm("link " + item.data + " is foreign or invalid. Continue ?"))
					return [];
			}
		}
		o.push(item);
	}
	return o;
}


function createBase64Uri(ar: ArrayBuffer): string {
	const b64 = base64ArrayBuffer(ar);
	const u8ar = new Uint8Array(ar);
	const t = getMimeType(u8ar);
	const uri = 'data:' + t + ';base64,' + b64;
	return uri;
}

function addMetadata(items: Ull.Item[]): Ull.Item[] {
	const now = Date.now();
	const new_item = new Ull.TimeStampItem(now);
	// console.log("items:::", items)
	items.push(new_item);
	const types = items.map(item => item.type);
	// console.log("types:::", types);
	if (!(contains(types, Ull.TripCodeItem.type_name))) {
		const id = getID();
		items.unshift(new Ull.TripCodeItem(id));	
	}
	return items;
}


//hashes of all visited messages. useful to verify when to stop traversing the ll (refresh on post)
const hashes: string[] = [];

// a map of links -> pointedToBy
const msgReferences = new ReferenceMap();

function contains(list: any[], item: any): boolean {
	return list.reduce((prev, cur) => {
		if (prev) return prev;
		return cur == item;
	}, false);
}

function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function itemToTag(gitem: Ull.Item, node: IpfsNode, messageHash: string, map:ReferenceMap): HTMLElement {
	if (gitem.type === Ull.TextItem.type_name) {
		const item: Ull.TextItem = gitem;
		const p = document.createElement("p");
		p.innerText = item.data;
		return p;
	} else if (gitem.type === Ull.FileItem.type_name) {
		const item: Ull.FileItem = gitem;
		const div = document.createElement("div");
		const a = document.createElement("a");
		a.href = gateway + item.data.path; //item.data.path;
		a.innerText = item.data.name;
		div.appendChild(a);
		div.appendChild(document.createElement("br"));
		return div;
	} else if (gitem.type === Ull.ImageItem.type_name) {
		const item: Ull.ImageItem = gitem;

		return newIpfsImage(createCidFromForeignCid(item.data), node);

	} else if (gitem.type === Ull.LinkItem.type_name) {
		const item: Ull.LinkItem = gitem;
		//const div = document.createElement("div");

		//console.log("item.data:::::", item.data);
		const hash: Ipfs.CID = createCidFromForeignCid(item.data);
		const hashString = hash.toString();
	
		const link = newLink(hashString, messageHash, map);
		return link;	
	} else if (gitem.type === Ull.CodeItem.type_name) {
		const item: Ull.CodeItem = gitem;
		const i = item as Ull.CodeItem;
		const tag = document.createElement("div");
		tag.classList.add("code");
		const preTag = document.createElement("pre");
		tag.appendChild(preTag);
		const hljs = (window as any).hljs;
		preTag.innerHTML = hljs.highlight( i.data.language ? i.data.language:"plaintext", i.data.content).value;
		//}
		return tag;
	} else if (gitem.type === Ull.InlineCodeItem.type_name) {
		const item: Ull.InlineCodeItem = gitem;
		const div = document.createElement("div");
		div.classList.add("inline_code");
		div.innerText = item.data;
		return div;
	} else if (gitem.type === Ull.AudioItem.type_name) {
		const item: Ull.AudioItem = gitem;
		return newIpfsAudio(createCidFromForeignCid(item.data), node);

	} else if (gitem.type === Ull.TimeStampItem.type_name) {
		const item: Ull.TimeStampItem = gitem;
		const div = document.createElement("div");
		//const content = document.createElement("div");
		//div.appendChild(document.createElement("br"));
		//div.appendChild(content);
		div.classList.add("low_profile");
		const date = new Date(item.data);
		div.innerText = days[date.getDay()] + " " + date.toLocaleDateString() + " " + date.toLocaleTimeString();
		return div;
	}else if (gitem.type === Ull.GenericLinkItem.type_name){
		const item: Ull.GenericLinkItem = gitem;
		const real_item: Ull.GenericLinkItem = item;
		
		const element = document.createElement("div");
		element.classList.add("text");
		element.classList.add("spoiler");
		element.innerText = real_item.data.description;
		let hoveredon = false;
		element.addEventListener("mouseover", function() {
			hoveredon = true;
			element.innerText = real_item.data.link;
		});
		element.addEventListener("mouseout", async function() {
			hoveredon = false;
			await sleep(2000);
			if (hoveredon) return;
			element.innerText = real_item.data.description;
		});		
		return element;
	}else if (gitem.type === Ull.TripCodeItem.type_name) {
		const item: Ull.TripCodeItem = gitem;
		const div = newTripCodeFromHash(item.data);
		return div;
	}else if (gitem.type == Ull.QuoteItem.type_name) {
		const item: Ull.QuoteItem = gitem;
		const text: string = item.data;
		const list = text.split("\n");
		
		if (list[list.length - 1] === ""){
			list.pop();
		}
		
		const quotedText = list.map(s => "> " + s).join("\n");
		const p = document.createElement("p");
		p.classList.add("quote");
		p.innerText = quotedText;
		return p;
	} else {
		console.log("received unknown item type:", gitem.type);
		const d = document.createElement("div");
		d.innerText = JSON.stringify(gitem)
		d.style.backgroundColor = "#FF000030";
		d.style.color = "#FFFFFF";
		return d;
	}
}


async function getIpfsNode(): Promise<IpfsNode> {
	const win = (window as any);

	const ipfs = win.ipfs;
	try {
		const node = await (window as any).ipfs.enable();
		console.log("using native node");
		IS_NATIVE_NODE = true;
		return node;
	} catch (err) {
		const node = await (window as any).Ipfs.create();
		console.log("using browser node");
		IS_NATIVE_NODE = false;
		return node;
	}
}

(async () => {
	const win = window;
	const ipfs = await getIpfsNode();
	(window as any).ipfsnode = ipfs;
	{
		const record = document.getElementById("record");
		let state = "idle";
		let stream: MediaStream;
		let recorder;
		const chunks = [];
		record.addEventListener('click', async () => {
			if (state === "idle") {
				if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
					console.log("recording supported");
				}
				else console.log("recording not supported");
				stream = await navigator.mediaDevices.getUserMedia({
					audio: true,
					video: false
				});
				const opts = {
					mimeType: "audio/mp3"
				};
				recorder = new MediaRecorder(stream);
				recorder.start();
				recorder.addEventListener("dataavailable", async (e) => {
					chunks.push(e.data);
				});
				record.innerText = "🔴 Recording";
				state = "recording";
			} else if (state === "recording") {
				recorder.onstop = async () => {
					record.innerText = "Record";
					stream.getTracks().forEach((tr) => { tr.stop() });
					stream = null;
					recorder = null;
					state = "idle";
					//console.log(chunks);
					const blob = new Blob(chunks);
					//console.log(blob);
					const ar = await new Response(blob).arrayBuffer();
					let hashes;
					try {
						hashes = await ipfs.add(ar);
						//console.log(hashes);
						const hash = hashes[0].hash;
						post.text.value += "[["+ hash +"][audio]]";
						//console.log(ar);
						//console.log(createBase64Uri(ar));
					} catch (err) {
						console.log("couldn't add audio to ipfs:", err);
					}
				};
				recorder.stop();
			}
		});
	}


	const id = document.getElementById("text");

	const container = document.getElementById("container") as HTMLElement;

	const l = win.location;
	const url = l.protocol + "//" + l.host + "/thread";//custom.url;
	let remotePeerAddress;
	const post_container = document.getElementById("post_container");
	const hash = null;//custom.hash;
	// let topHash: Ipfs.CID;
	let allTheHashes: Ipfs.CID[] = [];
	const params = new URLSearchParams(window.location.search);
	const reqHash = params.get("hash");
	const messageView: MessageView = new MessageView();
	
	if (reqHash) {
		if (post_container) {
			post_container.hidden = true;
			IS_READONLY = true;
		}
		console.log("reqHash:::::", reqHash);
		allTheHashes.push(new Ipfs.CID(reqHash));
	} else {
		//console.log("bout to get topHash from http");
		//console.log("url:", url);
		const resp = await (await fetch(url)).json();
		const other_hashes: string[] = resp.other_hashes;
		const resp_hash: string|null = resp.hash;
		allTheHashes = other_hashes.map((hash)=>{
			//console.log("hash:::::", hash);
			return new Ipfs.CID(hash);
		});
		if (resp_hash)
			allTheHashes.unshift(resp.hash);
		//console.log("allTheHashes:::::", allTheHashes);
		//console.log("response:::::", resp);		
		try {
			//console.log("resp:", resp)
			remotePeerAddress = resp.address;
			//console.log("bout to connect ipfs");
			const promise: Promise<any> = ipfs.swarm.connect(resp.address);
			await promise;
		} catch (err) {
			//console.log("error when connecting to peer:", err);
		}
		//console.log("top hash:", topHash);
	}



	post.text.addEventListener("keyup", (k) => {
		if (k.ctrlKey && k.keyCode == 13) {
			post.send.click();
		}
	});


	post.send.addEventListener("click", async () => {
		let messages: Ull.Item[] = filterItems(Ull.extract(post.text.value), messageView);
		if (messages.length === 0) return;
		messages = addMetadata(messages);
		const body = JSON.stringify(messages, (k, v) => v);
		const resp = await fetch(url, {
			method: "POST",
			body: body
		});
		if (resp.status == 400) {
			const message = (await resp.json()).error;
			alert(message);
			return;
		}
		post.text.value = "";
		const jsonResp: any = await resp.json();
		const nodes: Array<HTMLElement> = [];
		//console.log("jsonResp.hash:::::", jsonResp.hash);
		let topHash: Ipfs.CID = new Ipfs.CID(jsonResp.hash);
		try {
			try{await ipfs.swarm.connect(remotePeerAddress);}catch (err){}
			const smallerContainer = document.createElement("div");
			container.appendChild(smallerContainer);
			messageView.update(ipfs, topHash, smallerContainer);
		} catch (err) {
			console.log("error displaying new messages:", err);
		}
	});

	let thread_done = true;
	//console.log("allTheHashes:::::", allTheHashes);
	if (allTheHashes.length == 0) {
		const bigNode = document.createElement("div");
		bigNode.classList.add("big_node");
		bigNode.classList.add("low_profile")
		bigNode.innerText = "empty thread. Post something!";
		container.prepend(bigNode);
		thread_done = false;
	}
	try {
		const allTheDivs = allTheHashes.map((hash) => {
			const div = document.createElement("div");
			messageView.update(ipfs, hash, div);
			return div;
		});
		allTheDivs.reverse();
		allTheDivs.forEach((div) => {
			container.appendChild(div);
		});
	} catch (err) {
		console.log("error when getting whole chain:", err);
	}
})();
