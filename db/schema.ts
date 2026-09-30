import { sql } from "drizzle-orm";
import { integer, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const figurineOrders = sqliteTable("figurine_orders", {
  id: text("id").primaryKey(),
  status: text("status").notNull().default("new"),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull().default(""),
  finish: text("finish").notNull(),
  size: text("size").notNull(),
  copies: integer("copies").notNull().default(1),
  notes: text("notes").notNull().default(""),
  photoMetadata: text("photo_metadata").notNull(),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const generationOrders = sqliteTable(
  "generation_orders",
  {
    id: text("id").primaryKey(),
    publicToken: text("public_token").notNull(),
    email: text("email").notNull(),
    style: text("style").notNull(),
    priceCents: integer("price_cents").notNull().default(4900),
    currency: text("currency").notNull().default("pln"),
    paymentStatus: text("payment_status").notNull().default("pending"),
    generationStatus: text("generation_status").notNull().default("awaiting_payment"),
    progress: integer("progress").notNull().default(0),
    stripeSessionId: text("stripe_session_id"),
    stripePaymentIntentId: text("stripe_payment_intent_id"),
    meshyPrototypeTaskId: text("meshy_prototype_task_id"),
    meshyModelTaskId: text("meshy_model_task_id"),
    meshyConvertTaskId: text("meshy_convert_task_id"),
    glbKey: text("glb_key"),
    stlKey: text("stl_key"),
    thumbnailKey: text("thumbnail_key"),
    photoMetadata: text("photo_metadata").notNull(),
    errorMessage: text("error_message"),
    createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
    paidAt: text("paid_at"),
    completedAt: text("completed_at"),
  },
  (table) => [
    uniqueIndex("generation_orders_public_token_unique").on(table.publicToken),
    uniqueIndex("generation_orders_stripe_session_unique").on(table.stripeSessionId),
  ],
);
