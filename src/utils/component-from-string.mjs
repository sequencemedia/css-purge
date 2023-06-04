export default function componentFromString (string, max) {
  let component = 0

  if (/%$/g.test(string)) { // is percentage
    component = Math.floor(max * (parseFloat(string) / 100.0))
  } else {
    component = parseInt(string)
  }

  return component
}
