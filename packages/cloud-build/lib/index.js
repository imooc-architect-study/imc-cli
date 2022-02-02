"use strict";

const io = require("socket.io-client");
const { log } = require('@imc-cli/utils')

function parseMsg(msg) {
  const action = msg.data.action
  const message = msg.data.payload.message
  return {
    action,message
  }
}

class CloudBuild {
  constructor(props) {
    // 打包命令
    this.buildCmd = props.buildCmd;
    // 仓库地址
    this.repo = props.repo
    // 分支
    this.branch = props.branch
    this.timeout = 5 * 60 * 1000;
    // 连接超时时间
    this.connectTimeout = 5 * 1000
    // 定时器
    this.timer = null
  }

  clearTimer() {
    if (this.timer) {
      clearTimeout(this.timer)
      this.timer = null
    }
  }

  doTimeout(fn, timeout) {
    this.clearTimer()
    log.info('设置任务超时时间', `${timeout/1000}秒`)
    this.timer = setTimeout(fn,timeout)
  }

  init() {
    const socket = io("http://127.0.0.1:7001", {
      query: {
        repo:this.repo
      }
    });

    socket.on("connect", () => {
      this.clearTimer()
      // 客户端唯一id
      const { id } = socket
      log.success('云构建任务创建成功',`任务ID：${id}`)
      socket.on(id, msg => {
        const paresdMsg = parseMsg(msg)
        log.success(paresdMsg.action,paresdMsg.message)
      })
      console.log("connect!");
    });

    const disconnect = () => {
      this.clearTimer()
      socket.disconnect()
      socket.close()
    }

    // 连接超时处理
    this.doTimeout(() => {
      log.error('云构建服务连接超时，自动终止')
      disconnect()
    }, this.connectTimeout)
    
    socket.on('disconnect', () => {
      log.success('disconnect','云构建任务断开')
      disconnect()
    })

    socket.on('error', (err) => {
      log.error('error','云构建出错！',err)
      disconnect()
    })
  }
}

// or http://127.0.0.1:7001/chat
// const socket = require('socket.io-client')('http://127.0.0.1:7001');

// socket.on('connect', () => {
//   console.log('connect!');
//   socket.emit('chat', 'hello world!');
// });

// socket.on('res', msg => {
//   console.log('res from server: %s!', msg);
// });

module.exports = CloudBuild;
