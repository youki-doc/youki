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
	var th = tree.slice(0);
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
	var value = globalScope.evaluate($value);
	return setf(this, name, value);
})