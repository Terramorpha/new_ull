module Ull {

	interface SlashLink {
		"/": any;
	}
	

	function createLink(hash: string) {
		return {"/": hash};
	}
	
    /**
     * The structure in which an item will be presented in json.
     */
	export interface Item {
		type: string;
		data: any;
	}

    /**
     * The structure of a chain node, items is a hash to a list of Item,
     * next is a hash to the next Node
     */
	export interface Node {
		items: SlashLink;
		next: SlashLink;
	}

	export class FileItem implements Item {
		static type_name: string = "file";
		type: string = "file";
		data: {
			path: SlashLink,
			name: string
		};

		constructor(name: string, hash: string) {
			this.data.name = name;
			this.data.path = createLink(hash);
		}

	}

	export class TextItem implements Item {
		static type_name: string = "text_message";
		type: string = "text_message";
		data: string;

		constructor(text: string) {
			this.data = text;
		}
	}

	export class CodeItem implements Item {
		static type_name: string = "code_block";
		type: string = "code_block";
		data: {
			content: string,
			language?: string
		} = { content: "", language: "" };
		constructor(text: string, language?: string) {
			this.data.content = text;
			this.data.language = language;
		}
	}

	export class InlineCodeItem implements Item {
		static type_name: string = "inline_code_block";
		type: string = "inline_code_block";
		data: string;
		constructor(text: string) {
			this.data = text;
		}
	}

	export class ImageItem implements Item {
		static type_name: string = "image";
		type: string = "image";
		data: SlashLink;
		constructor(hash: string) {
			this.data = createLink(hash);
		}
	}
	export class VideoItem implements Item {
		static type_name: string = "video";
		type: string = "video";
		data: SlashLink;
		constructor(hash: string) {
			this.data = createLink(hash);
		}
	}
	export class AudioItem implements Item {
		static type_name: string = "audio";
		type: string = "audio";
		data: SlashLink;
		constructor(hash: string) {
			this.data = createLink(hash);
		}
	}

	export class LinkItem implements Item {
		static type_name: string = "link";
		type: string = "link";
		data: SlashLink;

		constructor(hash: string) {
			this.data = createLink(hash);
		}

	}

	export class HTMLItem implements Item {
		static type_name: string = "html";
		type: string = "html";
		data: string;
		constructor(text) {
			this.data = text;
		}
	}

	export class TimeStampItem {
		static type_name: string = "timestamp";
		type: string = "timestamp";
		data: number;
		constructor(time) {
			this.data = time;
		}
	}

	export class TripCodeItem {
		static type_name: string = "tripcode";
		type: string = "tripcode";
		data: string;
		constructor(code: string) {
			this.data = code;
		}
	}

	export class GenericLinkItem  implements Item {
		static type_name: string = "generic_link";
		type: string = "generic_link";
		data: {
			link: string;
			description: string;
		};
		constructor(link, description) {
			this.data = {
				link: link,
				description: description,
			};
		}
	}
	// (greentext)
	export class QuoteItem  implements Item {
		static type_name: string = "quote";
		type: string = "quote";
		data: string;
		constructor(data: string) {
			this.data = data;
		}
	}
	
	export interface Parser {
		pattern: RegExp;
		parse(match: RegExpMatchArray): Item;
	}
	
	export const parsers: Parser[] = [
		{//raw text between ``
			pattern: /`([\s\S]*?)`/, //`(asdfasdfasd)`
			parse(match: RegExpMatchArray): Item {
				return new InlineCodeItem(match[1])
			}
		},
		{//code blocks
			pattern: /\[code(?: (.*?))?\]([\s\S]*?)\[\/code\]/,
			parse(match: RegExpMatchArray): Item {
				if (match[1]) {
					return new CodeItem(match[2].slice(1, match[2].length), match[1]);
				} else {
					return new CodeItem(match[2].slice(1, match[2].length));
				}
			}
		},

		{//links
			pattern: />>(\S+)/,
			parse(match: RegExpMatchArray): Item {
				//console.log("match:", match);
				return new LinkItem(match[1]);
			}
		},
		//[[hash][image|img]]
		{//image
			pattern: /\[\[(.*?)\]\[(?:image|img)\]\]/,
			parse(match: RegExpMatchArray): Item {
				return new ImageItem(match[1]);
			}
		},
		{
			pattern: /\[\[(.*?)\]\[(?:audio|sound)\]\]/,
			parse(match: RegExpMatchArray): Item {
				return new AudioItem(match[1]);
			}
		},
		{//video
			pattern: /\[\[(.*?)\]\[(?:video|vid)\]\]/,
			parse(match: RegExpMatchArray): Item {
				return new VideoItem(match[1]);
			}
		},
		{//[[marmelade][tripcode]]
			pattern: /\[\[(.*?)\]\[(?:tripcode|trip)\]\]/,
			parse(match: RegExpMatchArray): Item {
				return new TripCodeItem(match[1]);
			}
		},
		{// generic link
			pattern: /\[\[(.*?)\]\[(.*?)\]\]/,
			parse(match: RegExpMatchArray): Item {
				return new GenericLinkItem(match[1], match[2]);
			}
		},
		{// greentexts
			pattern: /((?:>\s*.*\n)*?(?:>\s*.*))/m,
			parse(match: RegExpMatchArray):Item {
				const lines: string[] = match[1].split("\n");
				for (let i = 0;i < lines.length;i++) {
					lines[i] = lines[i].replace(/>\s*/, "")
				}
				const text = lines.join("\n")
				return new QuoteItem(text)
			}
		}
	];

	export function extract(text: string): Item[] {
		for (let i = 0; i < parsers.length; i++) {
			const parser: Parser = parsers[i];
			const match = text.match(parser.pattern);
			if (match) {
				let split = text.split(match[0]);
				split = split.slice(0, 1).concat(split.slice(1, split.length).join(match[0]));
				let left = split[0];
				let right = split[1];
				let left_parsed = extract(left);
				let right_parsed = extract(right);
				return left_parsed.concat([parser.parse(match)]).concat(right_parsed);
			}
		}
		return [new TextItem(text)];
	}
}

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
	class Buffer {
		constructor(any);
	}
}

interface Swarm {
	connect(string);
}

interface Dag {
	get(CID): any;
}

interface IpfsNode {
	dag: Dag;
	swarm: Swarm;
	add(string):any;
	cat(hash:Ipfs.CID):any;
	cat(string):any;
}

function createCidFromForeignCid(foreignCID: any) {
	if (foreignCID["/"]) return new Ipfs.CID(foreignCID["/"]);
	//console.log("foreignCID:::::", foreignCID);
	//console.log("isChrome:", isChrome);
	return new Ipfs.CID(foreignCID.version, foreignCID.codec, new Ipfs.Buffer((isChrome && IS_NATIVE_NODE) ? foreignCID.hash:foreignCID.multihash))
}
