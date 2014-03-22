exports.apply = function(scope, exports, runtime){
	require('./fundemental').apply(scope, exports, runtime);
	require('./numeric').apply(scope, exports, runtime);
	require('./string').apply(scope, exports, runtime);
	require('./date').apply(scope, exports, runtime);
}