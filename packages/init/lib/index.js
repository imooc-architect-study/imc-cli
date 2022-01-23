"use strict";

function init(projectName, options) {
  console.log(projectName, options.force,process.env.CLI_TARGET_PATH);
}

module.exports = init;
