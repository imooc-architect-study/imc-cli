const path = require("path");
const cp = require("child_process");
const log = require("../log/index.js");
const Package = require("../package/index.js");

const SETTINGS = {
  init: "@imooc-cli/init",
};

const CACHE_DIR = "dependencise/";

async function exec() {
  // 用户指定需要执行的npm包路径，不指定默认就执行@imooc-cli/init这个包
  let targetPath = process.env.CLI_TARGET_PATH;
  // 缓存目录
  const homePath = process.env.CLI_HOME_PATH;
  let storeDir = "";
  let pkg;
  log.verbose("targetPath", targetPath);
  log.verbose("homePath", homePath);
  const options = arguments[arguments.length - 1];
  // 执行的命令名称
  const cmdName = options.name();
  // 执行的包名
  const packageName = SETTINGS[cmdName];
  // 执行的npm包版本号
  const packageVersion = "latest";

  // 实现动态加载模块
  if (!targetPath) {
    //   没有传入执行文件的目录的路径，说明是使用缓存模式，使用我们自己定义的@imc-cli/init
    targetPath = path.resolve(homePath, CACHE_DIR);
    storeDir = path.resolve(targetPath, "node_modules");
    log.verbose("targetPath", targetPath);
    log.verbose("storeDir", storeDir);
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
      storeDir,
    });
    if (await pkg.exits()) {
      //   更新package
      await pkg.update();
    } else {
      //   安装package
      await pkg.install();
    }
  } else {
    //   非缓存模式，使用用户自定义的包
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion,
    });
  }

  const rootFile = pkg.getRootFilePath();
  if (rootFile) {
    // imc-cli init test --targetPath D:\ljf\Desktop\imooc-lego\imc-cli\packages\init --debug
    try {
      // require(rootFile).call(null, Array.from(arguments));
      const args = Array.from(arguments)
      const cmd = args[args.length - 1]
      const o = Object.create(null)
      // 过滤掉一些参数
      // Object.keys(cmd).forEach(key => {
      //   if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') {
      //     o[key] = cmd[key]
      //   }
      // })
      o.opts = cmd.opts()
      args[args.length - 1] = o
      const code = `require('${rootFile.replace(/\\/g, '/')}').call(null, ${JSON.stringify(args)})`;
      // 1、执行一条命令
      // cp.exec('npm i')
      // 2、执行一个shell文件，第一个参数是shell文件路径，这里我们传入了npm，实际上会通过环境变量找到npm的文件
      // cp.execFileSync('npm',['i'])
      // 3、也是执行命令，不过所有的返回都是通过流的形式
      // cp.spawn
      // 4、执行一个js文件，可通过children.send，children.on和process.on，process.send进行通信
      // cp.fork()
      // 通过调用子进程执行代码
      const child = spawn("node", ["-e", code], {
        cwd: process.cwd(),
        // 子进程中的所有输出都会被打印到父进程中
        // 默认是pipe，输入需要输入子进程的信息，需要通过on去监听，手动去打印
        stdio: "inherit",
      });
      // 子进程代码执行错误
      child.on("error", (e) => {
        log.error(e.message);
        process.exit(1);
      });
      // 子进程执行完毕
      child.on("exit", (e) => {
        log.verbose("执行命令成功：" + e);
        process.exit(e);
      });
    } catch (error) {
      log.error(error.message);
      if (process.env.LOG_LEVEL === "verbose") {
        console.log(error);
      }
    }
  }
}

// 兼容window操作系统，win10下试了，不需要兼容
function spawn(command, args, options) {
  const win32 = process.platform === 'win32'
  const cmd = win32 ? 'cmd' : command
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args
  return cp.spawn(cmd,cmdArgs,options || {})
}

module.exports = exec;
