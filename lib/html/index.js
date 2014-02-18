exports.apply = function(scope, runtime){
	require('./tags').apply(scope, runtime);
	require('./htmlsection.yk').apply(scope, runtime);
}