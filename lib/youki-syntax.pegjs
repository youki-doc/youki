/* This is the lispy experimental syntax for Youki */
{
	var Reference = require('./runtime').Reference	
}
start
	= blockcontent

expression
	= invoke
	/ textblock
	/ identifier
	/ numberliteral
	/ stringliteral

invoke
	= "[" expressionspace? inside:expressionitems expressionspace? "]" { return inside }

expressionitems
	= head:expression expressionspace rear:expressionitems { return [head].concat(rear) }
	/ unique:expression { return [unique] }

textblock
	= "{" newline* inside:blockcontent newline* "}" { 
	if(inside.length === 1) return inside[0]
	else return ['.cons_block'].concat(inside)
}

blockcontent
	= it:everlasting { return [it] }
	/ head:paragraphic parabreak rear:blockcontent { return [head].concat(rear) }
	/ it:paragraphic { return [it] }

everlasting
	= leader:invoke "::" space? newline rear:blockcontent { return leader.concat(rear) }

paragraphic
	= list:list { return ['.ul'].concat(list) }
	/ para:paragraph { return ['.p'].concat(para) }

paragraph
	= head:line singlenewline (!newline) rear:paragraph { return [head].concat(rear) }
	/ it:line { return [it]}

list
	= head:listitem newline rear:list { return [head].concat(rear) }
	/ it:listitem { return [it] }

listitem
	= "-" content:line { return ['.li', content] }

line
	= inside:lineitem* { 
	if(inside.length === 1) return inside[0]
	else return ['.cons_line'].concat(inside)
}

lineitem
	= invoke
	/ textblock
	/ "\\" it:textidentifier { return it }
	/ it:textliteral { return ['.lit', it] }

textliteral "Text"
	= content:[^\\\[\{\}\r\n]+ { return content.join('') }

stringliteral "String Literal"
	= "\"" inner:stringcharacter* "\"" { return inner.join('') }

stringcharacter
	= [^"\\]
	/ "\\" which:. {
	switch(which){
		case('n'): return "\n"
		case('r'): return "\r"
		default: return "\\" + which
	}
}
numberliteral "Numeric Literal"
	= '-' positive:numberliteral { return -positive }
	/ ("0x" / "0X") hexdigits:[0-9a-fA-F]+ { return parseInt(hexdigits.join(''), 16) }
	/ integral:[0-9]+ "." fraction:[0-9]+ { return (integral.join('') + '.' + fraction.join('')) - 0 }
	/ digits:[0-9]+ { return digits.join('') - 0 }
identifier "Identifier"
	= name:([a-zA-Z_$] [a-zA-Z0-9\-_/]*) { return new Reference(name[0]+name[1].join('')) }
textidentifier "Embedded Identifier"
	= name:([a-zA-Z_$] [a-zA-Z0-9_]*) { return new Reference(name[0]+name[1].join('')) }
space "Space without Newline"
	= [ \t]+
expressionspace
	= [ \t\r\n]+
parabreak "Paragraph Break"
	= space? "\r"? "\n" space? newline
newline
	= "\r"? "\n" [ \t\r\n]*
singlenewline
	= "\r"? "\n" [ \t]*