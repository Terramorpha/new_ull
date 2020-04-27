const highlight_sleep_time = 500;

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
			(this.map[to].references as string[]).forEach(_from => {
				o[_from].push(to);
			})
		}
		return o;
	}
	constructor() {
		this.map = new Map();
	}
}

function newLink(toHash: string, fromHash: string, map: ReferenceMap): HTMLElement {
	const a = document.createElement("a") as HTMLAnchorElement;
	a.href = "javascript:void(0)";

	a.addEventListener('click',followThreadUp(toHash, fromHash, map));
	handleMouseOver(a, toHash);

	a.href = "#" + toHash;// + item.data;
	a.classList.add("post_link");
	//console.log(hashes, item.data);
	a.innerText = ">>" + toHash.slice(7, 13);
	//div.append(a);
	//div.append(document.createElement("br"));
	return a;
}


/**
 * create a blue link
 *
 * @param toHash the hash the link 
 */
function newBackLink(toHash: string): HTMLElement {
	const elem = document.createElement("a");
	elem.href = "javascript:void(0)";
	handleMouseOver(elem, toHash);

	const ft = followThreadDown(toHash);
	elem.addEventListener("click", ()=>{
		if (elem.classList.contains("selected_backlink"))elem.classList.remove("selected_backlink");
		ft();
	});
	elem.classList.add("pointed_by");
	elem.innerText = shortHash(toHash);
	elem.setAttribute("hash", toHash);
	return elem;
}

async function catIpfs(hash: Ipfs.CID , ipfsNode: IpfsNode): Promise<any[]> {
	if (isChrome && !IS_NATIVE_NODE){
		const buffers = [];
		for await (const chunk of ipfsNode.cat(hash)) {
			buffers.push(chunk);
		}

		return buffers;
	}else {
		return [await ipfsNode.cat(hash)];
	}
}

/**
 * create an image element which will, after the content is retrieved, display the linked image
 * @param hash the hash to the video file
 * @param ipfsNode the node
 */
function newIpfsImage(hash: Ipfs.CID, ipfsNode: IpfsNode): HTMLElement {

	const img = document.createElement("img");
	img.classList.add("message_image");
	img.setAttribute("hash", hash.toString());
	img.alt = "[Image]";
	catIpfs(hash, ipfsNode).then((u8arrays: Uint8Array[]) => {
		const blob = new Blob(u8arrays);
		const uri = URL.createObjectURL(blob)
		img.src = uri;
	})


	const a = document.createElement("a") as HTMLAnchorElement;
	a.href = "javascript:void(0)";//gateway + item.data;
	a.appendChild(img);
	a.addEventListener("click", () => {
		if (img.classList.contains("message_image_full")) {
			img.classList.remove("message_image_full");
			a.style.display = null;
		}else {
			img.classList.add("message_image_full");
			a.style.display = "block";
		}
	})

	return a;
}


/**
 * create an audio element which will, after the content is retrieved, display the linked image
 * @param hash the hash to the video file
 * @param ipfsNode the node
 */
