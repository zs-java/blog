---
icon: network
date: 2023-04-20
category:
  - 网络编程篇
  - VPN
---

# 网络编程篇：VPN 原理与实战开发

通过前面几篇文章介绍了网络编程的基础流程 和 `VPN`原理中的 `Tun`虚拟网络设备

本篇文章就带大家来实战开发一个简单的 `VPN` 程序～

## 背景介绍

<img src="https://static.xzcoder.com/markdown/image-1682007231289.png" alt="网络拓扑图" style="zoom:50%;" />

**如上图所示得到如下信息：**

1. 公司局域网网段为 `172.1.0.0/24`
2. 公司局域网内有一台机器安装了`VPN`服务端程序端口为`51005`，且`51005`通过内网穿透的方式可以通过公网进行访问
3. 家里的电脑上安装了`VPN`客户端程序，可以连通公司局域网`VPN`服务器的`51005`端口

**最终目标**

家中的电脑可以直接访问公司局域网的内网`IP`访问局域网中的任意机器，如：`ping 172.1.0.103`访问数据库服务器

### VPN 客户端工作原理

`VPN`客户端主要负责的工作分为`发送`与`接收`两部分：将应用程序发到`172.1.0.0/24`网段的数据包发送给`VPN`服务端；再将`VPN`服务端返回的数据包返回给应用程序。

下面通过网络传输示意图来分别介绍这两部分的流程

**VPN 客户端发送数据包到服务端**

