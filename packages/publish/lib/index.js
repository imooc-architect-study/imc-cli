"use strict";

const path = require("path");
const fse = require("fs-extra");
const semver = require("semver");
const colors = require("colors");
const { log } = require("@imc-cli/utils");
const CloudBuild = require("@imc-cli/cloud-build");
const LOWEST_NODE_VERSION = "12.0.0";
const simpleGit = require("simple-git");

class PublishCommand {
  constructor(options) {
    this.options = options;
    this.git = null;
    // 仓库地址
    this.repo = null;
    // 分支
    this.branch = null
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

  init() {
    const dir = process.cwd();
    this.git = simpleGit(dir);
    // // https://gitee.com/c10342/imc-cli-test.git
    // const userName = (await this.git.getConfig('user.name')).value
    // console.log(userName);
  }

  // 获取仓库地址
  async getRepo() {
    const reg = /((http(s)?:\/\/([^\/]+?\/){2}|git@[^:]+:[^\/]+?\/).*?.git)/;
    const ret = await this.git.remote({ "-v": true });
    const arr = ret.match(reg);
    if (arr && arr[0]) {
      return arr[0];
    }

    return null;
  }

  // 获取分支
  async getBranch() {
    const ret = await this.git.branch();
    const branches = ret.branches || []
    const res = Object.keys(branches).map(key=>branches[key]).find(item=>item.current)
    return res?res.name:null
  }

  async exec() {
    try {
      const startTime = new Date().getTime();
      // 1、初始化检查
      await this.prepare();
      // 2、git flow自动化，直接忽略，没啥用
      // const git = new Git(this.projectInfo,this.options);
      // await git.prepare();
      // 3、云构建和云发布
       this.build();
      const endTime = new Date().getTime();
      log.info(`本次发布耗时：${Math.floor((endTime - startTime) / 1000)}秒`);
    } catch (error) {
      log.error(error.message);
    }
  }

   build() {
    // 获取打包命令
    const buildCmd = this.options.buildCmd || "npm run build";

    const cloudBuild = new CloudBuild({ buildCmd, repo: this.repo ,branch:this.branch});
    cloudBuild.init();
  }

  // 预检查
  async prepare() {
    
    this.repo = await this.getRepo()
    if (!this.repo) {
      throw new Error('查询不到仓库地址')
    }
    this.branch = await this.getBranch()
    if (!this.branch) {
      throw new Error('获取不到当前分支')
    }
    // 1、检查时候为npm项目
    // 2、确认是否包含name，version，build命令
    // const projectPath = process.cwd();
    // const pckPath = path.resolve(projectPath, "package.json");
    // log.verbose("package.json", pckPath);
    // if (!fse.existsSync(pckPath)) {
    //   throw new Error("package.json不存在");
    // }
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
