const path = require("path");
const pkgDir = require("pkg-dir").sync;
const npminstall = require("npminstall");
const types = require("../types/index.js");
const npmUtils = require("../npm/index");

class Package {
  constructor(options) {
    if (!options) {
      throw new Error("Package类的options参数不能为空");
    }
    if (!types.isObject(options)) {
      throw new Error("Package类的options参数必须为对象");
    }
    // package的路径
    this.targetPath = options.targetPath;
    // package的存储路径
    this.storeDir = options.storeDir;
    // package的name
    this.packageName = options.packageName;
    // package的version
    this.packageVersion = options.packageVersion;
  }

  // 判断当前package是否存在
  exits() {}

  // 安装package
  install() {
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: npmUtils.getDefaultRegistry(),
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    });
  }

  // 获取入口文件路径
  getRootFilePath() {
    // 1、找到package.json所在的目录
    const dir = pkgDir(this.targetPath);
    if (dir) {
      // 2、读取package.json
      const pkgFile = require(path.resolve(dir, "package.json"));
      // 3、寻找入口文件
      if (pkgFile && pkgFile.main) {
        return path.resolve(dir, pkgFile.main);
      }
    }
    return null;
  }
}

module.exports = Package;
