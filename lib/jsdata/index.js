exports.apply = function(scope, exports, runtime){
	exports.json = {
		parse: function(str){
			return JSON.parse(str)
		},
		stringify: function(json){
			return JSON.stringify(json)
		}
	};
	exports.base64 = {
		encode: function(s, encoding){
			return new Buffer(s, encoding || 'utf8').toString('base64')
		},
		decode: function(b, encoding){
			return new Buffer(b, 'base64').toString(encoding || 'utf8')
		}
	}
}