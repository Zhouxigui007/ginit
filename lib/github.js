const CLI = require('clui');
const Configstore = require('configstore');
const Spinner = CLI.Spinner;
const { Octokit } = require("@octokit/rest")
const { createBasicAuth } = require('@octokit/auth-basic');

const inquirer = require('./inquirer');
const pkg = require('../package.json');
// 初始化本地的存储配置
const conf = new Configstore(pkg.name);

// 模块内部的单例
let octokit;

module.exports = {
    // 获取实例
    getInstance: () => {
        return octokit;
    },

    // 获取本地token
    getStoredGithubToken: () => {
        return conf.get('github.token');
    },

    // 通过个人账号信息获取token
    getPersonalAccessToken: async () => {
        const credentials = await inquirer.askGithubCredentials();
        const status = new Spinner('验证身份中，请等待...');

        status.start();

        const auth = createBasicAuth({
            username: credentials.username,
            password: credentials.password,
            async on2Fa() {
                status.stop();
                const res = await inquirer.getTwoFactorAuthenticationCode();
                status.start();
                return res.twoFactorAuthenticationCode;
            },
            token: {
                scopes: ['user', 'public_repo', 'repo', 'repo:status'],
                note: 'ginit, the command-line tool for initalizing Git repos',
            },
        });

        try {
            const res = await auth();

            if (res.token) {
                conf.set('github.token', res.token);
                return res.token;
            } else {
                throw new Error('GitHub token was not found in the response');
            }
        } finally {
            status.stop();
        }
    },

    // 通过token登陆
    githubAuth: (token) => {
        octokit = new Octokit({
            auth: token,
        });
    },
};
