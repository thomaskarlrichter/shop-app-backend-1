export class ForbiddenError extends Error
{
	public readonly statusCode = 403;
}