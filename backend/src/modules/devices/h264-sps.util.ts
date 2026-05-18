/**
 * Minimal H.264 SPS parser — reads encoded frame size from SPS NAL (Annex-B).
 * Used when the device rotates and scrcpy sends a new config (SPS/PPS) packet.
 */

const HIGH_PROFILE_IDS = new Set([
  100, 110, 122, 244, 44, 83, 86, 118, 128, 138, 139, 134, 135,
]);

class BitReader {
  private byte = 0;
  private bitsLeft = 0;
  private pos = 0;

  constructor(private readonly data: Uint8Array) {}

  readBit(): number {
    if (this.bitsLeft === 0) {
      if (this.pos >= this.data.length) return 0;
      this.byte = this.data[this.pos++]!;
      this.bitsLeft = 8;
    }
    const bit = (this.byte >> 7) & 1;
    this.byte <<= 1;
    this.bitsLeft--;
    return bit;
  }

  readBits(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) {
      v = (v << 1) | this.readBit();
    }
    return v;
  }

  readUE(): number {
    let zeros = 0;
    while (this.readBit() === 0 && zeros < 32) zeros++;
    let val = 1;
    for (let i = 0; i < zeros; i++) {
      val = (val << 1) | this.readBit();
    }
    return val - 1;
  }
}

function removeEmulationPrevention(rbsp: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < rbsp.length; i++) {
    if (
      i >= 2 &&
      rbsp[i] === 0x03 &&
      rbsp[i - 1] === 0x00 &&
      rbsp[i - 2] === 0x00
    ) {
      continue;
    }
    out.push(rbsp[i]!);
  }
  return new Uint8Array(out);
}

function splitAnnexBNals(buf: Buffer): Uint8Array[] {
  const data = new Uint8Array(buf);
  const nals: Uint8Array[] = [];
  let i = 0;
  while (i < data.length) {
    let start = -1;
    if (
      i + 3 < data.length &&
      data[i] === 0 &&
      data[i + 1] === 0 &&
      data[i + 2] === 1
    ) {
      start = i + 3;
    } else if (
      i + 4 < data.length &&
      data[i] === 0 &&
      data[i + 1] === 0 &&
      data[i + 2] === 0 &&
      data[i + 3] === 1
    ) {
      start = i + 4;
    }
    if (start === -1) {
      i++;
      continue;
    }
    let j = start;
    while (j + 2 < data.length) {
      if (
        data[j] === 0 &&
        data[j + 1] === 0 &&
        (data[j + 2] === 1 ||
          (j + 3 < data.length && data[j + 2] === 0 && data[j + 3] === 1))
      ) {
        break;
      }
      j++;
    }
    if (j + 2 >= data.length) j = data.length;
    if (j > start) nals.push(data.subarray(start, j));
    i = j;
  }
  return nals;
}

/** Parse SPS NAL (type 7) → luma picture size in pixels. */
export function parseSpsDimensions(spsNal: Uint8Array): {
  width: number;
  height: number;
} | null {
  if (spsNal.length < 4) return null;
  const nalType = spsNal[0]! & 0x1f;
  if (nalType !== 7) return null;

  const rbsp = removeEmulationPrevention(spsNal.subarray(1));
  const br = new BitReader(rbsp);

  const profileIdc = br.readBits(8);
  br.readBits(8); // constraint + level
  br.readUE(); // seq_parameter_set_id

  if (HIGH_PROFILE_IDS.has(profileIdc)) {
    const chroma = br.readUE();
    if (chroma === 3) br.readBit();
    br.readUE(); // bit_depth_luma_minus8
    br.readUE(); // bit_depth_chroma_minus8
    br.readBit(); // qpprime_y_zero_transform_bypass_flag
    if (br.readBit()) {
      // seq_scaling_matrix_present_flag — skip scaling lists
      const count = chroma !== 3 ? 8 : 12;
      for (let i = 0; i < count; i++) {
        if (!br.readBit()) continue;
        const size = i < 6 ? 16 : 64;
        let last = 8;
        let next = 8;
        for (let j = 0; j < size; j++) {
          if (next !== 0) {
            const delta = br.readUE();
            next = (last + delta + 256) % 256;
          }
          last = next === 0 ? last : next;
        }
      }
    }
  }

  br.readUE(); // log2_max_frame_num_minus4
  const picOrderCntType = br.readUE();
  if (picOrderCntType === 0) {
    br.readUE();
  } else if (picOrderCntType === 1) {
    br.readBit();
    br.readUE();
    br.readUE();
    const n = br.readUE();
    for (let i = 0; i < n; i++) br.readUE();
  }

  br.readUE(); // max_num_ref_frames
  br.readBit(); // gaps_in_frame_num_value_allowed_flag

  const picWidthInMbs = br.readUE() + 1;
  const picHeightInMapUnits = br.readUE() + 1;
  const frameMbsOnly = br.readBit();
  if (frameMbsOnly === 0) br.readBit();
  br.readBit(); // direct_8x8_inference_flag

  let cropLeft = 0;
  let cropRight = 0;
  let cropTop = 0;
  let cropBottom = 0;
  if (br.readBit()) {
    cropLeft = br.readUE();
    cropRight = br.readUE();
    cropTop = br.readUE();
    cropBottom = br.readUE();
  }

  const width =
    picWidthInMbs * 16 - (cropLeft + cropRight) * 2;
  const height =
    (2 - frameMbsOnly) * picHeightInMapUnits * 16 -
    (cropTop + cropBottom) * 2;

  if (width <= 0 || height <= 0) return null;
  return { width, height };
}

/** Extract video size from scrcpy config packet (Annex-B SPS+PPS). */
export function parseVideoSizeFromConfigPacket(
  config: Buffer,
): { width: number; height: number } | null {
  for (const nal of splitAnnexBNals(config)) {
    if ((nal[0]! & 0x1f) === 7) {
      return parseSpsDimensions(nal);
    }
  }
  return null;
}
