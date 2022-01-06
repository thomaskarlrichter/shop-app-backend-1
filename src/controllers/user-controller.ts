import { Controller, Get, Post, Request, Response }               from "@decorators/express";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";

import { base }                           from "../app";
import { BadInputError }                  from "../errors/bad-input-error";
import { RequestedResourceNotFoundError } from "../errors/requested-resource-not-found-error";

interface LoginExpressResponse
{
	token?: string;
	user?: {
		id: number;
		firstname: string;
		lastname: string;
		email: string;
		verified: boolean;
		language: string;
	}
}

@Controller( "/user/" )
export class UserController
{
	@Post( "/login" )
	public async login( @Request() request: ExpressRequest, @Response() response: ExpressResponse )
	{
		const { email : inputEmail, hash } = request?.body
		const json: LoginExpressResponse   = {};

		if( !inputEmail || !hash ) throw new BadInputError( "Malformed body - email or/and hash missing." );

		try
		{
			const [ user ] = await base( "users" )
				.select( {
					view            : "default",
					fields          : [
						"id",
						"firstname",
						"lastname",
						"email",
						"verified",
						"abbreviation (from language)"
					],
					filterByFormula : `AND({email} = '${inputEmail}', {hash} = '${hash}')`,
					maxRecords      : 1
				} )
				.all();

			if( !user ) throw new RequestedResourceNotFoundError( `User email or password incorrect.` );

			/* TODO: implement email verfified check */

			/* TODO: fix dummy token */
			json.token = "123";

			json.user = {
				id        : user.fields[ "id" ] as number,
				firstname : user.fields[ "firstname" ] as string,
				lastname  : user.fields[ "lastname" ] as string,
				email     : user.fields[ "email" ] as string,
				verified  : user.fields[ "verified" ] as boolean,
				language  : user.fields[ "abbreviation (from language)" ][ 0 ] as string,
			};
		}
		catch( error )
		{
			response.status( error.statusCode );

			return response.send( error.message );
		}

		return response.send( json );
	}

	@Get( "/register" )
	public async register( @Response() response: ExpressResponse )
	{
		const json = { products : [] };

		try
		{
			const records = await base( "users" )
				.select( {
					view   : "default",
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
			response.status( error.statusCode );

			return response.send( error.message );
		}

		return response.send( json );
	}
}