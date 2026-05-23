/**
 * Minimal H.264 SPS parser — extracts encoded frame size only.
 * Used to detect orientation / resolution changes from scrcpy config packets.
 */

function removeEmulationPrevention(bytes: Uint8Array): Uint8Array {
  const out: number[] = [];
  for (let i = 0; i < bytes.length; i++) {
    if (i >= 2 && bytes[i] === 0x03 && bytes[i - 1] === 0 && bytes[i - 2] === 0) {
      continue;
    }
    out.push(bytes[i]);
  }
  return Uint8Array.from(out);
}

class BitReader {
  private pos = 0;
  private curByte = 0;
  private bitPos = 8;

  constructor(private readonly data: Uint8Array) {}

  readBit(): number {
    if (this.bitPos >= 8) {
      if (this.pos >= this.data.length) return 0;
      this.curByte = this.data[this.pos++];
      this.bitPos = 0;
    }
    const bit = (this.curByte >> (7 - this.bitPos)) & 1;
    this.bitPos++;
    return bit;
  }

  readBits(n: number): number {
    let v = 0;
    for (let i = 0; i < n; i++) {
      v = (v << 1) | this.readBit();
    }
    return v;
  }

  readUe(): number {
    let zeros = 0;
    while (this.readBit() === 0 && zeros < 32) zeros++;
    return zeros === 0 ? 0 : (1 << zeros) - 1 + this.readBits(zeros);
  }

  readSe(): number {
    const ue = this.readUe();
    const sign = (ue & 1) === 1 ? 1 : -1;
    return sign * Math.ceil(ue / 2);
  }
}

/** Returns scaled video width/height from SPS NAL (without NAL header byte). */
export function parseH264SpsDimensions(
  spsWithHeader: Uint8Array,
): { width: number; height: number } | null {
  if (spsWithHeader.length < 4) return null;
  const nalType = spsWithHeader[0] & 0x1f;
  if (nalType !== 7) return null;

  try {
    const rbsp = removeEmulationPrevention(spsWithHeader.subarray(1));
    const br = new BitReader(rbsp);
    br.readBits(8); // profile_idc
    br.readBits(8); // constraint + reserved
    br.readBits(8); // level_idc
    br.readUe(); // seq_parameter_set_id

    const profile = spsWithHeader[1];
    if ([100, 110, 122, 244].includes(profile)) {
      br.readUe(); // chroma_format_idc
      if (br.readUe() === 3) br.readBit(); // separate_colour_plane_flag
      br.readUe(); // bit_depth_luma_minus8
      br.readUe(); // bit_depth_chroma_minus8
      br.readBit(); // qpprime_y_zero_transform_bypass_flag
      if (br.readBit()) {
        // seq_scaling_matrix_present_flag — skip scaling lists
        const count = profile === 100 || profile === 110 ? 8 : 12;
        for (let i = 0; i < count; i++) {
          if (!br.readBit()) continue;
          const size = i < 6 ? 16 : 64;
          let last = 8;
          let next = 8;
          for (let j = 0; j < size; j++) {
            if (next !== 0) next = (last + br.readSe() + 256) % 256;
            last = next === 0 ? last : next;
          }
        }
      }
    }

    br.readUe(); // log2_max_frame_num_minus4
    const picOrderCntType = br.readUe();
    if (picOrderCntType === 0) {
      br.readUe();
    } else if (picOrderCntType === 1) {
      br.readBit();
      for (let i = 0; i < 8; i++) br.readSe();
      const cycles = br.readUe();
      for (let i = 0; i < cycles; i++) br.readSe();
    }
    br.readUe(); // max_num_ref_frames
    br.readBit(); // gaps_in_frame_num_value_allowed_flag

    const picWidthInMbs = br.readUe();
    const picHeightInMapUnits = br.readUe();
    const frameMbsOnly = br.readBit();
    if (!frameMbsOnly) br.readBit(); // mb_adaptive_frame_field_flag
    br.readBit(); // direct_8x8_inference_flag

    let cropLeft = 0;
    let cropRight = 0;
    let cropTop = 0;
    let cropBottom = 0;
    if (br.readBit()) {
      cropLeft = br.readUe();
      cropRight = br.readUe();
      cropTop = br.readUe();
      cropBottom = br.readUe();
    }

    const width =
      (picWidthInMbs + 1) * 16 - (cropLeft + cropRight) * 2;
    const height =
      (2 - frameMbsOnly) * (picHeightInMapUnits + 1) * 16 -
      (cropTop + cropBottom) * 2;

    if (width < 160 || height < 160 || width > 4096 || height > 4096) {
      return null;
    }
    return { width, height };
  } catch {
    return null;
  }
}

/** Parse first SPS in an Annex-B config packet (SPS+PPS). */
export function parseConfigPacketDimensions(
  config: Uint8Array,
): { width: number; height: number } | null {
  let i = 0;
  while (i < config.length) {
    let start = -1;
    if (
      i + 3 < config.length &&
      config[i] === 0 &&
      config[i + 1] === 0 &&
      config[i + 2] === 0 &&
      config[i + 3] === 1
    ) {
      start = i + 4;
    } else if (
      i + 2 < config.length &&
      config[i] === 0 &&
      config[i + 1] === 0 &&
      config[i + 2] === 1
    ) {
      start = i + 3;
    }
    if (start === -1) {
      i++;
      continue;
    }
    let j = start;
    while (j + 2 < config.length) {
      if (
        config[j] === 0 &&
        config[j + 1] === 0 &&
        (config[j + 2] === 1 ||
          (j + 3 < config.length && config[j + 2] === 0 && config[j + 3] === 1))
      ) {
        break;
      }
      j++;
    }
    if (j + 2 >= config.length) j = config.length;
    const nal = config.subarray(start, j);
    const dims = parseH264SpsDimensions(nal);
    if (dims) return dims;
    i = j;
  }
  return null;
}
