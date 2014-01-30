/// Yukine Runtime Primitives
/// Runtime Types
var Scope = function(){  }
var Marco = function(f) {
	this.apply = f
};
var Reference = function(id) {
	this.id = id;
};
exports.Reference = Reference;
exports.ref = function(id){
	return new Reference(id)
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
		for(var i = 0; base && i < idSegments.length - 1; i++){
			base = base[idSegments[i]]
			if(base === undefined) { return base }
		}
		return base;
	}	
};
var thunk = function(scope, tree){
	var th = (tree instanceof Array ? tree.slice[0] : Object.create(tree));
	th.definingScope = scope;
	return th;
}
var evaluate = function(scope, tree) {
	if(tree instanceof Array) {
		var fn = evaluate(scope, tree[0]);
		var args = []
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
		return getf(scope, tree);
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
globalScope['.setf'] = Marco(function($name, $value){
	if(!($name instanceof Reference)) throw "Unexpected \\setf Pattern " + $name
	var value = globalScope.evaluate($value);
	return setf(this, name, value);
})
globalScope.evaluate = function(thunk){
	return evaluate(thunk.definingScope, thunk)
}
globalScope['lambda'] = Marco(function(){
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
			setf(s, 'arguments', arguments);
			evaluate(s, $body)
		}
	}
});

exports.globalScope = globalScope;
exports.evaluate = evaluate;