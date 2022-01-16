import { Body, Controller, Get, Params, Post, Query, Response } from "@decorators/express";
import { Response as ExpressResponse }                          from "express";

import { base }                           from "../app";
import { RequestedResourceNotFoundError } from "../errors/requested-resource-not-found-error";

interface CheckoutRequestBody
{
	items: string[];
}

@Controller( "/product/" )
export class ProductController
{
	@Get( "/all" )
	public async all( @Response() response: ExpressResponse )
	{
		const json = { products : [] };

		try
		{
			const records = await base( "products" )
				.select( {
					view   : "sort by created",
					fields : [ "id", "title", "rating", "price", "name (from tags)", "image" ]
				} )
				.all();

			for( const record of records )
			{
				json.products.push( {
					id        : record.fields[ "id" ],
					title     : record.fields[ "title" ],
					thumbnail : record.fields[ "image" ][ 0 ][ "thumbnails" ][ "large" ][ "url" ],
					rating    : record.fields[ "rating" ],
					price     : record.fields[ "price" ]
				} );
			}
		}
		catch( error )
		{
			return response.status( error.statusCode ).send( error.message );
		}

		return response.send( json );
	}

	@Get( "/single/:productId" )
	public async single( @Params( 'productId' ) id: string, @Query( "type" ) type: "detail" | "tile" = "detail", @Response() response: ExpressResponse )
	{
		let json;
		const selectFields = [ "id", "title", "rating", "price", "name (from tags)", "image" ];

		if( type === "detail" )
		{
			selectFields.push( "description" );
			selectFields.push( "shipment" );
		}

		try
		{
			const { fields } = ( await base( "products" )
				.select( {
						view            : "default",
						fields          : selectFields,
						filterByFormula : `{id} = '${id}'`,
						maxRecords      : 1
					}
				)
				.all() )?.[ 0 ];

			if( !fields ) throw new RequestedResourceNotFoundError( `Product with id '${id}' not found.` );

			const imageSize = type === "detail" ? "large" : "full";

			json = {
				id          : fields[ "id" ],
				title       : fields[ "title" ],
				image       : fields[ "image" ][ 0 ][ "thumbnails" ][ imageSize ][ "url" ],
				rating      : fields[ "rating" ],
				price       : fields[ "price" ],
				description : fields[ "description" ],
				shipment    : fields[ "shipment" ],
				tags        : fields[ "name (from tags)" ]
			};
		}

		catch( error )
		{
			return response.status( error.statusCode ).send( error.message );
		}

		return response.send( json );
	}

	@Get( "/reviews/:productId" )
	public async reviews( @Params( 'productId' ) id: string, @Response() response: ExpressResponse )
	{
		let json           = { reviews : [] };
		const selectFields = [ "id", "title (from product)", "text", "created", "email (from user)", "firstname (from user)", "lastname (from user)" ];

		try
		{
			const records = await base( "product-reviews" )
				.select( {
						view            : "default",
						fields          : selectFields,
						filterByFormula : `{product} = '${id}'`
					}
				)
				.all();

			for( const record of records )
			{
				const { fields }            = record;
				const { id, text, created } = fields;

				json.reviews.push( {
					id,
					text,
					created,
					productTitle : fields[ "title (from product)" ][ 0 ],
					userName     : `${fields[ "firstname (from user)" ][ 0 ]} ${fields[ "lastname (from user)" ][ 0 ]}`,
					userEmail    : fields[ "email (from user)" ][ 0 ]
				} );
			}
		}

		catch( error )
		{
			return response.status( error.statusCode ).send( error.message );
		}

		return response.send( json );
	}

	@Post( "/checkout" )
	async checkout( @Body() { items = [] }: CheckoutRequestBody, @Response() response: ExpressResponse )
	{
		try
		{
			// do something with items
		}
		catch( error )
		{
			return response.status( error.statusCode ).send( error.message );
		}
	}
}