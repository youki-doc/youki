/// Youki Fundemental Library
var util = require('util')
exports.apply = function(scope, runtime){
	var Macro = runtime.Macro;
	var evaluate = runtime.evaluate;
	var Reference = runtime.Reference;
	var setf = runtime.setf;
	scope.define = new Macro(function($pattern, $definition){
		if(!$pattern || !($pattern instanceof Array) || !($pattern[0] instanceof Reference) || /^\./.test($pattern[0].id))
			throw "Invalid pattern";
		setf(this, $pattern[0].id, scope.lambda.apply(this, $pattern.slice(1).concat([$definition])))
	});
	scope['define-macro'] = scope.defineMacro = new Macro(function($pattern, $definition){
		if(!$pattern || !($pattern instanceof Array) || !($pattern[0] instanceof Reference) || /^\./.test($pattern[0].id))
			throw "Invalid pattern";
		setf(this, $pattern[0].id, scope.macro.apply(this, $pattern.slice(1).concat([$definition])))
	});
	scope.part = function(base, shift){
		return base[shift]
	}
	scope.setpart = function(base, shift, value){
		return base[shift] = value
	}
	scope.derive = function(obj){
		return Object.create(obj)
	}
	scope.emptyObject = function(){
		return {}
	}
	scope.object = new Macro(function(){
		var obj = {};
		for(var j = 0; j < arguments.length; j++){
			var s = arguments[j].definingScope;
			if(arguments[j] instanceof Array && arguments[j][0] instanceof Reference) {
				obj[arguments[j][0].id] = evaluate(s, arguments[j][1])
			}
		}
		return obj
	})
	scope.trace = function(x){ return process.stderr.write(x + '\n') }
	scope.util = {
		trace: function(x){ return process.stderr.write(x + '\n') },
		inspect: function(x, options){ return util.inspect(x, options) }
	}
}