import { Body, Controller, Params, Post, Response } from "@decorators/express";
import { compare, hash }                            from "bcryptjs";
import { Response as ExpressResponse }              from "express";
import { sign }                                     from "jsonwebtoken";
import { base }                                     from "../app";
import { BadInputError }                            from "../errors/bad-input-error";
import { ConflictError }                            from "../errors/conflict-error";
import { ForbiddenError }                           from "../errors/forbidden-error";
import { send }                                     from "../mail";
import { AuthenticateToken }                        from "../middleware/access";
import { SALT_ROUNDS_COUNT }                        from "../settings";

const { JWT_EXPIRATION, JWT_SECRET_KEY, CLIENT_BASE_URL } = process.env;

interface LoginExpressResponse
{
	jwt?: string;
	user?: {
		id: number;
		firstname: string;
		lastname: string;
		email: string;
		language: string;
	}
}

interface RegisterRequestBody
{
	firstname: string;
	lastname: string;
	email: string;
	password: string;
}

interface LoginRequestBody
{
	email: string;
	password: string;
}

interface RetryVerificationRequestBody
{
	email: string;
}

@Controller( "/user/" )
export class UserController
{
	@Post( "/login", [ AuthenticateToken ] )
	public async login( @Body() { email, password }: LoginRequestBody, @Response() response: ExpressResponse )
	{
		const json: LoginExpressResponse = {};
		const tokenUser                  = ( response as any ).user;

		try
		{
			if( !tokenUser && ( !email || !password ) ) throw new BadInputError( "Missing input." );

			const [ user ] = await base( "users" )
				.select( {
					view            : "default",
					fields          : [
						"id",
						"firstname",
						"lastname",
						"email",
						"verified",
						"hash",
						"abbreviation (from language)"
					],
					filterByFormula : `{email} = '${tokenUser?.email || email}'`,
					maxRecords      : 1
				} )
				.all();

			if( !tokenUser )
			{
				if( !user ) throw new ForbiddenError( `User email or password incorrect.` );

				const valid = await compare( password, user.fields[ "hash" ] as string );

				if( !valid ) throw new ForbiddenError( `User email or password incorrect.` );
			}

			if( !user.fields[ "verified" ] ) throw new ForbiddenError( `User email not verified.` );

			json.user = {
				id        : user.fields[ "id" ] as number,
				firstname : user.fields[ "firstname" ] as string,
				lastname  : user.fields[ "lastname" ] as string,
				email     : user.fields[ "email" ] as string,
				language  : user.fields[ "abbreviation (from language)" ]?.[ 0 ] as string,
			};

			const jwt = this._generateJwt( json.user.email );

			json.jwt = jwt;
		}
		catch( error )
		{
			return response.status( error.statusCode || 403 ).send( error.message );
		}

		return response.status( 201 ).send( json );
	}

	@Post( "/register" )
	public async register( @Body() { firstname, lastname, email, password }: RegisterRequestBody, @Response() response: ExpressResponse )
	{
		try
		{
			if( !firstname || !lastname || !email || !password ) throw new BadInputError( "Malformed body - Missing data in request body." );

			const hasUser = ( await base( "users" )
				.select( {
					view            : "default",
					filterByFormula : `{email} = '${email}'`,
					maxRecords      : 1
				} )
				.all() as any[] ).length;

			if( hasUser ) throw new ConflictError( "Email already in use." );

			const hashedPassword = await hash( password, SALT_ROUNDS_COUNT );

			await base( "users" )
				.create( [
					{
						fields : {
							firstname,
							lastname,
							email,
							hash : hashedPassword
						}
					}
				] );

			await this._handleNewVerificationRequest( email );
		}
		catch( error )
		{
			return response.status( error.message === "jwt expired" ? 410 : error.statusCode ).send( error.message );
		}

		return response.status( 201 ).send( "User successfully created." );
	}

	@Post( "/verify", [ AuthenticateToken ] )
	public async verify( @Response() response: ExpressResponse )
	{
		const { email } = ( response as any )?.user;

		try
		{
			const [ user ] = await base( "users" )
				.select( {
					view            : "default",
					fields          : [ "verified" ],
					filterByFormula : `{email} = '${email}'`,
					maxRecords      : 1
				} )
				.all();

			if( !user ) throw new ForbiddenError( `User not found.` );

			if( user.fields[ "verified" ] ) throw new ConflictError( `User already verified.` );

			await base( "users" ).update( user.id, { verified : true } );
		}
		catch( error )
		{
			const status = error.message === "invalid token" ? 403 : ( error.statusCode || 500 );

			return response.status( status ).send( error.message );
		}

		return response.status( 201 ).send( "User verifivation successfull." );
	}

	@Post( "/retry-verification/:email" )
	public async retryVerification( @Params( "email" ) email: string, @Response() response: ExpressResponse )
	{
		try
		{
			const [ user ] = await base( "users" )
				.select( {
					view            : "default",
					fields          : [
						"id",
						"email",
						"verified"
					],
					filterByFormula : `{email} = '${email}'`,
					maxRecords      : 1
				} )
				.all();

			if( !user ) throw new ForbiddenError( `Input parameters incorrect.` );

			if( user.fields[ "verified" ] ) throw new ConflictError( `User already verified.` );

			await this._handleNewVerificationRequest( email );
		}
		catch( error )
		{
			return response.status( error.statusCode || 500 ).send( error.message );
		}

		return response.status( 201 ).send( "New user verifivation successfully requested." );
	}

	private async _handleNewVerificationRequest( email: string )
	{
		const jwt = this._generateJwt( email );

		const link = `${CLIENT_BASE_URL}/verify?token=${jwt}`;

		console.log( "TOKEN: ", `[${jwt}]` );

		await send();

		/* TODO: generate new email */

		return jwt;
	}

	private _generateJwt( email: string )
	{
		return sign(
			{ email },
			JWT_SECRET_KEY,
			{
				expiresIn : JWT_EXPIRATION
			}
		);
	}
}