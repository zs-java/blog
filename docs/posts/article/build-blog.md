---
icon: edit
date: 2023-02-26
category:
  - Blog
---

# 博客网站搭建

> 最近突然有了写博客的想法，于是搭建了自己的博客网站。第一篇博客就记录下搭建的过程～

## 技术选型
由于工作中经常使用`markdown`维护文档，所以想要博客也用`markdown`来进行维护。最终选择了`vuepress`和`vuepress-theme-hope`主题。

**链接：**

* `vuepress`: https://vuepress.vuejs.org/
* `vuepress-theme-hope`: https://theme-hope.vuejs.press/



## 安装`vuepress-theme-hope`
在 [dir] 文件夹内新建 vuepress-theme-hope 项目:

::: code-tabs#shell

@tab yarn

```bash
yarn create vuepress-theme-hope [dir]
```

@tab:active npm

```bash
npm init vuepress-theme-hope [dir]
```

:::

## 本地启动博客
::: code-tabs#shell

@tab yarn

```bash
yarn docs:clean-dev
```

@tab:active npm

```bash
npm run docs:clean-dev
```

:::

> 启动成功后便可以看到默认页面，来欣赏下`vue-theme-hope`主题的页面样式

**博客首页**

![image-20230226185016999](https://static.xzcoder.com/markdown/image-20230226185016999.png)

![image-20230226185056914](https://static.xzcoder.com/markdown/image-20230226185056914.png)

**文章页面**

![image-20230226185202115](https://static.xzcoder.com/markdown/image-20230226185202115.png)

>  这看起来非常棒!



## 项目目录结构

```
├── docs																	# 项目文档根目录
│         ├── .vuepress										# vuepress 配置目录
│         │         └── public						# 公共资源目录
│         │         └── navbar						# 导航栏配置
│         │         └── sidebar						# 侧边栏配置
│         │         └── styles						# 样式代码
│         │         └── config.ts					# vuepress 配置文件
│         │         └── theme.ts					# 主题配置
│         ├── posts												# 示例文档
│         ├── README.md										# 博客主页
│         ├── home.md											# 项目主页
├── package.json
```



## 上传GitHub

由于 `.vuepress`目录中会配置一些密钥、文档加密密码等，所以选择将`.vuepress`目录作为`Git`子模块进行管理。

主仓库：https://github.com/zs-java/blog
子模块：https://github.com/zs-java/blog-config-vuepress



## 部署博客

> 博客项目准备工作都已经完成了，下面就是部署博客到云服务器上。

### 打包项目部署资源

> 打包后的资源文件：`docs/.vuepress/dist/`

::: code-tabs#shell

@tab yarn

```shell
yarn docs:build
```

@tab npm

```shell
npm run docs:build
```

:::

### 上传服务器

> 这里使用`ftp-deploy`自动化部署，编写`docs/.vuepress/build/deploy.js`部署代码。

```javascript
const FtpDeploy = require('ftp-deploy')

const deployer = new FtpDeploy()

let config = {
  // 服务器登录账号
  user: 'username',
  // 服务器密码
  password: 'password',
  // 服务器地址
  host: '',
  // ftp的接口
  port: 21,
  // 本地目录
  localRoot: './docs/.vuepress/dist/',
  // 远程路径
  remoteRoot: '',
  // 包含文件
  include: ['*', '*/*'],
  // 上传前是否删除
  deleteRemote: true,
  // 主动模式/被动模式
  forcePasv: true
}

console.log('begin deploy!')
deployer.deploy(config).then(res => {
  console.log('deploy successful!')
  return true
}).catch(err => {
  console.log(`deploy failed: ${err}`)
  return false
})
```

**package.json**

```json
"scripts": {
		// ……
    "deploy": "node docs/.vuepress/build/deploy.js"
  },
```

**上传测试**

::: code-tabs#shell

@tab yarn

```shell
yarn deploy
```

@tab npm

```shell
npm run deploy
```

:::

![image-20230226203413741](https://static.xzcoder.com/markdown/image-20230226203413741.png)





**好了，至此已经基本完成了了博客网站的搭建，后面有时间再更新 `GitHub CI/CD`自动化部署流程～**
