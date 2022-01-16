import { Body, Controller, Put, Response } from "@decorators/express";
import { hash }                            from "bcryptjs";
import { Response as ExpressResponse }     from "express";
import { base }                            from "../app";
import { BadInputError }                   from "../errors/bad-input-error";
import { ConflictError }                   from "../errors/conflict-error";
import { handleNewVerificationRequest }    from "../middleware/authentication";
import { SALT_ROUNDS_COUNT }               from "../settings";

const { CLIENT_BASE_URL } = process.env;

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

}