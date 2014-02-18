/// Youki Parser
var fork = function(o){return Object.create(o)};
var G_DEBUG = false;
var ref = require('./runtime').ref;
var Reference = require('./runtime').Reference;

function walk(r, s, fMatch, fGap){
	var l = r.lastIndex;
	r.lastIndex = 0;
	fMatch = fMatch || function(){};
	fGap = fGap || function(){};
	var match, last = 0;
	while(match = r.exec(s)){
		if(last < match.index) fGap(s.slice(last, match.index), last);
		fMatch.apply(this, match);
		last = r.lastIndex;
	};
	if(last < s.length) fGap(s.slice(last), last);
	r.lastIndex = l;
	return s;
};
var ttype = function(name){
	name = name || ''; 
	return {_type : name, toString: function(){return name}}
};
var LIT = ttype('Literal');
var VER = ttype('Verbatim');
var NOMEN = ttype('Macro');
var LB = ttype('Left Bracket');
var RB = ttype('Right Bracket');
var FIN = ttype('Finish');
var NL = ttype('Newline');
var LI = ttype('List Item');
var EC = ttype('EC');
var QM = ttype('Quickmark');

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

var MARCO_PATTERN = /(?:\??[\w\-]+|['\[\]\(\)~!@#$%^&*\.\/<>;:"\{\}\|\-=_+][\w\-]*|,)/;
var INLINE = composeRex(
	/(\[:[\s\S]*?:\])|\[([\w\-]+):([\s\S]*?):\2\]|(\\#MARCO_PATTERN)|([\[\]]|\*+|~+)|(\r?\n(?:\s*\r?\n)?[ \t]*(?:(?:[#+\-]|:#MARCO_PATTERN)[ \t]*)?)/g,
	{MARCO_PATTERN: MARCO_PATTERN} );

function lexLine(s){
	var tokens = [];
	var n = 0;
	function push(t, position){ 
		t.position = position;
		tokens[n++] = t
	};
	function concat(list){ tokens = tokens.concat(list); n += list.length}

	walk(INLINE, s,
		function(m, verbatim1, _2, verbatim2, macro, symbol, newline, j){
			if(macro) {
				if(macro != '\,')
				push({type: NOMEN, text: macro.slice(1).trim()}, j)
			} else if(symbol === '[') {
				push({type: LB}, j)
			} else if(symbol === ']') {
				push({type: RB}, j)
			} else if(symbol) {
				push({type: QM, text: symbol}, j)
			} else if(verbatim1) {
				push({type: VER, text: verbatim1.slice(2, -2)}, j)
			} else if(_2) {
				push({type: VER, text: verbatim2}, j)
			} else if(newline) {
				if(/:/.test(m)) {
					push({type: NL, separateParagraph: true}, j)
					push({type: EC, text: m.trim()}, j)
				} else if(/[+\-]/.test(m)) {
					push({type: NL, separateParagraph: true}, j)
					push({type: LI, text: m.trim()}, j)
				} else if(/#/.test(m)) {
					push({type: NL, separateParagraph: true}, j)
					push({type: LI, text: m.trim()}, j)
				} else if(/\n\s*\n/.test(m)) {
					push({type: NL, separateParagraph: true}, j)
				} else {
					push({type: NL}, j);
				}
			}
		}, function(s, j){if(s) push({type: LIT, text: s}, j)});

	return tokens;
};
//	console.log(tokens);
function parse(s){
	var tokens = lexLine(s);
	var i = 0, token = tokens[0];
	var NULL_TOKEN = { type: null };
	function move(){ 
		i++; 
		token = tokens[i] || NULL_TOKEN;
	};
	function block(){
		move();
		if(token.type === RB) {
			// Empty block
			move();
			return;
		}
		var b = blockContent();
		if(token.type !== RB) throw 'Parse error!'
		move();
		return b;
	};
	function call(){
		var h = ref(token.text);
		var args = [];
		var f;
		move();
		while(token.type === LB || token.type === VER) {
			if(token.type === LB) {
				args.push(block())
			} else {
				args.push(token.text);
				move();
			}
		}
		if(args.length > 0) {
			args = args.filter(function(x){ return !!x })
			return [h].concat(args);
		} else {
			return h;
		}
	};
	function quickmark() {
		var qmt = token.text;
		move();
		var b = line(qmt);
		move();
		return [ref('.inline_qm'), b, qmt];
	}
	function line(qm_text) {
		var buff = [ref('.cons_line')];
		while(token && token.type && token.type !== RB && token.type !== NL && (!qm_text || token.type !== QM && token.text !== qm_text)) {
			if(token.type === LIT){
				buff.push([ref('.lit'), token.text]);
				move();
			} else if(token.type === VER) {
				buff.push([ref('.verbatim'), token.text]);
				move();
			} else if(token.type === NOMEN) {
				buff.push(call())
			} else if(token.type === LB) {
				buff.push(block())
			} else if(token.type === QM) {
				buff.push(quickmark())
			} else if(token.type === FIN){
				move()
			};
		};
		if(buff.length === 2) {
			return buff[1]
		} else if(buff.length === 1) {
			return ref('.nil')
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
		var buf = [ref(initializer === '#' ? '.ol' : '.ul')];
		while(token.type === LI && token.text === initializer) {
			move();
			buf.push([ref('.li')].concat(paratic()));
			if(token.type === NL && token.separateParagraph) {
				move()
			} else {
				break;
			}
		}
		return buf;
	}
	function paragraph() {
		var buf = [ref('.p')].concat(paratic());
		if(token.type === NL && token.separateParagraph) {
			move();
		}
		return buf;
	}
	function expandedCall() {
		var fid = token.text.slice(1);
		move();
		var invocation = [ref(fid)];
		while(token.type === LB){
			invocation.push(block());
		}
		invocation.push(blockContent());
		return invocation
	}
	function blockContent() {
		var buffer = [ref('.cons_block')];

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
		if(buffer[0] instanceof Reference && buffer[0].id === '.p' && buffer.length === 2) {
			buffer = buffer[1]
		}
		return buffer;
	}

	return blockContent();
};


exports.lexLine = lexLine;
exports.parse = parse;