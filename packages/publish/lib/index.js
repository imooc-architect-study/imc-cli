"use strict";

const path = require("path");
const fse = require("fs-extra");
const semver = require("semver");
const colors = require("colors");
const { log, request } = require("@imc-cli/utils");
const CloudBuild = require("@imc-cli/cloud-build");
const LOWEST_NODE_VERSION = "12.0.0";
const Git = require("@imc-cli/git");
const terminalLink = require("terminal-link");
const inquirer = require("inquirer");

class PublishCommand {
  constructor(options) {
    this.options = options;
    this.git = null;
    this.start();
  }

  start() {
    try {
      this.checkNodeVersion();
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

  async exec() {
    try {
      const startTime = new Date().getTime();
      // 1、初始化检查
      await this.prepare();
      // 2、git 自动化
      await this.gitCheck();
      // 3、云构建和云发布
      await this.build();
      if (this.options.prod) {
        // 升级版本号
        await this.updateVersion();
        // 打tag
        await this.addTag();
        // 合并分支到主线
        await this.mergeBranchToMaster()
      }
      const endTime = new Date().getTime();
      log.info(`本次发布耗时：${Math.floor((endTime - startTime) / 1000)}秒`);
    } catch (error) {
      log.error(error.message);
    }
  }

  async mergeBranchToMaster() {
    await this.git.mergeBranchToMaster()
    log.success(`${this.git.branch}分支代码合并到到master分支成功`)
  }

  // 打标签
  async addTag() {
    const pckPath = path.resolve(process.cwd(), "package.json");
    const pck = fse.readJsonSync(pckPath);
    const currentVersion = pck.version;
    await this.git.addTag(`v${currentVersion}`);
    log.success(`v${currentVersion} 版本标签创建成功，并推送到远程仓库`);
  }

  // 升级版本号
  async updateVersion() {
    const pckPath = path.resolve(process.cwd(), "package.json");
    const pck = fse.readJsonSync(pckPath);
    const currentVersion = pck.version;
    const version = (
      await inquirer.prompt({
        type: "list",
        name: "version",
        message: `选择将要升级的版本(当前版本 ${currentVersion} )：`,
        choices: this.getVersionsList(currentVersion),
      })
    ).version;
    pck.version = version;
    fse.writeFileSync(pckPath, JSON.stringify(pck, null, 2));
    await this.git.addCommitted("update:升级版本号");
    await this.git.pushCommitted(false);
    log.success("版本号升级成功");
  }

  getVersionsList(version) {
    version = version.split("+");

    const currentVersion = version[0];
    const levels = ["patch", "minor", "major"];
    const opts = [];

    levels.forEach(function (item) {
      const val = semver.inc(currentVersion, item);
      opts.push({
        name: val,
        value: val,
      });
    });

    return opts;
  }

  async gitCheck() {
    this.git = new Git(process.cwd());
    await this.git.prepare();
    await this.checkGitRemote()
    await this.git.checkCommit();
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
    this.checkPackageJson();
  }

  checkPackageJson() {
    // 1、检查是否为npm项目
    const projectPath = process.cwd();
    const pckPath = path.resolve(projectPath, "package.json");
    log.verbose("package.json", pckPath);
    if (!fse.existsSync(pckPath)) {
      throw new Error("package.json不存在");
    }
  }

  // 检查当前仓库是否已经在平台注册
  async checkGitRemote() {
    const res = await request.get("/imcCli/cloudBuildTask/checkTask", {
      params: {
        repo: this.git.repo,
        branch: this.git.branch,
      },
    });
    if (res.code !== 200) {
      if (res.code === 2) {
        throw new Error(
          `${res.message}：${terminalLink("链接", "http://127.0.0.1:7001")}`
        );
      } else {
        throw new Error(res.message);
      }
    }
  }
}

function publish(options) {
  return new PublishCommand(options);
}

module.exports = publish;
