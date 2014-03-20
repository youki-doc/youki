/// Youki Runtime
var util = require('util');
/// Runtime Types
var Scope = function(){  }
Scope.prototype.toString = function(){ return '[scope]' }
var Macro = function(f) {
	this.apply = function(t, a){ 
		return f.apply(t, a) 
	}
};
var Reference = function(id) {
	this.id = id;
};
Reference.prototype.toString = function(){
	return this.id
};

var serializeForm = function(form, level){
	if(level <= 0) return '...';
	if(form instanceof Reference) return form.id;
	if(form instanceof Array) {
		return '[' + form.map(function(item){ return serializeForm(item, level - 1) }).join(' ') + ']'
	}
	return util.inspect(form);
};

var EvaluationError = function(reason, form){
	this.message = reason;
	if(form) {
		if(form.begins && form.ends) {
			var filename = form.begins.module.filename;
			this.message += '\n\nWithin file ' + filename;
			this.message += '\nRelated source ' + form.begins.module.exports.source.slice(form.begins.offset, form.ends.offset);
		}
	}
}
EvaluationError.prototype = Object.create(Error.prototype);

/// Runtime Functions
var setf = function(base, shift, value){
	if(!/\//.test(shift) || shift[0] === '/'){
		return (base[shift] = value)
	} else {
		var idSegments = shift.split('/');
		for(var i = 0; base && i < idSegments.length - 1; i++){
			if(!(idSegments[i] in base)) {
				base = base[idSegments[i]] = {};
			} else {
				base = base[idSegments[i]]
			}
		}
		return (base[idSegments[idSegments.length - 1]] = value);
	}
};
var getf = function(base, shift) {
	if(!/\//.test(shift) || shift[0] === '/'){
		return (base[shift])
	} else {
		var idSegments = shift.split('/');
		for(var i = 0; base && i < idSegments.length; i++){
			base = base[idSegments[i]]
			if(base === undefined) { return base }
		}
		return base;
	}
};
var thunk = function(scope, form){
	if(typeof form === 'string' || typeof form === 'number') return thunk(scope, [new Reference('.id'), form]);
	var th = (form instanceof Array ? form.slice(0) : Object.create(form));
	Object.defineProperty(th, 'definingScope', {
		value: scope,
		writable: false,
		enumerable: false
	});
	return th;
}
var evaluate = function(scope, form) {
	if(form instanceof Array) {
		// An Invoke Node
		if(!form.length) return undefined;
		var fn = evaluate(scope, form[0]);
		var args = [];
		if(fn && fn instanceof Macro) {
			for(var j = 1; j < form.length; j++) {
				args.push(thunk(scope, form[j]))
			};
		} else if(fn && fn instanceof Function) {
			for(var j = 1; j < form.length; j++) {
				args.push(evaluate(scope, form[j]))
			};
		} else {
			throw new EvaluationError("Expression " + serializeForm(form[0], 3) + ' is being invoked but it is not a function.', form);
		}
		return fn.apply(scope, args);
	} else if(form instanceof Reference) {
		// An Reference Node
		return getf(scope, form.id);
	} else {
		return form;
	}
};
/// Global Scope
var globalScope = new Scope;
globalScope['.globalScope'] = globalScope;
globalScope['.id'] = function(name) {
	return getf(this, name);
}
globalScope['setf'] = new Macro(function($base, $name, $value){
	var base;
	if(arguments.length < 3) {
		$value = arguments[1]
		$name = arguments[0]
		base = this;
	} else {
		base = globalScope.evaluate($base);
	}
	if(!($name instanceof Reference)) throw "Unexpected \\setf Pattern " + util.inspect($name)
	var value = globalScope.evaluate($value);
	return setf(base, $name.id, value);
});

globalScope.evaluate = function(thunk){
	return evaluate(thunk.definingScope, thunk)
}
globalScope['evaluate-here'] = function(form){
	return evaluate(this, form)
}
globalScope['evaluate-in-scope'] = function(scope, form){
	return evaluate(scope, form);
}
globalScope['lambda'] = new Macro(function(){
	// A lambda is an anonymous function, which is always
	// statically scoped and call-by-name.
	var defScope = this;
	var $parnames = [];
	var $body = arguments[arguments.length - 1];
	for(var j = 0; j < arguments.length - 1; j++){
		if(arguments[j] instanceof Reference && !/\//.test(arguments[j].id)) {
			$parnames[j] = arguments[j].id
		} else {
			throw "Unexpected Parameter Pattern " + arguments[j]
		}
	};
	return function(){
		var s = Object.create(defScope);
		for(var j = 0; j < arguments.length && j < $parnames.length; j++) {
			setf(s, $parnames[j], arguments[j]);
		};
		setf(s, '##', arguments);
		return evaluate(s, $body);
	}
});
globalScope['macro'] = new Macro(function(){
	// The \macro is defined to create a macro which allows
	// dynamic scoping and call-by-need. It is just a \lambda
	// with \invokeScope appended.
	var defScope = this;
	var $parnames = [];
	var $body = arguments[arguments.length - 1];
	for(var j = 0; j < arguments.length - 1; j++){
		if(arguments[j] instanceof Reference && !/\//.test(arguments[j].id)) {
			$parnames[j] = arguments[j].id
		} else {
			throw "Unexpected Parameter Pattern " + arguments[j]
		}
	};
	return new Macro(function(){
		var s = Object.create(defScope);
		for(var j = 0; j < arguments.length && j < $parnames.length; j++) {
			setf(s, $parnames[j], arguments[j]);
		};
		setf(s, '##', arguments);
		setf(s, 'clientScope', this);
		return evaluate(s, $body);
	})
});
globalScope['closure'] = function(scope, form){
	return thunk(scope, form);
}
var flatBlockInvokes = function($block){
	if($block[0] instanceof Reference && $block[0].id === '.cons_block') {
		return $block.slice(1).map(flatBlockInvokes);
	} else if($block[0] instanceof Reference && $block[0].id === '.p') {
		return $block[1]
	} else {
		return $block
	}
};

