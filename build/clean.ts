import { OUTPUT_DIRECTORY } from "./settings";

const del = require( 'del' );

export function clean()
{
	return del( [
		`${OUTPUT_DIRECTORY}**`,
		`!${OUTPUT_DIRECTORY}`
	] );
}