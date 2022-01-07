export class ConflictError extends Error
{
	public readonly statusCode = 409;
}