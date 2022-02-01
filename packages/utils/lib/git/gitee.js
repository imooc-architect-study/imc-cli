const GitServer = require("./git-server");

const GiteeRequest = require('./gitee-request')

class Gitee extends GitServer{
    constructor() {
        super('gitee')
        this.request = null
    }

    setToken(token) {
        this.token = token
        this.request = new GiteeRequest(token)
    }

    getUser() {
        return this.request.get('/user')
    }

    getOrg(username) {
        return this.request.get(`/users/${username}/orgs`, {
            page: 1,
            per_page:100
        })
    }

    getTokenUrl() {
        return 'https://gitee.com/profile/personal_access_tokens'
    }

    getTokenHelpUrl() {
        return 'https://gitee.com/help/articles/4181'
    }
}

module.exports = Gitee