![VPN客户端发送数据](https://static.xzcoder.com/markdown/image-20230421005858861.png)

1. 首先 `VPN`客户端程序会创建一个`Tun`虚拟网络设备，并添加`172.1.0.0/24`网段静态路由指向`Tun`设备
2. 当执行`ping 172.1.0.103` 时，会根据设置的静态路由将数据发送给`Tun`设备
3. `VPN`客户端读取`Tun`数据包，并将数据包转发给公司局域网内的`VPN`服务端程序

**VPN 客户端接收数据包到服务端**

![VPN客户端接收数据](https://static.xzcoder.com/markdown/image-20230421011710018.png)

1. `VPN`客户端收到服务端返回的数据包，并将数据包写入`Tun`设备

2. 写入到`Tun`设备的数据包经过`TCP/IP`协议栈发送给对应的应用程序

### VPN 服务端端工作原理

服务端工作原理与客户端大体一致，我就不再放示意图了。

**VPN 服务端接收数据**

1. 当服务端接收到客户端发送的数据包后，将数据包写入`Tun`设备
2. 写入到`Tun`设备的数据包经过`TCP/IP`协议栈转发给交换机
3. 交换机再将数据包转发给局域网内的机器

**VPN 服务端返回数据**

1. 读取`Tun`设备数据包，并数据包的目标`IP`地址找到对应的客户端连接
2. 将数据包发送给客户端

## 实战开发

下面将使用`Go`语言实现`VPN`客户端与服务端

```shell
# 安装依赖库
go get -u github.com/zs-java/libgo-common
```

定义`TCP`应用数据包指令

```go
// file: libgvpn/common.go
const (
  // 客户端向服务端注册虚拟IP地址
	CmdClientRegisterCidr = iota + 1
  // 转发数据包
	CmdProxyPacket
)
```

#### VPN 客户端开发

##### 1. 定义程序输入参数

```go
// file: client.go
// Tun 网卡局域网IP和子网掩码
cidr := flag.String("cidr", "182.1.1.101/24", "vlan cidr")
// 服务端地址
serverAddress := flag.String("server", "", "server address")
flag.Parse()
```

##### 2. 定义结构体存储客户端信息

```go
// file: libgvpn/common.go
type ClientStorage struct {
	IP   net.IP // Tun IP
	CIDR string // Tun CIDR
	Tun  *libtun.Interface // Tun 设备接口
}
```

##### 3. 与服务端创建 TCP 连接

```go
// file: client.go
conn, err := nets.Dial("tcp", *serverAddress, func(conn net.Conn) *nets.Conn {
  return &nets.Conn{
    Conn:               conn,
    HandshakeHandler:   handshake.NewVersionClientHandler(libgvpn.Version),
    Reader:             packet.NewReader(conn),
    Writer:             packet.NewWriter(conn),
    TransactionManager: transaction.NewManager(),
    PacketHandlers: []*nets.PacketHandler{
      nets.DefaultTransactionPacketHandler,
      libgvpn.NewClientProxyPacketHandler(storage),
    },
  }
})
assert.NotNil(err)
// handshake
assert.NotNil(conn.Handshake())
// handle packet
go conn.HandlePacket()
```

##### 4. 向服务端注册虚拟 IP 并得到旁路地址

```go
// file: client.go
bypass, err := libgvpn.RegisterClientAndGetBypass(conn, storage)
assert.NotNil(err)
fmt.Printf("Server Bypass: %s\n", bypass)
// ------ 文件分割线 ------
// file: libgvpn/handler.go
func RegisterClientAndGetBypass(conn *nets.Conn, storage *ClientStorage) (string, error) {
  // 创建事务数据包并发送
	t := conn.TransactionManager.CreateTransaction(CmdClientRegisterCidr, storage.IP)
	assert.NotNil(conn.WritePacket(t.GetPacket()))
  // 等待事务结束（服务端响应结果）
	assert.NotNil(t.Wait())
  // 解析服务端响应的数据(JSON)
	var result ClientRegisterResult
	assert.NotNil(json.Unmarshal(t.GetCallbackPacket().Data, &result))
	if !result.Success {
		return "", errors.New(fmt.Sprintf("Register CIDR(%s) Failed: %s\n", storage.CIDR, result.Message))
	}
	fmt.Printf("Register CIDR(%s) Successful!\n", storage.CIDR)
  // 得到旁路地址（就是服务端局域网网段）
	return result.Bypass, nil
}
```

##### 5. 创建 Tun 设备并转发数据包

创建 `Tun` 虚拟设备，并添加静态路由指向虚拟网卡

```go
// file: libgvpn/handler.go#SetupTunAndProxyToServer
// 创建 tun 虚拟网络设备
tun, err := libtun.NewTun(libtun.Config{
  MTU:  1500,
  CIDR: storage.CIDR,
  Name: "gvpn",
})
assert.NotNil(err)
storage.Tun = tun
// 添加旁路路由到 tun 网卡
assert.NotNil(tun.RouteAdd(bypass))
```

读取`Tun`数据包并转发给服务端

```go
// file: libgvpn/handler.go#SetupTunAndProxyToServer
buf := make([]byte, tun.MUT)
for {
  n, err := tun.Read(buf)
  if err != nil {
    panic(err)
  }
  // IP 数据包
  data := buf[:n]
  if !waterutil.IsIPv4(data) {
    // 只处理 ipv4 数据包
    continue
  }
  // 目标IP
  destIp := waterutil.IPv4Destination(data)
  // 如果目标IP与本地 Tun 设备的IP相同，则将数据包写回到 Tun 设备
  if destIp.Equal(storage.IP) {
    _, _ = tun.Write(data)
    continue
  }
  // 发送到 server
  _ = conn.WritePacket(packet.NewPacket(CmdProxyPacket, data))
}
```

##### 6. 处理服务端返回的数据包

```go
// file: libgvpn/handler.go
func NewClientProxyPacketHandler(storage *ClientStorage) *nets.PacketHandler {
	return &nets.PacketHandler{
		Name: "ClientProxyPacketHandler",
		Cmd:  CmdProxyPacket,
		Action: func(ctx *nets.Context, p *packet.Packet) error {
			fmt.Println("tun", storage.Tun)
			if storage.Tun == nil {
				// tun 网卡未准备好，忽略数据包
				return nil
			}
			// 将服务端转发回来的数据包写入 tun 网卡
			_, err := storage.Tun.Write(p.Data)
			return err
		},
	}
}
```

#### VPN 服务端开发

##### 1. 定义程序输入参数

```go
// file: server.go
// 服务端监听地址
serverAddress := flag.String("address", ":51005", "server address")
// 服务端 Tun 虚拟设备 CIDR
cidr := flag.String("cidr", "182.1.1.0/24", "vlan cidr")
// 需要代理转发的网段地址
bypass := flag.String("bypass", "", "bypass cidr")
flag.Parse()
```

##### 2. 定义结构体存储服务端信息

```go
// file: libgvpn/common.go
type ServerStorage struct {
	CIDR    string	// Tun CIDR
	Bypass  string	// 旁路地址 CIDR
	Tun     *libtun.Interface	// Tun 设备接口
	ConnMap map[*nets.Conn]*ClientInfo	// TCP连接客户端信息
}
type ClientInfo struct {
  // 客户端的虚拟网卡IP
	IP net.IP
}
```

##### 3. 监听 TCP 端口接收客户端连接

```go
// file: server.go
listen, err := nets.Listen("tcp", *serverAddress, func(conn net.Conn) *nets.Conn {
  return &nets.Conn{
    Conn:               conn,
    HandshakeHandler:   handshake.NewVersionServerHandler(libgvpn.Version),
    Reader:             packet.NewReader(conn),
    Writer:             packet.NewWriter(conn),
    TransactionManager: transaction.NewManager(),
    PacketHandlers: []*nets.PacketHandler{
      nets.DefaultTransactionPacketHandler,
      // 处理客户端注册指令数据包
      libgvpn.NewServerAcceptClientRegisterCidrHandler(storage),
      // 处理客户端转发指令数据包
      libgvpn.NewServerProxyPacketHandler(storage),
    },
    ExceptionHandler: libgvpn.PrintEofExceptionHandler,
    // 当连接关闭时删除 ConnMap 缓存
    ClosedHandler: func(ctx *nets.Context) {
      delete(storage.ConnMap, ctx.Conn)
    },
  }
})
assert.NotNil(err)
// 创建 Tun 设备并转发数据包
go libgvpn.SetupTunAndProxyToClient(storage)
for {
  accept, err := listen.Accept()
  if err != nil {
    fmt.Println(err)
    continue
  }
  go func() {
    _ = accept.Handshake()
    accept.HandlePacket()
  }()
}
```

##### 4. 处理客户端注册指令数据包

若客户端虚拟 IP 已被注册则注册失败，注册成功返回旁路地址

```go
// file: libgvpn/handler.go
func NewServerAcceptClientRegisterCidrHandler(storage *ServerStorage) *nets.PacketHandler {
	return &nets.PacketHandler{
		Name: "ServerAcceptClientRegisterCidrHandler",
		Cmd:  CmdClientRegisterCidr,
		Action: func(ctx *nets.Context, p *packet.Packet) error {
			// 获取客户端发送的 ip
			var ip net.IP = p.Data
			fmt.Printf("client register ip: %s\n", ip.String())

			result := ClientRegisterResult{}

			// 判断当前连接是否已经注册过信息
			if _, ok := storage.ConnMap[ctx.Conn]; !ok {
				// 没注册过，检查 cidr 是否已被注册
				for _, info := range storage.ConnMap {
					if info.IP.Equal(ip) {
						// 注册失败
						result.Success = false
						result.Message = "CIDR is registered!"
						_ = ctx.WritePacket(ctx.TransactionManager.CreateCallbackPacket(p.TransactionId, assert.GetFirstByteArr(json.Marshal(result))))
						_ = ctx.Close()
						return nil
					}
				}
			}
      // 记录客户端信息
			storage.ConnMap[ctx.Conn] = &ClientInfo{IP: ip}
			result.Success = true
			result.Bypass = storage.Bypass
			return ctx.WritePacket(ctx.TransactionManager.CreateCallbackPacket(p.TransactionId, assert.GetFirstByteArr(json.Marshal(result))))
		},
	}
}
```

##### 5. 创建 Tun 设备并转发数据包

```go
// file: libgvpn/handler.go#SetupTunAndProxyToClient
// 创建 Tun 设备
tun, err := libtun.NewTun(libtun.Config{
  MTU:  1500,
  CIDR: storage.CIDR,
  Name: "gvpn",
})
assert.NotNil(err)
storage.Tun = tun
defer func() {
	// ……
}()
// 读取 Tun 数据包
buf := make([]byte, tun.MUT)
for {
  n, err := tun.Read(buf)
  if err != nil {
    panic(err)
  }
  data := buf[:n]
  if !waterutil.IsIPv4(data) {
    continue
  }
  // 目标IP
  destIpv4 := waterutil.IPv4Destination(data)
  // 判断目标IP是否属于虚拟网卡网段
  if !IpContains(storage.CIDR, destIpv4) {
    continue
  }
  // 找到对应的连接并写入数据
  if conn, ok := stream.Map(stream.OfMap(storage.ConnMap).Filter(func(entry item.Pair[*nets.Conn, *ClientInfo]) bool {
    return destIpv4.Equal(entry.Val.IP)
  }), func(entry item.Pair[*nets.Conn, *ClientInfo]) *nets.Conn {
    return entry.Key
  }).FindFirst(); ok {
    _ = conn.WritePacket(packet.NewPacket(CmdProxyPacket, data))
  }
  // 没有找到对应的客户端连接，忽略
}
```

##### 6. 处理客户端转发指令数据包

```go
// file: libgvpn/handler.go
func NewServerProxyPacketHandler(storage *ServerStorage) *nets.PacketHandler {
	return &nets.PacketHandler{
		Name: "ServerProxyPacketHandler",
		Cmd:  CmdProxyPacket,
		Action: func(ctx *nets.Context, p *packet.Packet) error {
			// 目标 ip
			destIpv4 := waterutil.IPv4Destination(p.Data)
			// 判断目标 ip 是否在 旁路网段内
			if !IpContains(storage.Bypass, destIpv4) {
				return nil
			}
			// 写入 tun 网卡
			if storage.Tun == nil {
				return nil
			}
			_, err := storage.Tun.Write(p.Data)
			return err
		},
	}
}
```

**OK，编码结束～**

## 程序测试

由于我没有这么多机器，所以用腾讯云的一台机器与`Docker`容器来模拟公司的局域网环境。

#### 测试环境准备

1. 腾讯云安装`Docker`,`docker0`网桥的网段为`172.17.0.1/16`

2. 部署一个`nginx`容器，容器的内网地址为`172.17.0.4`

3. 宿主机开启`IP`转发

   ```shell
   sysctl -w net.ipv4.ip_forward=1
   ```

4. `iptables`为宿主机`docker0`网卡添加`NAT`规则

   ```shell
   iptables -t nat -A POSTROUTING -o docker0 -j MASQUERADE
   ```

5. 宿主机启动`VPN`服务端

   ```shell
   ./gvpn-server --bypass=172.17.0.0/16
   ```

6. 个人电脑启动`VPN`客户端

   ```shell
   ./gvpn-client --server=
   ```

![VPN程序截图](https://static.xzcoder.com/markdown/image-20230421130700684.png)

#### 访问验证

**`ping`命令访问`nginx`容器**

![ping局域网机器](https://static.xzcoder.com/markdown/image-20230421131048069.png)

**`curl`访问`nginx`容器的`80`端口**

![curl局域网端口](https://static.xzcoder.com/markdown/image-20230421131228247.png)

**大功告成，这样就可以在我个人电脑上直接使用内网 IP 访问 Docker 容器了！**

## 总结

本篇文章讲解了`VPN`工作的原理，并且基于前面几章「网络编程篇」中的基础内容带大家实战开发了一个 简单的`VPN`程序。

`GO`和`Java`实现源码可以公众号私聊获取～

以上就是本文的全部内容。喜欢本文的话请帮忙转发或点击“在看”。您的举手之劳是对我莫大的鼓励。谢谢！