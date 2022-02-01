const axios = require("axios");

const BASEURL = "https://api.github.com";

class GithubRequest {
  constructor(token) {
    this.token = token;
    this.server = axios.create({
      baseURL: BASEURL,
      timeout: 5000,
    });

    this.server.interceptors.request.use((config) => {
      config.headers["Authorization"] = `token ${this.token}`;
      return config
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
      params,
      headers,
    });
  }
}

module.exports = GithubRequest;
