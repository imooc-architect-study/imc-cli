const cp = require("child_process");
// 兼容window操作系统，win10下试了，不需要兼容
function execCommand(command, args, options) {
  const win32 = process.platform === "win32";
  const cmd = win32 ? "cmd" : command;
  const cmdArgs = win32 ? ["/c"].concat(command, args) : args;
  return cp.spawn(cmd, cmdArgs, options || {});
}


function execCommandAsync(command, args, options) {
    return new Promise((resolve, reject) => {
        const p = execCommand(command,args,options)
        p.on('error',reject)
        p.on('exit',resolve)
    })
}

// execCommand.execCommandAsync = execCommandAsync

module.exports = execCommand
module.exports.execCommandAsync = execCommandAsync