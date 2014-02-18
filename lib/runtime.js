/// Youki Runtime
var util = require('util');
/// Runtime Types
var Scope = function(){  }
Scope.prototype.toString = function(){ return '[scope]' }
var Marco = function(f) {
	this.apply = function(t, a){ 
		return f.apply(t, a) 
	}
};
var Reference = function(id) {
	this.id = id;
};

/// Runtime Functions
var setf = function(base, shift, value){
	if(!/-/.test(shift)){
		return (base[shift] = value)
	} else {
		var idSegments = shift.split('-');
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
	if(!/-/.test(shift)){
		return (base[shift])
	} else {
		var idSegments = shift.split('-');
		for(var i = 0; base && i < idSegments.length; i++){
			base = base[idSegments[i]]
			if(base === undefined) { return base }
		}
		return base;
	}
};
var thunk = function(scope, tree){
	var th = (tree instanceof Array ? tree.slice(0) : Object.create(tree));
	th.definingScope = scope;
	return th;
}
var evaluate = function(scope, tree) {
	if(tree instanceof Array) {
		// An Invoke Node
		var fn = evaluate(scope, tree[0]);
		var args = [];
		if(!fn) {
			throw "Unable find function " + util.inspect(tree[0]) + " in node " + util.inspect(tree);
		}
		if(fn instanceof Marco) {
			for(var j = 1; j < tree.length; j++) {
				args.push(thunk(scope, tree[j]))
			};
		} else {
			for(var j = 1; j < tree.length; j++) {
				args.push(evaluate(scope, tree[j]))
			};
		}
		return fn.apply(scope, args);
	} else if(tree instanceof Reference) {
		// An Reference Node
		return getf(scope, tree.id);
	} else {
		return tree;
	}
};
/// Global Scope
var globalScope = new Scope;
globalScope['.globalScope'] = globalScope;
globalScope['.id'] = function(name) {
	return getf(this, name);
}
globalScope['setf'] = new Marco(function($name, $value){
	if(!($name instanceof Reference)) throw "Unexpected \\setf Pattern " + util.inspect($name)
	var value = globalScope.evaluate($value);
	return setf(this, $name.id, value);
});

globalScope.evaluate = function(thunk){
	return evaluate(thunk.definingScope, thunk)
}
globalScope.evaluateInScope = function(scope, tree){
	return evaluate(scope, tree);
}
globalScope['lambda'] = new Marco(function(){
	// A lambda is an anonymous function, which is always
	// statically scoped and call-by-name.
	var defScope = this;
	var $parnames = [];
	var $body = arguments[arguments.length - 1];
	for(var j = 0; j < arguments.length - 1; j++){
		if(arguments[j] instanceof Reference && !/-/.test(arguments[j].id)) {
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
		setf(s, 'arguments', arguments);
		return evaluate(s, $body);
	}
});
globalScope['marco'] = new Marco(function(){
	// The \marco is defined to create a marco which allows
	// dynamic scoping and call-by-need. It is just a \lambda
	// with \invokeScope appended.
	var defScope = this;
	var $parnames = [];
	var $body = arguments[arguments.length - 1];
	for(var j = 0; j < arguments.length - 1; j++){
		if(arguments[j] instanceof Reference && !/-/.test(arguments[j].id)) {
			$parnames[j] = arguments[j].id
		} else {
			throw "Unexpected Parameter Pattern " + arguments[j]
		}
	};
	return new Marco(function(){
		var s = Object.create(defScope);
		for(var j = 0; j < arguments.length && j < $parnames.length; j++) {
			setf(s, $parnames[j], arguments[j]);
		};
		setf(s, 'arguments', arguments);
		setf(s, 'clientScope', this);
		return evaluate(s, $body);
	})
});
var flatBlockInvokes = function($block){
	if($block[0] instanceof Reference && $block[0].id === '.cons_block') {
		return $block.slice(1).map(flatBlockInvokes);
	} else if($block[0] instanceof Reference && $block[0].id === '.p') {
		return $block[1]
	} else {
		return $block
	}
};
globalScope['$seq'] = new Marco(function($parts){
	var result = void 0;
	for(var j = 0; j < arguments.length; j++){
		result = evaluate(this, $parts[j])
	}
	return result
});
globalScope['$flatblock'] = function($block){ return thunk($block.definingScope, flatBlockInvokes($block)) }
globalScope['do'] = new Marco(function($block){
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

globalScope['.nil'] = void 0
globalScope['.lit'] = globalScope['.verbatim'] = function(s){ return '' + s }
globalScope['.p'] = globalScope['.li'] = function(){
	return globalScope['.cons_line'].apply(this, arguments) + '\n';
}

globalScope['.cons_line'] = globalScope['.cons_block'] = globalScope['.ol'] = globalScope['.ul'] = function(){
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
globalScope['true'] = true;
globalScope['false'] = false;

exports.Marco = Marco;
exports.Reference = Reference;
exports.getf = getf;
exports.setf = setf;
exports.globalScope = globalScope;
exports.evaluate = evaluate;
exports.ref = function(id){
	return new Reference(id)
};