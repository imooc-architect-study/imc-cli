const toString = Object.prototype.toString;

function isObject(data) {
  return toString.call(data) === "[object Object]";
}

module.exports = {
  isObject,
};