function newIpfsAudio(hash: Ipfs.CID, ipfsNode: IpfsNode): HTMLAudioElement {
	const au = document.createElement("audio") as HTMLAudioElement;
	au.setAttribute("controls", "");
	au.setAttribute("hash", hash.toString());
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
function newIpfsVideo(hash: Ipfs.CID, ipfsNode: IpfsNode): HTMLVideoElement {
	const vid: HTMLVideoElement = document.createElement("video");
	vid.controls = true;
	//const stream: Plugin = ipfsNode.files.catPullStream(hash);
	//console.log("stream:", stream);
	//const media_stream = new MediaStream(stream);
	//console.log("media_stream:", media_stream);
	//vid.srcObject = media_stream;

	vid.src = "https://ipfs.io/ipfs/" + hash.toString();

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
				elems.push(newBackLink(ref));
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
 * this is a higher order function: it returns a function that, when called, will
 * scroll up a thread to the message with the specified hash and highlight it for a
 * second. It will also highlight the backlink to the fromHash message
 */
function followThreadUp(hash: string, fromHash: string, map: ReferenceMap) {
	return () => {
		const e = document.getElementById(hash)!;
		if (e) {
			e.scrollIntoView(true);
			e.classList.add("selected");

			const references = map.get(hash);
			for (let i = 0;i < references.element.children.length;i++) {
				const elem: Element = references.element.children.item(i);
				if (elem.getAttribute("hash") === fromHash) elem.classList.add("selected_backlink");
			}
			sleep(highlight_sleep_time).then(() => {
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

/** 
 * this is a higher order function: it returns a function that, when called, wil
 * scroll back to the message with the specified hash and highlight it for a
 * second.   
 */
function followThreadDown(backToHash: string) {
	return () => {
		const e = document.getElementById(backToHash)!;
		if (e) {
			e.scrollIntoView(true);
			e.classList.add("selected");
			sleep(highlight_sleep_time).then(() => {
				e.classList.remove("selected");
			});
		}
	};
}


function shortHash(hash: string): string {
	return hash.slice(7, 13)
}

function newMessageBox(name: string, references: HTMLDivElement, tripCode?: HTMLElement): HTMLElement {
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
	if (tripCode)
		header.appendChild(tripCode);
	header.appendChild(references);
	message.appendChild(header);
	message.appendChild(document.createElement("br"));
	return message;
}

function newTripCodeFromHash(hash: string): HTMLElement {
	let word = hash;
	try {
		word = tripcode.makeWordFromHash(hash);
	}catch(err) {}
	const colors = tripcode.makeColorListFromHash(hash, 2);
	const spans = [];
	const skip = 4;
	for (let i = 0;i < word.length;i++) {
		const e = document.createElement("span");
		e.innerText = word[i];
		// e.style.color = colors[i];
		//e.style.backgroundColor = colors[Math.floor(i/skip)];
		e.style.color = colors[Math.floor(i/skip)];
		spans.push(e);
	}
	const div = document.createElement("div");
	spans.forEach((span) => div.appendChild(span));
	div.classList.add("tripcode");
	return div;	
}

class MessageView {
	msgReferences: ReferenceMap;
	hashes: string[];

	constructor() {
		this.hashes = [];
		this.msgReferences = new ReferenceMap();
	}
	
	/**
	 * Update the dom by displaying the messages in the specified container div
	 *
	 * @param ipfs The ipfs Node which will be used to retrieve the dag objects
	 * @param topHash the cid of the head of the chain of message to render
	 * @param container the div in which the messages will be placed
	 */
	async update(ipfs: IpfsNode,topHash: Ipfs.CID ,container: HTMLElement) {
		while (topHash && !contains(this.hashes, topHash.toString())) {
			this.hashes.push(topHash.toString());
			const val = await getListNodeFromHash(ipfs, topHash);
			
			// a div to put all the blue links in
			const references = document.createElement("div");
			// and give it to the blue links manager
			this.msgReferences.get(topHash.toString()).setElement(references);

			let tripcodes = document.createElement("div");
			
			const elem = newMessageBox(topHash.toString(), references, tripcodes);
			// wrapper for the message box, contains the \n
			const bigNode = document.createElement("div");
			bigNode.classList.add("big_node");
			bigNode.appendChild(elem);
			bigNode.appendChild(document.createElement("br"));

			// fix this, nodes must be accessible
			container.prepend(bigNode);
			const h: Ipfs.CID = topHash;
			let first_code = true;
			val.getItems(ipfs).then((items) => {
				items.forEach(item => {
					if (item.type === Ull.LinkItem.type_name) {
						const link: Ull.LinkItem = item;
						const hashString = createCidFromForeignCid(link.data);
						const ref = this.msgReferences.get(hashString.toString());
						ref.addRef(h.toString());
						ref.updateRendering();
					}
					if (item.type === Ull.TripCodeItem.type_name) {
						const t = itemToTag(item, ipfs, h.toString(), this.msgReferences);
						tripcodes.appendChild(t);
						if (first_code) {
							first_code = false;
							return;
						}
					}
					elem.appendChild(itemToTag(item, ipfs, h.toString(), this.msgReferences));
				})
			})

			topHash = val.next;
		}
	}
}



