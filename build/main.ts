import * as gulp       from "gulp";
import { build }       from "./build";
import { clean }       from "./clean";
import { getArgument } from "./settings";
import { start }       from "./start";

gulp.task( 'run', gulp.series( build, start ) );
gulp.task( 'build', build );
gulp.task( 'clean', clean );
gulp.task( 'start-server', start );

getArgument( "--port" ) && ( process.env.PORT = getArgument( "--port" ).toString() )
process.env.NODE_ENV = getArgument( "--dev" ) ? "dev" : "prod";