import { z } from "zod";

import { idSchema, optionalTrimmedString } from "./common.ts";

export const webhookEventTypes = [
  "envelope.completed",
  "envelope.declined",
  "envelope.voided",
  "envelope.expired",
] as const;

export type WebhookEventType = (typeof webhookEventTypes)[number];

export const webhookEventTypeSchema = z.enum(webhookEventTypes);

const webhookEventsSchema = z
  .array(webhookEventTypeSchema)
  .min(1, "Choose at least one event.");

export const webhookEndpointCreateSchema = z.object({
  description: optionalTrimmedString(200),
  enabled: z.boolean().optional(),
  events: webhookEventsSchema,
  url: z
    .string()
    .trim()
    .min(1, "Enter a URL.")
    .max(2048, "That URL is too long."),
});

export const webhookEndpointPatchSchema = z
  .object({
    description: z.union([z.string().trim().max(200), z.null()]).optional(),
    enabled: z.boolean().optional(),
    events: webhookEventsSchema.optional(),
    url: z
      .string()
      .trim()
      .min(1, "Enter a URL.")
      .max(2048, "That URL is too long.")
      .optional(),
  })
  .refine(
    (value) =>
      value.description !== undefined ||
      value.enabled !== undefined ||
      value.events !== undefined ||
      value.url !== undefined,
    { message: "Nothing to change." },
  );

export const webhookIdSchema = idSchema;

export type WebhookDeliveryStatus = "delivered" | "failed" | "pending";

export type WebhookDeliveryView = {
  attemptCount: number;
  createdAt: number;
  endpointId: string;
  eventType: WebhookEventType;
  id: string;
  lastAttemptAt: number | null;
  lastError: string | null;
  lastStatusCode: number | null;
  status: WebhookDeliveryStatus;
};

export type WebhookEndpointView = {
  createdAt: number;
  deliveries: WebhookDeliveryView[];
  description: string | null;
  enabled: boolean;
  events: WebhookEventType[];
  id: string;
  updatedAt: number;
  url: string;
};

export type WebhookEndpointCreated = WebhookEndpointView & { secret: string };
