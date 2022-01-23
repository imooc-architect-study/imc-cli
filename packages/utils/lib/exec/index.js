const path = require("path");
const log = require("../log/index.js");
const Package = require("../package/index.js");

const SETTINGS = {
  init: "@imooc-cli/init",
};

const CACHE_DIR = "dependencise/";

async function exec() {
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

  // 实现动态加载模块
  if (!targetPath) {
    //   没有传入执行文件的目录的路径，说明是使用缓存模式，使用我们自己定义的@imc-cli/init
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
    if (await pkg.exits()) {
      //   更新package
      await pkg.update()
    } else {
      //   安装package
      await pkg.install();
    }
  } else {
    //   非缓存模式，使用用户自定义的包
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }

  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    require(rootFile).apply(null, arguments);
  }
}

module.exports = exec;
