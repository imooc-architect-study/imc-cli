"use strict";

const io = require("socket.io-client");
const { log } = require("@imc-cli/utils");

function parseMsg(msg) {
  const action = msg.data.action;
  const message = msg.data.payload.message;
  return {
    action,
    message,
  };
}

const FAILED_CODE = ["prepare failed",'download failed','install failed','build failed'];

class CloudBuild {
  constructor(props) {
    // 打包命令
    this.buildCmd = props.buildCmd;
    // 仓库地址
    this.repo = props.repo;
    // 分支
    this.branch = props.branch;
    this.timeout = 5 * 60 * 1000;
    // 连接超时时间
    this.connectTimeout = 5 * 1000;
    // 定时器
    this.timer = null;
    this.socket = null;
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  doTimeout(fn, timeout) {
    this.clearTimer();
    log.info("设置任务超时时间", `${timeout / 1000}秒`);
    this.timer = setTimeout(fn, timeout);
  }

  disconnect() {
    this.clearTimer();
    if (this.socket) {
      this.socket.disconnect();
      this.socket.close();
    }
  }

  init() {
    return new Promise((resolve, reject) => {
      this.socket = io("http://127.0.0.1:7001", {
        query: {
          repo: this.repo,
          branch: this.branch,
          buildCmd: this.buildCmd,
        },
      });

      this.socket.on("connect", () => {
        this.clearTimer();
        // 客户端唯一id
        const { id } = this.socket;
        log.success("云构建任务创建成功", `任务ID：${id}`);
        this.socket.on(id, (msg) => {
          const paresdMsg = parseMsg(msg);
          log.success(paresdMsg.action, paresdMsg.message);
        });
        resolve();
      });

      // 连接超时处理
      this.doTimeout(() => {
        log.error("云构建服务连接超时，自动终止");
        this.disconnect();
      }, this.connectTimeout);

      this.socket.on("disconnect", () => {
        log.success("disconnect", "云构建任务断开");
        this.disconnect();
      });

      this.socket.on("error", (err) => {
        log.error("error", "云构建出错！", err);
        this.disconnect();
        reject(err);
      });
    });
  }

  build() {
    return new Promise((resolve, reject) => {
      this.socket.emit("build");
      this.socket.on("build", (msg) => {
        const parsedMsg = parseMsg(msg);
        if (FAILED_CODE.indexOf(parsedMsg.action) >= 0) {
          log.error(parsedMsg.action, parsedMsg.message);
          this.disconnect();
        } else {
          log.success(parsedMsg.action, parsedMsg.message);
        }
      });
      this.socket.on("building", (msg) => {
        console.log(msg);
      });
    });
  }
}

module.exports = CloudBuild;
