import chalk from "chalk";

interface ArgumentsTypeMap
{
	"--dev": boolean;
	"--watch": boolean;

	[ key: string ]: any;
}

type ArgumentsMap = {
	[key in keyof ArgumentsTypeMap]: ( argument: keyof ArgumentsMap ) => any;
};

const ARGUMENTS_MAP: ArgumentsMap = {
	"--dev"   : ( argument: string ) => process.argv.indexOf( argument ) !== -1,
	"--watch" : ( argument: string ) => process.argv.indexOf( argument ) !== -1
};

export const SOURCE_DIRECTORY       = "./src/**/*.ts";
export const OUTPUT_DIRECTORY       = "./dist/";
export const OUTPUT_ENTRY_FILE_NAME = "app.js";

export const ENVIRONMENTS = {
	dev  : "dev",
	prod : "production"
}

export const COLORS = {
	browserSync : chalk.hex( "#EB7633" ),
	client      : chalk.yellow,
	watcher     : chalk.green,
	time        : chalk.gray,
}

export function getArgument<KEY extends keyof ArgumentsTypeMap>( argument: KEY ): ArgumentsTypeMap[KEY] | false
{
	if( !( argument in ARGUMENTS_MAP ) ) throw new Error( `Argument '${argument}' is not defined in ${__dirname + __filename}.` );

	return ARGUMENTS_MAP[ argument ]( argument );
}

export function getEnv(): string
{
	return getArgument( "--dev" ) ? ENVIRONMENTS.dev : ENVIRONMENTS.prod;
}

export function getTimeStamp(): string
{
	const time = new Date().toLocaleTimeString();

	return `[${COLORS.time( time )}]`;
}