/* This is the syntax for Youki */
/* Expressions */
{
	var runtime = require('./runtime.js')
	var Reference = runtime.Reference;
	var storedVerbatimTerminator;
	var formLine = function(content) {
		if(content.length === 1) return content[0]
		else return [new Reference('.cons_line')].concat(content)		
	}
	var formBlock = function(content) {
		if(content.length === 1) return content[0]
		else return [new Reference('.cons_block')].concat(content)		
	}
	var nVerbatimTests = 0;
}
start = blockContent

expression
	= invoke
	/ quote
	/ quasiquote
	/ unquote
	/ verbatim
	/ textblock
	/ identifier
	/ literal
expressionitems
	= head:expression rear:(expressionSpace expression)* { 
		var res = [head]
		for(var j = 0; j < rear.length; j++){
			res.push(rear[j][1])
		};
		return res;
	}
invoke
	= begins:invokeBracketLeft spaceCharOrNewline* inside:expressionitems spaceCharOrNewline* ends:invokeBracketRight { 
		var call = inside.slice(0);
		Object.defineProperty(call, 'begins', {
			value: begins,
			enumerable: false
		});
		Object.defineProperty(call, 'ends', {
			value: ends,
			enumerable: false
		});
		return call
	}
invokeBracketLeft = "[" { return {line: line(), column: column()} }
invokeBracketRight = "]" { return {line: line(), column: column()} }
quote
	= "'" it:(invoke/verbatim/textblock/identifier/literal) { return [new Reference('quote'), it] }
quasiquote
	= '`' it:invoke { return [new Reference('quasiquote'), it] }
unquote
	= ',' it:(invoke/verbatim/textblock/identifier/literal) { return [new Reference('unquote'), it] }
literal
	= numberliteral
	/ stringliteral

/* Texts */

textblock
	= "{" inside:line "}" {
		return inside
	}
	/ "{" newline* inside:blockContent newline* "}" { return formBlock(inside) }

blockContent
	= it:everlasting { return [it] }
	/ head:blockSection rear:(parabreak blockSection)* { 
		var res = [head]
		for(var j = 0; j < rear.length; j++){
			res.push(rear[j][1])
		};
		return res;
	}

everlasting = leader:invoke "::" space? newline rear:blockContent { 
	return [
		[new Reference('macro'), new Reference('@'), 
			[new Reference('evaluate-in-scope'), new Reference('@/definingScope'), [new Reference('quasiquote'), leader]]],
			formBlock(rear)]
}

blockSection
	= everlasting
	/ head:blockSectionPart rear:(singleNewline blockSectionPart)* {
		var res = [head];
		for(var j = 0; j < rear.length; j++){
			res.push(rear[j][1])
		};
		return formBlock(res);
	}

blockSectionPart = list / paragraph

paragraph = head:line rear:(singleNewline line)* {
	var res = [new Reference('.p'), head];
	for(var j = 0; j < rear.length; j++){
		res.push(rear[j][1])
	};
	return res;
}

list = head:listitem rear:(singleNewline listitem)* {
	var res = [new Reference('.ul'), head];
	for(var j = 0; j < rear.length; j++){
		res.push(rear[j][1])
	};
	return res;
}

listitem = "-" space? content:line { return [new Reference('.li'), content] }

line = !("-") content:lineitem* { return formLine(content) }

lineitem                  = invoke / lineVerbatim / textblock / lineDoubleStar / lineSingleStar / lineEscape / lineText
lineitemWithoutDoubleStar = invoke / lineVerbatim / textblock                  / lineSingleStar / lineEscape / lineText
lineitemWithoutSingleStar = invoke / lineVerbatim / textblock / lineDoubleStar                  / lineEscape / lineText

lineVerbatim = it:(verbatim / codeSpan) { return [new Reference('.verbatim'), it] }
lineEscape = "\\" special:[\-=`*:\[\]\{\}\\] { return [new Reference('.lit'), special]}
           / "\\" it:textidentifier args:(invoke/verbatim/textblock)* {
           		if(args.length){
           			return [it].concat(args)
           		} else {
           			return it
           		}
           }
lineText "Text" = t:$([^\r\n\[\{\\\}\]*]+) { return [new Reference('.lit'), t] }
lineDoubleStar = "**" inner:lineitemWithoutDoubleStar* "**" { return [new Reference('.inline**'), formLine(inner)] }
lineSingleStar = "*" !"*" inner:lineitemWithoutSingleStar* "*" { return [new Reference('.inline*'), formLine(inner)] }


/* Tokens */
stringliteral "String Literal"
	= "\"" inner:stringcharacter* "\"" { return inner.join('') }
stringcharacter
	= [^"\\\r\n]
	/ "\\u" digits:([a-fA-F0-9] [a-fA-F0-9] [a-fA-F0-9] [a-fA-F0-9]) { 
		return String.fromCharCode(parseInt(digits.join(''), 16))
	}
	/ "\\" which:[^u\r\n] {
		switch(which) {
			case('n'): return "\n"
			case('r'): return "\r"
			case('"'): return "\""
			case('t'): return "\t"
			case('v'): return "\v"
			default: return "\\" + which
		}
	}
	/ "\\" newline "\\" { return '' }

codeSpan "Code Span"
	= "`" val:$([^`]+) "`" { return val }
	/ terminator:$("`" "`"+) & { storedVerbatimTerminator = terminator; return true }
	  inner: $(codeSpanInner*)
	  codeSpanTerminator { return inner }
codeSpanInner
	= [^`]+
	/ !codeSpanTerminator "`"
codeSpanTerminator
	= term:$("`" "`"+) & { term === storedVerbatimTerminator } { return }
verbatim "Verbatim Segment"
	= "{:" val:$(([^:] / ":"+ [^:\}])*) ":}" { return val }
	/ "{" terminator:verbatimEqualSequence ":" & { storedVerbatimTerminator = terminator; return true }
		inner:$(verbatimInner*)
		verbatimTerminator { return inner }
verbatimInner
	= content:$([^:]+) { return content }
	/ !verbatimTerminator content:":" { return content }
verbatimTerminator
	= ":" terminator:verbatimEqualSequence "}" & { 
		return terminator === storedVerbatimTerminator
	} { return }
verbatimEqualSequence
	= equals:$("="+) { return equals }
numberliteral "Numeric Literal"
	= '-' positive:numberliteral { return -positive }
	/ ("0x" / "0X") hexdigits:$([0-9a-fA-F]+) { return parseInt(hexdigits, 16) }
	/ decimal:$([0-9]+ ("." [0-9]+)? ([eE] [+\-]? [0-9]+)?) { return decimal - 0 }
identifier "Identifier"
	= it:$([a-zA-Z\-_/+*<=>!?$%_&~^@#] [a-zA-Z0-9\.\-_/+*<=>!?$%_&~^@#]*) { 
		var ref = new Reference(it);
//		ref.line = line();
//		ref.column = column();
		return ref;
	}
textidentifier "Embedded Identifier"
	= it:$([a-zA-Z_$] [a-zA-Z0-9_]*) { return new Reference(it) }
spacechar "Space Character"
	= [\t\v\f \u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF]
spaceCharOrNewline "Space Character or Newline"
	= [\t\v\f \u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF\r\n]
space "Space without Newline"
	= spacechar+
expressionSpace
	= spaceCharOrNewline+
parabreak "Paragraph Break"
	= space? "\r"? "\n" space? newline
newline
	= "\r"? "\n" spaceCharOrNewline*
singleNewline
	= "\r"? "\n" spacechar* !newline