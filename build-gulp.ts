import * as gulp       from "gulp";
import { build }       from "./build/build";
import { clean }       from "./build/clean";
import { getArgument } from "./build/settings";
import { start }       from "./build/start";

gulp.task( 'run', gulp.series( build, start ) );
gulp.task( 'build', gulp.series( clean, build ) );
gulp.task( 'clean', clean );
gulp.task( 'start-server', start );

process.env.NODE_ENV = getArgument( "--dev" ) ? "dev" : "prod";