export class GoneError extends Error
{
	public readonly statusCode = 410;
}