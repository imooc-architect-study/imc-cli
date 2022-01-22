'use strict';

const {log} = require('@imc-cli/utils')
const pkg = require('../package.json')

function core() {
    // 检查脚手架版本号
    checkPkgVersion()
}

function checkPkgVersion() {
    log.info('cli',pkg.version)
}


module.exports = core;
