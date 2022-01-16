require( "dotenv" ).config()

import { attachControllers }        from "@decorators/express";
import Airtable                     from "airtable";
import cors                         from "cors";
import express                      from "express";
import { AuthenticationController } from "./controllers/authentication-controller";
import { ProductController }        from "./controllers/product-controller";
import { UserController }           from "./controllers/user-controller";
import { DEFAULT_PORT }             from "./settings";

const { AIRTABLE_API_KEY, PORT, AIRTABLE_ENDPOINT_URL, SERVER_BASE_URL, AIRTABLE_BASE_ID } = process.env;

const port = parseInt( PORT ) || DEFAULT_PORT;
const app  = express();

app.use( express.json() );
app.use( cors() );
app.options( '*', cors() );

attachControllers( app, [
	AuthenticationController,
	ProductController,
	UserController
] );

Airtable.configure( {
	apiKey      : AIRTABLE_API_KEY,
	endpointUrl : AIRTABLE_ENDPOINT_URL,
} );

export const base = Airtable.base( AIRTABLE_BASE_ID );

app.listen( port, () => console.log( `Server available at ${SERVER_BASE_URL}:${port}` ) );