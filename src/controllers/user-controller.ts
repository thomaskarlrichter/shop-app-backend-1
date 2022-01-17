import { Body, Controller, Get, Patch, Response } from "@decorators/express";
import { Response as ExpressResponse }            from "express";
import { base }                                   from "../app";
import { RequestedResourceNotFoundError }         from "../errors/requested-resource-not-found-error";
import { AuthenticateAccessToken }                from "../middleware/authentication";

interface UserExpressResponse
{
	firstname: string;
	lastname: string;
	email: string;
	phone: string;
	country: string;
	state: string;
	city: string;
	language: string;
}

interface SetRequestBody
{
	firstname: string;
	lastname: string;
	phone: string;
}

@Controller( "/user/" )
export class UserController
{
	@Get( "/", [ AuthenticateAccessToken ] )
	public async get( @Response() response: ExpressResponse )
	{
		const json: Partial<UserExpressResponse> = {};
		const { email }                          = ( response as any ).user;

		try
		{
			const { fields } = ( await base( "users" )
				.select( {
						view            : "default",
						fields          : [ "firstname", "lastname", "email", "phone", "name (from country)", "name (from state)", "name (from city)", "abbreviation (from language)" ],
						filterByFormula : `{email} = '${email}'`,
						maxRecords      : 1
					}
				)
				.all() )[ 0 ];

			if( !fields ) throw new RequestedResourceNotFoundError( `User not found.` );

			json.firstname = fields[ "firstname" ] as string;
			json.lastname  = fields[ "lastname" ] as string;
			json.email     = fields[ "email" ] as string;
			json.phone     = fields[ "phone" ] as string;
			json.country   = fields[ "name (from country)" ][ 0 ];
			json.state     = fields[ "name (from state)" ][ 0 ];
			json.city      = fields[ "name (from city)" ][ 0 ];
			json.language  = fields[ "abbreviation (from language)" ][ 0 ];
		}
		catch( error )
		{
			return response.status( error.statusCode || 403 ).send( error.message );
		}

		return response.status( 200 ).send( json );
	}

	@Patch( "/", [ AuthenticateAccessToken ] )
	public async set( @Body() { firstname, lastname, phone }: Partial<SetRequestBody>, @Response() response: ExpressResponse )
	{
		const { email } = ( response as any ).user;

		try
		{
			const [ user ] = ( await base( "users" )
				.select( {
						view            : "default",
						filterByFormula : `{email} = '${email}'`,
						maxRecords      : 1
					}
				)
				.all() );

			if( !user ) throw new RequestedResourceNotFoundError( `User not found.` );

			await base( "users" ).update( user.id, {
				firstname,
				lastname,
				phone,
			} );
		}
		catch( error )
		{
			return response.status( error.statusCode || 403 ).send( error.message );
		}

		return response.status( 200 ).send( "User data successfully updated." );
	}
}