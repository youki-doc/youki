/// Youki Fundemental Library
var util = require('util')
exports.apply = function(scope, runtime){
	var Macro = runtime.Macro;
	var Reference = runtime.Reference;
	var setf = runtime.setf;
	scope.define = new Macro(function($pattern, $definition){
		if(!$pattern || !($pattern instanceof Array) || !($pattern[0] instanceof Reference) || /^\./.test($pattern[0].id))
			throw "Invalid pattern";
		setf(this, $pattern[0].id, scope.lambda.apply(this, $pattern.slice(1).concat([$definition])))
	});
	scope.define.macro = scope.defineMacro = new Macro(function($pattern, $definition){
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
	scope.object = new Macro(function($parent, $block){
		var obj;
		if(arguments.length < 2) {
			obj = {}
			$block = $parent
		} else {
			obj = Object.create(scope.evaluate($parent));
		};
		var s = Object.create($block.definingScope);
		s.item = function(name, value){
			return obj[name] = value
		}
		scope.evaluateInScope(s, $block);
		return obj
	})
	scope.util = {
		trace: function(x){ return process.stderr.write(x + '\n') },
		inspect: function(x, options){ return util.inspect(x, options) }
	}
}