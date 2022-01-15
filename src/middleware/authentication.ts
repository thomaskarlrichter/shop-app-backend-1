import { Middleware, Request, Response }                                        from "@decorators/express";
import { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { IncomingHttpHeaders }                                                  from "http";
import { sign, verify }                                                         from "jsonwebtoken";
import { base }                                                                 from "../app";
import { BadInputError }                                                        from "../errors/bad-input-error";
import { ForbiddenError }                                                       from "../errors/forbidden-error";

export interface TokenUser
{
	email: string;
}

const { ACCESS_EXPIRATION, VERFICATION_EXPIRATION, ACCESS_SECRET_KEY, REFRESH_SECRET_KEY, VERFICATION_SECRET_KEY, CLIENT_BASE_URL } = process.env;
const REFRESH_TOKEN_TABLE_NAME                                                                                                      = "refresh-token";

export class AuthenticateAccessToken implements Middleware
{
	public use( @Request() request: ExpressRequest, @Response() response: ExpressResponse, next: NextFunction ): void
	{
		const token = getTokenFromHeaders( request.headers );

		if( !token ) return next();

		try
		{
			const { email } = verify( token, ACCESS_SECRET_KEY ) as TokenUser;

			( response as any ).user = { email };
		}
		catch( error )
		{
			response.status( error.message === "jwt expired" ? 410 : 403 ).send( error.message );

			return;
		}

		next();
	}
}

export class AuthenticateRefreshToken implements Middleware
{
	public async use( @Request() request: ExpressRequest, @Response() response: ExpressResponse, next: NextFunction ): Promise<void>
	{
		const token = getTokenFromHeaders( request.headers );

		try
		{
			if( !token ) throw new BadInputError( "Token missing." );

			const { email }  = verify( token, REFRESH_SECRET_KEY ) as TokenUser;
			const { length } = await base( REFRESH_TOKEN_TABLE_NAME )
				.select( {
					view            : "default",
					filterByFormula : `{token} = '${token}'`,
				} )
				.all();

			if( !length ) throw new ForbiddenError( "Token invalid" );

			( response as any ).user = { email };
		}
		catch( error )
		{
			response.status( error.message === "jwt expired" ? 410 : 403 ).send( error.message );

			return;
		}

		next();
	}
}

export class AuthenticateVerficationToken implements Middleware
{
	public use( @Request() request: ExpressRequest, @Response() response: ExpressResponse, next: NextFunction ): void
	{
		const token = getTokenFromHeaders( request.headers );

		try
		{
			if( !token ) throw new BadInputError( "Token missing." );

			const { email } = verify( token, VERFICATION_SECRET_KEY ) as TokenUser;

			( response as any ).user = { email };
		}
		catch( error )
		{
			response.status( error.message === "jwt expired" ? 410 : 403 ).send( error.message );

			return;
		}

		next();
	}
}

export async function handleNewVerificationRequest( user: TokenUser )
{
	const token = generateVerificationToken( user );
	const link  = `${CLIENT_BASE_URL}/verify?token=${token}`;

	console.log( "TOKEN: ", token );
	// console.log( "LINK: ", link );

	// await send();

	/* TODO: generate new email */

	return token;
}

export async function generateRefreshToken( user: TokenUser )
{
	const { email } = user;
	const token     = sign(
		user,
		REFRESH_SECRET_KEY
	);

	await base( REFRESH_TOKEN_TABLE_NAME ).create( [
		{
			fields : {
				token,
				email
			}
		}
	] );

	return token;
}

export function generateAccessToken( user: TokenUser )
{
	return sign(
		user,
		ACCESS_SECRET_KEY,
		{ expiresIn : ACCESS_EXPIRATION }
	);
}

export function generateVerificationToken( user: TokenUser )
{
	return sign(
		user,
		VERFICATION_SECRET_KEY,
		{ expiresIn : VERFICATION_EXPIRATION }
	);
}

export async function removeRefreshTokenFromDb( email: string )
{
	const records = await base( REFRESH_TOKEN_TABLE_NAME )
		.select( {
			view            : "default",
			filterByFormula : `{email} = '${email}'`,
		} )
		.all();

	if( !records.length ) return;

	const mapped = records.map( record => record.id );

	await base( REFRESH_TOKEN_TABLE_NAME ).destroy( mapped );
}

function getTokenFromHeaders( headers: IncomingHttpHeaders )
{
	return headers.authorization?.split( " " )[ 1 ];
}