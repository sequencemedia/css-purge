import hueToRgb from './hue-to-rgb.mjs'

/**
 * Converts an HSL color value to RGB. Conversion formula
 * adapted from http://en.wikipedia.org/wiki/HSL_color_space.
 * Assumes h, s, and l are contained in the set [0, 1] and
 * returns r, g, and b in the set [0, 255].
 *
 * @param   {number}  h       The hue
 * @param   {number}  s       The saturation
 * @param   {number}  l       The lightness
 * @return  {Array}           The RGB representation
 */
export default function hslToRgb (h, s, l) {
  let r
  let g
  let b

  if (s === 0) {
    r = g = b = l // achromatic
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hueToRgb(p, q, h + 1 / 3.0)
    g = hueToRgb(p, q, h)
    b = hueToRgb(p, q, h - 1 / 3.0)
  }

  return [
    Math.min(Math.floor(r * 256), 255),
    Math.min(Math.floor(g * 256), 255),
    Math.min(Math.floor(b * 256), 255)
  ]
}
