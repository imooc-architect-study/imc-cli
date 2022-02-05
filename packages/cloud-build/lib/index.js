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

const FAILED_CODE = [
  "prepare failed",
  "download failed",
  "install failed",
  "build failed",
  "uploadPrepare failed",
  "sSHConnect failed",
  "compressFile failed",
  "deleteFile failed",
  "putFile failed",
  "unzip failed",
  "deleleZip failed",
];

class CloudBuild {
  constructor(props) {
    // 打包命令
    this.buildCmd = props.buildCmd;
    // 仓库地址
    this.repo = props.repo;
    // 分支
    this.branch = props.branch;
    // 连接超时时间
    this.connectTimeout = 5 * 1000;
    // 定时器
    this.timer = null;
    this.socket = null;
    this.finish = false;
    // 参数检查
    this.checkProps();
  }

  checkProps() {
    const check = (key, value) => {
      if (!value) {
        throw new Error(`${key} 的值不能为空`);
      }
    };

    check("buildCmd", this.buildCmd);
    check("repo", this.repo);
    check("branch", this.branch);
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
  }

  doSocketConnectTimeout(fn) {
    this.clearTimer();
    log.info("设置连接超时时间", `${this.connectTimeout / 1000}秒`);
    this.timer = setTimeout(fn, this.connectTimeout);
  }

  disconnectSocket() {
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
        this.onSocketConnect();
        resolve();
      });

      // 连接超时处理
      this.doSocketConnectTimeout(() => {
        log.error("云构建服务连接超时，自动终止");
        this.disconnectSocket();
      });

      this.socket.on("disconnect", () => {
        this.onSocketDisconnect();
      });

      this.socket.on("error", (err) => {
        this.onSocketError();
        reject(err);
      });
    });
  }

  onSocketConnect() {
    this.clearTimer();
    // 客户端唯一id
    const { id } = this.socket;
    log.success("云构建任务创建成功", `任务ID：${id}`);
    this.socket.on(id, (msg) => {
      this.onSocketMsg(msg);
    });
  }

  onSocketMsg(msg) {
    const paresdMsg = parseMsg(msg);
    log.success(paresdMsg.action, paresdMsg.message);
  }

  onSocketDisconnect() {
    !this.finish && log.success("disconnect", "云构建任务断开");
    this.disconnectSocket();
  }

  onSocketError() {
    log.error("error", "云构建出错！", err);
    this.disconnectSocket();
  }

  build() {
    return new Promise((resolve, reject) => {
      this.socket.emit("build");
      this.socket.on("build", (msg) => {
        this.onSocketBuild(msg);
      });
      this.socket.on("building", (msg) => {
        console.log(msg);
      });
      this.socket.on("finish", () => {
        this.finish = true
        resolve()
      });
    });
  }

  onSocketUpload(msg) {
    const parsedMsg = parseMsg(msg);
    if (FAILED_CODE.indexOf(parsedMsg.action) >= 0) {
      log.error(parsedMsg.action, parsedMsg.message);
      this.disconnectSocket();
    } else {
      log.success(parsedMsg.action, parsedMsg.message);
    }
  }

  onSocketBuild(msg) {
    const parsedMsg = parseMsg(msg);
    if (FAILED_CODE.indexOf(parsedMsg.action) >= 0) {
      log.error(parsedMsg.action, parsedMsg.message);
      this.disconnectSocket();
    } else {
      log.success(parsedMsg.action, parsedMsg.message);
    }
  }
}

module.exports = CloudBuild;
