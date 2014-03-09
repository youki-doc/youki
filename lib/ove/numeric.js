/// Youki Numeric Library
exports.apply = function(scope, runtime){
	scope['+'] = function(x, y, z){
		// NOTE: Youki's [+] is always numeric.
		// To concat string, use [&].
		switch(arguments.length){
			case 0: return 0
			case 1: return x - 0
			case 2: return (x - 0) + y
			case 3: return (x - 0) + y + z
			default: {
				var result = x - 0;
				for(var j = 1; j < arguments.length; j++) {
					result += arguments[j] - 0
				}
				return result
			}
		}
	};
	scope['-'] = function(x, y, z){
		switch(arguments.length){
			case 0: return 0
			case 1: return 0 - x
			case 2: return x - y
			case 3: return x - y - z
			default: {
				var result = x;
				for(var j = 1; j < arguments.length; j++) {
					result -= arguments[j]
				}
				return result
			}
		}
	};
	scope['*'] = function(x, y, z){
		switch(arguments.length){
			case 0: return 1
			case 1: return x - 0
			case 2: return x * y
			case 3: return x * y * z
			default: {
				var result = x;
				for(var j = 1; j < arguments.length; j++) {
					result *= arguments[j]
				}
				return result
			}
		}
	};
	scope['/'] = function(x, y, z){
		switch(arguments.length){
			case 0: return 1
			case 1: return 1 / x
			case 2: return x / y
			case 3: return x / y / z
			default: {
				var result = x;
				for(var j = 1; j < arguments.length; j++) {
					result /= arguments[j]
				}
				return result
			}
		}
	};
	scope['quotient'] = function(p, q){
		return (p - p % q) / q
	};
	scope['modulo'] = function(p, q){
		return p % q
	};
	scope['&'] = function(x, y, z){
		// NOTE: Youki's [+] is always numeric.
		// To concat string, use [&].
		switch(arguments.length){
			case 0: return ''
			case 1: return '' + x
			case 2: return '' + x + y
			case 3: return '' + x + y + z
			default: {
				var result = '' + x;
				for(var j = 1; j < arguments.length; j++) {
					result += arguments[j]
				}
				return result
			}
		}
	};
	scope['='] = function(x, y){
		if(arguments.length === 1) return x
		return x == y
	};
	scope['!='] = function(x, y){
		return x != y
	};
	scope['<'] = function(x, y){
		return x < y
	};
	scope['>'] = function(x, y){
		return x > y
	};
	scope['<='] = function(x, y){
		return x <= y
	};
	scope['>='] = function(x, y){
		return x >= y
	};
	scope['not'] = function(x){
		return !x
	};
	scope['negate'] = function(x) {
		return 0 - x
	};
	// NOTE: [and] and [or] are not functions, they are marcos, to impelment shortcut evaluation
	scope['and'] = new runtime.Macro(function(){
		for(var k = 0; k < arguments.length; k++){
			var result = scope.evaluate(arguments[k]);
			if(!result) return result;
		}
		return result;
	});
	scope['or'] = new runtime.Macro(function(){
		for(var k = 0; k < arguments.length; k++){
			var result = scope.evaluate(arguments[k]);
			if(result) return result;
		}
		return false;
	});
}