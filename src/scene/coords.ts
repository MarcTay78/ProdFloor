/** Floor (x east, y north) to three.js (x, up, z). North is -z so a top camera shows north up and east right. */
export const toThree = (x: number, y: number, h = 0): [number, number, number] => [x, h, -y];
/** Floor rotation (degrees, counter-clockwise from above) to three.js rotation.y (radians). */
export const rotY = (deg: number) => (deg * Math.PI) / 180;
