module tripcode {
	const vowel_sounds = [
		"a",
		"e",
		"i",
		"o",
		"u",
	];
	const consonnant_sounds = [
		"b",
		"d",
		"f",
		"j",
		"k",
		"l",
		"m",
		"n",
		"p",
		"q",
		"r",
		"s",
		"t",
		"v",
		"z",
	];

	const color_palette = [
		"#FF8000",
		"#00A000",
		//"009D4E",
		//"009781",
		"#FF5E5D",
		//"0083CB",
		//"0074D5",
		"#00A2FF",
		//"00C0FF",
		//"009898",
		"#004F65",
		//"31527C",
		"#595499",
		//"954BA2",
		"#FF006A",
		//"D13192",

		"#05FF00",
		"#0084FF",
		"#FA00FF",
		"#FF7B00",

	];
	

	//https://bitcoin.stackexchange.com/questions/52727/byte-array-to-hexadecimal-and-back-again-in-javascript
	function toHexString(byteArray) {
		return Array.prototype.map.call(byteArray, function(byte) {
			return ('0' + (byte & 0xFF).toString(16)).slice(-2);
		}).join('');
	}
	function toByteArray(hexString) {
		var result = [];
		for (var i = 0; i < hexString.length; i += 2) {
			result.push(parseInt(hexString.substr(i, 2), 16));
		}
		return result;
	}

	function XORArray(array: number[]):number {
		let o = 0;
		for (let i = 0 ; i < array.length;i++)
			o ^= array[i];
		return o;
	}
	export function makeColorListFromHash(hash: string, listLen: number): string[] {
		const indices = []
		for (let i = 0;i < listLen;i++)
			indices.push(0);
		const bytes = toByteArray(hash);
		for (let i  = 0;i < bytes.length;i++) if (bytes[i] === undefined) return [color_palette[0], color_palette[1]];
		const colors = [];
		const l = 4;
		for (let i = 0;i < bytes.length;i ++) {
			indices[i % indices.length] ^= bytes[i];
		}
		indices.forEach((index) => {
			colors.push(color_palette[index % color_palette.length]);
		});
		return colors;
	}
	export function makeWordFromHash(hash: string):string {
		let vowel = false;
		const bytes = toByteArray(hash);
		for (let i  = 0;i < bytes.length;i++) if (bytes[i] === undefined) return "unknowne";
		let name:string = "";
		const l = 4;
		for (let i = 0;i < bytes.length;i += l) {
			if (vowel) {
				name += vowel_sounds[XORArray(bytes.slice(i,i+l)) % vowel_sounds.length];
			}else {
				name += consonnant_sounds[XORArray(bytes.slice(i, i+l)) % consonnant_sounds.length];
			}
			vowel = !vowel;
		}
		return name;		
	}
}
