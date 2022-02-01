const fs = require("fs");

function readFile(path, options = {}) {
  if (fs.existsSync(path)) {
    const buffer = fs.readFileSync(path);
    if (buffer) {
      if (options.toJson) {
        return buffer.toJSON();
      } else {
        return buffer.toString();
      }
    }
  }
  return null;
}

function writeFile(path, data, { rewirte = true } = {}) {
  if (fs.existsSync(path)) {
    if (rewirte) {
      fs.writeFileSync(path, data);
      return true;
    }
    return false;
  } else {
    fs.writeFileSync(path, data);
    return true;
  }
}

module.exports = {
  readFile,
  writeFile,
};
