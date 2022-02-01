const axios = require("axios");

const BASEURL = "https://gitee.com/api/v5";

class GiteeRequest {
  constructor(token) {
    this.token = token;
    this.server = axios.create({
      baseURL: BASEURL,
      timeout: 5000,
    });

    this.server.interceptors.response.use(
      (response) => {
        return response.data;
      },
      (error) => {
        if (error.response && error.response.data) {
          return error.response.data;
        }
        return Promise.reject(error);
      }
    );
  }

  get(url, params = {}, headers) {
    return this.server({
      method: "get",
      url,
      params: {
        ...params,
        access_token: this.token,
      },
      headers,
    });
  }
}

module.exports = GiteeRequest;
