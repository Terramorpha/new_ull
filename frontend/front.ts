declare var MediaRecorder: any;
declare module Ipfs {
	var dag: Dag;
	var swarm: Swarm;
	class CID {
		codec: string;
		multiBaseName: string;
		multiHash: Uint8Array;
		version: number;
		constructor(version: number, codec: string, multiHash: Buffer);
		constructor(hash: string);
	}
}

interface Swarm {
	connect(string);
}

interface Dag {
	get(CID): any;
}

interface Link {
	version: number;
	codec: string;
	multihash: string;
}

interface IpfsNode {
	dag: Dag;
	swarm: Swarm;
	add(string):any;
}

let IS_NATIVE_NODE = false;
let IS_READONLY = false;
const gateway = "https://ipfs.io/ipfs/";
//const gateway = "ipfs://";
const days = ["Sunday", "Monday","Tuesday", "Wednesday", "Thursday", "Friday", "Saturday" ];

const post = {
	send: document.getElementById("post_send") as HTMLButtonElement,
	text: document.getElementById("post_text") as HTMLTextAreaElement,
};

class ReferenceMap {
	map: Map<string, RefenrencedMessage>;
	add(to: string, from: string) {
		if (!this.map[to]) this.map[to] = [];
		if (this.map[to].every((v) => v != from))
			(this.map[to] as string[]).push(from);

	}
	get(to: string): RefenrencedMessage {
		const o = this.map[to];
		if (o) return o;
		this.map[to] = new RefenrencedMessage();
		return this.map[to];
	}
	toTree(): Map<string, string[]> {
		const o = new Map();
		for (const to in this.map) {
			if (!(this.map[to] as RefenrencedMessage).element) continue;
			o[to] = [];
		}
		for (const to in this.map) {
			(this.map[to].references as string[]).forEach(from => {
				o[from].push(to);
			})
		}
		return o;
	}
	constructor() {
		this.map = new Map();
	}
}

function newCID(link: Link): Ipfs.CID {
	return new Ipfs.CID(link.version, link.codec, new Buffer(link.multihash));
}

function newCIDFromString(cid: string): Ipfs.CID {
	return new Ipfs.CID(cid);
}
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
	constructor(next: Link, items: Link) {
		this.next = null;
		if (next)
			this.next = newCID(next);
		this.items = newCID(items);
	}
}

async function getListNodeFromHash(ipfsnode: IpfsNode, hash: Ipfs.CID): Promise<ListNode> {
	const value = await ipfsnode.dag.get(hash);
	return new ListNode(value.value.next, value.value.items);
}

function filterItems(items: Ull.Item[]): Ull.Item[] {
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
			//console.log("data:", c.data);
			try {
				new Ipfs.CID(c.data);
			}catch {
				failed = true;
			}
			if (failed) {
				alert(c.data + " is not a valid hash of an image");
				return [];
			}
			if (c.data == "") continue;
		}
		if (item.type === Ull.LinkItem.type_name) {
			//console.log("data", item);
			const val = msgReferences.map[item.data];
			//console.log(val);
			if (!val) {
				if (!confirm("link " + item.data + " is foreign or invalid. Continue ?"))
					return [];
			}
		}
		o.push(item);
	}
	return o;
}

function newRepliesLink(toHash: string): HTMLElement {
	const elem = document.createElement("a");
	elem.href = "javascript:void(0)";
	handleMouseOver(elem, toHash);
	elem.addEventListener("click", scrollIntoView(toHash));
	elem.classList.add("pointed_by");
	elem.innerText = shortHash(toHash);
	return elem;
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
	items.push(new_item);
	return items;
}

/**
 * create an image element which will, after the content is retrieved, display the linked image
 * @param hash the hash to the video file
 * @param ipfsNode the node
 */
function newIpfsImage(hash: string, ipfsNode: any): HTMLImageElement {
	const img = document.createElement("img");
	img.classList.add("message_image");
	ipfsNode.cat(hash).then((u8array: Uint8Array) => {
		const blob = new Blob([u8array.buffer]);
		const uri = URL.createObjectURL(blob)
		img.src = uri;
	});
	img.alt = "[Image]";
	return img;
}

/**
 * create an audio element which will, after the content is retrieved, display the linked image
 * @param hash the hash to the video file
 * @param ipfsNode the node
 */
function newIpfsAudio(hash: string, ipfsNode: any): HTMLAudioElement {
	const au = document.createElement("audio") as HTMLAudioElement;
	au.setAttribute("controls", "");
	ipfsNode.cat(hash).then((u8array: Uint8Array) => {
		const blob = new Blob([u8array.buffer]);
		const uri = URL.createObjectURL(blob)
		au.src = uri;
	});
	return au;
}

