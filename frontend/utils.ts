//https://gist.github.com/jonleighton/958841  
function base64ArrayBuffer(arrayBuffer: ArrayBuffer): string {
	let base64 = ''
	const encodings = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
	const bytes = new Uint8Array(arrayBuffer)
	const byteLength = bytes.byteLength
	const byteRemainder = byteLength % 3
	const mainLength = byteLength - byteRemainder
	let a, b, c, d
	let chunk
	// Main loop deals with bytes in chunks of 3
	for (var i = 0; i < mainLength; i = i + 3) {
		// Combine the three bytes into a single integer
		chunk = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2]
		// Use bitmasks to extract 6-bit segments from the triplet
		a = (chunk & 16515072) >> 18 // 16515072 = (2^6 - 1) << 18 = 111111000000000000000000
		b = (chunk & 258048) >> 12   // 258048   = (2^6 - 1) << 12 = 000000111111000000000000
		c = (chunk & 4032) >> 6      // 4032     = (2^6 - 1) << 6  = 000000000000111111000000
		d = chunk & 63               // 63       = (2^6 - 1)       = 000000000000000000111111
		// Convert the raw binary segments to the appropriate ASCII encoding
		base64 += encodings[a] + encodings[b] + encodings[c] + encodings[d]
		// every 6 bit is mapped to a character
	}
	// Deal with the remaining bytes and padding
	if (byteRemainder == 1) {
		chunk = bytes[mainLength]
		a = (chunk & 252) >> 2 // 252 = (2^6 - 1) << 2
		// Set the 4 least significant bits to zero
		b = (chunk & 3) << 4 // 3   = 2^2 - 1
		base64 += encodings[a] + encodings[b] + '=='
	} else if (byteRemainder == 2) {
		chunk = (bytes[mainLength] << 8) | bytes[mainLength + 1]
		a = (chunk & 64512) >> 10 // 64512 = (2^6 - 1) << 10
		b = (chunk & 1008) >> 4 // 1008  = (2^6 - 1) << 4
		// Set the 2 least significant bits to zero
		c = (chunk & 15) << 2 // 15    = 2^4 - 1
		base64 += encodings[a] + encodings[b] + encodings[c] + '='
	}

	return base64
}

//https://stackoverflow.com/questions/18299806/how-to-check-file-mime-type-with-javascript-before-upload
function getMimeType(array: Uint8Array): string {
	var arr = array.slice(0, 16);
	var header = "";
	for (var i = 0; i < arr.byteLength; i++) {
		header += arr[i].toString(16);
	}
	//console.log("header:", header);
	let type;
	if (header.slice(0, 8) === "89504e47") {
		return "image/png";
	} else if (header.slice(0, 8) === "47494638") {
		return "image/gif";
	} else if (header.slice(0, 7) === "ffd8ffe") {
		return "image/jpeg";
	} else if (header.slice(0, 6) === "494433") {
		return "audio/mp3";
	} else if (header.slice(0, 8) === "1a45dfa3") {
		return "video/webm";
	} else if (header.slice(0, 8) === "00000020") {
		return "video/mp4";
	} else {
		return "unknown";
	}
	return type;
}
