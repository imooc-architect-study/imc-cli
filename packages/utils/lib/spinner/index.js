const ora = require("ora");

let spinner;

function start(message = "loading") {
    stop();
  spinner = ora(message).start();
  return spinner;
}

function stop() {
  if (spinner) {
    spinner.stop();
    spinner = null;
  }
}

module.exports = {start,stop};
