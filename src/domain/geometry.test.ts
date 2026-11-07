import { describe, expect, test } from 'vitest';
import { CATALOGUE, createMachine } from './catalogue';
import {
  boxRect, clearanceRect, localToWorld, machineRect, operatorRect, polygonInsideBox,
  rectCorners, rectsOverlap, segmentRect,
} from './geometry';

const near = (a: number, b: number) => expect(a).toBeCloseTo(b, 6);
const sq = (cx: number, cy: number, rotation = 0) => ({ cx, cy, length: 1, width: 1, rotation });

describe('rectCorners', () => {
  test('unrotated', () => {
    expect(rectCorners({ cx: 0, cy: 0, length: 2, width: 1, rotation: 0 })).toEqual([
      { x: -1, y: -0.5 }, { x: 1, y: -0.5 }, { x: 1, y: 0.5 }, { x: -1, y: 0.5 },
    ]);
  });
  test('rotated 90° swaps extents', () => {
    const c = rectCorners({ cx: 0, cy: 0, length: 2, width: 1, rotation: 90 });
    near(Math.max(...c.map((p) => p.x)), 0.5);
    near(Math.max(...c.map((p) => p.y)), 1);
  });
});

describe('rectsOverlap', () => {
  test('identical rects overlap', () => expect(rectsOverlap(sq(0, 0), sq(0, 0))).toBe(true));
  test('touching edges do not overlap', () => expect(rectsOverlap(sq(0, 0), sq(1, 0))).toBe(false));
  test('separated do not overlap', () => expect(rectsOverlap(sq(0, 0), sq(3, 0))).toBe(false));
  test('partial overlap', () => expect(rectsOverlap(sq(0, 0), sq(0.5, 0.5))).toBe(true));
  test('rotated rect near corner: bounding boxes overlap but shapes do not', () => {
    expect(rectsOverlap(sq(0, 0), sq(1.1, 1.1, 45))).toBe(false);
  });
  test('rotated rect overlapping', () => expect(rectsOverlap(sq(0, 0), sq(0.7, 0.7, 45))).toBe(true));
});

describe('polygonInsideBox', () => {
  test('inside and crossing', () => {
    expect(polygonInsideBox(rectCorners(sq(5, 5)), 0, 0, 10, 10)).toBe(true);
    expect(polygonInsideBox(rectCorners(sq(9.8, 5)), 0, 0, 10, 10)).toBe(false);
    expect(polygonInsideBox(rectCorners(sq(9.5, 5)), 0, 0, 10, 10)).toBe(true);
  });
});

describe('helpers', () => {
  test('boxRect converts min corner to centre', () => {
    expect(boxRect(2, 3, 4, 2)).toEqual({ cx: 4, cy: 4, length: 4, width: 2, rotation: 0 });
  });
  test('segmentRect for a vertical wall', () => {
    const r = segmentRect(5, 0, 5, 10, 0.2);
    near(r.cx, 5); near(r.cy, 5); near(r.length, 10); near(r.width, 0.2); near(r.rotation, 90);
  });
  test('localToWorld rotates then translates', () => {
    const p = localToWorld({ x: 10, y: 5, rotation: 90 }, { x: 1, y: 0 });
    near(p.x, 10); near(p.y, 6);
  });
});

describe('machine rects', () => {
  const base = () => {
    const m = createMachine(CATALOGUE.find((t) => t.id === 'table-saw')!, 10, 5);
    m.length = 2; m.width = 1;
    m.clearance = { front: 1, back: 0, left: 0, right: 0 };
    m.operatorArea = { side: 'front', depth: 0.9, width: 2 };
    return m;
  };
  test('machineRect', () => expect(machineRect(base())).toEqual({ cx: 10, cy: 5, length: 2, width: 1, rotation: 0 }));
  test('clearanceRect extends to the front', () => {
    const r = clearanceRect(base());
    near(r.cx, 10); near(r.cy, 5.5); near(r.length, 2); near(r.width, 2);
  });
  test('clearanceRect follows rotation (front faces -x at 90°)', () => {
    const m = base(); m.rotation = 90;
    const r = clearanceRect(m);
    near(r.cx, 9.5); near(r.cy, 5); near(r.rotation, 90);
  });
  test('operatorRect sits outside the front edge', () => {
    const r = operatorRect(base())!;
    near(r.cx, 10); near(r.cy, 5 + 0.5 + 0.45); near(r.length, 2); near(r.width, 0.9);
  });
  test('operatorRect left side is depth wide along x', () => {
    const m = base(); m.operatorArea = { side: 'left', depth: 0.8, width: 1 };
    const r = operatorRect(m)!;
    near(r.cx, 10 - 1 - 0.4); near(r.cy, 5); near(r.length, 0.8); near(r.width, 1);
  });
  test('operatorRect null when depth is 0', () => {
    const m = base(); m.operatorArea.depth = 0;
    expect(operatorRect(m)).toBeNull();
  });
});
