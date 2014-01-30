var fork = function(o){return Object.create(o)};
var G_DEBUG = false;

function walk(r, s, fMatch, fGap){
	var l = r.lastIndex;
	r.lastIndex = 0;
	fMatch = fMatch || function(){};
	fGap = fGap || function(){};
	var match, last = 0;
	while(match = r.exec(s)){
		if(last < match.index) fGap(s.slice(last, match.index));
		fMatch.apply(this, match);
		last = r.lastIndex;
	};
	if(last < s.length) fGap(s.slice(last));
	r.lastIndex = l;
	return s;
};
var ttype = function(name){
	name = name || ''; 
	return {_type : name, toString: function(){return name}}
};
var LIT = ttype('Lit');
var NOMEN = ttype('Marco');
var LB = ttype('LB');
var RB = ttype('RB');
var FIN = ttype('Finish');
var NL = ttype('Newline');
var LI = ttype('List Item');
var EC = ttype('EC');

var Nulllit = function(){return {type: FIN}};

var composeRex = function(r, o){
	var source = r.source;
	var g = r.global;
	var i = r.ignoreCase;
	var m = r.multiline;
	source = source.replace(/#\w+/g, function(word){
		word = word.slice(1);
		if(o[word] instanceof RegExp) return o[word].source
		else return word
	});
	return new RegExp(source, (g ? 'g' : '') + (i ? 'i' : '') + (m ? 'm' : ''));
};

var MARCO_PATTERN = /(?:\??[\w\-]+|\??[\\'\[\]\(\)~!@#$%^&*\.\/<>;:"\{\}\|\-=_+][\w\-]*|,)/;
var INLINE = composeRex(
	/(\\ )|(\\#MARCO_PATTERN)|\{(=+)\{(.*?)\}\3\}|\{\{(.*?)\}\}|(\{|\})|(`+|\*+|~+)(.*?)\7|(\n(?:\s*\n)?[ \t]*(?:(?:[#+\-]|:#MARCO_PATTERN)[ \t]*)?)/g,
	{MARCO_PATTERN: MARCO_PATTERN} );
var BLOCK_LEVEL = /^(::|\|\|)(.*)\n([\s\S]*)|^([:|])(.*)\n+((?:(?:\t|    ).*\n+)*)/gm;

function lexLine(s){
	var tokens = [];
	var n = 0;
	function push(t){ tokens[n++] = t };
	function concat(list){ tokens = tokens.concat(list); n += list.length}

	walk(INLINE, s,
		function(m, space, marco, _3, txt, txtb, bracket, _7, sourcely, newline){
			if(space) push({type: LIT, text:'', raw: true})
			else if(marco) {
				if(marco != '\,')
				push({type: NOMEN, text: marco.slice(1).trim()})
			} else if(bracket) {
				if(bracket.trim() === '|'){
					push({type: RB})
					push({type: LB})
				} else {
					push({type: bracket.trim() === '{' ? LB : RB})
				}
			} else if(txt || txtb) {
				push({type: LB});
				push({type: LIT, text: txt || txtb, raw: true});
				push({type: RB});
			} else if(_7) {
				var sourcelyChar = _7.charAt(0);
				push({type: NOMEN, text: '.inline_' + sourcelyChar});
				push({type: LB});
				if(sourcelyChar === '`'){
					push({type: LIT, text: sourcely})
				} else {
					concat(lexLine(sourcely));
				};
				push({type: RB});
				push({type: LB});
				push({type: LIT, text: _7.length, raw: true})
				push({type: RB});
				push({type: FIN})
			} else if(newline) {
				if(/[+\-]/.test(m)) {
					push({type: NL, separateParagraph: true})
					push({type: LI, text: m.trim()})
				} else if(/#/.test(m)) {
					push({type: NL, separateParagraph: true})
					push({type: LI, text: m.trim()})
				} else if(/:/.test(m)) {
					push({type: NL, separateParagraph: true})
					push({type: EC, text: m.trim()})
				} else if(/\n\s*\n/.test(m)) {
					push({type: NL, separateParagraph: true})
				} else {
					push({type: NL});
				}
			}
		}, function(s){if(s) push({type: LIT, text: s})});

	return tokens;
};
//	console.log(tokens);
function parse(s){
	var tokens = lexLine(s);
	var i = 0, token = tokens[0];
	var TNULL = { type: null }
	function move(){ 
		i++; 
		token = tokens[i] || TNULL;
	};
	function block(){
		move();
		var b = blockContent();
		if(token.type !== RB) throw 'Parse error!'
		move();
		return b;
	};
	function call(){
		var h = ['.id', token.text];
		var args = [];
		var f;
		move();
		while (token.type === LB){
			args.push(block())
		}
		if(args.length > 0) {
			return [h].concat(args);
		} else {
			return h;
		}
	};
	function line() {
		var buff = ['.cons_line'];
		while(token.type && token.type !== RB && token.type !== NL) {
			if(token.type === LIT){
				buff.push([token.raw? '.raw' : '.lit', token.text]);
				move();
			} else if(token.type === NOMEN) {
				buff.push(call())
			} else if(token.type === LB) {
				buff.push(block())
			} else if(token.type === FIN){
				move()
			};
		};
		if(buff.length === 2) {
			return buff[1]
		} else if(buff.length === 1) {
			return ['.nil']
		} else {
			return buff;
		}
	};

	function paratic() {
		var buf = [];
		buf.push(line());
		while(token.type === NL && !token.separateParagraph) {
			move();
			buf.push(line());
		}
		return buf;
	}
	function list(initializer) {
		var buf = [(initializer === '#' ? '.ol' : '.ul')];
		while(token.type === LI && token.text === initializer) {
			move();
			buf.push(['.li'].concat(paratic()));
			if(token.type === NL && token.separateParagraph) {
				move()
			} else {
				break;
			}
		}
		return buf;
	}
	function paragraph() {
		var buf = ['.p'].concat(paratic());
		if(token.type === NL && token.separateParagraph) {
			move();
		}
		return buf;
	}
	function expandedCall() {
		var fid = token.text.slice(1);
		move();
		var invocation = [['.id', fid]];
		while(token.type === LB){
			invocation.push(block());
		}
		invocation.push(blockContent());
		return invocation
	}
	function blockContent() {
		var buffer = ['.cons_block'];

		while(token.type === NL) { move() };
		while(token.type && token.type !== RB) {
			if(token.type === EC) {
				buffer.push(expandedCall());
			} else if(token.type === LI) {
				buffer.push(list(token.text))
			} else {
				buffer.push(paragraph())
			}
			while(token.type === NL) { move() };
		};
		if(buffer.length === 2){ buffer = buffer[1] }
		if(buffer[0] === '.p' && buffer.length === 2) {
			buffer = buffer[1]
		}
		return buffer;
	}

	return blockContent();
};


exports.lexLine = lexLine;
exports.parse = parse;