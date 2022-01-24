const toString = Object.prototype.toString;

function isObject(data) {
  return toString.call(data) === "[object Object]";
}

function isArray(data) {
  return Array.isArray(data)
}

module.exports = {
  isObject,
  isArray
};
