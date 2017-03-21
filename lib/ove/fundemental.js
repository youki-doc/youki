/// Youki Fundemental Library
var util = require('util')
exports.apply = function (scope, exports, runtime) {
	var Macro = runtime.Macro;
	var evaluate = runtime.evaluate;
	var Reference = runtime.Reference;
	var setf = runtime.setf;
	var thunk = runtime.thunk;
	exports.define = new Macro(function ($pattern, $definition) {
		if ($pattern) {
			if ($pattern instanceof Array && $pattern[0] instanceof Reference && !/^\./.test($pattern[0].id)) {
				// function definition
				setf(this, $pattern[0].id, scope.lambda.apply($definition.definingScope || this, $pattern.slice(1).concat([$definition])))
			} else if ($pattern instanceof Reference) {
				setf(this, $pattern.id, scope.evaluate($definition))
			} else {
				throw "Invalid pattern"
			}
		} else {
			throw "Invalid pattern"
		}
	});
	exports['define-macro'] = exports.defineMacro = new Macro(function ($pattern, $definition) {
		if (!$pattern || !($pattern instanceof Array) || !($pattern[0] instanceof Reference) || /^\./.test($pattern[0].id))
			throw "Invalid pattern";
		setf(this, $pattern[0].id, scope.macro.apply(this, $pattern.slice(1).concat([$definition])))
	});
	exports['let'] = new Macro(function () {
		var $block = arguments[arguments.length - 1];
		if (!$block || !$block.definingScope) throw "Invalid LET usage.";
		var t = $block.definingScope;
		var s = Object.create(t);
		for (var k = 0; k < arguments.length - 1; k++) {
			exports.define.apply(s, [thunk(s, arguments[k][0]), thunk(t, arguments[k][1])]);
		}
		return evaluate(s, $block);
	});
	exports['letrec'] = new Macro(function () {
		var $block = arguments[arguments.length - 1];
		if (!$block || !$block.definingScope) throw "Invalid LET usage."
		var s = Object.create($block.definingScope);
		for (var k = 0; k < arguments.length - 1; k++) {
			exports.define.apply(s, [thunk(s, arguments[k][0]), thunk(s, arguments[k][1])]);
		}
		return evaluate(s, $block);
	});
	exports.part = function (base, shift) {
		return base[shift]
	}
	exports.setpart = function (base, shift, value) {
		return base[shift] = value
	}
	exports.derive = function (obj) {
		return Object.create(obj)
	}
	exports.emptyObject = function () {
		return {}
	}
	exports.object = new Macro(function () {
		var obj = {};
		for (var j = 0; j < arguments.length; j++) {
			var s = arguments[j].definingScope;
			if (arguments[j] instanceof Array && arguments[j][0] instanceof Reference) {
				obj[arguments[j][0].id] = evaluate(s, arguments[j][1])
			}
		}
		return obj
	});
	exports['merge-parts'] = function (p, q) {
		var keys = Object.keys(q);
		for (var k = 0; k < keys.length; k++) {
			p[keys[k]] = q[keys[k]];
		};
		return p;
	}
	exports.util = {
		trace: function (x) { process.stderr.write(x + '\n'); return x },
		log: function (x) { process.stdout.write(x + ''); return x },
		inspect: function (x, options) { return util.inspect(x, options) }
	}
}