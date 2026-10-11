import { Router } from "express";
import { repository } from "../data/store.js";
import { prisma } from "../data/prisma.js";
import { config } from "../config/env.js";
import { generateId } from "../utils/hash.js";
import { addNotification } from "../utils/notify.js";
import { today } from "../utils/time.js";
import { persistImage } from "../utils/imageStorage.js";
import { isNonEmptyString, isOneOf, optionalString, toPositiveNumber } from "../utils/validate.js";
import { anchorStorageNotMigrated, confirmProduceAnchor, prepareProduceAnchor, publicAnchor } from "../utils/solanaAnchor.js";
const router = Router();
const CATEGORIES = ["Yam","Maize","Soybean","Cassava","Vegetables","Fruits","Other"] as const;
const STATUSES = ["Ready now","Harvesting soon","Sold out"] as const;
const FALLBACK_IMAGES: Record<string,string> = { Yam:"/src/assets/images/fresh_white_yam_1791478863303.jpg", Maize:"/src/assets/images/dry_yellow_maize_1791478874630.jpg", Cassava:"/src/assets/images/fresh_cassava_roots_1791478885358.jpg", Soybean:"/src/assets/images/clean_soybean_grains_1791478895398.jpg" };
const labels = (quantity:number, unit:string, price:number, priceUnit:string) => ({ quantityLabel:`${quantity} ${unit} available`, priceDisplay:`₦${price.toLocaleString()} / ${priceUnit}` });
const phoneKey=(value:string)=>value.replace(/[^\d+]/g,"");
router.get("/", async (req,res,next) => { try {
 const {category,search,location,sort}=req.query; let list=await repository.produce.all();
 if(typeof category==="string"&&category.trim()&&category.toLowerCase()!=="all") list=list.filter((p:any)=>p.category.toLowerCase()===category.toLowerCase());
 if(typeof search==="string"&&search.trim()){const q=search.toLowerCase().trim();list=list.filter((p:any)=>[p.title,p.category,p.location,p.farmerName,p.description].some(v=>String(v??"").toLowerCase().includes(q)));}
 if(typeof location==="string"&&location.trim())list=list.filter((p:any)=>p.location.toLowerCase().includes(location.toLowerCase().trim()));
 if(sort==="price-asc")list.sort((a:any,b:any)=>a.price-b.price);else if(sort==="price-desc")list.sort((a:any,b:any)=>b.price-a.price);else if(sort==="quantity-desc")list.sort((a:any,b:any)=>b.quantity-a.quantity);else list.sort((a:any,b:any)=>Date.parse(b.createdAt)-Date.parse(a.createdAt));
  let anchors: Awaited<ReturnType<typeof prisma.produceAnchor.findMany>>=[];try{anchors=await prisma.produceAnchor.findMany({where:{produceId:{in:list.map((p:any)=>p.id)}}});}catch(error){if(!anchorStorageNotMigrated(error))throw error;}const byProduce=new Map(anchors.map((anchor)=>[anchor.produceId,publicAnchor(anchor)]));
 res.json({success:true,count:list.length,data:list.map((p:any)=>({...p,chainAnchor:byProduce.get(p.id)??{status:"not_anchored",cluster:"devnet",verified:false}}))});
 } catch(e){next(e);} });
