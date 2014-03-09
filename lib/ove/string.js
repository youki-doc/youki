/// Youki String Processing Library
exports.apply = function(scope, runtime){
	scope['regex'] = function(pattern, flags){
		return new RegExp(pattern, flags)
	}
	scope['ssub'] = function(s, pattern, replacement){
		return s.replace(pattern, replacement)
	}
}