import type { Body } from 'matter-js';
import type { BoardGeometry } from './geometry';

const MAX_SETTLING_SPEED = 0.16;
const SETTLING_DWELL_MS = 450;

export interface SettlingMemory {
  bin: number | null;
  enteredAtMs: number | null;
}

function reset(memory: SettlingMemory) {
  memory.bin = null;
  memory.enteredAtMs = null;
}

export function classifySettledBall(
  body: Body,
  geometry: BoardGeometry,
  memory: SettlingMemory,
  nowMs: number,
): number | null {
  const bin = geometry.bins.find(({ left, right, top, bottom }, index, bins) => (
    body.position.y >= top
    && body.position.y <= bottom
    && body.position.x >= left
    && (body.position.x < right || (index === bins.length - 1 && body.position.x <= right))
  ));

  if (!bin || body.speed > MAX_SETTLING_SPEED) {
    reset(memory);
    return null;
  }

  if (memory.bin !== bin.index || memory.enteredAtMs === null) {
    memory.bin = bin.index;
    memory.enteredAtMs = nowMs;
    return null;
  }

  return nowMs - memory.enteredAtMs >= SETTLING_DWELL_MS ? bin.index : null;
}
