const axios = require("axios");
const urlJoin = require("url-join");
const semver = require("semver");

// 获取线上的npm包信息
function getNpmInfo(npmName, registry) {
  if (!npmName) {
    return null;
  }
  const registryUrl = registry || getDefaultRegistry();
  const npmInfoUrl = urlJoin(registryUrl, npmName);
  return axios
    .get(npmInfoUrl)
    .then((res) => {
      if (res.status === 200) {
        return res.data;
      }
      return null;
    })
    .catch((error) => {
      //   return Promise.reject(error);
      return null;
    });
}

function getDefaultRegistry(isOriginal = false) {
  return isOriginal
    ? "https://registry.npmjs.org"
    : "https://registry.npm.taobao.org";
}

// 获取npm上的所有版本号
async function getNpmVersions(npmName, registry) {
  const data = await getNpmInfo(npmName, registry);
  if (data) {
    return Object.keys(data.versions);
  }
  return [];
}

// 获取大于baseVersion的版本号
function getLatestSemverVersion(baseVersion, versions) {
  return versions
    .filter((version) => semver.satisfies(version, `^${baseVersion}`))
    .sort((a, b) => semver.gt(b, a));
}

// 获取最新的版本号
async function getNpmLatestSemverVersion(baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  const latestVersions = getLatestSemverVersion(baseVersion, versions);
  if (latestVersions && latestVersions.length > 0) {
    return latestVersions[0];
  }
  return null;
}

// 找出包名的最新版本号
async function getNpmLatestVersion(npmName, registry) {
  const versions = await getNpmVersions(npmName, registry);
  if (versions && versions.length > 0) {
    return versions.sort((a, b) => semver.gt(b, a))[0];
  }
  return null;
}

module.exports = {
  getNpmInfo,
  getNpmLatestSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion
};
