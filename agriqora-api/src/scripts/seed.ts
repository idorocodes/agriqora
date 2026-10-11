import bcrypt from "bcryptjs";
import {prisma} from "../data/prisma.js";
import {seedProduce} from "../data/seed/produce.js";
import {seedRequests,seedNotifications} from "../data/seed/requests.js";
import {seedUsers,seedFarmRecords,seedCommunityPosts} from "../data/seed/platform.js";
import {seedEducation} from "../data/seed/education.js";
async function main(){
  if(await prisma.produce.count()===0){
    for(const p of seedProduce){
      await prisma.produce.create({data:{id:p.id,batchId:p.batchId,category:p.category,status:p.status,title:p.title,location:p.location,createdAt:new Date(p.createdAt),data:p as any}});
      await prisma.ledgerBlock.create({data:{id:`seed-block-${p.blockNumber}`,blockNumber:p.blockNumber,batchId:p.batchId,hash:p.blockHash,previousHash:null,kind:"PRODUCE",data:p as any,createdAt:new Date(p.createdAt)}});
    }
  }
  if(await prisma.user.count()===0) {
    const adminPassword = process.env.DEMO_ADMIN_PASSWORD ?? "AgriQoraAdmin!2026";
    const buyerPassword = process.env.DEMO_BUYER_PASSWORD ?? "HauwaBuyer!2026";
    for(const u of seedUsers) {
      const password = u.role === "admin" ? adminPassword : (u.phone === "+234 805 441 9023" ? buyerPassword : undefined);
      await prisma.user.create({data:{id:u.id,name:u.name,phone:u.phone,role:u.role,verified:u.verified,passwordHash:password ? await bcrypt.hash(password,12) : null,data:u as any}});
    }
    console.log("Demo auth credentials initialized. Change DEMO_ADMIN_PASSWORD and DEMO_BUYER_PASSWORD before seeding production data.");
  }
  if(await prisma.buyerRequest.count()===0) for(const r of seedRequests) await prisma.buyerRequest.create({data:{id:r.id,produceId:r.produceId,status:r.status,createdAt:new Date(r.createdAt),data:r as any}});
  if(await prisma.farmRecord.count()===0) for(const r of seedFarmRecords) await prisma.farmRecord.create({data:{id:r.id,farmerName:r.farmerName,batchId:r.batchId,createdAt:new Date(`${r.date}T12:00:00Z`),data:r as any}});
  if(await prisma.communityPost.count()===0) for(const p of seedCommunityPosts) await prisma.communityPost.create({data:{id:p.id,data:p as any}});
  if(await prisma.notification.count()===0) for(const n of seedNotifications) await prisma.notification.create({data:{id:n.id,userRole:n.userRole,createdAt:new Date(n.createdAt),data:n as any}});
  if(await prisma.learningModule.count()===0) for(const m of seedEducation) await prisma.learningModule.create({data:{id:m.id,crop:m.crop,data:m as any}});
  const max=await prisma.ledgerBlock.aggregate({_max:{blockNumber:true}});
  const latest=await prisma.ledgerBlock.findFirst({orderBy:{blockNumber:"desc"}});
  await prisma.ledgerState.upsert({where:{id:1},create:{id:1,nextBlockNumber:(max._max.blockNumber??482899)+1,lastHash:latest?.hash??null},update:{nextBlockNumber:Math.max(max._max.blockNumber??482899,482899)+1,lastHash:latest?.hash??null}});
  console.log("AgriQora seed complete.");
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(async()=>prisma.$disconnect());
