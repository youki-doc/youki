function safeTagsReplace(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

function propesc(s) {
	return safeTagsReplace(s).replace(/"/g, '&quot;')
};

function Tag(type, inner, attributes) {
	this.type = type;
	this.inner = inner || '';
	this.attributes = attributes;
};
Tag.prototype.toString = function(){
	return '<' + this.type + (this.attributes ? ' ' + this.attributes : '') + '>' + ('' + this.inner) + '</' + this.type + '>'
};

function VoidTag(type) {
	Tag.apply(this, arguments);
};
VoidTag.prototype = Object.create(Tag.prototype);
VoidTag.prototype.toString = function(){
	if(!this.inner) {
		return '<' + this.type + (this.attributes ? ' ' + this.attributes : '') + '/>'
	} else {
		return Tag.prototype.toString.apply(this, arguments)
	}
};

function BlockTag(type){
	Tag.apply(this, arguments);
};
BlockTag.prototype = Object.create(Tag.prototype);

function AttributeList(items){
	this.items = items;
};
AttributeList.prototype.toString = function(){ return this.items.join(' ') }

function concatParagraphSegments(tagname, segments){
	var buffer = [];
	var workset = [];
	for(var j = 0; j < segments.length; j++){
		if(segments[j] instanceof BlockTag){
			if(workset.length) {
				if(workset.length === 1) buffer.push(workset[0])
				else buffer.push(this.tags[tagname](workset.join('\n')))
				workset = []
			}
			buffer.push(segments[j])
		} else if(segments[j] !== undefined) {
			workset.push(segments[j])
		}

	}
	if(workset.length) {
		if(workset.length === 1) buffer.push(workset[0])
		else buffer.push(this.tags[tagname](workset.join('\n')))
		workset = []
	};
	return this['.cons_block'].apply(this, buffer);	
};
function removeLeftCommonIndent(text){
	var segments = text.replace(/\r\n/g, '\n').split('\n');
	if(!segments.length) return '';
	var commonIndent = null;
	for(var j = 0; j < segments.length; j++){
		var segment = segments[j]
		if(segments[j].trim() && commonIndent !== ''){
			// Calculate the most-common indent of non-blank lines
			if(commonIndent === null){
				commonIndent = segment.match(/^[ \t]*/)[0];
			} else if(segment.slice(0, commonIndent.length) !== commonIndent) {
				// Calculate the common indentation
				var k = 0; 
				while(k < segment.length && commonIndent.length && commonIndent[k] === segment[k]){ 
					k += 1
				};
				commonIndent = commonIndent.slice(0, k);
			}
		}
	};
	for(var j = 0; j < segments.length; j++){
		if(segments[j].trim()) {
			segments[j] = segments[j].slice(commonIndent.length)
		} else {
			segments[j] = ''
		}
	};
	return segments.join('\n');
}

exports.apply = function(scope, runtime){
	scope.dothtml = {
		dotlit: safeTagsReplace,
		dotcodespan: function(text){
			return scope.tags.code(safeTagsReplace(removeLeftCommonIndent(text)))
		},
		dotverbatim: function(text){
			return safeTagsReplace(removeLeftCommonIndent(text))
		},
		dotp: function(content){
			return concatParagraphSegments.call(this, 'p', arguments)
		},
		dotli: function(lead, rear){
			if(rear){
				return scope.tags.li(lead + rear)
			} else {
				return scope.tags.li(lead)
			}
		},
		dotul: function(content){
			return scope.tags.ul.call(this, scope['.cons_block'].apply(this, arguments))
		},
		dotol: function(content){
			return scope.tags.ol.call(this, scope['.cons_block'].apply(this, arguments))
		},
		dotstrong: function(content){
			return scope.tags.strong(content)
		},
		dotem: function(content){
			return scope.tags.em(content)
		}
	};
	scope.tags = {};
	scope.tag = function(tagname, h, b){
		if(arguments.length < 2 && !(h instanceof AttributeList)){
			b = h, h = undefined
		};
		b = ((b || '') + '');
		h = h || '';
		return new Tag(tagname, b, h);
	};
	scope['define-tag'] = new runtime.Macro(function($name, $properties){
		var tagname = $name.id;
		var properties = this.evaluate($properties);
		var tagtype = properties.type;
		var tagpre = properties.pre;
		var expose = !properties.notexpose;
		var TagClass = (tagtype === 'void' ? VoidTag 
			          : tagtype === 'block' ? BlockTag 
			          : Tag);

		scope.tags[tagname] = function(h, b){
			if(arguments.length < 2 && !(h instanceof AttributeList)){
				b = h, h = undefined
			};
			b = ((b || '') + '');
			h = h || '';
			return new TagClass(tagname, b, h);
		};
		if(expose) {
			if(tagpre){
				scope[tagname] = new runtime.Macro(function($h, $b){
					if(arguments.length < 2){
						$b = $h, $h = ''
					};
					if($b[0] && $b[0].id === '.id' && typeof $b[1] === 'string'){
						$b = safeTagsReplace(removeLeftCommonIndent($b[1].replace(/^\s*\n/, '')))
					};
					return scope.tags[tagname].call(this, this.evaluate($h), this.evaluate($b))
				})
			} else {
				scope[tagname] = scope.tags[tagname];
			}
		}
		return scope.tags[tagname];
	});
	scope['html-attributes'] = scope['attrs'] = new runtime.Macro(function(){
		var buff = [];
		for(var j = 0; j < arguments.length; j++){
			var s = arguments[j].definingScope;
			if(arguments[j] instanceof Array && arguments[j][0] instanceof runtime.Reference) {
				buff.push(arguments[j][0].id + "=\"" + propesc(runtime.evaluate(s, arguments[j][1])) + "\"")
			}
		}
		return new AttributeList(buff)
	});
	scope['with-attributes'] = function(attributes, tag){
		if(tag instanceof Tag && !tag.attributes && attributes instanceof AttributeList) {
			var tag1 = Object.create(tag);
			tag1.attributes = attributes;
			return tag1
		} else if(tag instanceof Tag && tag.attributes instanceof AttributeList && attributes instanceof AttributeList) {
			var tag1 = Object.create(tag);
			tag1.attributes = new AttributeList(tag.attributes.items.concat(attributes.items));
			return tag1
		} else {
			return tag
		}
	};
	scope['with-class'] = function(classname, tag){
		return scope['with-attributes'](new AttributeList(["class=" + classname]), tag)
	};
	require('./tagtypes.yk').apply(scope, runtime);
}