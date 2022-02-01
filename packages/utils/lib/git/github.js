const GitServer = require("./git-server");
const GithubRequest = require('./github-request')

class Github extends GitServer {
  constructor() {
    super("github");
  }
  setToken(token) {
    this.token = token;
    this.request = new GithubRequest(token)
  }
  getUser() {
    return this.request.get('/user')
}

getOrg() {
    return this.request.get(`/user/orgs`, {
        page: 1,
        per_page:100
    })
}
  getTokenUrl() {
    return "https://github.com/settings/tokens";
  }

  getTokenHelpUrl() {
    return "https://docs.github.com/en/authentication/connecting-to-github-with-ssh";
  }
}

module.exports = Github;
