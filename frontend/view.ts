const highlight_sleep_time = 500;

class ReferenceMap {
	map: Map<string, ReferencedMessage>;
	add(to: string, from: string) {
		if (!this.map[to]) this.map[to] = [];
		if (this.map[to].every((v) => v != from))
			(this.map[to] as string[]).push(from);

	}
	get(to: string): ReferencedMessage {
		const o = this.map[to];
		if (o) return o;
		this.map[to] = new ReferencedMessage();
		return this.map[to];
	}
	toTree(): Map<string, string[]> {
		const o = new Map();
		for (const to in this.map) {
			if (!(this.map[to] as ReferencedMessage).element) continue;
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

function newLink(toHash: string, fromHash: string, map: ReferenceMap, previewMessageOnLinkHover:boolean): HTMLElement {
	const a = document.createElement("a") as HTMLAnchorElement;
	a.href = "javascript:void(0)";

	a.addEventListener('click',followThreadUp(toHash, fromHash, map));
	if (previewMessageOnLinkHover)
		handleMouseOver(a, toHash);

	a.href = "#" + toHash;// + item.data;
	a.classList.add("post_link");
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
function newBackLink(toHash: string, settings: Settings.SettingStore): HTMLElement {
	const elem = document.createElement("a");
	elem.href = "javascript:void(0)";
	if (settings.previewMessageOnLinkHover)
		handleMouseOver(elem, toHash);

	const ft = followThreadDown(toHash);
	elem.addEventListener("click", () => {
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
function newIpfsImage(hash: Ipfs.CID, ipfsNode: IpfsNode, settings: Settings.SettingStore): HTMLElement {

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
		if (settings.enableImageOverlay) {
			const imageOverlayContainer = document.getElementById('image_overlay_container');
			const imageOverlay = document.getElementById('image_overlay');
			imageOverlay.style.backgroundImage = "url(" + img.src + ")";
			imageOverlayContainer.classList.add('active');
		} else {
			if (img.classList.contains("message_image_full")) {
				img.classList.remove("message_image_full");
				a.style.display = null;
			} else {
				img.classList.add("message_image_full");
				a.style.display = "block";
			}
		}
	});

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

	catIpfs(hash, ipfsNode).then((u8arrays: Uint8Array[]) => {
		const blob = new Blob(u8arrays);
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
	vid.src = "https://ipfs.io/ipfs/" + hash.toString();

	/* ipfsNode.cat(hash).then((u8array: Uint8Array) => {
		const blob = new Blob([u8array.buffer])
		vid.src = URL.createObjectURL(blob);
	}); */

	return vid;
}

class ReferencedMessage {
	element: HTMLDivElement | null;
	references: Array<string>;
	constructor() {
		this.element = null;
		this.references = new Array();
	}

	addRef(ref: string, settings: Settings.SettingStore) {

		if (!contains(this.references, ref)) {
			this.references.push(ref);
		}
		this.updateRendering(settings);
	}

	updateRendering(settings: Settings.SettingStore) {
		if (this.element) {
			const elems = [];
			this.references.forEach(ref => {
				elems.push(newBackLink(ref, settings));
			});
			this.element.innerText = "";
			elems.forEach((v) => this.element.appendChild(v));
		}
	}

	setElement(elem: HTMLDivElement, settings: Settings.SettingStore) {
		elem.classList.add("pointers_container");
		this.element = elem;
		this.updateRendering(settings);
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
			big.style.left = rect.right.toString() + "px";
			big.style.top = (rect.top - elem.getBoundingClientRect().height / 2).toString() + "px";
			//elem = createDiv(hash, rect.right, rect.top);
			//elem.style.backgroundColor = "#FFFFFF";
			return;
		}
		console.warn("didn't find node to display");

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

function newMessageBox(name: string, references: HTMLDivElement, tripCodes?: HTMLElement): HTMLElement {
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
			await navigator.clipboard.writeText(name);
		} else {
			post.text.value += ">>" + name + "\n";
		}
	});
	header.appendChild(id);
	if (tripCodes)
		header.appendChild(tripCodes);
	header.appendChild(references);
	message.appendChild(header);
	message.appendChild(document.createElement("br"));
	return message;
}

function newTripCodeFromHash(hash: string): HTMLElement {
	let word = hash;
	try {// if the hash is not a certain length, this function might crash
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

		e.classList.add("tripcode_char");
		spans.push(e);
	}
	const elem = document.createElement("div");
	spans.forEach((span) => elem.appendChild(span));
	elem.classList.add("tripcode");
	return elem;
}

class MessageView {
	settings: Settings.SettingStore;
	msgReferences: ReferenceMap;
	hashes: string[];

	constructor(store: Settings.SettingStore) {
		this.hashes = [];
		this.msgReferences = new ReferenceMap();
		this.settings = store;
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

			const bigNode = document.createElement("div");
			bigNode.classList.add("big_node");
			if (this.settings.compactView)
				bigNode.classList.add("medium_container");

			// fix this, nodes must be accessible
			container.prepend(bigNode);
			const thisHash = topHash;
			val.getItems(ipfs).then((items) => {
				bigNode.appendChild(this.render(thisHash.toString(), items, ipfs));
				// bigNode.appendChild(document.createElement("br"));
			})
			topHash = val.next;
		}
	}

	render(hash: string, items: Ull.Item[], ipfs: IpfsNode): HTMLElement {

		// a div to put all the blue links in
		const references = document.createElement("div");
		// and give it to the blue links manager
		//TODO: this creates garbage
		this.msgReferences.get(hash).setElement(references, this.settings);

		let tripcodes = document.createElement("div");
		tripcodes.classList.add("tripcode_container");
		const elem = newMessageBox(hash, references, tripcodes);
		// wrapper for the message box, contains the \n

		while (items[0].type == Ull.TripCodeItem.type_name && items.length != 0) {
			const item: Ull.TripCodeItem = items.shift();
			const t = itemToTag(item, ipfs, hash, this.msgReferences, this.settings);
			tripcodes.appendChild(t);
		}
		items.forEach(item => {
			if (item.type === Ull.LinkItem.type_name) {
				const link: Ull.LinkItem = item;
				const hashString = createCidFromForeignCid(link.data);
				const ref = this.msgReferences.get(hashString.toString());
				ref.addRef(hash, this.settings);

			}

			elem.appendChild(itemToTag(item, ipfs, hash, this.msgReferences, this.settings));
		})
		return elem;
	}
}