router.get("/:id",async(req,res,next)=>{try{const item=await repository.produce.find(req.params.id);if(!item){res.status(404).json({success:false,error:"Produce listing not found"});return;}let anchor=null;try{anchor=await prisma.produceAnchor.findUnique({where:{produceId:item.id}});}catch(error){if(!anchorStorageNotMigrated(error))throw error;}res.json({success:true,data:{...item,chainAnchor:anchor?publicAnchor(anchor):{status:"not_anchored",cluster:"devnet",verified:false}}});}catch(e){next(e);}});
router.post("/:id/anchor/prepare",async(req,res,next)=>{try{const item=await repository.produce.find(req.params.id);if(!item){res.status(404).json({success:false,error:"Produce listing not found"});return;}if(phoneKey(item.farmerPhone)!==phoneKey(req.authUser!.phone)){res.status(403).json({success:false,error:"Only the farmer who owns this listing can anchor it"});return;}const prepared=await prepareProduceAnchor(item.id,String(req.body?.walletAddress??""));res.json({success:true,data:prepared});}catch(e:any){if(e.status){res.status(e.status).json({success:false,error:e.message});return;}next(e);}});
router.post("/:id/anchor/confirm",async(req,res,next)=>{try{const item=await repository.produce.find(req.params.id);if(!item){res.status(404).json({success:false,error:"Produce listing not found"});return;}if(phoneKey(item.farmerPhone)!==phoneKey(req.authUser!.phone)){res.status(403).json({success:false,error:"Only the farmer who owns this listing can confirm its anchor"});return;}if(!isNonEmptyString(req.body?.signature)){res.status(400).json({success:false,error:"A Solana transaction signature is required"});return;}const confirmed=await confirmProduceAnchor(item.id,req.body.signature);res.json({success:true,data:confirmed});}catch(e:any){if(e.status){res.status(e.status).json({success:false,error:e.message});return;}if(anchorStorageNotMigrated(e)){res.status(503).json({success:false,error:"Solana anchoring is not ready: apply the API database migrations first"});return;}next(e);}});
router.post("/",async(req,res,next)=>{try{
 const b=req.body??{},quantity=toPositiveNumber(b.quantity),price=toPositiveNumber(b.price);
 if(!isNonEmptyString(b.title)||!isNonEmptyString(b.category)||quantity===null||price===null){res.status(400).json({success:false,error:"title, category, quantity (> 0) and price (> 0) are required"});return;}
 if(!isOneOf(b.category,CATEGORIES)){res.status(400).json({success:false,error:`category must be one of: ${CATEGORIES.join(", ")}`});return;}
 const actor=await repository.users.find(req.authUser!.id);if(!actor){res.status(401).json({success:false,error:"Farmer account not found"});return;}if(req.authUser!.role==="farmer"&&!actor.verified){res.status(403).json({success:false,error:"Your account must be verified before posting produce"});return;}
 const category=b.category,title=b.title.trim(),unit=optionalString(b.unit)??"units",priceUnit=optionalString(b.priceUnit)??optionalString(b.unit)??"unit",farmerName=req.authUser!.role==="farmer"?actor.name:optionalString(b.farmerName)??actor.name,farmerPhone=req.authUser!.role==="farmer"?actor.phone:optionalString(b.farmerPhone)??actor.phone;
 const batchId=`AGQ-${category.slice(0,3).toUpperCase()}-${new Date().getFullYear()}-${generateId("b").slice(-8).toUpperCase()}`;
 const createdAt=new Date().toISOString();
 const item:any={id:generateId("prod"),title,category,quantity,unit,...labels(quantity,unit,price,priceUnit),price,priceUnit,location:optionalString(b.location)??actor.location??"Regional Farm Hub",state:config.defaultState,status:"Ready now",verified:actor.verified,image:await persistImage(optionalString(b.image),FALLBACK_IMAGES[category]??FALLBACK_IMAGES.Yam),farmerName,farmerPhone,farmName:actor.farmOrBusinessName??optionalString(b.farmName)??"Local Family Farm",farmSize:actor.farmSize??optionalString(b.farmSize)??"3 Hectares",harvestDate:optionalString(b.harvestDate)??today(),batchId,blockHash:"",blockNumber:0,blockchainNetwork:config.blockchainNetwork,farmingMethod:optionalString(b.farmingMethod)??"Standard sustainable rainfed cultivation",description:optionalString(b.description)??"High-quality agricultural produce harvested from verified farmlands.",createdAt};
 await prisma.$transaction(async tx=>{
   const state=await tx.ledgerState.findUnique({where:{id:1}});if(!state)throw new Error("Ledger state is not initialized; run npm run seed");
   await tx.$queryRaw`SELECT "id" FROM "LedgerState" WHERE "id" = 1 FOR UPDATE`;
   const locked=await tx.ledgerState.findUniqueOrThrow({where:{id:1}});
   const blockNumber=locked.nextBlockNumber,previousHash=locked.lastHash;
   const {generateBlockchainHash}=await import("../utils/hash.js");
   const blockHash=generateBlockchainHash(`${batchId}-${title}-${farmerName}-${blockNumber}-${previousHash??"GENESIS"}`);
   item.blockNumber=blockNumber;item.blockHash=blockHash;
   await tx.produce.create({data:{id:item.id,batchId,category,status:item.status,title,location:item.location,createdAt:new Date(createdAt),data:item}});
   await tx.ledgerBlock.create({data:{id:generateId("block"),blockNumber,batchId,hash:blockHash,previousHash,kind:"PRODUCE",data:{...item,previousHash}}});
   await tx.ledgerState.update({where:{id:1},data:{nextBlockNumber:blockNumber+1,lastHash:blockHash}});
 });
 await addNotification("Buyer","New Produce Listed",`${item.title} (${item.quantityLabel}) was just listed in ${item.location}.`);
 res.status(201).json({success:true,data:item});
}catch(e){next(e);}});
router.put("/:id",async(req,res,next)=>{try{
 const item=await repository.produce.find(req.params.id);if(!item){res.status(404).json({success:false,error:"Produce not found"});return;}const b=req.body??{};
 if(b.category!==undefined&&!isOneOf(b.category,CATEGORIES)){res.status(400).json({success:false,error:`category must be one of: ${CATEGORIES.join(", ")}`});return;}
 if(b.status!==undefined&&!isOneOf(b.status,STATUSES)){res.status(400).json({success:false,error:`status must be one of: ${STATUSES.join(", ")}`});return;}
 if(req.authUser!.role!=="admin"&&phoneKey(item.farmerPhone)!==phoneKey(req.authUser!.phone)){res.status(403).json({success:false,error:"You can only update your own produce"});return;}
 if(b.quantity!==undefined){const q=Number(b.quantity);if(!Number.isFinite(q)||q<0){res.status(400).json({success:false,error:"quantity must be a number >= 0"});return;}item.quantity=q;if(q===0&&b.status===undefined)item.status="Sold out";}
 if(b.price!==undefined){const p=toPositiveNumber(b.price);if(p===null){res.status(400).json({success:false,error:"price must be a number > 0"});return;}item.price=p;}
 if(b.category!==undefined)item.category=b.category;if(b.status!==undefined)item.status=b.status;
 for(const f of ["title","unit","priceUnit","location","image","farmSize","harvestDate","availabilityDate","farmingMethod","description"]){const v=optionalString(b[f]);if(v!==undefined)item[f]=v;}
 Object.assign(item,labels(item.quantity,item.unit,item.price,item.priceUnit));await repository.produce.update(item);res.json({success:true,data:item});
}catch(e){next(e);}});
router.delete("/:id",async(req,res,next)=>{try{const item=await repository.produce.find(req.params.id);if(!item){res.status(404).json({success:false,error:"Produce not found"});return;}if(req.authUser!.role!=="admin"&&phoneKey(item.farmerPhone)!==phoneKey(req.authUser!.phone)){res.status(403).json({success:false,error:"You can only remove your own produce"});return;}await repository.produce.delete(req.params.id);res.json({success:true,message:"Produce removed successfully"});}catch(e){next(e);}});
export default router;
