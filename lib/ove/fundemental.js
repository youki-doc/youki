/// Yukine Fundemental Library
var Marco = require('../runtime').Marco;
var Reference = require('../runtime').Reference;
var setf = require('../runtime').setf;
exports.apply = function(scope){
	scope.define = new Marco(function($pattern, $definition){
		if(!$pattern || !($pattern instanceof Array) || !($pattern[0] instanceof Reference) || /^\./.test($pattern[0].id))
			throw "Invalid pattern";
		setf(this, $pattern[0].id, scope.lambda.apply(this, $pattern.slice(1).concat([$definition])))
	});
	scope.define.marco = scope.defineMarco = new Marco(function($pattern, $definition){
		if(!$pattern || !($pattern instanceof Array) || !($pattern[0] instanceof Reference) || /^\./.test($pattern[0].id))
			throw "Invalid pattern";
		setf(this, $pattern[0].id, scope.marco.apply(this, $pattern.slice(1).concat([$definition])))
	});
}