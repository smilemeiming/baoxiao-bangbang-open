function padNumber(value) {
  return value < 10 ? `0${value}` : `${value}`
}

function formatTime(date) {
  const year = date.getFullYear()
  const month = padNumber(date.getMonth() + 1)
  const day = padNumber(date.getDate())
  const hour = padNumber(date.getHours())
  const minute = padNumber(date.getMinutes())

  return `${year}-${month}-${day} ${hour}:${minute}`
}

module.exports = {
  formatTime
}
