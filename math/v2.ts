export interface Vec2 {
  x: number
  y: number
}

export const v2 = (x: number, y: number): Vec2 => ({x: x, y: y})

export const ZERO: Readonly<Vec2> = v2(0, 0)
export const zero = () => v2(0, 0)

// Eucliean distance between two points
export const distance = (pt1: Vec2, pt2: Vec2): number => Math.sqrt(
  (pt2.x - pt1.x) * (pt2.x - pt1.x) +
  (pt2.y - pt1.y) * (pt2.y - pt1.y)
)

export const distanceSquared = (pt1: Vec2, pt2: Vec2): number =>
  (pt2.x - pt1.x) * (pt2.x - pt1.x) +
  (pt2.y - pt1.y) * (pt2.y - pt1.y)

// Magnitude
export const magnitude = (v: Vec2): number => distance(v, ZERO)

// Given the three points, are they counter clockwise?
export const ccw = (a: Vec2, b: Vec2, c: Vec2): number => (b.x - a.x) * (c.y - a.y) - (c.x - a.x) * (b.y - a.y)

// Angle between two points in radians
export const angle2 = (a: Vec2, b: Vec2): number => Math.atan2(b.y - a.y, b.x - a.x)

// Angle between three points in radians
export const angle3 = (a: Vec2, b: Vec2, c: Vec2): number => Math.atan2(a.y - b.y, a.x - b.x) - Math.atan2(c.y - b.y, c.x - b.x)

export const piNum: number = Math.PI / 180
export const numPi: number = 180 / Math.PI
export const degToRad = (deg: number): number => deg * piNum
export const radToDeg = (rad: number): number => rad * numPi

export const sum = (a: Vec2, b: Vec2): Vec2 => v2(a.x + b.x, a.y + b.y)
export const sub = (a: Vec2, b: Vec2): Vec2 => v2(a.x - b.x, a.y - b.y)

export const dot = (a: Vec2, b: Vec2): number => a.x * b.x + a.y * b.y
export const unit = (a: Vec2): Vec2 => {
  const dist = distance(ZERO, a)
  return v2(a.x / dist, a.y / dist)
}

export const normal = (p0: Vec2, p1: Vec2): Vec2 => {
  // if we define dx=x2-x1 and dy=y2-y1, then the normals are (-dy, dx) and (dy, -dx).
  let dx = p1.x - p0.x
  let dy = p1.y - p0.y
  // orthoginal(sub(p1, p0))
  return v2(-dy, dx)
}

export const orthogonal = (v: Vec2): Vec2 => v2(-v.y, v.x)

export const scalarMultiply = (a: Vec2, c: number): Vec2 => v2(a.x * c, a.y * c)
export const scalarSum = (a: Vec2, c: number): Vec2 => v2(a.x + c, a.y + c)

export const clampLength = (clampee: Vec2, length: number): Vec2 => magnitude(clampee) > length ? scalarMultiply(unit(clampee), length) : clampee
