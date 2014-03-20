/// Youki String Processing Library
exports.apply = function(scope, runtime){
	scope['regex'] = function(pattern, flags){
		return new RegExp(pattern, flags)
	}
	scope['ssub'] = function(s, pattern, replacement){
		return s.replace(pattern, replacement)
	}
	scope['slice'] = function(a){
		return [].slice.apply(a, [].slice.call(arguments, 1))
	}
	scope['map'] = function(m, f){
		var t = this;
		return m.map(function(){ return f.apply(t, arguments) });
	}
	scope['cons'] = function(h, t){
		return [h].concat(t);
	}
	scope['split'] = function(s, k){
		return s.split(k)
	}
	scope['array-join'] = function(a, d){
		return a.join(d)
	}
}