/**
 * Doesn't work
 * @param hash the hash to the video file
 * @param ipfsNode the node to use to get the file
 */
function newIpfsVideo(hash: string, ipfsNode: any): HTMLVideoElement {
	const vid: HTMLVideoElement = document.createElement("video");
	vid.controls = true;
	//const stream: Plugin = ipfsNode.files.catPullStream(hash);
	//console.log("stream:", stream);
	//const media_stream = new MediaStream(stream);
	//console.log("media_stream:", media_stream);
	//vid.srcObject = media_stream;

	vid.src = "https://ipfs.io/ipfs/" + hash;

	/* ipfsNode.cat(hash).then((u8array: Uint8Array) => {
		const blob = new Blob([u8array.buffer])
		vid.src = URL.createObjectURL(blob);
	}); */

	return vid;
}
class RefenrencedMessage {
	element: HTMLDivElement | null;
	references: Array<string>;
	constructor() {
		this.element = null;
		this.references = new Array();
	}

	addRef(ref: string) {

		if (!contains(this.references, ref)) {
			this.references.push(ref);
		}
		this.updateRendering();
	}

	updateRendering() {
		if (this.element) {
			const elems = [];
			this.references.forEach(ref => {
				elems.push(newRepliesLink(ref));
			});
			this.element.innerText = "";
			elems.forEach((v) => this.element.appendChild(v));
		}
	}

