module Ull {

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
		items: string;
		next: string;
	}

	export class FileItem implements Item {
		static type_name: string = "file";
		type: string = "file";
		data: {
			path: string,
			name: string
		} = { path: "", name: "" };

		constructor(name: string, hash: string) {
			this.data.name = name;
			this.data.path = hash;
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
		data: string;
		constructor(hash: string) {
			this.data = hash;
		}
	}
	export class VideoItem implements Item {
		static type_name: string = "video";
		type: string = "video";
		data: string;
		constructor(hash: string) {
			this.data = hash;
		}
	}
	export class AudioItem implements Item {
		static type_name: string = "audio";
		type: string = "audio";
		data: string;
		constructor(hash: string) {
			this.data = hash;
		}
	}

	export class LinkItem implements Item {
		static type_name: string = "link";
		type: string = "link";
		data: string;

		constructor(hash: string) {
			this.data = hash;
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
		{// generic link
			pattern: /\[\[(.*?)\]\[(.*?)\]\]/,
			parse(match: RegExpMatchArray): Item {
				return new GenericLinkItem(match[1], match[2]);
			}
		},
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
