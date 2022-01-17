import { Body, Controller, Delete, Get, Params, Patch, Post, Put, Response }                                                                                         from "@decorators/express";
import { compare, hash }                                                                                                                                             from "bcryptjs";
import { Response as ExpressResponse }                                                                                                                               from "express";
import { base }                                                                                                                                                      from "../app";
import { BadInputError }                                                                                                                                             from "../errors/bad-input-error";
import { ConflictError }                                                                                                                                             from "../errors/conflict-error";
import { ForbiddenError }                                                                                                                                            from "../errors/forbidden-error";
import { AuthenticateRefreshToken, AuthenticateVerficationToken, generateAccessToken, generateRefreshToken, handleNewVerificationRequest, removeRefreshTokenFromDb } from "../middleware/authentication";
import { SALT_ROUNDS_COUNT }                                                                                                                                         from "../settings";

interface LoginExpressResponse
{
	refreshToken: string;
	accessToken: string;
}

interface TokenExpressResponse
{
	accessToken: string;
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

@Controller( "/authentication/" )
export class AuthenticationController
{
	@Get( "/login" )
	public async login( @Body() { email, password }: LoginRequestBody, @Response() response: ExpressResponse )
	{
		const json: Partial<LoginExpressResponse> = {};
		// const tokenUser                           = ( response as any ).user;

		try
		{
			// if( !tokenUser && ( !email || !password ) ) throw new BadInputError( "Missing input." );
			if( !email || !password ) throw new BadInputError( "Missing input." );

			const [ user ] = await base( "users" )
				.select( {
					view   : "default",
					fields : [
						"email",
						"verified",
						"hash"
					],
					// filterByFormula : `{email} = '${tokenUser?.email || email}'`,
					filterByFormula : `{email} = '${email}'`,
					maxRecords      : 1
				} )
				.all();

			// if( !tokenUser )
			// {
			if( !user ) throw new ForbiddenError( `User email or password incorrect.` );

			const valid = await compare( password, user.fields[ "hash" ] as string );

			if( !valid ) throw new ForbiddenError( `User email or password incorrect.` );
			// }

			await removeRefreshTokenFromDb( email );

			if( !user.fields[ "verified" ] ) throw new ForbiddenError( `User email not verified.` );

			json.accessToken  = generateAccessToken( { email : user.fields[ "email" ] as string } );
			json.refreshToken = await generateRefreshToken( { email : user.fields[ "email" ] as string } );
		}
		catch( error )
		{
			return response.status( error.statusCode || 403 ).send( error.message );
		}

		return response.status( 200 ).send( json );
	}

	@Delete( "/logout", [ AuthenticateRefreshToken ] )
	public async logout( @Response() response: ExpressResponse )
	{
		const tokenUser = ( response as any ).user;

		try
		{
			if( !tokenUser ) throw new ForbiddenError( "Invalid refresh token." );

			await removeRefreshTokenFromDb( tokenUser.email );
		}
		catch( error )
		{
			return response.status( error.statusCode || 403 ).send( error.message );
		}

		return response.status( 201 ).send( "Logout successfull" );
	}

	@Put( "/register" )
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

			await handleNewVerificationRequest( { email } );
		}
		catch( error )
		{
			return response.status( error.statusCode || 403 ).send( error.message );
		}

		return response.status( 201 ).send( "User successfully created." );
	}

	@Get( "/token", [ AuthenticateRefreshToken ] )
	public async token( @Response() response: ExpressResponse )
	{
		const json: Partial<TokenExpressResponse> = {};
		const tokenUser                           = ( response as any ).user;

		try
		{
			json.accessToken = await generateAccessToken( tokenUser );
		}
		catch( error )
		{
			return response.status( error.statusCode || 403 ).send( error.message );
		}

		return response.status( 200 ).send( json );
	}

	@Patch( "/verify", [ AuthenticateVerficationToken ] )
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
			if( !email ) throw new BadInputError( `Input parameters incorrect.` );

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

			if( !user ) throw new ForbiddenError( `User not found.` );

			if( user.fields[ "verified" ] ) throw new ConflictError( `User already verified.` );

			await handleNewVerificationRequest( { email } );
		}
		catch( error )
		{
			return response.status( error.statusCode || 500 ).send( error.message );
		}

		return response.status( 201 ).send( "New user verifivation successfully requested." );
	}
}