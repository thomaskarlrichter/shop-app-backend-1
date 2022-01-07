export class UserAlreadyExistsError extends Error
{
	public readonly statusCode = 400;
}