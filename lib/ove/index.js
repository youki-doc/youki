exports.apply = function(scope, runtime){
	require('./fundemental').apply(scope, runtime);
	require('./numeric').apply(scope, runtime);
	require('./string').apply(scope, runtime);
	require('./date').apply(scope, runtime);
}