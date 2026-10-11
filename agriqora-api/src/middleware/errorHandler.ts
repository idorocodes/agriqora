import type {NextFunction,Request,Response} from "express";
export function notFound(req:Request,res:Response):void {res.status(404).json({success:false,error:`Route not found: ${req.method} ${req.originalUrl}`});}
interface HttpError extends Error {status?:number;type?:string;code?:string}
export function errorHandler(err:HttpError,_req:Request,res:Response,_next:NextFunction):void {
 if(err.type==="entity.parse.failed"){res.status(400).json({success:false,error:"Invalid JSON body"});return;}
 if(err.code==="P2002"){res.status(409).json({success:false,error:"A record with this unique value already exists"});return;}
 if(err.code==="P2025"){res.status(404).json({success:false,error:"Record not found"});return;}
 const status=err.status&&err.status>=400&&err.status<600?err.status:500;
 if(status===500)console.error(err);
 res.status(status).json({success:false,error:status===500?"Database operation failed":err.message});
}
