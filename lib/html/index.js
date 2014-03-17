exports.apply = function(scope, runtime){
	require('./tags').apply(scope, runtime);
	scope['load-library'](require('./htmlsection.yk'));
}