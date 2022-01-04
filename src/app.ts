import Airtable, { Base }                                         from "airtable";
import express, { Express }                                       from "express"
import cors                                                       from "cors"
import { Server }                                                 from "http"
import { ShopRoute, ShopRouteConstructor }                        from "./app.d";
import { Products }                                               from "./routes/products";
import { API_KEY, BASE_ID, BASE_URL, DEFAULT_PORT, ENDPOINT_URL } from "./settings";

const PORT            = parseInt( process.env.PORT ) || DEFAULT_PORT;
const AIRTABLE_CONFIG = {
	apiKey      : API_KEY,
	endpointUrl : ENDPOINT_URL,
}

class App
{
	private _express: Express    = express();
	private _server: Server      = new Server( this._express );
	private _base: Base;
	private _routes: ShopRoute[] = [];

	constructor( private _port: number )
	{
		Airtable.configure( AIRTABLE_CONFIG );
		this._express.use( cors() );
		this._express.options( '*', cors() );

		this._base = Airtable.base( BASE_ID );

		this._initRoutes();
	}

	public start()
	{
		this._tryStartingWithPort( this._port );
	}

	public initRoute( route: ShopRouteConstructor )
	{
		this._routes.push( new route( this._express, this._server, this._base ) );
	}

	private _initRoutes()
	{
		// @ts-ignore
		this.initRoute( Products );
	}

	private _tryStartingWithPort( port: number )
	{
		this._server.listen( port, () => console.log( `Server available at ${BASE_URL}:${port}` ) );
	}
}

new App( PORT ).start()
