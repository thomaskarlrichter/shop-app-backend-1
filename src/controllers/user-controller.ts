import { Controller, Post, Request, Response }                    from "@decorators/express";
import { compare, hash }                                          from "bcryptjs";
import { config as dotenvConfig }                                 from "dotenv";
import { Request as ExpressRequest, Response as ExpressResponse } from "express";
import { decode, sign, verify }                                   from "jsonwebtoken";
import { base }                                                   from "../app";
import { BadInputError }                                          from "../errors/bad-input-error";
import { ConflictError }                                          from "../errors/conflict-error";
import { ForbiddenError }                                         from "../errors/forbidden-error";
import { GoneError }                                              from "../errors/gone-error";
import { SALT_ROUNDS_COUNT }                                      from "../settings";
import { send }                                                   from "../mail";

dotenvConfig();

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

@Controller( "/user/" )
export class UserController
{
	@Post( "/login" )
	public async login( @Request() request: ExpressRequest, @Response() response: ExpressResponse )
	{
		const { email : inputEmail, password } = request?.body
		const json: LoginExpressResponse       = {};

		try
		{
			/* TODO: accept token in header instead of credentials */

			if( !inputEmail || !password ) throw new BadInputError( "Malformed body - Email and/or password missing." );

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
					filterByFormula : `{email} = '${inputEmail}'`,
					maxRecords      : 1
				} )
				.all();

			if( !user ) throw new ForbiddenError( `User email or password incorrect.` );

			const valid = await compare( password, user.fields[ "hash" ] as string );

			if( !valid ) throw new ForbiddenError( `User email or password incorrect.` );

			if( !user.fields[ "verified" ] ) throw new ForbiddenError( `User email not verified.` );

			json.user = {
				id        : user.fields[ "id" ] as number,
				firstname : user.fields[ "firstname" ] as string,
				lastname  : user.fields[ "lastname" ] as string,
				email     : user.fields[ "email" ] as string,
				language  : user.fields[ "abbreviation (from language)" ][ 0 ] as string,
			};

			const jwt = this._generateJwt( json.user.email );

			json.jwt = jwt;

			await base( "users" ).update( user.id, { jwt } );
		}
		catch( error )
		{
			return response.status( error.statusCode ).send( error.message );
		}

		return response.status( 201 ).send( json );
	}

	@Post( "/register" )
	public async register( @Request() request: ExpressRequest, @Response() response: ExpressResponse )
	{
		const { firstname, lastname, email, password } = request?.body

		try
		{
			if( !firstname || !lastname || !email || !password ) throw new BadInputError( "Malformed body - Missing data in request body." );

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
					filterByFormula : `{email} = '${email}'`,
					maxRecords      : 1
				} )
				.all();

			if( user ) throw new ConflictError( "Email already in use." );

			const hashedPassword = await hash( password, SALT_ROUNDS_COUNT );
			const jwt            = await this._handleNewVerificationRequest( email );

			await base( "users" )
				.create( [
					{
						fields : {
							firstname,
							lastname,
							email,
							hash : hashedPassword,
							jwt
						}
					}
				] );
		}
		catch( error )
		{
			return response.status( error.statusCode ).send( error.message );
		}

		return response.status( 201 ).send( "User successfully created." );
	}

	@Post( "/verify" )
	public async verify( @Request() request: ExpressRequest, @Response() response: ExpressResponse )
	{
		const { token } = request.query;

		try
		{
			const email = this._tryGettingEmailFromJwt( token );

			if( !email ) throw new ForbiddenError( `Input parameters incorrect.` );

			const [ user ] = await base( "users" )
				.select( {
					view            : "default",
					fields          : [
						"id",
						"email",
						"jwt",
						"verified"
					],
					filterByFormula : `{email} = '${email}'`,
					maxRecords      : 1
				} )
				.all();

			if( !user || token !== user.fields[ "jwt" ] ) throw new ForbiddenError( `Input parameters incorrect.` );

			if( user.fields[ "verified" ] ) throw new ConflictError( `User already verified.` );

			await base( "users" ).update( user.id, { verified : true } );
		}
		catch( error )
		{
			return response.status( error.statusCode || 500 ).send( error.message );
		}

		return response.status( 201 ).send( "User verifivation successfull." );
	}

	@Post( "/retry-verification" )
	public async retryVerification( @Request() request: ExpressRequest, @Response() response: ExpressResponse )
	{
		const { email } = request?.body;

		try
		{
			if( !email ) throw new ForbiddenError( `Input parameters incorrect.` );

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

			debugger;

			if( !user ) throw new ForbiddenError( `Input parameters incorrect.` );

			if( user.fields[ "verified" ] ) throw new ConflictError( `User already verified.` );

			await this._handleNewVerificationRequest( email as string, user.id );
		}
		catch( error )
		{
			return response.status( error.statusCode || 500 ).send( error.message );
		}

		return response.status( 201 ).send( "User verifivation successfull." );
	}

	private _tryGettingEmailFromJwt( token ): string
	{
		let email;

		try
		{
			email = decode( token as string, { json : true } ).email;

			verify( token as string, JWT_SECRET_KEY );
		}
		catch( error )
		{
			if( error.message === "jwt expired" ) throw new GoneError( "Token expired" );
			else throw new ForbiddenError( `Input parameters incorrect.` );
		}

		return email;
	}

	/**
	 * @param userId (optional): If provided the user record will be updated, so it contains the new JWT
	 */
	private async _handleNewVerificationRequest( email: string, userId?: string )
	{
		const jwt = this._generateJwt( email );

		const link = `${CLIENT_BASE_URL}/verify?token=${jwt}`;

		await send();

		/* TODO: generate new email */

		if( userId ) await base( "users" ).update( userId, { jwt } );

		return jwt;
	}

	private _generateJwt( email: string )
	{
		return sign(
			{ email : email },
			JWT_SECRET_KEY,
			{
				expiresIn : JWT_EXPIRATION
			}
		);
	}
}