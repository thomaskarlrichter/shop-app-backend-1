import { attachControllers }                                      from "@decorators/express";
import Airtable                                                   from "airtable";
import cors                                                       from "cors";
import express                                                    from "express";
import { ProductController }                                      from "./controllers/product-controller";
import { UserController }                                         from "./controllers/user-controller";
import { API_KEY, BASE_ID, BASE_URL, DEFAULT_PORT, ENDPOINT_URL } from "./settings";

const PORT = parseInt( process.env.PORT ) || DEFAULT_PORT;
const app  = express();

app.use( express.json() );
app.use( cors() );
app.options( '*', cors() );

attachControllers( app, [
	ProductController,
	UserController
] );

Airtable.configure( {
	apiKey      : API_KEY,
	endpointUrl : ENDPOINT_URL,
} );

export const base = Airtable.base( BASE_ID );

app.listen( PORT, () => console.log( `Server available at ${BASE_URL}:${PORT}` ) );

/* TODO: cart should be saved on server rather than on client session */