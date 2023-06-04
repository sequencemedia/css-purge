export default function hueToRgb (p, q, t) {
  if (t < 0) { t += 1 }
  if (t > 1) { t -= 1 }
  if (t < 1 / 6.0) { return p + (q - p) * 6 * t }
  if (t < 1 / 2.0) { return q }
  if (t < 2 / 3.0) { return p + (q - p) * (2 / 3.0 - t) * 6 }
  return p
}
