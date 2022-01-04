import { getArgument, getEnv, OUTPUT_DIRECTORY, OUTPUT_ENTRY_FILE } from "./settings";

const nodemon = require( "gulp-nodemon" );

export function start( done: Function )
{
	const watch = getArgument( "--watch" );

	const options = {
		script : `${OUTPUT_DIRECTORY}${OUTPUT_ENTRY_FILE}`,
		ext    : "js html",
		env    : { "NODE_ENV" : getEnv() },
		done   : done,
		watch  : false as boolean | string[]
	}

	if( watch ) options.watch = [ `${OUTPUT_DIRECTORY}` ];

	return nodemon( options );
}