import { Base }    from "airtable";
import { Express } from "express";
import { Server }  from "http";

// export interface ShopAppBase extends Base
// {
//
// }

export interface ShopRoute
{
	constructor( express: Express, server: Server, base: Base )
}

export interface ShopRouteConstructor
{
	new( express: Express, server: Server, base: Base ): ShopRoute
}