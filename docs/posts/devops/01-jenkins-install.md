---
icon: devops
date: 2023-05-15
category:
  - DevOps篇
  - CI/CD
  - Jenkins
---

# DevOps篇: 多节点部署 Jenkins
在软件开发过程中，持续集成和自动化构建是必不可少的环节。`Jenkins`作为一款优秀的`CI/CD`工具，被广泛使用。它支持众多插件和工具，能够自动化构建、测试和部署，实现持续集成和持续交付，提升软件开发效率和质量。

今天为大家介绍如何部署多节点`Jenkins`

## 为什么需要 Jenkins 多节点？

1. 分布式构建：在多节点部署的情况下，可以将构建工作分配到不同的节点上去执行，从而实现加速构建、降低风险等目的。

2. 大规模部署：在大规模的项目中，可能需要同时部署多个`Jenkins`节点，这样可以缓解任务压力，提高系统的可扩展性和鲁棒性。

3. 不同操作系统支持：由于`Jenkins`可以在多个操作系统上运行，因此在多节点部署的情况下，可以针对不同的操作系统配置和管理不同的节点。

4. 冗余：在多节点部署的情况下，如果某个节点发生故障，可以通过其他可用的节点来提供服务，并且不会停止整个`Jenkins`系统的运行。

总的来说，多节点部署可以提高`Jenkins`系统的性能、可扩展性、鲁棒性和可靠性。

## 实战部署 Jenkins

> 下文会详细介绍通过 `Docker Compose` 方式部署 `Jenkins` 主节点，以及分别通过 `SSH`方式 和 `JavaWeb` 代理方式部署 `Jenkins` 从节点。3 个节点默认都已安装好 `Docker` 环境。

### 1. 使用 Docker 部署 Jenkins 主节点

> 镜像使用 `jenkins/jenkins:lts` 长期支持版本，`docker-compose.yml` 配置如下

```yaml
version: "3"
services:
  jenkins:
    image: "jenkins/jenkins:lts"
    container_name: jenkins
    privileged: true
    restart: always
    ports:
      - "8080:8080"
    environment:
      - TZ=Asia/Shanghai
    volumes:
      # jenkins 工作目录
      - ./jenkins_home:/var/jenkins_home
```

> 创建 `jenkins_home` 目录并修改权限

```shell
mkdir jenkins_home
chown -R 1000:1000 ./jenkins_home
```

> 启动容器并查看日志

```shell
# 后台启动容器
docker-compose up -d
# 查看容器日志
docker-compose logs -f
```

> 从日志中获取初始密码 或 查看容器内的 `/var/jenkins_home/secrets/initialAdminPassword` 文件获取初始密码

