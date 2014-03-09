/* This is the syntax for Youki */
/* Expressions */
{
	var Reference = options.Reference;
	var Position = options.Position;
	var storedVerbatimTerminator;
	var formLine = function(content) {
		if(content.length === 1) return content[0]
		else return [new Reference('.cons_line')].concat(content)		
	};
	var formBlock = function(content) {
		if(content.length === 1) return content[0]
		else return [new Reference('.cons_block')].concat(content)		
	};
	var nVerbatimTests = 0;
	var textIndentStack = [];
	var textIndent = "";
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
	= head:expression rear:(EXPRESSION_SPACE? expression)* { 
		var res = [head]
		for(var j = 0; j < rear.length; j++){
			res.push(rear[j][1])
		};
		return res;
	}
invoke
	= begins:POS "["
	  SPACE_CHARACTER_OR_NEWLINE* 
	  inside:expressionitems 
	  SPACE_CHARACTER_OR_NEWLINE* 
	  "]" ends:POS { 
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

quote
	= "'" it:(invoke/verbatim/textblock/identifier) { return [new Reference('quote'), it] }
quasiquote
	= '`' it:(invoke/textblock) { return [new Reference('quasiquote'), it] }
unquote
	= ',' it:(invoke/verbatim/textblock/identifier) { return [new Reference('unquote'), it] }
literal
	= numberliteral
	/ stringliteral

/* Texts */

textblock
	= "{" inside:line "}" {
		return inside
	}
	/ "{"
	  INDENT_CLEAR_ON
	  inner:textBlockInner
	  INDENT_CLEAR_OFF
	  NEWLINE*
	  "}" { return formBlock(inner) }

textBlockInner
	= NEWLINE_INDENT_ADD bc:blockContent &(NEWLINE* "}") INDENT_REMOVE { return bc }
	/ bc:blockContent { return bc }

blockContent
	= head:blockSection rear:(PARAGRAPH_BREAK blockSection)* { 
		var res = [head]
		for(var j = 0; j < rear.length; j++){
			res.push(rear[j][1])
		};
		return res;
	}

blockSection
	= head:blockSectionPart rear:(TEXT_IN_SEGMENT_LINEBREAK blockSectionPart)* {
		var res = [head];
		for(var j = 0; j < rear.length; j++){
			res.push(rear[j][1])
		};
		return formBlock(res);
	}

blockSectionPart 
	= everlasting 
	/ indentedVerbatimOperate 
	/ indentedOperate 
	/ ul 
	/ ol 
	/ paragraph

everlasting = leader:invoke "::" NEWLINE rear:blockContent { 
	return leader.concat([formBlock(rear)])
}
indentedVerbatimOperate = leader:invoke '|' leadingSpaces:$(NEWLINE_INDENT_ADD) rear:indentedVerbatimLines INDENT_REMOVE {
	return leader.concat(leadingSpaces + rear)
}
indentedOperate = leader:invoke ':' NEWLINE_INDENT_ADD rear:blockContent INDENT_REMOVE {
	return leader.concat([formBlock(rear)])
}

indentedVerbatimLines = $([^\r\n]+ (NEWLINE_INDENT_SAME_OR_MORE [^\r\n]+)*)


paragraph = head:line rear:(TEXT_IN_SEGMENT_LINEBREAK line)* {
	var res = [new Reference('.p'), head];
	for(var j = 0; j < rear.length; j++){
		res.push(rear[j][1])
	};
	return res;
}

ul 
	= head:ulli rear:(TEXT_IN_SEGMENT_LINEBREAK ulli)* {
		var res = [new Reference('.ul'), head];
		for(var j = 0; j < rear.length; j++){
			res.push(rear[j][1])
		};
		return res;
	}
	/ head:ulliAlt rear:(TEXT_IN_SEGMENT_LINEBREAK ulliAlt)* {
		var res = [new Reference('.ul'), head];
		for(var j = 0; j < rear.length; j++){
			res.push(rear[j][1])
		};
		return res;
	}

ulli    = "-" SPACES? lead:line NEWLINE_INDENT_ADD rear:(ul / ol) INDENT_REMOVE {
        	return [new Reference('.li'), lead, rear]
        }
        / "-" SPACES? content:line { return [new Reference('.li'), content] }
ulliAlt = "+" SPACES? lead:line NEWLINE_INDENT_ADD rear:(ul / ol) INDENT_REMOVE {
        	return [new Reference('.li'), lead, rear]
        }
        / "+" SPACES? content:line { return [new Reference('.li'), content] }

ol = head:olli rear:(TEXT_IN_SEGMENT_LINEBREAK olli)* {
	var res = [new Reference('.ol'), head];
	for(var j = 0; j < rear.length; j++){
		res.push(rear[j][1])
	};
	return res;
}

olli    = "#" SPACES? lead:line NEWLINE_INDENT_ADD rear:(ul / ol) INDENT_REMOVE {
        	return [new Reference('.li'), lead, rear]
        }
        / "#" SPACES? content:line { return [new Reference('.li'), content] }

line = ![+\-#] !(invoke ("::"/":"/"|") NEWLINE) content:lineitem* { return formLine(content) }

lineitem                  = invoke / lineVerbatim / textblock / lineDoubleStar / lineSingleStar / lineEscape / lineText
lineitemWithoutDoubleStar = invoke / lineVerbatim / textblock                  / lineSingleStar / lineEscape / lineText
lineitemWithoutSingleStar = invoke / lineVerbatim / textblock / lineDoubleStar                  / lineEscape / lineText

lineVerbatim = it:(verbatim / codeSpan) { return [new Reference('.verbatim'), it] }
lineEscape = "\\" special:[+#\-=`*:\[\]\{\}\\] { return [new Reference('.lit'), special]}
           / '\\' normal:[^\r\n] { return [new Reference('.lit'), '\\' + normal] }

lineText "Text" = t:$([^\r\n\[\{\\\}\]*`]+) { return [new Reference('.lit'), t] }
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
	/ "\\" NEWLINE "\\" { return '' }

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
	= begins:POS it:$([a-zA-Z\-_/+*<=>!?$%_&~^@#] [a-zA-Z0-9\.\-_/+*<=>!?$%_&~^@#]*) ends:POS { 
		var ref = new Reference(it);
		Object.defineProperty(ref, 'begins', {
			value: begins,
			enumerable: false
		});
		Object.defineProperty(ref, 'ends', {
			value: ends,
			enumerable: false
		});
		return ref;
	}
textidentifier "Embedded Identifier"
	= it:$([a-zA-Z_$] [a-zA-Z0-9_]*) { return new Reference(it) }
SPACE_CHARACTER "Space Character"
	= [\t\v\f \u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF]
SPACE_CHARACTER_OR_NEWLINE "Space Character or Newline"
	= [\t\v\f \u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF\r\n]
SPACES "Space without Newline"
	= $(SPACE_CHARACTER+)
EXPRESSION_SPACE
	= $(SPACE_CHARACTER_OR_NEWLINE+)
LINE_BREAK = "\r"? "\n"
PARAGRAPH_BREAK "Paragraph Break"
	= LINE_BREAK (SPACES? LINE_BREAK)+ INDENT_SAME
NEWLINE
	= LINE_BREAK SPACE_CHARACTER_OR_NEWLINE*
TEXT_IN_SEGMENT_LINEBREAK "Single Newline"
	= LINE_BREAK INDENT_SAME !(LINE_BREAK)
NEWLINE_INDENT_ADD
	= LINE_BREAK SPACES? NEWLINE_INDENT_ADD
	/ LINE_BREAK INDENT_ADD
NEWLINE_INDENT_SAME
	= LINE_BREAK SPACES? NEWLINE_INDENT_SAME
	/ LINE_BREAK INDENT_SAME
NEWLINE_INDENT_SAME_OR_MORE
	= LINE_BREAK (SPACES? LINE_BREAK)* INDENT_SAME_OR_MORE

POS = { return Position(offset()) }

INDENT_CLEAR_ON  = { textIndentStack.push(textIndent); textIndent = "" }
INDENT_CLEAR_OFF = { textIndent = textIndentStack.pop() }
INDENT_ADD = spaces:SPACES & { return spaces.length > textIndent.length && spaces.slice(0, textIndent.length) === textIndent }
                  { textIndentStack.push(textIndent); textIndent = spaces }
INDENT_REMOVE = { textIndent = textIndentStack.pop() }
INDENT_SAME = spaces:$(SPACES?) & { return spaces === textIndent }
INDENT_SAME_OR_MORE = spaces:$(SPACES?) & { return spaces === textIndent || spaces.slice(0, textIndent.length) === textIndent }