"use strict";

const { Command, log } = require("@imc-cli/utils");

class InitCommand extends Command{
  init() { 
    const options = this._cmd.opts
    // 初始化的项目名称
    this.projectName = this._argv[0] || ''
    // 是否强制初始化项目
    this.force = !!options.force
    log.verbose('projectName',this.projectName)
    log.verbose('force',this.force)
  }
  
  exec(){}
}

function init(argv) {
  // console.log(projectName, options.force, process.env.CLI_TARGET_PATH);
  
  return new InitCommand(argv)
}

module.exports = init;

module.exports.InitCommand = InitCommand
