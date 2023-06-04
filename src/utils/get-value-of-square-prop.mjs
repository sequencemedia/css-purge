export default function getValueOfSquareProp (valueIn, side) {
  const value = valueIn.split(' ')
  switch (value.length) {
    case 1: return value[0]
    case 2:
      switch (side) {
        case 'top':
        case 'topleft':
        case 'bottom':
        case 'bottomright':
          return value[0]
        case 'right':
        case 'topright':
        case 'left':
        case 'bottomleft':
          return value[1]
      }
      break
    case 3:
      switch (side) {
        case 'top':
        case 'topleft':
          return value[0]
        case 'right':
        case 'topright':
        case 'left':
        case 'bottomleft':
          return value[1]
        case 'bottom':
        case 'bottomright':
          return value[2]
      }
      break
    case 4:
      switch (side) {
        case 'top':
        case 'topleft':
          return value[0]
        case 'right':
        case 'topright':
          return value[1]
        case 'bottom':
        case 'bottomright':
          return value[2]
        case 'left':
        case 'bottomleft':
          return value[3]
      }
      break
  }

  return ''
}
