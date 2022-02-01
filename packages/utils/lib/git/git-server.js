function error(methodName) {
  throw new Error(`${methodName} must be implamented`);
}

class GitServer {
  constructor(type, token) {
    // 托管仓库
    this.type = type;
    this.token = token;
  }

  setToken() {
    error("setToken");
  }

  // 创建个人仓库
  createRepo() {
    error("createRepo");
  }
  // 创建组织仓库
  createOrgRepo() {
    error("createOrgRepo");
  }

  getRemote() {
    error("getRemote");
  }

  getUser() {
    error("getUser");
  }

  getOrg() {
    error("getOrg");
  }

  getTokenUrl() {
    error("getTokenUrl");
  }

  getTokenHelpUrl() {
    error("getTokenHelpUrl");
  }
}

module.exports = GitServer;
