/**
 * scrcpy control message serialization (matches app/src/control_msg.c).
 * @see https://github.com/Genymobile/scrcpy/blob/master/app/src/control_msg.h
 */

export const SC_CONTROL_MSG_TYPE_INJECT_KEYCODE = 0;
export const SC_CONTROL_MSG_TYPE_INJECT_TOUCH_EVENT = 2;

/** Android MotionEvent actions */
export const AMOTION_EVENT_ACTION_DOWN = 0;
export const AMOTION_EVENT_ACTION_UP = 1;
export const AMOTION_EVENT_ACTION_MOVE = 2;
export const AMOTION_EVENT_ACTION_POINTER_DOWN = 5;
export const AMOTION_EVENT_ACTION_POINTER_UP = 6;

export const SC_POINTER_ID_GENERIC_FINGER = BigInt("18446744073709551614"); // UINT64_C(-2)

const U16_MAX = 0xffff;

function writeU16BE(buf: Buffer, offset: number, value: number): void {
  buf.writeUInt16BE(Math.max(0, Math.min(U16_MAX, value)), offset);
}

function writeU32BE(buf: Buffer, offset: number, value: number): void {
  buf.writeInt32BE(value | 0, offset);
}

function writeU64BE(buf: Buffer, offset: number, value: bigint): void {
  buf.writeBigUInt64BE(value, offset);
}

function floatToU16fp(pressure: number): number {
  const p = Math.max(0, Math.min(1, pressure));
  return Math.round(p * U16_MAX);
}

export type ScrcpyTouchParams = {
  action: number;
  pointerId?: bigint;
  x: number;
  y: number;
  /** Device display size in current orientation (ADB / injector space). */
  screenWidth: number;
  screenHeight: number;
  pressure?: number;
  actionButton?: number;
  buttons?: number;
};

/** 32-byte INJECT_TOUCH_EVENT control message. */
export function serializeInjectTouchEvent(params: ScrcpyTouchParams): Buffer {
  const buf = Buffer.alloc(32);
  buf[0] = SC_CONTROL_MSG_TYPE_INJECT_TOUCH_EVENT;
  buf[1] = params.action;
  writeU64BE(buf, 2, params.pointerId ?? SC_POINTER_ID_GENERIC_FINGER);
  writeU32BE(buf, 10, params.x);
  writeU32BE(buf, 14, params.y);
  writeU16BE(buf, 18, params.screenWidth);
  writeU16BE(buf, 20, params.screenHeight);
  writeU16BE(buf, 22, floatToU16fp(params.pressure ?? 1));
  writeU32BE(buf, 24, params.actionButton ?? 0);
  writeU32BE(buf, 28, params.buttons ?? 0);
  return buf;
}

export type ScrcpyKeyParams = {
  action: number;
  keycode: number;
  repeat?: number;
  metastate?: number;
};

/** 14-byte INJECT_KEYCODE control message. */
export function serializeInjectKeycode(params: ScrcpyKeyParams): Buffer {
  const buf = Buffer.alloc(14);
  buf[0] = SC_CONTROL_MSG_TYPE_INJECT_KEYCODE;
  buf[1] = params.action;
  writeU32BE(buf, 2, params.keycode);
  writeU32BE(buf, 6, params.repeat ?? 0);
  writeU32BE(buf, 10, params.metastate ?? 0);
  return buf;
}

export const ANDROID_KEYCODE_HOME = 3;
export const ANDROID_KEYCODE_BACK = 4;
export const ANDROID_KEYCODE_APP_SWITCH = 187;

export const ANDROID_KEYEVENT_ACTION_DOWN = 0;
export const ANDROID_KEYEVENT_ACTION_UP = 1;
