import { z } from 'zod';

// Base fields every event must carry
const baseEvent = z.object({
  eventId: z.string().uuid(),
  timestamp: z.string().datetime(),
  discordUserId: z.string().optional(), // Q1: may not exist until team confirms
});

export const SessionStartEvent = baseEvent.extend({
  type: z.literal('session_start'),
  deviceId: z.string(),
  deviceName: z.string(),
  userId: z.string(),
});

export const SessionEndEvent = baseEvent.extend({
  type: z.literal('session_end'),
  deviceId: z.string(),
  deviceName: z.string(),
  userId: z.string(),
  durationSeconds: z.number().int().nonnegative(),
});

export const SessionWarningEvent = baseEvent.extend({
  type: z.literal('session_warning'),
  deviceId: z.string(),
  deviceName: z.string(),
  userId: z.string(),
  remainingSeconds: z.number().int().nonnegative(),
});

export const DeviceOfflineEvent = baseEvent.extend({
  type: z.literal('device_offline'),
  deviceId: z.string(),
  deviceName: z.string(),
});

export const DeviceOnlineEvent = baseEvent.extend({
  type: z.literal('device_online'),
  deviceId: z.string(),
  deviceName: z.string(),
});

// Union of all supported events
export const AnyEvent = z.discriminatedUnion('type', [
  SessionStartEvent,
  SessionEndEvent,
  SessionWarningEvent,
  DeviceOfflineEvent,
  DeviceOnlineEvent,
]);

export type AnyEvent = z.infer<typeof AnyEvent>;
export type SessionStartEvent = z.infer<typeof SessionStartEvent>;
export type SessionEndEvent = z.infer<typeof SessionEndEvent>;
export type SessionWarningEvent = z.infer<typeof SessionWarningEvent>;
export type DeviceOfflineEvent = z.infer<typeof DeviceOfflineEvent>;
export type DeviceOnlineEvent = z.infer<typeof DeviceOnlineEvent>;
