function safeTagsReplace(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

function propesc(s) {
	return safeTagsReplace(s).replace(/"/g, '&quot;')
};

function Tag(type, inner, props) {
	this.type = type;
	this.inner = inner || '';
	this.props = ('' + (props || '')).trim();
};
Tag.prototype.toString = function(){
	return '<' + this.type + (this.props ? ' ' + this.props : '') + '>' + ('' + this.inner) + '</' + this.type + '>'
};

function SimpleTag(type) {
	Tag.apply(this, arguments);
};
SimpleTag.prototype = Object.create(Tag.prototype);
SimpleTag.prototype.toString = function(){
	if(!this.inner) {
		return '<' + this.type + (this.props ? ' ' + this.props : '') + '/>'
	} else {
		return Tag.prototype.toString.apply(this, arguments)
	}
};

function BlockTag(type){
	Tag.apply(this, arguments);
};
BlockTag.prototype = Object.create(Tag.prototype);

function concatParagraphSegments(tagname, segments){
	var buffer = [];
	var workset = [];
	for(var j = 0; j < segments.length; j++){
		if(segments[j] instanceof BlockTag){
			if(workset.length) {
				buffer.push(this.tags.p(this['.cons_block'].apply(this, workset)))
				workset = []
			}
			buffer.push(segments[j])
		} else if(segments[j] !== undefined) {
			workset.push(segments[j])
		}

	}
	if(workset.length) {
		buffer.push(this.tags[tagname](this['.cons_block'].apply(this, workset)))
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
		dotverbatim: function(text){
			return scope.tags.code(safeTagsReplace(removeLeftCommonIndent(text)))
		},
		dotp: function(content){
			return concatParagraphSegments.call(this, 'p', arguments)
		},
		dotli: function(content){
			return concatParagraphSegments.call(this, 'li', arguments)
		},
		dotul: function(content){
			return scope.tags.ul.call(this, scope['.cons_block'].apply(this, arguments))
		},
		dotol: function(content){
			return scope.tags.ol.call(this, scope['.cons_block'].apply(this, arguments))
		}
	};
	scope.tags = {};
	scope['define-tag'] = new runtime.Macro(function($name, $properties){
		var tagname = $name.id;
		var properties = this.evaluate($properties);
		var tagtype = properties.type;
		var tagpre = properties.pre;
		var expose = !properties.notexpose;
		var TagClass = (tagtype === 'simple' ? SimpleTag 
			          : tagtype === 'block' ? BlockTag 
			          : Tag);

		scope.tags[tagname] = function(h, b){
			if(arguments.length < 2){
				b = h, h = ''
			};
			b = ((b || '') + '');
			h = ((h || '') + '').trim();
			return new TagClass(tagname, b, h);
		};
		if(expose) {
			if(tagpre){
				scope[tagname] = new runtime.Macro(function($h, $b){
					if(arguments.length < 2){
						$b = $h, $h = ''
					};
					if($b instanceof String){
						$b = safeTagsReplace(removeLeftCommonIndent($b.trim()))
					};
					return scope.tags[tagname].call(this, this.evaluate($h), this.evaluate($b))
				})
			} else {
				scope[tagname] = scope.tags[tagname];
			}
		}
		return scope.tags[tagname];
	});
	require('./tagtypes.yk').apply(scope, runtime);
}