![Jenkins容器日志](https://static.xzcoder.com/markdown/image-1684247023603.png)

### 2. Jenkins 初始化配置

> 容器启动成功后，则可以通过网页访问`jenkins`页面。

#### 2.1. 新手入门配置

输入初始密码，初始密码可以通过容器日志获取 或 查看容器内的`var/jenkins_home/secrets/initialAdminPassword`文件

![](https://static.xzcoder.com/markdown/image-1684248505625.png)

选择「安装推荐的插件」，等待安装完成

![安装初始插件](https://static.xzcoder.com/markdown/image-20230516225620168.png)

设置管理员账号密码

![设置管理员账号密码](https://static.xzcoder.com/markdown/image-20230516231239296.png)

配置完成后进入到`Jenkins`主页

![首页](https://static.xzcoder.com/markdown/image-20230516231336802.png)

#### 2.2. 安装插件

> 由于后续我会采用 `docker` 方式运行容器进行构建，所以这里不需要对全局工具构建工具进行配置，如：`maven`、`nodejs`等。所以只需要安装`Docker Pipeline` 插件即可

![](https://static.xzcoder.com/markdown/image-20230516231923087.png)

找到插件勾选并点击安装后重启

![安装插件](https://static.xzcoder.com/markdown/image-20230516232130430.png)

### 3. SSH 方式部署 Jenkins 从节点

#### 3.1. 从节点安装 JDK11

> 注意：需要安装`jdk11`或更高版本，实测使用`jdk8`时安装报错

```shell
mkdir -p /data/jenkins-agent/
cd /data/jenkins-agent/
# 安装 openjdk-11
wget https://d6.injdk.cn/openjdk/openjdk/11/openjdk-11+28_linux-x64_bin.tar.gz
# 解压，解压后的目录名为 jdk-11
tar -zxvf openjdk-11+28_linux-x64_bin.tar.gz
# 删除压缩包
rm -rf openjdk-11+28_linux-x64_bin.tar.gz
```

#### 3.2. 新增节点

Jenkins -> 系统管理 -> 节点管理，可以看到当前已有了内置的`master`节点。

![节点列表](https://static.xzcoder.com/markdown/image-20230516235302003.png)

新建节点，填写节点名称为`worker1`

![新建节点](https://static.xzcoder.com/markdown/image-20230516235418182.png)

填写配置

![节点配置](https://static.xzcoder.com/markdown/image-20230517220331550.png)

填写`SSH`信息，设置`Java路径`为`/data/jenkins-agent/jdk-11/bin/java`，点击保存。

![设置启动方式](https://static.xzcoder.com/markdown/image-20230517221208387.png)

这样节点就会自动开始配置了，可以通过日志查看状态

![节点日志](https://static.xzcoder.com/markdown/image-20230517221434013.png)稍等片刻后节点就准备完成了，可以通过「脚本命令行」执行`Groovy`脚本进行测试

![执行脚本测试](https://static.xzcoder.com/markdown/image-20230517221517215.png)

`Groovy`脚本正常执行并返回了节点信息，这样`worker1`节点就安装完成了。

### 4. JavaWeb 代理方式部署 Jenkins 从节点

> `Jenkins`除了提供`SSH`方式安装节点外还提供了`JavaWeb`代理方式安装节点。这种方式相比使用`SSH`方式时，`Jenkins`主节点必须要能够访问从节点的`SSH`服务，对网络的要求更低，只需要从节点能够访问`Jenkins`网页服务就可以，在实际使用中更为实用。

#### 4.1. Jenkins 页面新增从节点

> 页面新增节点与`SSH`安装方式中介绍的类似，启动方式选择「通过 Java Web 启动代理」

![节点配置](https://static.xzcoder.com/markdown/image-20230517222129036.png)

![设置启动方式](https://static.xzcoder.com/markdown/image-20230517222214825.png)

创建节点后页面给出了`agent.jar`的下载地址和启动命令，这里我们记录下后续需要使用。

![](https://static.xzcoder.com/markdown/image-20230517222537307.png)

#### 4.2. 从节点上启动 Java Web 代理

> 在从节点上安装`openjdk-11`，并启动 `Java Web` 代理

```shell
# 创建工作目录(与页面新建节点时填写的一致)
mkdir -p /data/jenkins-agent
cd /data/jenkins-agent/
# 下载 openjdk-11 并解压，解压后的目录名为 jdk-11
wget https://d6.injdk.cn/openjdk/openjdk/11/openjdk-11+28_linux-x64_bin.tar.gz
tar -zxvf openjdk-11+28_linux-x64_bin.tar.gz
rm -rf openjdk-11+28_linux-x64_bin.tar.gz
# 通过 Jenkins 页面提供的命令下载 agent.jar
curl -sO http://192.168.1.125:8080/jnlpJars/agent.jar
# 启动 Java Web 代理
# 注意：jdk11没有配置环境变量，所以写全路径
/data/jenkins-agent/jdk-11/bin/java -jar agent.jar -jnlpUrl http://192.168.1.125:8080/manage/computer/worker2/jenkins-agent.jnlp -secret 2007cfd52553e6927c4a41966bd85ecf3acda559beda2a3d5e4ffd106fe01db1 -workDir "/data/jenkins-agent/"
```

![启动代理](https://static.xzcoder.com/markdown/image-20230517223221899.png)

启动后通过控制台输出的日志可以看到代理已经连接成功了，可以与上面介绍的方式在`Jenkins`页面中执行「脚本命令行」来验证。

![执行脚本测试](https://static.xzcoder.com/markdown/image-20230517223419283.png)

#### 4.3. 将 Java Web 代理安装为系统服务

> 上一步中，我们通过 `java -jar`的方式成功启动了`agent.jar`，但是这种方式在`SSH`连接断开后，应用也会停止，所以我们还需要将`java -jar agent.jar ……`安装为系统服务。

这里我准备了一键安装脚本`install-jenkins-agent.sh`,只需要修改`CMD=''`为`Jenkins`页面给出的启动命令后上传到服务器并执行即可

```shell
#!/bin/bash
CMD='将启动命令写到这里'
JNLPURL=$(echo $CMD | sed 's/.*jnlpUrl \(.*\)/\1/'|  cut -d ' ' -f1 )
WORKDIR=$(echo $CMD | sed 's/.*workDir \(.*\)/\1/'|  cut -d ' ' -f1 |  sed 's/"//g')
if [[ "$CMD" =~ java &&  "$CMD" =~ jnlpUrl &&  "$CMD" =~ secret && "$CMD" =~ workDir ]];then
    echo "开始配置jenkins-agent服务"
else
    echo "ERROR:请将节点连接jenkins的java启动命令填入脚本CMD=''的引号中"
    exit 1
fi
mkdir -p $WORKDIR
wget ${JNLPURL%%manage*}jnlpJars/agent.jar -P ${WORKDIR}
chmod 755 ${WORKDIR}/agent.jar

cat>/usr/lib/systemd/system/jenkins-agent.service<<EOF
[Unit]
Description=The Jenkins Agent Server

[Service]
User=root
ExecStart=/usr/local/bin/jenkins-agent start
ExecReload=/usr/local/bin/jenkins-agent restart
ExecStop=/usr/local/bin/jenkins-agent stop
Restart=always

[Install]
WantedBy=multi-user.target

EOF

cat>/usr/local/bin/jenkins-agent<<EOF
#!/bin/bash

start()
{
    ${CMD/agent.jar/$WORKDIR/agent.jar}
}

case "\$1" in
start)
    start
    ;;
stop)
    stop
    ;;
restart)
    stop
    start
    ;;
*)
    echo "usage: \$0 start|stop|restart"
    exit 0;
esac
exit
EOF

chmod 755 /usr/local/bin/jenkins-agent
systemctl daemon-reload
systemctl start jenkins-agent
systemctl enable jenkins-agent
result=$(systemctl is-active jenkins-agent)
if [[ $result == 'active' ]];then
        echo "success"
else
        nohup ${CMD/agent.jar/$WORKDIR/agent.jar} > /dev/null 2>&1 &
fi
```

查看`jenkins-agent`系统服务状态并查看日志

```shell
# 查看服务状态
systemctl status jenkins-agent
# 查看服务日志
journalctl -u jenkins-agent -f
```

![安装系统服务](https://static.xzcoder.com/markdown/image-20230517224359958.png)

这样则完成了通过`Java Web`代理方式的从节点安装。

## 流水线任务测试

> 既然`jenkins`主节点和两个从节点都已安装完成，那么我们就来创建个流水线任务运行试试吧～

`Jenkins`页面选择「新建任务」，填写「任务名称」，并选择类型为「流水线」

![新建流水线任务](https://static.xzcoder.com/markdown/image-20230517224816193.png)

简单写个流水线脚本，大概含义为：分别在`worker1`、`worker2`节点上通过`docker`启动`maven:3-alpine`、`node:alpine`容器，并执行`mvn -v`、`node -v`。

将流水线代码配置好后点击保存

![配置 pipeline 脚本](https://static.xzcoder.com/markdown/image-20230517225316322.png)

流水线代码如下：

```groovy
pipeline {
    agent none
    stages {
        stage('Worker1-Maven') {
            agent {
                docker { label 'worker1' image 'maven:3-alpine' }
            }
            steps {
                sh "mvn -v"
            }
        }
        stage('Worker2-Node') {
            agent {
                docker { label 'worker2' image 'node:alpine' }
            }
            steps {
                sh "node -v"
            }
        }
    }
}
```

点击「立即构建」启动任务，并查看任务日志

![任务构建](https://static.xzcoder.com/markdown/image-20230517225820743.png)

![构建详情](https://static.xzcoder.com/markdown/image-20230517225833978.png)

通过日志可以看到按照流水线定义在对应的机器上启动容器并执行命令

![任务日志-1](https://static.xzcoder.com/markdown/image-20230517230107682.png)

![任务日志-2](https://static.xzcoder.com/markdown/image-20230517230219107.png)

## 总结

今天为搭建介绍了如何搭建`Jenkins`主节点以及分别通过`SSH方式`与`Java Web 代理`方式搭建从节点，并编写流水线(`Jenkins Pipeline`)脚本部署测试。

后续会将`Jenkins`多节点、`Pipeline`脚本的一些使用心得分享给大家，喜欢本文的话请帮忙转发或点击“在看”。您的举手之劳是对我莫大的鼓励。谢谢！
