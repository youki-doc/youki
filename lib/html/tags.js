function safe_tags_replace(str) {
	return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
};

function propesc(s) {
	return safe_tags_replace(s).replace(/"/g, '&quot;')
};

function Tag(type, inner, props) {
	this.type = type;
	this.inner = inner || '';
	this.props = ('' + (props || '')).trim();
}
Tag.prototype.toString = function(){
	return '<' + this.type + (this.props ? ' ' + this.props : '') + '>' + ('' + this.inner) + '</' + this.type + '>'
}

function SimpleTag(type) {
	Tag.apply(this, arguments);
}
SimpleTag.prototype = Object.create(Tag.prototype);
SimpleTag.prototype.toString = function(){
	if(!this.inner) {
		return '<' + this.type + (this.props ? ' ' + this.props : '') + '/>'
	} else {
		return Tag.prototype.toString.apply(this, arguments)
	}
}

function BlockTag(type){
	Tag.apply(this, arguments);
}
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
		} else {
			workset.push(segments[j])
		}
		if(workset.length) {
			buffer.push(this.tags[tagname](this['.cons_block'].apply(this, workset)))
			workset = []
		};
		return this['.cons_block'].apply(this, buffer);	
	}
}

exports.apply = function(scope, runtime){
	scope.dothtml = {
		dotlit: safe_tags_replace,
		dotp: function(content){
			return concatParagraphSegments.call(this, 'p', arguments)
		},
		dotli: function(content){
			return concatParagraphSegments.call(this, 'li', arguments)
		}
	};
	scope.tags = {};
	scope.defineTag = new runtime.Marco(function($name, $block){
		var tagname = this.evaluate($name);
		var tagtype = 'normal';
		var tagpre = false;
		var expose = true;
		if($block){
			var s = Object.create($block.definingScope);
			s.type = function(t){ return tagtype = t };
			s.pre = function(p){ return tagpre = p };
			this.evaluateInScope(s, $block);
		};
		var TagClass = (tagtype === 'simple' ? SimpleTag : tagtype === 'block' ? BlockTag : Tag);
		scope.tags[tagname] = function(h, b){
			if(arguments.length < 2){
				b = h, h = ''
			};
			b = ((b || '') + ''), h = ((h || '') + '').trim()
			return new TagClass(tagname, b, h);
		};
		if(expose) scope[tagname] = scope.tags[tagname];
		return scope.tags[tagname];
	});
	require('./tagtypes.yk').apply(scope, runtime);
}