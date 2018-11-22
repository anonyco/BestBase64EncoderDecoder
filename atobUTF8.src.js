var atobUTF8 = (function(){
	"use strict";
	var log = Math.log;
	var LN2 = Math.LN2;
	var clz32 = Math.clz32 || function(x) {return 31 - log(x >>> 0) / LN2 | 0};
	var fromCharCode = String.fromCharCode;
	var original_atob = atob;
	function replacer(encoded){
		var codePoint = encoded.charCodeAt(0) << 24;
		var leadingOnes = clz32(~codePoint);
		var endPos = 0, stringLen = encoded.length;
		var result = "";
		if (leadingOnes < 5 && stringLen >= leadingOnes) {
			codePoint = (codePoint<<leadingOnes)>>>(24+leadingOnes);
			for (endPos = 1; endPos < leadingOnes; ++endPos)
				codePoint = (codePoint<<6) | (encoded.charCodeAt(endPos)&0x3f/*0b00111111*/);
			if (codePoint <= 0xFFFF) { // BMP code point
			result += fromCharCode(codePoint);
			} else if (codePoint <= 0x10FFFF) {
			// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
			codePoint -= 0x10000;
			result += fromCharCode(
				(codePoint >> 10) + 0xD800,  // highSurrogate
				(codePoint & 0x3ff) + 0xDC00 // lowSurrogate
			);
			} else endPos = 0; // to fill it in with INVALIDs
		}
		for (; endPos < stringLen; ++endPos) result += "\ufffd"; // replacement character
		return result;
	}
	return function(inputString, keepBOM){
		if (!keepBOM && inputString.substring(0,3) === "\xEF\xBB\xBF")
			inputString = inputString.substring(3); // eradicate UTF-8 BOM
		// 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
		// 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
		return original_atob(inputString).replace(/[\xc0-\xff][\x80-\xbf]*/g, replacer);
	};
})();
