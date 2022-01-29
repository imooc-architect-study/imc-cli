const path = require("path");
const pkgDir = require("pkg-dir").sync;
const pathExists = require("path-exists").sync;
const fse = require('fs-extra')
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
    //   package缓存目录前缀，cnpm的格式
    this.cacheFilePathPrefix = this.packageName.replace("/", "_");
  }

  async prepare() {
    if (this.storeDir && !pathExists(this.storeDir)) {
      fse.mkdirpSync(this.storeDir)
    }
    if (this.packageVersion === "latest") {
      // 查找最新版本号
      this.packageVersion = await npmUtils.getNpmLatestVersion(
        this.packageName
      );
    }
  }

  // 根据版本号拼接出缓存路径
  getSpecificCacheFilePath(version) {
    // 路径是根据pnpm下载的规则来的
    return  path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${version}@${this.packageName}`
    );
  }

  async update() {
    await this.prepare()
    // 获取最新npm模块版本号
    // const latestNpmVersion = await npmUtils.getNpmLatestVersion(
    //   this.packageName
    // );
    // 查询版本号对应的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(this.packageVersion)
    // 如果不存在，则直接安装最新版本
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storeDir,
        registry: npmUtils.getDefaultRegistry(),
        pkgs: [{ name: this.packageName, version: this.packageVersion }],
      });
      // this.packageVersion = latestNpmVersion
    }

  }

  // 缓存路径
  get cacheFilePath() {
    // _@imooc-cli_init@1.1.2@@imooc-cli
    return path.resolve(
      this.storeDir,
      `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`
    );
  }

  // 判断当前package是否存在
  async exits() {
    if (this.storeDir) {
      //   缓存模式
      await this.prepare();
      return pathExists(this.cacheFilePath);
    } else {
      return pathExists(this.targetPath);
    }
  }

  // 安装package
  async install() {
    await this.prepare();
    return npminstall({
      root: this.targetPath,
      storeDir: this.storeDir,
      registry: npmUtils.getDefaultRegistry(),
      pkgs: [{ name: this.packageName, version: this.packageVersion }],
    });
  }

  // 获取入口文件路径
  getRootFilePath() {
    function _getFilePath(targetPath) {
      // 1、找到package.json所在的目录
      const dir = pkgDir(targetPath);
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
    if (this.storeDir) {
      // 使用缓存的情况
      return _getFilePath(this.cacheFilePath)
    } else {
      return _getFilePath(this.targetPath)
    }
  }
}

module.exports = Package;
