---
home: true
title: DataX Cli
tagline: DataX 命令行工具
heroText: DataX CLI
heroImage: /svg/golang.svg
date: 2022-01-09
actions:
  - text: GitHub
    link: https://github.com/zs-java/datax-cli
    type: primary

features:
  - title: 一键安装
    icon: home
  - title: 使用简单
    icon: home
  - title: 原生体验
    icon: home
---

# DataX Cli
> simple datax terminal tools.

## Install
#### install with Go
```shell
go get https://github.com/zs-java/datax-cli
```
#### install with Makefile
```shell
git clone https://github.com/zs-java/datax-cli.git
cd datax-cli
make && make install
```

## Prepare
```shell
# or ~/.bash_profile
echo DATAX_HOME=/your/datax/path/ >> /etc/profile
source /etc/profile
```

## USAGE
```
NAME:
   DataX-cli - simple datax client utils

USAGE:
   DataX-cli [global options] command [command options] [arguments...]

VERSION:
   1.0.0

COMMANDS:
   build    build job json file for datax
   run      run datax jobs
   help, h  Shows a list of commands or help for one command

GLOBAL OPTIONS:
   --help, -h     show help (default: false)
   --version, -v  print the version (default: false)
```

### COMMAND: build
```text
NAME:
   DataX-cli build - build job json file for datax

USAGE:
   DataX-cli build [command options] [arguments...]

OPTIONS:
   --jobs value, -j value      datax job dir or file, support YAML,JSON
   --template value, -t value  template file, support YAML,JSON
   --env value, -e value       env file
   --output value, -o value    result output dir (default: "dist")
   --help, -h                  show help (default: false)
```

### COMMAND: run
```
NAME:
   DataX-cli run - run datax jobs

USAGE:
   DataX-cli run [command options] [arguments...]

OPTIONS:
   --jobs value, -j value        datax job dir or file (default: "dist")
   --env value, -e value         env file
   --output value, -o value      result output dir (default: "logs")
   --datax-home value, -d value  datax home, default read env DATAX_HOME
   --loglevel value              datax log level (default: "info")
   --help, -h                    show help (default: false)
```