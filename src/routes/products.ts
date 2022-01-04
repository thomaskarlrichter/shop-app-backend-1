import { Base }      from "airtable";
import { Express }   from "express";
import { Server }    from "http";
import { ShopRoute } from "../app.d";

let instance: Products;

// @ts-ignore
export class Products implements ShopRoute
{
	constructor( private _express: Express, private _server: Server, private _base: Base )
	{
		if( instance ) throw new Error( "There already exists an instance of route [Products]." );

		this._initGetAllOverviewItems();

		instance = this;
	}

	// constructor(express: Express, server: Server, base: Base) {
	//     throw new Error("Method not implemented.");
	// }

	private _initGetAllOverviewItems()
	{
		this._express.get( '/overview-products', async ( request, response ) =>
		{
			const json = { products : [] };

			try
			{
				const params = {
					view   : "sort by created",
					fields : [ "id", "title", "thumbnail", "rating", "price", "name (from tags)" ]
				}

				const records = await this._base( "products" )
										  .select( params )
										  .all();

				for( const record of records )
				{
					json.products.push( {
						id        : record.fields[ "id" ],
						title     : record.fields[ "title" ],
						thumbnail : record.fields[ "thumbnail" ],
						rating    : record.fields[ "rating" ],
						price     : record.fields[ "price" ],
						tags      : record.fields[ "name (from tags)" ]
					} );
				}
			}
			catch( error )
			{
				return response.send( `${error.statusCode}: ${error.message}` );
			}

			return response.send( json );
		} );
	}
}