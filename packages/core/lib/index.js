"use strict";

const path = require("path");
const semver = require("semver");
const colors = require("colors/safe");
const rootCheck = require("root-check");
const userhome = require("userhome");
const pathExists = require("path-exists").sync;
const dotenv = require("dotenv");
const { Command } = require("commander");
const { log, npmUtils, exec } = require("@imc-cli/utils");
// const init = require("@imc-cli/init");
const constants = require("./const.js");
const pkg = require("../package.json");

const userHomePath = userhome();

async function core() {
  try {
    await prepare();
    //   注册命令
    registerCommander();
  } catch (error) {
    log.error(error.message);
    if (process.env.LOG_LEVEL === "verbose") {
      console.log(error);
    }
  }
}

async function prepare() {
  // 检查脚手架版本号
  checkPkgVersion();
  //   root账号启动检查和自动降级功
  checkRoot();
  //   检查用户主目录是否存在
  checkUserHome();
  //   加载环境变量
  checkEnv();
  //   检查更新版本号
  await checkGlobalUpdate();
}

function checkPkgVersion() {
  log.info("cli", pkg.version);
}


function checkRoot() {
  // 检查root账号，如果用户是通过root去创建的文件，其他用户去修改会导致报错
  rootCheck();
}

function checkUserHome() {
  if (!userHomePath || !pathExists(userHomePath)) {
    throw new Error(colors.red("当前登录用户不存在主目录"));
  }
}

function checkEnv() {
  // 加载用户主目录下.env文件
  const dotenvPath = path.resolve(userHomePath, ".env");
  if (pathExists(dotenvPath)) {
    // 将.env文件的内容加载进环境变量中，process.env
    const config = dotenv.config({
      path: dotenvPath,
    });
  }
  if (process.env.CLI_HOME) {
    process.env.CLI_HOME_PATH = path.join(userHomePath, process.env.CLI_HOME);
  } else {
    process.env.CLI_HOME_PATH = path.join(
      userHomePath,
      constants.DEFAULT_CLI_HOME
    );
  }
}

async function checkGlobalUpdate() {
  // 获取当前版本号和模块名
  const currentVersion = pkg.version;
  const npmName = pkg.name;
  const latestVersion = await npmUtils.getNpmLatestSemverVersion(
    currentVersion,
    npmName
  );
  if (latestVersion && semver.gt(latestVersion, currentVersion)) {
    //   提示版本升级
    log.warn(
      colors.yellow(
        `请手动更新 ${npmName}，当前版本：${currentVersion}，最新版本：${latestVersion}，更新命令：npm i ${npmName} -g`
      )
    );
  }
}

function registerCommander() {
  const program = new Command();
  program
    .name(Object.keys(pkg.bin)[0])
    // 用法
    .usage("<command> [options]")
    // 版本号
    .version(pkg.version)
    // 参数
    .option("-d,--debug", "是否开启调试模式", false)
    .option("-tp,--targetPath <targetPath>", "是否指定本地调试文件路径");

  // 注册init命令
  program
    .command("init [projectName]")
    .option("-f,--force", "是否强制初始化项目", false)
    .action(exec);

  // 监听参数
  program.on("option:debug", () => {
    const options = program.opts();
    if (options.debug) {
      process.env.LOG_LEVEL = "verbose";
    } else {
      process.env.LOG_LEVEL = "info";
    }
    log.level = process.env.LOG_LEVEL;
  });

  // 监听targetPath参数，添加到全局的环境变量中，方便使用
  program.on("option:targetPath", () => {
    const options = program.opts();
    process.env.CLI_TARGET_PATH = options.targetPath;
  });

  // 监听未知命令，所有没有被匹配到的命令
  program.on("command:*", (obj) => {
    const availableCommands = program.commands.map((cmd) => cmd.name());
    console.log(colors.red(`未知命令：${obj[0]}`));
    if (availableCommands && availableCommands.length > 0) {
      console.log(colors.red(`可用命令：${availableCommands.join(",")}`));
    }
  });

  program.parse(process.argv);

  if (program.args && program.args.length < 1) {
    // program.args是上面已经声明的参数
    // 没有参数的情况，也就是直接输入 imc-cli
    program.outputHelp();
  }
}

module.exports = core;
