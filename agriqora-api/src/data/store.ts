/**
 * Database repository. JSON payloads preserve the existing frontend response
 * fields while indexed columns support filtering and constraints.
 */
import { prisma } from "./prisma.js";

const jsonSafe = (value: any) => JSON.parse(JSON.stringify(value));
const userData = (row: any) => ({ ...row.data, name: row.name || row.data?.name || "" });

export const repository = {
  users: {
    all: async () => (await prisma.user.findMany({ orderBy: { createdAt: "desc" } })).map(userData),
    find: async (id: string) => { const x = await prisma.user.findUnique({ where: { id } }); return x ? userData(x) : null; },
    create: async (data: any) => userData(await prisma.user.create({ data: { id: data.id, name: data.name, phone: data.phone, role: data.role, verified: data.verified, data: jsonSafe(data) } })),
    update: async (id: string, data: any) => userData(await prisma.user.update({ where: { id }, data: { name: data.name, phone: data.phone, role: data.role, verified: data.verified, data: jsonSafe(data) } })),
  },
  produce: {
    all: async () => (await prisma.produce.findMany({ orderBy: { createdAt: "desc" } })).map(x => x.data as any),
    find: async (id: string) => { const x = await prisma.produce.findUnique({ where: { id } }); return x?.data as any; },
    findBatch: async (batchId: string) => { const x = await prisma.produce.findUnique({ where: { batchId } }); return x?.data as any; },
    create: async (data: any) => (await prisma.produce.create({ data: { id: data.id, batchId: data.batchId, category: data.category, status: data.status, title: data.title, location: data.location, createdAt: new Date(data.createdAt), data: jsonSafe(data) } })).data as any,
    update: async (data: any) => (await prisma.produce.update({ where: { id: data.id }, data: { category: data.category, status: data.status, title: data.title, location: data.location, data: jsonSafe(data) } })).data as any,
    delete: async (id: string) => prisma.produce.delete({ where: { id } }),
  },
  requests: {
    all: async () => (await prisma.buyerRequest.findMany({ orderBy: { createdAt: "desc" } })).map(x => x.data as any),
    find: async (id: string) => { const x = await prisma.buyerRequest.findUnique({ where: { id } }); return x?.data as any; },
    create: async (data: any) => (await prisma.buyerRequest.create({ data: { id: data.id, produceId: data.produceId, status: data.status, createdAt: new Date(data.createdAt), data: jsonSafe(data) } })).data as any,
    update: async (data: any) => (await prisma.buyerRequest.update({ where: { id: data.id }, data: { status: data.status, data: jsonSafe(data) } })).data as any,
  },
  records: {
    all: async () => (await prisma.farmRecord.findMany({ orderBy: { createdAt: "desc" } })).map(x => x.data as any),
    create: async (d: any) => (await prisma.farmRecord.create({ data: { id: d.id, farmerName: d.farmerName, batchId: d.batchId, data: jsonSafe(d) } })).data as any,
  },
  community: {
    all: async () => (await prisma.communityPost.findMany({ orderBy: { createdAt: "desc" } })).map(x => x.data as any),
    create: async (d: any) => (await prisma.communityPost.create({ data: { id: d.id, data: jsonSafe(d) } })).data as any,
  },
  notifications: {
    all: async () => (await prisma.notification.findMany({ orderBy: { createdAt: "desc" } })).map(x => x.data as any),
    create: async (d: any) => (await prisma.notification.create({ data: { id: d.id, userRole: d.userRole, createdAt: new Date(d.createdAt), data: jsonSafe(d) } })).data as any,
  },
  education: async () => (await prisma.learningModule.findMany()).map(x => x.data as any),
};
