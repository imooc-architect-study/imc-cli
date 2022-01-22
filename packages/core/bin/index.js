#!/usr/bin/env node

const importLocal = require("import-local");

const { log } = require("@imc-cli/utils");

// npm i 之后，如果本地有相同的模块，优先使用是本地的模块，参考lerna
if (importLocal(__filename)) {
  log.info("cli", "正在使用 imc-cli 本地版本");
} else {
  require('../lib/index.js')()
}