	setElement(elem: HTMLDivElement) {
		elem.classList.add("pointers_container");
		this.element = elem;
		this.updateRendering();
	}
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


/**
 * a is the element to set the handlers on
 * hash is the element's id/hash to display when the a element is hovered
 */
function handleMouseOver(a: HTMLElement, hash: string) {
	let elem: HTMLElement | null;
	a.addEventListener('mouseover', () => {
		const e = document.getElementById(hash);
		if (e) {
			const big = document.createElement("div");
			elem = e!.cloneNode(true) as HTMLElement;
			elem.classList.add("message_preview");
			big.classList.add("message_preview_background");
			big.style.position = "fixed"
			big.appendChild(elem);

			document.body.appendChild(big);
			const rect: any = a.getBoundingClientRect();
			//console.log("rect:", elem.getBoundingClientRect());
			big.style.left = rect.right.toString() + "px";
			big.style.top = (rect.top - elem.getBoundingClientRect().height / 2).toString() + "px";
			//elem = createDiv(hash, rect.right, rect.top);
			//elem.style.backgroundColor = "#FFFFFF";
			return;
		}
		console.log("didn't find node to display");

	});

	a.addEventListener('mouseout', () => {
		if (elem)
			elem.remove();
	});
}

/** 
 * this is a higher order function: it returns a function that,
 * when called, wil scroll to the specified hash and highlight
 * it for a second
 */
function scrollIntoView(hash) {
	return () => {
		const e = document.getElementById(hash)!;
		if (e) {
			e.scrollIntoView(true);
			e.classList.add("selected");
			sleep(1000).then(() => {
				e.classList.remove("selected");
			});
		} else {
			//console.log("hash not in this thread");
			//console.log("hash:", hash);
			//custom.openHashInWindow(hash);
			//alert("todo");
			const u = new URL(window.location.href);
			u.search = "";
			u.searchParams.set("hash", hash);
			window.open(u.href, "_blank");
			//alert("not in this thread: foreign");
		}
	};
}

function itemToTag(item: Ull.Item, node: any): HTMLElement {
	if (item.type === Ull.TextItem.type_name) {
		const p = document.createElement("p");
		p.innerText = item.data;
		return p;
	} else if (item.type === Ull.FileItem.type_name) {
		const div = document.createElement("div");
		const a = document.createElement("a");
		a.href = gateway + item.data.path; //item.data.path;
		a.innerText = item.data.name;
		div.appendChild(a);
		div.appendChild(document.createElement("br"));
		return div;
	} else if (item.type === Ull.ImageItem.type_name) {
		//const div = document.createElement("div") as HTMLDivElement;
		const a = document.createElement("a") as HTMLAnchorElement;
		a.href = "javascript:void(0)";//gateway + item.data;
		const image = newIpfsImage(item.data, node);
		a.appendChild(image);
		a.addEventListener("click", () => {
			if (image.classList.contains("message_image_full")) {
				image.classList.remove("message_image_full");
				a.style.display = null;
			}else {
				image.classList.add("message_image_full");
				a.style.display = "block";
			}
		})
		return a;

	} else if (item.type === Ull.LinkItem.type_name) {

		//const div = document.createElement("div");

		const a = document.createElement("a") as HTMLAnchorElement;
		a.href = "javascript:void(0)";
		const hash = item.data;
		a.addEventListener('click', scrollIntoView(hash));


		handleMouseOver(a, hash);

		a.href = "#" + item.data;
		a.classList.add("post_link");
		//console.log(hashes, item.data);
		a.innerText = ">>" + item.data.slice(7, 13);
		//div.append(a);
		//div.append(document.createElement("br"));
		return a;
	} else if (item.type === Ull.CodeItem.type_name) {
		const i = item as Ull.CodeItem;
		const tag = document.createElement("div");
		tag.classList.add("code");
		const preTag = document.createElement("pre");
		tag.appendChild(preTag);
		const hljs = (window as any).hljs;
		preTag.innerHTML = hljs.highlight(i.data.language, i.data.content).value;
		//}
		return tag;
	} else if (item.type === Ull.InlineCodeItem.type_name) {
		const div = document.createElement("div");
		div.classList.add("inline_code");
		div.innerText = item.data;
		return div;
	}
	else if (item.type === Ull.VideoItem.type_name) {
		const vid = newIpfsVideo(item.data, node);
		vid.innerText = "[video]"
		vid.style.width = vid.style.width = "20em";
		return vid;
	} else if (item.type === Ull.AudioItem.type_name) {
		return newIpfsAudio(item.data, node);

	} else if (item.type === Ull.TimeStampItem.type_name) {
		const div = document.createElement("div");
		//const content = document.createElement("div");
		//div.appendChild(document.createElement("br"));
		//div.appendChild(content);
		div.classList.add("low_profile");
		const date = new Date(item.data);
		div.innerText = days[date.getDay()] + " " + date.toLocaleDateString() + " " + date.toLocaleTimeString();
		return div;
	}else if (item.type === Ull.GenericLinkItem.type_name){
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
	}else{
		console.log("received unknown item type:", item.type);
		const d = document.createElement("div");
		d.innerText = JSON.stringify(item)
		d.style.backgroundColor = "#FF000030";
		d.style.color = "#FFFFFF";
		return d;
		
	}
}

function shortHash(hash: string): string {
	return hash.slice(7, 13)
}

function newMessageBox(name: string, references: HTMLDivElement): HTMLElement {
	const message = document.createElement("div");
	message.id = name;
	message.className = "message";

	const header = document.createElement("div");
	header.classList.add("message_header");

	const short_name = shortHash(name);

	const id: HTMLAnchorElement = document.createElement("a");
	id.innerText = short_name;
	id.classList.add("post_id");
	id.href = "javascript:void(0)";
	//set the callback for the id copying
	id.addEventListener('click', async () => {
		if (IS_READONLY) {
			//post.text.value = name;
			//post.text.select();
			//const result = document.execCommand("copy");
			//console.log("clipboard:", result);
			//console.log("val:", name);
			await navigator.clipboard.writeText(name);
		} else {
			post.text.value += ">>" + name + "\n";
		}
	});
	header.appendChild(id);
	header.appendChild(references);
	message.appendChild(header);
	message.appendChild(document.createElement("br"));
	//const refs = msgReferences.get(name);
	//refs.forEach((v) => {
	//    const l: HTMLAnchorElement = document.createElement("a");
	//    l.href = "javascript:void";
	//    l.innerText = ">>" + shortHash(v);
	//    l.classList.add("pointed_by");
	//    l.addEventListener("click", scrollIntoView(v));
	//    handleMouseOver(l, v);
	//    message.appendChild(l);
	//})
	//message.appendChild(document.createElement("br"));
	return message;
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
	let topHash: Ipfs.CID;
	const params = new URLSearchParams(window.location.search);
	const reqHash = params.get("hash");
	if (reqHash) {
		if (post_container) {
			post_container.hidden = true;
			IS_READONLY = true;
		}
		topHash = newCIDFromString(reqHash);
	} else {
		//console.log("bout to get topHash from http");
		//console.log("url:", url);
		const resp = await (await fetch(url)).json();
		const allTheHashes: string[] = resp.other_hashes;
		allTheHashes.unshift(resp.hash);
		console.log("allTheHashes:::::", allTheHashes);
		//console.log("response:::::", resp);		
		topHash = resp.hash;
		try {
			//console.log("resp:", resp)
			remotePeerAddress = resp.address;
			//console.log("bout to connect ipfs");
			const promise: Promise<any> = ipfs.swarm.connect(resp.address);
			await promise;
			//console.log("connected ipfs");




			
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
		let messages: Ull.Item[] = filterItems(Ull.extract(post.text.value));
		//console.log(typeof messages);
		//console.log(messages);
		// failed or no item
		if (messages.length === 0) return;
		messages = addMetadata(messages);
		


		//console.log("items", items);
		//console.log("items.length", items.length);
		//console.log("items", messages);
		const body = JSON.stringify(messages, (k, v) => v);
		//console.log("body:", body);
		//console.log("url:", url);
		const resp = await fetch(url, {
			method: "POST",
			body: body
		});
		if (resp.status == 400) {
			//bad request
			const message = (await resp.json()).error;
			//console.log("couldn't post:", message);
			alert(message);
			return;
		}
		post.text.value = "";
		const jsonResp: any = await resp.json();

		//console.log(jsonResp);

		
		
		const nodes: Array<HTMLElement> = [];
		//console.log("resp:", resp);
		//console.log("setting new topHash");
		let topHash: Ipfs.CID | null = newCIDFromString(jsonResp.hash);
		//console.log("remotePeerAddress");

		try {
			await ipfs.swarm.connect(remotePeerAddress);
		} catch (err) { }
		while (topHash && !contains(hashes, topHash.toString())) {
			//console.log("topHash:", topHash);
			const val = await getListNodeFromHash(ipfs, topHash);
			//console.log("list:", val );
			const references = document.createElement("div");
			msgReferences.get(topHash.toString()).setElement(references);
			const elem = newMessageBox(topHash.toString(), references);

			const bigNode = document.createElement("div");
			bigNode.classList.add("big_node");
			bigNode.appendChild(elem);
			bigNode.appendChild(document.createElement("br"));
			nodes.push(bigNode);
			const h = topHash;
			val.getItems(ipfs).then((items) => {
				items.forEach(item => {
					if (item.type === Ull.LinkItem.type_name) {
						const ref = msgReferences.get(item.data);
						ref.addRef(h.toString());


						ref.updateRendering();
					}
					elem.appendChild(itemToTag(item, ipfs));
				})
			})
			hashes.push(topHash.toString());
			topHash = val.next;
		}
		nodes.reverse();
		nodes.forEach((v) => {
			container.appendChild(v);
		})

		//} catch (err) {
		//    console.log("error posting message:", err);
		//}
		const tree = msgReferences.toTree();
		//render(document.getElementById("canvas") as HTMLCanvasElement, tree);

	});
	let thread_done = true;
	if (!topHash) {
		const bigNode = document.createElement("div");
		bigNode.classList.add("big_node");
		bigNode.innerText = "empty thread. Post something!";
		container.prepend(bigNode);
		thread_done = false;
	}
	try {
		//console.log("topHash:", topHash);
		while (topHash) {
			//console.log("bout to get");
			//console.log("topHash:::::", topHash);
			const obj: any = await ipfs.dag.get(topHash);
			//console.log("obj.value:::", obj);
			const val = new ListNode(obj.value.next, obj.value.items);
			//console.log("val::::: ", val);
			//when we get the actual content of the message,
			const bigNode = document.createElement("div");
			bigNode.classList.add("big_node");
			const references = document.createElement("div");
			msgReferences.get(topHash.toString()).setElement(references);
			const message = newMessageBox(topHash.toString(), references);
			bigNode.appendChild(message);
			bigNode.appendChild(document.createElement("br"));
			container.prepend(bigNode);
			const h = topHash;
			val.getItems(ipfs).then((items: Ull.Item[]) => {
				//console.log("items:", items);
				items.forEach((item) => {
					if (item.type === Ull.LinkItem.type_name) {
						const ref = msgReferences.get(item.data);
						ref.addRef(h.toString());
						ref.updateRendering();
					}
					message.appendChild(itemToTag(item, ipfs));
				});
			});
			hashes.push(topHash.toString());
			topHash = val.next;
		}
		// const container = document.getElementById("post_container");
		// const canvas = document.createElement("canvas");
		// canvas.id = "canvas";
		// container.appendChild(canvas);
		//const tree = msgReferences.toTree();
		//render(canvas, tree);
		if (thread_done) {
			const bigNode = document.createElement("div");
			bigNode.classList.add("big_node");
			bigNode.classList.add("low_profile");
			bigNode.innerText = "thread fully loaded";
			container.prepend(bigNode);
		}
	} catch (err) {
		console.log("error when getting whole chain:", err);
	}
})();
