export default function roundTo (n, digits = 0) {
  const multiplicator = Math.pow(10, digits)
  const float = parseFloat((n * multiplicator).toFixed(11))
  const round = (Math.round(float) / multiplicator)
  return +(round.toFixed(digits))
}
