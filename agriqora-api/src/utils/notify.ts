import type { NotificationRole } from "../types/index.js";
import { repository } from "../data/store.js";
import { generateId } from "./hash.js";
export async function addNotification(userRole: NotificationRole, title: string, message: string, recipientId?: string): Promise<void> {
  await repository.notifications.create({ id: generateId("notif"), userRole, recipientId, title, message, createdAt: new Date().toISOString(), read: false });
}
