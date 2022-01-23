const path = require("path");
const log = require("../log/index.js");
const Package = require("../package/index.js");

const SETTINGS = {
  init: "@imc-cli/init",
};

const CACHE_DIR = "dependencise/";

function exec() {
  // 执行文件的目录
  let targetPath = process.env.CLI_TARGET_PATH;
  // 缓存目录
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = "";
  let pkg;
  log.verbose("targetPath", targetPath);
  log.verbose("homePath", homePath);
  const options = arguments[arguments.length - 1];
  // 执行的命令名称
  const cmdName = options.name();
  // 执行的包名
  const packageName = SETTINGS[cmdName];
  // 执行的npm包版本号
  const packageVersion = "latest";
  if (!targetPath) {
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose("targetPath", targetPath);
    log.verbose("storeDir", storeDir);
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storeDir,
    });
    if (pkg.exits()) {
      //   更新package
    } else {
      //   安装package
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
    }
    
    const rootFile = pkg.getRootFilePath()
    require(rootFile).call(null,arguments)
}

module.exports = exec;
