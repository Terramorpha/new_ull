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
		"c",
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
		"w",
		"z",
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
	
	export function makeWordFromHash(hash: string):string {
		let vowel = false;
		const bytes = toByteArray(hash);
		for (let i  = 0;i < bytes.length;i++) if (bytes[i] === undefined) throw "invalid hash";
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
