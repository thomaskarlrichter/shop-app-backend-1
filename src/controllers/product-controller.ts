import { Controller, Get, Params, Post, Response } from "@decorators/express";
import { Response as ExpressResponse }             from "express";

import { base }                           from "../app";
import { RequestedResourceNotFoundError } from "../errors/requested-resource-not-found-error";

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
	public async single( @Response() response: ExpressResponse, @Params( 'productId' ) id: string )
	{
		let json;

		try
		{
			const records = await base( "products" )
				.select( {
					view            : "default",
					fields          : [ "id", "title", "rating", "price", "name (from tags)", "image" ],
					filterByFormula : `{id} = '${id}'`,
					maxRecords      : 1
				} )
				.all();

			if( !records.length ) throw new RequestedResourceNotFoundError( `Product with id '${id}' not found.` );

			const [ product ] = records;

			json = {
				id     : product.fields[ "id" ],
				title  : product.fields[ "title" ],
				image  : product.fields[ "image" ][ 0 ][ "thumbnails" ][ "full" ][ "url" ],
				rating : product.fields[ "rating" ],
				price  : product.fields[ "price" ],
				tags   : product.fields[ "name (from tags)" ]
			};
		}

		catch( error )
		{
			return response.status( error.statusCode ).send( error.message );
		}

		return response.send( json );
	}
}