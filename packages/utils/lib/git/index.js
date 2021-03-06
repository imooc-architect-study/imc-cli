const simpleGit = require("simple-git");
const path = require("path");
const fse = require("fs-extra");
const terminalLink = require('terminal-link')
const inquirer = require('inquirer')
const tools = require("../tools/index.js");
const log = require("../log/index.js");
const Github = require("./github");
const Gitee = require("./gitee");

// git存储目录
const GIT_ROOT_DIR = ".git";
// 缓存文件
const GIT_SERVER_FILE = ".git_server";
const GIT_TOKEN_FILE = '.git_token'
const GIT_OWNER_FILE = '.git_owner'
const GIT_LOGIN_FILE = '.git_login'

const GIT_SERVER_TYPE = { github: "github", gitee: "gitee" };

const GIT_SERVER_TYPE_LIST = [
  { name: "Github", value: GIT_SERVER_TYPE.github },
  { name: "Gitee", value: GIT_SERVER_TYPE.gitee },
];

const GIT_OWNER_TYPE = {
  user: 'user',
  org:'org'
}

const GIT_OWNER_TYPE_LIST = [
  {
    name: '个人',
    value:GIT_OWNER_TYPE.user
  },
  {
    name: '组织',
    value:GIT_OWNER_TYPE.org
  }
]

const GIT_OWNER_TYPE_ONLY = [
  {
    name: '个人',
    value:GIT_OWNER_TYPE.user
  },
]

class Git {
  constructor({ name, version, dir }, { refreshServer = false,refreshToken = false,refreshOwner=false } = {}) {
    // 是否强制更新远程托管平台
    this.refreshServer = refreshServer;
    // 强制更新token
    this.refreshToken = refreshToken
    // 强制刷新仓库类型
    this.refreshOwner = refreshOwner
    // 项目名称
    this.name = name;
    // 项目版本号
    this.version = version;
    this.token = null
    // 用户信息
    this.user = null
    // 用户所属组织
    this.orgs = null
    // 仓库类型
    this.owner = null
    // 登录名
    this.login = null
    // 项目路径
    this.dir = dir;
    this.git = simpleGit(dir);
    this.gitServer = null;
    // 缓存目录
    this.homePath = process.env.CLI_HOME_PATH;
  }

  async prepare() {
    // 检查代码托管平台
    await this.checkGitServer();
    // 检查token
    await this.checkGitToken()
    // 获取用户信息和组织
    await this.getUserAnrOrgs()
    // 获取仓库类型
    await this.checkGitOwner()
  }

  async checkGitToken() {
    // 生成token文件存放路径
    const tokenPath = this.createPath(GIT_TOKEN_FILE)
    // 获取token
    let token = tools.readFile(tokenPath)
    // 判断是否存在token或者是否强制刷新token
    if (!token || this.refreshToken) {
      log.warn(`${this.gitServer.type} token未生成，请先生成token，${terminalLink('链接', this.gitServer.getTokenUrl())}`)
      
      token = (await inquirer.prompt({
        type: 'password',
        name: 'token',
        message:'请将token复制到这里'
      })).token
      tools.writeFile(tokenPath, token)
      log.success('token写入成功',`${token} -> ${tokenPath}`)
    } else {
      log.success('token获取成功',tokenPath)
    }
    this.token = token
    this.gitServer.setToken(token)
  }

  async checkGitServer() {
    // 创建缓存文件路径
    const gitServerPath = this.createPath(GIT_SERVER_FILE);
    let gitServer = tools.readFile(gitServerPath);
    if (!gitServer || this.refreshServer) {
      const ret = await inquirer.prompt({
        type: "list",
        name: "gitServer",
        message: "请选择托管的git平台",
        default: GIT_SERVER_TYPE.github,
        choices: GIT_SERVER_TYPE_LIST,
      });
      gitServer = ret.gitServer;
      tools.writeFile(gitServerPath, gitServer);
      log.success("git server写入成功", `${gitServer} -> ${gitServerPath}`);
    } else {
      log.success("git server获取成功", gitServer);
    }
    this.gitServer = this.createGitServer(gitServer);
    if (!this.gitServer) {
      throw new Error("gitServer 初始化失败");
    }
  }

  async getUserAnrOrgs() {
    this.user = await this.gitServer.getUser()
    if (!this.user) {
      throw new Error('获取用户信息失败')
    }
    this.orgs = await this.gitServer.getOrg(this.user.login)
    if (!this.orgs) {
      throw new Error('获取用户组织失败')
    }
    log.success(this.gitServer.type,'用户和组织信息获取成功')
  }

  async checkGitOwner() {
    // 仓库类型文件路径
    const ownerPath = this.createPath(GIT_OWNER_FILE)
    // 登录名文件路劲
    const loginPath = this.createPath(GIT_LOGIN_FILE)
    let owner = tools.readFile(ownerPath)
    let login = tools.readFile(loginPath)
    if (!owner || !login || this.refreshOwner) {
      owner = (await inquirer.prompt({
        type: 'list',
        name: 'owner',
        message: '请选择远程仓库类型',
        default:GIT_OWNER_TYPE.user,
        choices:this.orgs.length>0?GIT_OWNER_TYPE_LIST:GIT_OWNER_TYPE_ONLY
      })).owner
      if (owner === GIT_OWNER_TYPE.user) {
        // 个人仓库
        login = this.user.login
      } else {
        // 组织仓库
        login = (await inquirer.prompt({
          type: 'list',
          name: 'login',
          message: '请选择组织',
          choices: this.orgs.map(item => ({
            name: item.login,
            value:item.value
          }))
        })).login
      }
      tools.writeFile(ownerPath,owner)
      tools.writeFile(loginPath,login)
      log.success('owner写入成功',`${owner} -> ${ownerPath}`)
      log.success('login写入成功',`${login} -> ${loginPath}`)
    }

    this.owner = owner
    this.login = login
  }

  createGitServer(gitServer) {
    if (gitServer === GIT_SERVER_TYPE.github) {
      return new Github();
    } else if (gitServer === GIT_SERVER_TYPE.gitee) {
      return new Gitee();
    }
    return null;
  }

  // 创建路径
  createPath(file) {
    // git缓存目录文件
    const rootDir = path.resolve(this.homePath, GIT_ROOT_DIR);
    // 缓存文件
    const filePath = path.resolve(rootDir, file);
    // 确保路径存在
    fse.ensureDirSync(rootDir);
    return filePath;
  }

  init() {
    console.log("init");
  }
}

module.exports = Git;
