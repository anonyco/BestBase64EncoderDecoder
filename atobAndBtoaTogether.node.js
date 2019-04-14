// ==ClosureCompiler==
// @compilation_level ADVANCED_OPTIMIZATIONS
// @js_externs var define;
// @js_externs var exports;
// @language_out ECMASCRIPT_2015
// ==/ClosureCompiler==
(global => {
	"use strict";
	const clz32 = Math.clz32;
	const fromCharCode = String.fromCharCode;
	const fromCodePoint = String.fromCodePoint;
	const originalAtob = atob;
	const originalBtoa = btoa;
	const btoaReplacer = nonAsciiChars => {
		// make the UTF string into a binary UTF-8 encoded string
		let point = nonAsciiChars.codePointAt(0);
		if (point <= 0x007f) {
			return nonAsciiChars;
		} else if (point <= 0x07ff) {
			return fromCharCode((0x6<<5)|(point>>>6), (0x2<<6)|(point&0x3f));
		} else if (point <= 0xffff) {
			return fromCharCode(
				(0xe/*0b1110*/<<4) | (point>>>12),
				(0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
				(0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
			);
		} else {
			return fromCharCode(
				(0x1e/*0b11110*/<<3) | (point>>>18),
				(0x2/*0b10*/<<6) | ((point>>>12)&0x3f/*0b00111111*/),
				(0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
				(0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
			);
		}
	}
	const btoaUTF8 = (inputString, BOMit) => {
		return originalBtoa((BOMit ? "\xEF\xBB\xBF" : "") + inputString.replace(
			/[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g, btoaReplacer
		));// ==ClosureCompiler==
// @compilation_level SIMPLE_OPTIMIZATIONS
// @output_file_name default.js
// ==/ClosureCompiler==
	}
	//////////////////////////////////////////////////////////////////////////////////////
	const atobReplacer = encoded => {
		let codePoint = encoded.charCodeAt(0) << 24;
		let endPos = 0;
		let result = "";
		const leadingOnes = clz32(~codePoint);
		const stringLen = encoded.length|0;
		if (leadingOnes < 5 && stringLen >= leadingOnes) {
			codePoint = (codePoint<<leadingOnes)>>>(24+leadingOnes);
			for (endPos = 1; endPos < leadingOnes; endPos=endPos+1|0)
				codePoint = (codePoint<<6) | (encoded.charCodeAt(endPos)&0x3f/*0b00111111*/);
			result = fromCodePoint(codePoint);
		}
		for (; endPos < stringLen; endPos=endPos+1|0) result += "\ufffd"; // replacement character
		return result;
	}
	const atobUTF8 = (inputString, keepBOM) => {
		inputString = originalAtob(inputString);
		if (!keepBOM && inputString.substring(0,3) === "\xEF\xBB\xBF")
			inputString = inputString.substring(3); // eradicate UTF-8 BOM
		// 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
		// 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
		return inputString.replace(/[\xc0-\xff][\x80-\xbf]*/g, atobReplacer);
	};
	const factory = o => (o["btoaUTF8"] = btoaUTF8, o["atobUTF8"] = atobUTF8, o);
	
	typeof define === typeof factory && define["amd"] ? define(() => factory({})) :
	factory(typeof exports === 'object' ? exports : global);
})(this);
