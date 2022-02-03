"use strict";
const simpleGit = require("simple-git");
const { log } = require("@imc-cli/utils");
const inquirer = require("inquirer");

class Git {
  constructor(dir) {
    this.dir = dir;
      this.git = simpleGit(dir);
    // this.git.outputHandler((cmd, stdOut, stdErr, ...args) => {
    //     stdOut.on('data', buffer => console.log(buffer.toString()));
    //   });
    //   仓库地址
    this.repo = null;
    // 仓库分支
    this.branch = null;
  }

  // 检查提交
  async checkCommit() {
    await this.checkConflicted();
    // 查看文件状态
    await this.checkNotCommitted();
    await this.pullCommitted();
    await this.checkConflicted();
    await this.pushCommitted();
  }
  // 拉取代码
  async pullCommitted() {
    log.notice("开始拉取远程仓库代码");
    await this.git.pull();
    log.success("远程仓库代码拉取成功");
  }
  // 提交代码到远程仓库
  async pushCommitted() {
    if (!this.fileHasChanged()) {
      log.notice("没有代码需要提交到远程仓库");
      return;
    }
    log.notice("开始提交代码到远程仓库");
    await this.git.push();
    log.success("代码成功提交到远程仓库");
  }
// 本地代码仓库是否发生变化
  async fileHasChanged() {
    const status = await this.git.status();
    return (
      status.not_added.length > 0 ||
      status.created.length > 0 ||
      status.deleted.length > 0 ||
      status.modified.length > 0 ||
      status.renamed.length > 0
    );
  }

  // 检查没有提交的代码
  async checkNotCommitted() {
    if (await this.fileHasChanged()) {
      log.notice("存在没有提交的文件");
      const status = await this.git.status();
      await this.git.add(status.not_added);
      await this.git.add(status.created);
      await this.git.add(status.deleted);
      await this.git.add(status.modified);
      await this.git.add(status.renamed);
      const message = (
        await inquirer.prompt({
          type: "input",
          name: "message",
          message: "请输入 commit 信息：",
          validate(v) {
            // const done = this.async();
            // setTimeout(function () {
            //   if (!v) {
            //     done("commit 信息不能为空");
            //     return;
            //   }
            //   done(null, true);
            // }, 0);
            // 上面的写法会阻塞this.git.commit执行
            return !!v
          },
        })
      ).message;
      
      await this.git.commit(message);
      log.success("本地 commit 提交成功");
    }
  }

  // 检查代码冲突
  async checkConflicted() {
    const status = await this.git.status();
    log.notice("代码冲突检查");
    if (status.conflicted.length > 0) {
      // 代码存在冲突
      throw new Error("代码存在冲突，请手动处理");
    }
    log.success("代码冲突检查通过");
  }

  async prepare() {
    this.repo = await this.getRepo();
    if (!this.repo) {
      throw new Error("查询不到仓库地址");
    }
    this.branch = await this.getBranch();
    if (!this.branch) {
      throw new Error("获取不到当前分支");
    }
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
    return ret.current;
  }
}

module.exports = Git;
