export default function hasImportant (value) {
  return /(!important)/g.test(value)
}
