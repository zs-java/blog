---
icon: github
date: 2023-02-27
---

# GitHub Action 自动化部署博客网站

上一篇文章已经介绍了博客项目搭建过程以及通过`npm run deploy`进行部署，但这仍需要有`Node.js`开发环境才行，而有时想通过手机简单编辑文章就无法进行发布。

这篇文章简单介绍下如何使用`GitHub Actions`进行自动化部署，这样即使通过手机`GitHub`在线编辑也可以自动发布啦😄



## 创建GitHub Actions Workflow

> Actions => New workflow => 选择`Node.js`模版

![image-20230227231215077](https://static.xzcoder.com/markdown/image-20230227231215077.png)

![image-20230227231306941](https://static.xzcoder.com/markdown/image-20230227231306941.png)

**默认模版如下**

```yaml
# This workflow will do a clean installation of node dependencies, cache/restore them, build the source code and run tests across different versions of node
# For more information see: https://docs.github.com/en/actions/automating-builds-and-tests/building-and-testing-nodejs
name: Node.js CI
on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [14.x, 16.x, 18.x]
        # See supported Node.js release schedule at https://nodejs.org/en/about/releases/
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test
```

## 调整 Workflow 配置

由于搭建博客的时候使用了子模块，所以需要 `workflow`能够更新到子模块代码。

##### 首先需要创建`GitHub`个人访问令牌

> settings => Developer settings => Personal access tokens => Generate new token (classic)

![image-20230227232103827](https://static.xzcoder.com/markdown/image-20230227232103827.png)



##### 将访问令牌维护到仓库密钥中

> Repository => Settings => Secrets and variables => Actions => New repository secret

![image-20230227232439968](https://static.xzcoder.com/markdown/image-20230227232439968.png)

##### 调整 Workflow 拉取子模块

```yaml
- name: Checkout repository
  uses: actions/checkout@v3
  with:
  submodules: recursive
  token: ${{ secrets.ACCESS_TOKEN }}
```

##### 执行 npm 构建并发布

```yaml
- run: npm install
- run: npm run docs:build
- run: npm run deploy
```



## 发布测试

提交`workflow`文件后`GitHub Actions`便会自动执行～

![image-20230227233027993](https://static.xzcoder.com/markdown/image-20230227233027993.png)

![image-20230227233236418](https://static.xzcoder.com/markdown/image-20230227233236418.png)

**稍等片刻等待任务完成**

![image-20230227234131954](https://static.xzcoder.com/markdown/image-20230227234131954.png)

![image-20230227234149018](https://static.xzcoder.com/markdown/image-20230227234149018.png)

打开博客主页 [xzcoder.com](http://xzcoder.com) 可以看到已经部署成功了！



## 归档构建产物

> 将每次自动构建打包后的`dist`文件进行归档备份

```yaml
- name: Archive production artifacts
  uses: actions/upload-artifact@v3
  with:
  	name: dist
  	path: docs/.vuepress/dist
```

![image-20230227235538580](https://static.xzcoder.com/markdown/image-20230227235538580.png)



---------

这样就完成了`GitHub Actions`自动化部署啦，完美～

最后附上完整的 `deploy.yaml`文件配置

```yaml
name: Deploy CI
on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]
jobs:
  build:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        node-version: [16.x]
    steps:
    - name: Checkout repository
      uses: actions/checkout@v3
      with:
        submodules: recursive
        token: ${{ secrets.ACCESS_TOKEN }}
    
    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}
        cache: 'npm'

    - run: npm install
    - run: npm run docs:build
    - run: npm run deploy
    
    - name: Archive production artifacts
      uses: actions/upload-artifact@v3
      with:
        name: dist
        path: docs/.vuepress/dist

```





