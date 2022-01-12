import { Middleware, Request, Response }                                        from "@decorators/express";
import { NextFunction, Request as ExpressRequest, Response as ExpressResponse } from "express";
import { verify }                                                               from "jsonwebtoken";

const { JWT_SECRET_KEY } = process.env;

export interface TokenData
{
	email: string;
}

export class AuthenticateToken implements Middleware
{
	public use( @Request() request: ExpressRequest, @Response() response: ExpressResponse, next: NextFunction ): void
	{
		const token = request.headers.authorization?.split( " " )[ 1 ];

		if( !token ) return next();

		try
		{
			const { email } = verify( token, JWT_SECRET_KEY ) as TokenData;

			( response as any ).user = { email };
		}
		catch( error )
		{
			response.status( error.message === "jwt expired" ? 410 : 403 ).send( error.message );
		}

		next();
	}
}