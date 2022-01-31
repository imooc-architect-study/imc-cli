"use strict";

const fse = require("fs-extra");
const path = require("path");
const inquirer = require("inquirer");
const semver = require("semver");
const ejs = require("ejs");
const glob = require("glob");
const {
  Command,
  log,
  Package,
  spinner,
  execCommand,
  types,
} = require("@imc-cli/utils");
const getProjectTemplate = require("./getProjectTemplate.js");

const TYPE_PROJECT = "project";

const TYPE_COMPONENT = "component";

// 模板类型
const TEMPLATE_TYPE = {
  normal: "normal",
  custom: "custom",
};

// 可执行命令白名单
const WHITE_COMMAND_LIST = ["npm", "cnpm"];

class InitCommand extends Command {
  init() {
    const options = this._cmd.opts;
    // 初始化的项目名称
    this.projectName = this._argv[0] || "";
    // 是否强制初始化项目
    this.force = !!options.force;
    // 用户通过命令行交互选择的信息
    this.projectInfo = null;
    // 用户选择的项目模板信息
    this.templateInfo = null;
    // 模板npm包管理
    this.templateNpm = null;
    this.templateList = [];
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
        log.verbose("projectInfo", projectInfo);
        this.projectInfo = projectInfo;
        await this.downloadTemplate();
        await this.installTemplate();
      }
    } catch (error) {
      log.error(error.message);
    }
  }

  async installTemplate() {
    if (this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE.normal;
      }

      if (this.templateInfo.type === TEMPLATE_TYPE.normal) {
        await this.installNormalTemplate();
      } else if (this.templateInfo.type === TEMPLATE_TYPE.custom) {
        await this.installCustomTemplate();
      } else {
        throw new Error("无法识别项目模板类型");
      }
    } else {
      throw new Error("项目模板信息不存在");
    }
  }

  async installNormalTemplate() {
    try {
      spinner.start("正在安装模板...");
      const cacheFilePath = this.templateNpm.cacheFilePath;
      // 获取模板存储目录，规定是放在npm包中的template目录
      const templatePath = path.resolve(cacheFilePath, "template");
      // 当前命令行窗口所在目录
      const currentPath = process.cwd();
      // 确保目录是存在的，防止报错
      fse.ensureDirSync(templatePath);
      // 拷贝项目模板到当前目录
      fse.copySync(templatePath, currentPath);
      spinner.stop();
      log.success("安装模板成功");

      // 处理模板
      await this.renderTemplate({ ignore: this.templateInfo.ignore || [] });

      const { installCommand, startCommand } = this.templateInfo;
      log.info("执行安装依赖命令");
      // 执行安装命令
      await this.execCommand(installCommand, "依赖安装过程中失败");
      log.info("执行启动命令");
      // 执行启动命令
      await this.execCommand(startCommand, "启动过程中失败");
    } catch (error) {
      spinner.stop();
      throw error;
    }
  }

  async installCustomTemplate() {
    console.log("安装自定义模板");
    // 1、根据package.json获取入口文件
    // 2、require入口文件
    // 3、传入参数，执行函数

  }

  // 处理模板
  async renderTemplate(options) {
    return new Promise(async (resolve, reject) => {
      const fileList = await this.getAllTemplateFiles(options);
      const taskList = fileList.map((file) => this.ejsRender(file));
      Promise.all(taskList).then(resolve).catch(reject);
    });
  }

  // 渲染ejs模板
  ejsRender(filename) {
    return new Promise((resolve, reject) => {
      const cwd = process.cwd();
      const filePath = path.resolve(cwd, filename);
      ejs.renderFile(filePath, this.projectInfo, {}, function (err, str) {
        if (err) {
          reject(err);
          return;
        }
        fse.writeFileSync(filePath, str);
        resolve(str);
      });
    });
  }

  // 获取模板文件·
  getAllTemplateFiles(options) {
    return new Promise((resolve, reject) => {
      glob(
        // 获取所有文件
        "**",
        {
          cwd: process.cwd(),
          // 忽略的文件
          ignore: options.ignore || "",
          // 排除目录，只要文件
          nodir: true,
        },
        function (er, files) {
          if (er) {
            reject(er);
            return;
          }
          resolve(files);
        }
      );
    });
  }

  async execCommand(command, errorMessage) {
    if (command) {
      // 执行安装命令
      const arr = command.split(" ").filter(Boolean);
      const cmd = this.checkCommand(arr[0]);
      if (!cmd) {
        throw new Error(`命令不合法，只能是：${WHITE_COMMAND_LIST.join(",")}`);
      }
      const args = arr.slice(1);
      const ret = await execCommand.execCommandAsync(cmd, args, {
        cwd: process.cwd(),
        stdio: "inherit",
      });
      if (ret !== 0) {
        throw new Error(errorMessage);
      }
    }
  }

  checkCommand(cmd) {
    const index = WHITE_COMMAND_LIST.findIndex((item) => item === cmd);
    if (index > -1) {
      return cmd;
    }
    return null;
  }

  async downloadTemplate() {
    // 用户选择的项目模板
    const { template } = this.projectInfo;
    this.templateInfo = this.templateList.find(
      (item) => item.npmName === template
    );
    // 缓存目录
    const homePath = process.env.CLI_HOME_PATH;
    // 模板存储路径
    const targetPath = path.resolve(homePath, "template");
    const storeDir = path.resolve(targetPath, "node_modules");
    const { npmName, version } = this.templateInfo;
    const templateNpm = new Package({
      targetPath,
      storeDir,
      packageName: npmName,
      packageVersion: version,
    });
    this.templateNpm = templateNpm;
    if (!(await templateNpm.exits())) {
      try {
        spinner.start("正在下载模板...");
        await templateNpm.install();
        spinner.stop();
        log.success("模板下载成功");
      } catch (error) {
        spinner.stop();
        throw error;
      }
    } else {
      try {
        spinner.stop("正在更新模板...");
        await templateNpm.update();
        spinner.stop();
        log.success("模板更新成功");
      } catch (error) {
        spinner.stop();
        throw error;
      }
    }
  }

  async prepare() {
    // 1、先判断模板是否存在，不存在后面的操作就不存在意义了
    // 2、判断当前目录是否为空
    // 3、是否启动强制更新

    // 调用api获取服务端的模板数据
    const templateList = await getProjectTemplate();

    if (!templateList || templateList.length === 0) {
      throw new Error("项目模板不存在");
    }
    // 保存模板列表
    this.templateList = templateList;

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
    // 过滤模板
    this.templateList = this.templateList.filter((tpl) => {
      if (types.isArray(tpl.tag)) {
        return tpl.tag.includes(type);
      }
      return true;
    });
    const title = type === TYPE_PROJECT ? "项目" : "组件";
    const promptList = [];
    const obj = {};
    if (!this.projectName) {
      // 用户没有在命令行中输入项目名称时，需要询问项目名称
      promptList.push({
        type: "input",
        name: "name",
        message: `请输入${title}名称`,
        // 校验输入的内容
        validate(v) {
          return typeof v === "string";
        },
        // 处理输入的内容，也就是最终的到的结果
        filter(v) {
          return v;
        },
      });
    } else {
      obj.name = this.projectName;
    }
    promptList.push(
      {
        type: "input",
        name: "version",
        message: `请输入${title}版本号`,
        default: "1.0.0",
        validate(v) {
          const done = this.async();
          setTimeout(function () {
            const ret = !!semver.valid(v);
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
      {
        type: "list",
        name: "template",
        message: `请选择${title}模板`,
        choices: this.createProjectChoices(),
      }
    );
    if (type === TYPE_PROJECT) {
    } else if (type === TYPE_COMPONENT) {
      promptList.push({
        type: "input",
        name: "description",
        message: "请输入描述信息",
        // 校验输入的内容
        validate(v) {
          return typeof v === "string";
        },
      });
    }
    const projectInfo = await inquirer.prompt(promptList);

    return {
        ...obj,
        type,
        ...projectInfo,
      };
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

  createProjectChoices() {
    return this.templateList.map((item) => {
      return {
        value: item.npmName,
        name: item.name,
      };
    });
  }
}

function init(argv) {
  return new InitCommand(argv);
}

module.exports = init;

module.exports.InitCommand = InitCommand;
