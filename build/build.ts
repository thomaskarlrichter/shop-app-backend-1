import * as gulp                                                                 from 'gulp';
import { ENVIRONMENTS, getArgument, getEnv, OUTPUT_DIRECTORY, SOURCE_DIRECTORY } from "./settings";

const sourcemaps          = require( 'gulp-sourcemaps' );
const typescript          = require( "gulp-typescript" );
const { compilerOptions } = require( "../tsconfig.json" );

function _build( sourceMap: boolean = false )
{
	const options = { ...compilerOptions };

	if( !sourceMap )
	{
		return gulp.src( SOURCE_DIRECTORY )
				   .pipe( typescript( options ) )
				   .pipe( gulp.dest( OUTPUT_DIRECTORY ) );
	}

	return gulp.src( SOURCE_DIRECTORY )
			   .pipe( sourcemaps.init() )
			   .pipe( typescript( options ) )
			   .pipe( sourcemaps.write( "./" ) )
			   .pipe( gulp.dest( OUTPUT_DIRECTORY ) );
}

export function build()
{
	const watch     = getArgument( "--watch" );
	const sourceMap = getEnv() === ENVIRONMENTS.dev;

	return _build( sourceMap );
}