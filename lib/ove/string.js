/// Youki String Processing Library
exports.apply = function(scope, exports, runtime){
	exports['regex'] = function(pattern, flags){
		return new RegExp(pattern, flags)
	}
	exports['ssub'] = function(s, pattern, replacement){
		return s.replace(pattern, replacement)
	}
	exports['slice'] = function(a){
		return [].slice.apply(a, [].slice.call(arguments, 1))
	}
	exports['map'] = function(m, f){
		var t = this;
		return m.map(function(){ return f.apply(t, arguments) });
	}
	exports['cons'] = function(h, t){
		return [h].concat(t);
	}
	exports['split'] = function(s, k){
		return s.split(k)
	}
	exports['array-join'] = function(a, d){
		return a.join(d)
	}
}