globalScope['do'] = new Macro(function($block){
	var SIGNAL_RETURN = {}
	var s = Object.create($block.definingScope);
	var result = void 0;
	setf(s, 'return', function(x){ 
		result = x; 
		throw SIGNAL_RETURN;
	});
	try {
		evaluate(s, $block);
	} catch(ex) {
		if(ex === SIGNAL_RETURN) return result;
		else throw ex;
	}
	return result
});
globalScope['begin'] = function(){
	return arguments[arguments.length - 1]
};
globalScope['list'] = function(){
	return [].slice.call(0, arguments)
};
globalScope['quote'] = new Macro(function($block){ return $block });
var expandQuasiQuote = function(scope, form){
	if(form instanceof Array) {
		if(form[0] && form[0] instanceof Reference && form[0].id === 'unquote') {
			return evaluate(scope, form[1])
		} else {
			var result = []
			for(var j = 0; j < form.length; j++) {
				if(form[j] instanceof Array && form[j][0] instanceof Reference && form[j][0].id === 'unquote-splicing') {
					result = result.concat(evaluate(scope, form[j][1]))
				} else {
					result[j] = expandQuasiQuote(scope, form[j])
				}
			}
			return result
		}
	} else {
		return form;
	}
}
globalScope['quasiquote'] = new Macro(function($block){ 
	return expandQuasiQuote($block.definingScope, $block) 
});
globalScope['unquote'] = function(){ throw new Error('Unquote cannot occur directly.') }
globalScope['unquote-splicing'] = function(){ throw new Error('Unquote cannot occur directly.') }
globalScope['.nil'] = void 0;
globalScope['.lit'] = globalScope['.verbatim'] = globalScope['.codespan'] = function(s){ return '' + s }
globalScope['.id'] = function(s){ return s }
globalScope['.p'] = globalScope['.li'] = globalScope['.cons_line'] = globalScope['.cons_block'] = globalScope['.ol'] = globalScope['.ul'] = function(){
	var buff = '';
	var ntf = 0;
	var ctf;
	for(var i = 0; i < arguments.length; i++) {
		var tf = arguments[i];
		if(tf != undefined && tf !== '') {
			buff += tf;
			ntf += 1;
			ctf = tf;
		}
	}
	if(ntf === 1){
		return ctf
	} else {
		return buff;
	}
}

globalScope.invoke = function(f, args){
	return f.apply(this, [].slice.call(arguments, 1))
}
globalScope.apply = function(f, args){
	return f.apply(this, args)
}
globalScope['true'] = true;
globalScope['false'] = false;
globalScope['null'] = null;
globalScope['undefined'] = undefined;
globalScope['nothing'] = undefined;
globalScope['if'] = new Macro(function($condition, $consequent, $alternate){
	if(globalScope.evaluate($condition)) {
		return globalScope.evaluate($consequent)
	} else if($alternate) {
		return globalScope.evaluate($alternate)
	}
});
globalScope['while'] = new Macro(function($condition, $body){
	var r = undefined;
	while(globalScope.evaluate($condition)) {
		r = globalScope.evaluate($body)
	};
	return r;
});
globalScope['foreach-property'] = new Macro(function($name, $object, $body){
	var r = undefined;
	var obj = globalScope.evaluate($object);
	var s = Object.create($body.definingScope);
	for(var prop in obj) {
		setf(s, $name.id, prop);
		r = evaluate(s, $body)
	};
	return r;
});
globalScope['do-while'] = new Macro(function($condition, $body){
	var r = globalScope.evaluate($body);
	while(globalScope.evaluate($condition)) {
		r = globalScope.evaluate($body)
	};
	return r;
});
globalScope['cond'] = new Macro(function(){
	for(var j = 0; j < arguments.length; j++){
		var clause = arguments[j]
		if(!clause || !(clause instanceof Array) || !clause.definingScope) throw "Wrong cond pattern";
		if(evaluate(clause.definingScope, clause[0])) {
			return evaluate(clause.definingScope, [new Reference("begin")].concat(clause.slice(1)))
		}
	}
});
globalScope['comment'] = new Macro(function(){ });
globalScope['throw'] = function(ex) {
	throw ex;
}
globalScope['debugger'] = function(){
	debugger;
}

exports.Macro = Macro;
exports.Reference = Reference;
exports.getf = getf;
exports.setf = setf;
exports.globalScope = globalScope;
exports.evaluate = evaluate;
exports.thunk = thunk;
exports.ref = function(id){
	return new Reference(id)
};