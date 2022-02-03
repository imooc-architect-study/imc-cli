"use strict";

const path = require("path");
const fse = require("fs-extra");
const semver = require("semver");
const colors = require("colors");
const { log } = require("@imc-cli/utils");
const CloudBuild = require("@imc-cli/cloud-build");
const LOWEST_NODE_VERSION = "12.0.0";
const Git = require("@imc-cli/git");

class PublishCommand {
  constructor(options) {
    this.options = options;
    this.git = null;
    this.start();
  }

  start() {
    try {
      this.checkNodeVersion();
      this.init();
      this.exec();
    } catch (error) {
      log.error(error.message);
    }
  }

  // 检查node版本号
  checkNodeVersion() {
    const currentVersion = process.version;
    if (!semver.gte(currentVersion, LOWEST_NODE_VERSION)) {
      throw new Error(
        colors.red(
          `imc-cli publish 需要安装 v${LOWEST_NODE_VERSION} 以上版本的 Node.js`
        )
      );
    }
  }

  init() {}

  async exec() {
    try {
      const startTime = new Date().getTime();
      // 1、初始化检查
      await this.prepare();
      // 2、git flow自动化
      await this.gitCheck();
      // 3、云构建和云发布
      await this.build();
      const endTime = new Date().getTime();
      log.info(`本次发布耗时：${Math.floor((endTime - startTime) / 1000)}秒`);
    } catch (error) {
      log.error(error.message);
    }
  }

  async gitCheck() {
    this.git = new Git(process.cwd());
    await this.git.prepare();
    await this.git.checkCommit()
  }

  async build() {
    // 获取打包命令
    const buildCmd = this.options.buildCmd || "npm run build";

    const cloudBuild = new CloudBuild({
      buildCmd,
      repo: this.git.repo,
      branch: this.git.branch,
    });
    //  初始化
    await cloudBuild.init();
    //  开始打包
    await cloudBuild.build();
  }

  // 预检查
  async prepare() {
    // 1、检查是否为npm项目
    // 2、确认是否包含name，version，build命令
    const projectPath = process.cwd();
    const pckPath = path.resolve(projectPath, "package.json");
    log.verbose("package.json", pckPath);
    if (!fse.existsSync(pckPath)) {
      throw new Error("package.json不存在");
    }
    // const pck = fse.readJsonSync(pckPath);
    // const { name, version, scripts } = pck;
    // log.verbose("package.json", name, version, scripts);
    // if (!name || !version || !scripts || !scripts.build) {
    //   throw new Error(
    //     "package.json信息不全，请检查是否存在name、version和scripts（需提供build命令）"
    //   );
    // }
    // this.projectInfo = { name, version, dir: projectPath };
  }
}

function publish(options) {
  return new PublishCommand(options);
}

module.exports = publish;
