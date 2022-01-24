const semver = require("semver");
const colors = require("colors");
const types = require("../types/index.js");
const log = require("../log/index.js");
const LOWEST_NODE_VERSION = "12.0.0";

class Command {
  constructor(argv) {
    if (!argv) {
      throw new Error("Commander 参数不能为空");
    }
    if (!types.isArray(argv)) {
      throw new Error("Commander 参数必须是数组");
    }
    if (argv.length < 1) {
      throw new Error("Commander 参数长度必须大于1");
    }
    this._argv = argv;
    const runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve();
      // 检查node版本号
      chain = chain.then(() => this.checkNodeVersion());
      // 初始化参数
      chain = chain.then(() => this.initArgs());
      // 执行init方法
      chain = chain.then(() => this.init());
      // 执行exec方法
      chain = chain.then(() => this.exec());
      // 捕获错误
      chain.catch((error) => {
        log.error(error.message);
        if (process.env.LOG_LEVEL === "verbose") {
          console.log(error);
        }
      });
    });
  }

  initArgs() {
    this._cmd = this._argv[this._argv.length - 1];
    this._argv = this._argv.slice(0, this._argv.length - 1);
  }

  // 检查node版本号
  checkNodeVersion() {
    const currentVersion = process.version;
    // 比对版本号
    if (!semver.gte(currentVersion, LOWEST_NODE_VERSION)) {
      throw new Error(
        colors.red(
          `imc-cli 需要安装 v${LOWEST_NODE_VERSION} 以上版本的 Node.js`
        )
      );
    }
  }

  // 强制要求继承的子类实现init方法
  init() {
    throw new Error("子类必须实现 init 方法");
  }

  // 强制要求继承的子类实现exec方法
  exec() {
    throw new Error("子类必须实现 exec 方法");
  }
}

module.exports = Command;
