const sleep = (time) => {
  return new Promise(resolve => setTimeout(resolve, time))
}

const isObject = (data) => {
  return data != null && typeof data === "object" && !Array.isArray(data)
}

const isArray = (data) => {
  return data != null && typeof data === "object" && Array.isArray(data)
}

const toAsync = async (promise) => {
  return new Promise(resolve => promise.then(data => resolve({ data })).catch(err => resolve({ err })))
}

module.exports = { sleep, isObject, isArray, toAsync }