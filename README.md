# BestBase64EncoderDecoder

(from [https://stackoverflow.com/posts/53433503/edit])

I would assume that one might want it base64 encoded in a more standard way than some of the solutions listed above. This "standard" way is naturally interpretable by the browser such that you can use the base64 in a data URI. Please visit this data URI here to see a demonstration: `data:text/plain;base64,4pi44pi54pi64pi74pi84pi+4pi/` (copy the data uri, open a new tab, paste the data URI into the address bar, then press enter to go to the page). As you can see, despite the fact that it is a base64-encoded URL, the browser is still able to recognize the high code points and decode them properly. Thus, this demonstration proves that this is the best way to go because it is the most W3C standard. Below is the code used to generate it.

    var fromCharCode = String.fromCharCode;
    var btoaUTF8 = (function(btoa, replacer){"use strict";
        return function(inputString, BOMit){
        	return btoa((BOMit ? "\xEF\xBB\xBF" : "") + inputString.replace(
        		/[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g, replacer
    		));
    	}
    })(btoa, function(nonAsciiChars){"use strict";
        // make the UTF string into a binary UTF-8 encoded string
    	var point = nonAsciiChars.charCodeAt(0);
    	if (point >= 0xD800 && point <= 0xDBFF) {
    		var nextcode = nonAsciiChars.charCodeAt(1);
    		if (nextcode !== nextcode) // NaN because string is 1 code point long
    			return fromCharCode(0xef/*11101111*/, 0xbf/*10111111*/, 0xbd/*10111101*/);
    		// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
    		if (nextcode >= 0xDC00 && nextcode <= 0xDFFF) {
    			point = (point - 0xD800) * 0x400 + nextcode - 0xDC00 + 0x10000;
    			if (point > 0xffff)
    				return fromCharCode(
    					(0x1e/*0b11110*/<<3) | (point>>>18),
    					(0x2/*0b10*/<<6) | ((point>>>12)&0x3f/*0b00111111*/),
    					(0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
    					(0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
    				);
    		} else return fromCharCode(0xef, 0xbf, 0xbd);
    	}
    	if (point <= 0x007f) return inputString;
    	else if (point <= 0x07ff) {
            return fromCharCode((0x6<<5)|(point>>>6), (0x2<<6)|(point&0x3f));
    	} else return fromCharCode(
    		(0xe/*0b1110*/<<4) | (point>>>12),
    		(0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
    		(0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
    	);
    });

Then, to decode the base64 data, either HTTP get the data as a data URI or use the function below.

    var clz32 = Math.clz32 || (function(log, LN2){"use strict";
        return function(x) {return 31 - log(x >>> 0) / LN2 | 0};
    })(Math.log, Math.LN2);
    var fromCharCode = String.fromCharCode;
    var atobUTF8 = (function(atob, replacer){"use strict";
        return function(inputString, keepBOM){
            if (!keepBOM && inputString.substring(0,3) === "\xEF\xBB\xBF")
                inputString = inputString.substring(3); // eradicate UTF-8 BOM
            // 0xc0 => 0b11000000; 0xff => 0b11111111; 0xc0-0xff => 0b11xxxxxx
            // 0x80 => 0b10000000; 0xbf => 0b10111111; 0x80-0xbf => 0b10xxxxxx
        	return atob(inputString).replace(/[\xc0-\xff][\x80-\xbf]*/g, replacer);
    	}
    })(atob, function(encoded){"use strict";
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
    });

The advantage of being more standard is that this encoder and this decoder are more widely applicable because they can be used as a valid URL that displays correctly. Observe.

<!-- begin snippet: js hide: false console: true babel: false -->

<!-- language: lang-js -->

    (function(window){
        "use strict";
        var sourceEle = document.getElementById("source");
        var urlBarEle = document.getElementById("urlBar");
        var mainFrameEle = document.getElementById("mainframe");
        var gotoButton = document.getElementById("gotoButton");
        var parseInt = window.parseInt;
        var fromCodePoint = String.fromCodePoint;
        var parse = JSON.parse;
        
        function unescape(str){
            return str.replace(/\\u[\da-f]{0,4}|\\x[\da-f]{0,2}|\\u{[^}]*}|\\[bfnrtv"'\\]|\\0[0-7]{1,3}|\\\d{1,3}/g, function(match){
              try{
                if (match.startsWith("\\u{"))
                  return fromCodePoint(parseInt(match.slice(2,-1),16));
                if (match.startsWith("\\u") || match.startsWith("\\x"))
                  return fromCodePoint(parseInt(match.substring(2),16));
                if (match.startsWith("\\0") && match.length > 2)
                  return fromCodePoint(parseInt(match.substring(2),8));
                if (/^\\\d/.test(match)) return fromCodePoint(+match.slice(1));
              }catch(e){return "\ufffd".repeat(match.length)}
              return parse('"' + match + '"');
            });
        }
        
        function whenChange(){
          try{ urlBarEle.value = "data:text/plain;base64," + btoaUTF8(unescape(sourceEle.value), true);
          } finally{ gotoURL(); }
        }
        sourceEle.addEventListener("change",whenChange,{passive:1});
        sourceEle.addEventListener("input",whenChange,{passive:1});
        
        // IFrame Setup:
        function gotoURL(){mainFrameEle.src = urlBarEle.value}
        gotoButton.addEventListener("click", gotoURL, {passive: 1});
        function urlChanged(){urlBarEle.value = mainFrameEle.src}
        mainFrameEle.addEventListener("load", urlChanged, {passive: 1});
        urlBarEle.addEventListener("keypress", function(evt){
          if (evt.key === "enter") evt.preventDefault(), urlChanged();
        }, {passive: 1});
        
            
        var fromCharCode = String.fromCharCode;
        var btoaUTF8 = (function(btoa, replacer){
    		    "use strict";
            return function(inputString, BOMit){
            	return btoa((BOMit?"\xEF\xBB\xBF":"") + inputString.replace(
            		/[\x80-\uD7ff\uDC00-\uFFFF]|[\uD800-\uDBFF][\uDC00-\uDFFF]?/g, replacer
        		));
        	}
        })(btoa, function(nonAsciiChars){
    		"use strict";
        	// make the UTF string into a binary UTF-8 encoded string
        	var point = nonAsciiChars.charCodeAt(0);
        	if (point >= 0xD800 && point <= 0xDBFF) {
        		var nextcode = nonAsciiChars.charCodeAt(1);
        		if (nextcode !== nextcode) { // NaN because string is 1code point long
        			return fromCharCode(0xef/*11101111*/, 0xbf/*10111111*/, 0xbd/*10111101*/);
        		}
        		// https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
        		if (nextcode >= 0xDC00 && nextcode <= 0xDFFF) {
        			point = (point - 0xD800) * 0x400 + nextcode - 0xDC00 + 0x10000;
        			if (point > 0xffff) {
        				return fromCharCode(
        					(0x1e/*0b11110*/<<3) | (point>>>18),
        					(0x2/*0b10*/<<6) | ((point>>>12)&0x3f/*0b00111111*/),
        					(0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
        					(0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
        				);
        			}
        		} else {
        			return fromCharCode(0xef, 0xbf, 0xbd);
        		}
        	}
        	if (point <= 0x007f) { return inputString; }
        	else if (point <= 0x07ff) {
        		return fromCharCode((0x6<<5)|(point>>>6), (0x2<<6)|(point&0x3f/*00111111*/));
        	} else {
        		return fromCharCode(
        			(0xe/*0b1110*/<<4) | (point>>>12),
        			(0x2/*0b10*/<<6) | ((point>>>6)&0x3f/*0b00111111*/),
        			(0x2/*0b10*/<<6) | (point&0x3f/*0b00111111*/)
        		);
        	}
        });
        setTimeout(whenChange, 0);
    })(window);

<!-- language: lang-css -->

    img:active{opacity:0.8}

<!-- language: lang-html -->

    <center>
    <textarea id="source" style="width:66.7vw">Hello \u1234 W\186\0256ld!
    Enter text into the top box. Then the URL will update automatically.
    </textarea><br />
    <div style="width:66.7vw;display:inline-block;height:calc(25vw + 1em + 6px);border:2px solid;text-align:left;line-height:1em">
    <input id="urlBar" style="width:calc(100% - 1em - 13px)" /><img id="gotoButton" src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABsAAAAeCAMAAADqx5XUAAAAclBMVEX///9NczZ8e32ko6fDxsU/fBoSQgdFtwA5pAHVxt+7vLzq5ex23y4SXABLiiTm0+/c2N6DhoQ6WSxSyweVlZVvdG/Uz9aF5kYlbwElkwAggACxs7Jl3hX07/cQbQCar5SU9lRntEWGum+C9zIDHwCGnH5IvZAOAAABmUlEQVQoz7WS25acIBBFkRLkIgKKtOCttbv//xdDmTGZzHv2S63ltuBQQP4rdRiRUP8UK4wh6nVddQwj/NtDQTvac8577zTQb72zj65/876qqt7wykU6/1U6vFEgjE1mt/5LRqrpu7oVsn0sjZejMfxR3W/yLikqAFcUx93YxLmZGOtElmEu6Ufd9xV3ZDTGcEvGLbMk0mHHlUSvS5svCwS+hVL8loQQyfpI1Ay8RF/xlNxcsTchGjGDIuBG3Ik7TMyNxn8m0TSnBAK6Z8UZfp3IbAonmJvmsEACum6aNv7B0CnvpezDcNhw9XWsuAr7qnRg6dABmeM4dTgn/DZdXWs3LMspZ1KDMt1kcPJ6S1icWNp2qaEmjq6myx7jbQK3VKItLJaW5FR+cuYlRhYNKzGa9vF4vM5roLW3OSVjkmiGJrPhUq301/16pVKZRGFYWjTP50spTxBN5Z4EKnSonruk+n4tUokv1aJSEl/MLZU90S3L6/U6o0J142iQVp3HcZxKSo8LfkNRCtJaKYFSRX7iaoAAUDty8wvWYR6HJEepdwAAAABJRU5ErkJggg==" style="width:calc(1em + 4px);line-height:1em;vertical-align:-40%;cursor:pointer" />
    <iframe id="mainframe" style="width:66.7vw;height:25vw" frameBorder="0"></iframe>
    </div>
    </center>

<!-- end snippet -->

In addition to being very standardized, the above code snippets are also very fast. Instead of an indirect chain of succession where the data has to be converted several times between various forms (such as in Riccardo Galli's response), the above code snippet is as direct as performantly possible. It uses only one simple fast `String.prototype.replace` call to process the data when encoding, and only one to decode the data when decoding. Another plus is that (especially for big strings), `String.prototype.replace` allows the browser to automatically handle the underlying memory management of resizing the string, leading a significant performance boost especially in evergreen browsers like Chrome and Firefox that heavily optimize `String.prototype.replace`. Finally, the icing on the cake is that for you latin script exclūsīvō users, strings which don't contain any code points above 0x7f are extra fast to process because the string remains unmodified by the replacement algorithm.
