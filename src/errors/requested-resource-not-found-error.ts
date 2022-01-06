export class RequestedResourceNotFoundError extends Error
{
	public readonly statusCode = 404;
}