"use strict";

const fse = require("fs-extra");
const inquirer = require("inquirer");
const semver = require("semver");
const { Command, log } = require("@imc-cli/utils");

const TYPE_PROJECT = "project";

const TYPE_COMPONENT = "component";

class InitCommand extends Command {
  init() {
    const options = this._cmd.opts;
    // 初始化的项目名称
    this.projectName = this._argv[0] || "";
    // 是否强制初始化项目
    this.force = !!options.force;
    log.verbose("projectName", this.projectName);
    log.verbose("force", this.force);
  }

  async exec() {
    try {
      // 1、准备阶段
      // 2、下载模板
      // 3、安装模板
      const projectInfo = await this.prepare();
      if (projectInfo) {
        log.verbose('projectInfo', projectInfo)
        this.downloadTemplate()
      }
    } catch (error) {
      log.error(error.message);
    }
  }

  downloadTemplate(){}

  async prepare() {
    // 1、判断当前目录是否为空
    // 2、是否启动强制更新

    // 获取当前所在的位置
    const localPath = process.cwd();
    if (!this.isDirEmpty(localPath)) {
      // 非空的情况下
      let ifContinue = false;
      if (!this.force) {
        // 输入--force的情况下不询问是否继续创建目录
        // 1.1、询问是否继续创建
        const ret = await inquirer.prompt({
          type: "confirm",
          name: "ifContinue",
          message: "当前文件夹不为空，是否继续创建项目",
          default: false,
        });
        ifContinue = ret.ifContinue;
        if (!ifContinue) {
          // 如果选择了不继续创建项目，则退出程序
          return;
        }
      }
      if (ifContinue || this.force) {
        // 用户选择了继续创建项目或者传入了--force
        // 二次询问，确认信息
        const { confirmDelete } = await inquirer.prompt({
          type: "confirm",
          name: "confirmDelete",
          message: "是否确认清空当前目录下所有文件",
          default: false,
        });
        if (confirmDelete) {
          // 清空当前目录下所有文件，不删除目录
          fse.emptyDirSync(localPath);
        }
      }
    }
    return await this.getProjectInfo();
  }

  async getProjectInfo() {
    // 1、选择创建项目或者组件
    // 2、获取项目基本信息
    let info = null;
    const { type } = await inquirer.prompt({
      type: "list",
      name: "type",
      message: "请选择初始化类型",
      default: TYPE_PROJECT,
      choices: [
        { name: "项目", value: TYPE_PROJECT },
        { name: "组件", value: TYPE_COMPONENT },
      ],
    });
    if (type === TYPE_PROJECT) {
      const projectInfo = await inquirer.prompt([
        {
          type: "input",
          name: "projectName",
          message: "请输入项目名称",
          // 校验输入的内容
          validate(v) {
            return typeof v === "string";
          },
          // 处理输入的内容，也就是最终的到的结果
          filter(v) {
            return v;
          },
        },
        {
          type: "input",
          name: "projectVersion",
          message: "请输入项目版本号",
          default: "1.0.0",
          validate(v) {
            const done = this.async();
            setTimeout(function () {
              const ret = !!semver.valid(v)
              if (!ret) {
                done("请输入合法版本号");
                return;
              }
              done(null, true);
            }, 0);
          },
          filter(v) {
            const ret = semver.valid(v);
            return !!ret ? ret : v;
          },
        },
      ]);
      info = {
        type,
        ...projectInfo
      }
    } else if (type === TYPE_COMPONENT) {
    }

    return info;
  }

  // 判断当前目录是否为空
  isDirEmpty(dirPath) {
    // 读取文件
    let fileList = fse.readdirSync(dirPath);
    fileList = fileList.filter((file) => {
      // 如果是以.开头的或者是node_modules文件夹，则认为是缓存文件，不影响我们创建
      return !file.startsWith(".") && ["node_modules"].indexOf(file) < 0;
    });
    return fileList.length === 0;
  }
}

function init(argv) {
  // console.log(projectName, options.force, process.env.CLI_TARGET_PATH);

  return new InitCommand(argv);
}

module.exports = init;

module.exports.InitCommand = InitCommand;
