/* This is the syntax for Youki */
/* Expressions */
{
	var Reference = require('./runtime').Reference;
	var storedVerbatimTerminator;
	var formLine = function(content) {
		if(content.length === 1) return content[0]
		else return [new Reference('.cons_line')].concat(content)		
	}
	var formBlock = function(content) {
		if(content.length === 1) return content[0]
		else return [new Reference('.cons_block')].concat(content)		
	}
}
start = blockcontent

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
	= head:expression expressionspace rear:expressionitems { return [head].concat(rear) }
	/ unique:expression { return [unique] }
invoke
	= "[" expressionspace? inside:expressionitems expressionspace? "]" { return inside }
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
	/ "{" newline* inside:blockcontent newline* "}" { return formBlock(inside) }

blockcontent
	= it:everlasting { return [it] }
	/ head:paragraphic parabreak rear:blockcontent { return [head].concat(rear) }
	/ it:paragraphic { return [it] }

everlasting
	= leader:invoke "::" space? newline rear:blockcontent { return [
		[new Reference('macro'), new Reference('@'), [new Reference('evaluate-in-scope'), new Reference('@/definingScope'), [new Reference('quasiquote'), leader]]],
		formBlock(rear)
	]}

paragraphic
	= list:list { return [new Reference('.ul')].concat(list) }
	/ para:paragraph { return [new Reference('.p')].concat(para) }

paragraph
	= it:everlasting { return [it] }
	/ head:line singlenewline (!newline) rear:paragraph { return [head].concat(rear) }
	/ it:line { return [it]}

list
	= head:listitem newline rear:list { return [head].concat(rear) }
	/ it:listitem { return [it] }

listitem = "-" space? content:line { return [new Reference('.li'), content] }

line = content:lineitem* { return formLine(content) }

lineitem                  = invoke / lineVerbatim / textblock / lineDoubleStar / lineSingleStar / lineEscape / lineText
lineitemWithoutDoubleStar = invoke / lineVerbatim / textblock                  / lineSingleStar / lineEscape / lineText
lineitemWithoutSingleStar = invoke / lineVerbatim / textblock / lineDoubleStar                  / lineEscape / lineText

lineVerbatim = it:verbatim { return [new Reference('.verbatim'), it] }
lineEscape = "\\" it:textidentifier { return it }
lineText = it:textliteral { return [new Reference('.lit'), it] }
lineDoubleStar = "**" inner:lineitemWithoutDoubleStar* "**" { return [new Reference('.inline**'), formLine(inner)] }
lineSingleStar = "*" !"*" inner:lineitemWithoutSingleStar* "*" { return [new Reference('.inline*'), formLine(inner)] }


/* Tokens */
textliteral "Text"
	= head:[^\r\n\[\{\\\}\]*] rear:textliteral { return head + rear }
	/ head:[^\r\n\[\{\\\}\]*] { return head }
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
verbatim "Verbatim Segment"
	= "{" terminator:verbatimEqualSequence ":"
		& { storedVerbatimTerminator = terminator; return true }
		inner:verbatimInner*
		verbatimFinalTernimator
		{
			return inner.join('');
		}
verbatimInner
	= normal:[^:]+ { return normal.join('') }
	/ normal:(":" !"=" !"}") { return normal[0] }
	/ normal:(":" "="+ !"}") { return normal[0] + normal[1].join('') }
	/ !verbatimFinalTernimator text:(":" "="* "}") { return text[0] + text[1].join('') + text[2]}
verbatimFinalTernimator
	= ":" terminator:verbatimEqualSequence "}" & { 
		return terminator === storedVerbatimTerminator
	}
verbatimEqualSequence
	= text:"="* { return text.join('') }
numberliteral "Numeric Literal"
	= '-' positive:numberliteral { return -positive }
	/ ("0x" / "0X") hexdigits:[0-9a-fA-F]+ { return parseInt(hexdigits.join(''), 16) }
	/ integral:[0-9]+ "." fraction:[0-9]+ { return (integral.join('') + '.' + fraction.join('')) - 0 }
	/ digits:[0-9]+ { return digits.join('') - 0 }
identifier "Identifier"
	= name:([a-zA-Z\-_/+*<=>!?:$%_&~^@#] [a-zA-Z0-9\.\-_/+*<=>!?:$%_&~^@#]*) { return new Reference(name[0]+name[1].join('')) }
textidentifier "Embedded Identifier"
	= name:([a-zA-Z_$] [a-zA-Z0-9_]*) { return new Reference(name[0]+name[1].join('')) }
	/ specialname:[*:\[\]\{\}\\] { return [new Reference('.lit'), specialname] }
spacechar "Space Character"
	= [\t\v\f \u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF]
spacecharnewline "Space Character or Newline"
	= [\t\v\f \u00A0\u1680\u180E\u2000\u2001\u2002\u2003\u2004\u2005\u2006\u2007\u2008\u2009\u200A\u202F\u205F\u3000\uFEFF\r\n]
space "Space without Newline"
	= spacechar+
expressionspace
	= spacecharnewline+
parabreak "Paragraph Break"
	= space? "\r"? "\n" space? newline
newline
	= "\r"? "\n" spacecharnewline*
singlenewline
	= "\r"? "\n" spacechar*