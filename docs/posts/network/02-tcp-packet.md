---
icon: network
date: 2023-03-14
category:
  - 网络编程篇
---

# 网络编程篇：解决TCP粘包问题

上篇文章我们介绍了如何开发最基础的TCP应用`EchoServer`回声服务器，由于`EchoServer`中都是字符串并按行分割消息并传输，所以使用了`bufio.Reader`中的`ReadLine`方法逐行读取网络消息。

而实际的网络应用开发中，我们很少会只进行字符串的传输。举例：分片传输文件需要传递的数据包有多种格式，如文件二进制数据、文件片分批次信息等，而这时就会遇到TCP粘包问题。

## 什么是粘包、拆包？

假设客户端向服务端连续发送了两个数据包，用 packet1 和 packet2 来表示，那么服务端收到的数据可以分为三种，现列举如下

- 第一种：服务端正常接收到这两个数据包 package1 和 package2，即没有发生拆包和粘包
- 第二种：接收端只接收到一个包，由于tcp不会出现丢包的现象。所以这一个数据包中包含了发送端发送的两个数据包的信息，这种现象即为粘包。这种情况由于接收端不知道这两个数据包的界限，所以对于接收端来说很难处理。
- 第三种：这种情况有两种表现形式，接收端收到了两个数据包，但是这两个数据包要么是不完整的，要么就是多出来一块，这种情况即发生了拆包和粘包。（package1不完整，package2多了package1一部分；package1多了package2的一部分，package2不完整）

## 为什么会出现粘包？

简单说就是系统底层并不会按照应用中每次调用`writer.write(data)`的数据逐个数据包进行发送。

例如：当数据长度大于 MTU（以太网(数据链路层)传输数据方面的限制）时，数据会被拆分成多个包进行传输。

当然这只是其中一个原因，还有很多原因会导致粘包（滑动窗口、Nagle算法），我就不一一介绍了，有兴趣的话可以自行百度。

## 粘包、拆包解决办法

* **特殊字符分隔符协议**：可以在数据包之间设置边界，如添加特殊符号，这样，接收端通过这个边界就可以将不同的数据包拆分开。

  > `EchoServer`应用采用的就是这种方式，按照「换行符」进行分割。而这种方式显然不适合更加复杂的场景。比如需要开发的是个代理服务器，代理的数据中如果出现了「分隔符」则会影响我们正确拆包。

* **定长协议：** 发送端将每个数据包封装为固定长度（不够的可以通过补0填充），这样接收端每次从接收缓冲区中读取固定长度的数据就自然而然的把每个数据包拆分开来。

  > 这种方式虽然可行，但是缺点也很明显，需要通过补0的方式填充数据包，降低了数据传输的效率。

* **长度编码：** 发送端给每个数据包添加包首部，首部中应该至少包含数据包的长度，这样接收端在接收到数据后，通过读取包首部的长度字段，便知道每一个数据包的实际长度了。

**最终我们选择使用「长度编码方式」来解决粘包问题。**

## 数据包封包设计

**通过上面的介绍，我们的数据报文分为两个部分：**

1. **报文头(Header)：** 固定4个字节长度的`int32`数据，存储「报文体」子节长度。
2. **报文体(Body)：** 实际需要传输的数据子节数组，长度与「报文头」`int32`数值相同

**针对「报文体」进行固定的结构设计：**

1. **指令(Cmd)：** 4子节的`int32`数值存储数据指令，方便接收到数据包后根据指令来进行指定处理。
2. **事务编号(TransactionId)：** 4子节的`int32`数值存储事务编号，下篇文章会介绍作用。
3. **数据(Data)：** 指报文体剩下的子节数组，不同的指令会有不同的数据格式。

「报文体」结构体定义：

```go
// file: packet/packet.go
// Packet Network Transfer Packet
type Packet struct {
	Cmd           int32
	TransactionId int32
	Data          []byte
}
func NewPacket(cmd int32, data []byte) *Packet {
	return &Packet{Cmd: cmd, Data: data}
}
func NewPacketTransaction(cmd, transactionId int32, data []byte) *Packet {
	return &Packet{Cmd: cmd,TransactionId: transactionId,Data: data}
}
```

约定了这些之后即可开始编码啦～

##### 1. `Packet`编码、解码

将`Packet`结构体封包转为子节数组：先写入4子节的`Packet`数据长度，再写入`Packet`

```go
// file: packet/codec.go
func Marshal(packet *Packet) []byte {
	// MarshalBody
	body := MarshalBody(packet)
	// header = int32 body length
	header := Int2Byte(int32(len(body)))
	return append(header, body...)
}
func MarshalBody(packet *Packet) []byte {
	var buf []byte
	buf = append(buf, Int2Byte(packet.Cmd)...)
	buf = append(buf, Int2Byte(packet.TransactionId)...)
	buf = append(buf, packet.Data...)
	return buf[:]
}
```

将「报文体」数据转为`Packet`结构体

```go
// file: packet/codec.go
func UnmarshalBody(buf []byte) *Packet {
	reader := bytes.NewReader(buf)
	var cmd, transactionId int32
	// read int32(4byte) Cmd And TransactionId
	_ = binary.Read(reader, binary.BigEndian, &cmd)
	_ = binary.Read(reader, binary.BigEndian, &transactionId)
	// read other bytes
	data := make([]byte, reader.Len())
	n, _ := reader.Read(data)
	return &Packet{
		Cmd:           cmd,
		TransactionId: transactionId,
		Data:          data[:n],
	}
}
```

#####  2. `PacketWriter` 

> `PacketWriter`比较简单，只需要对`Packet`进行封包后发送即可。

```go
// file: packet/writer.go
type Writer struct {
	writer io.Writer
}
func NewWriter(writer io.Writer) *Writer {
	return &Writer{writer: writer}
}
func (c *Writer) Write(packet *Packet) (err error) {
	_, err = c.writer.Write(Marshal(packet))
	return err
}
```

##### 3. `PacketReader`

> 由于每次调用`Read`方法只能读取到部分数据，可能需要多次才能够读取到完整的数据包，所以实现起来稍微复杂一点，需要根据封包的结构来判断数据包是否完整，而读取到的下个不完整的数据包数据则需要进行缓存。

```go
type Reader struct {
	cache     []byte
	reader    io.Reader
	bufLength int
}
func NewReader(reader io.Reader) *Reader {
	return &Reader{
		cache:     []byte{},
		reader:    reader,
		bufLength: DefaultReaderBufLength,
	}
}
func (c *Reader) Read() (*Packet, error) {
	isHeader := true
	var bodyLength int32
	buf := make([]byte, 16)
	for {
		n, err := c.reader.Read(buf)
		if err != nil {
			return nil, err
		}
		// reset cache and append cache to data
		data := append(c.Reset(), buf[:n]...)
		length := int32(len(data))

		for {
			if isHeader {
				// 解析 bodyLength
				if length < HeaderLength {
					// 读取到的数据长度不足 HeaderLength 长度
					// 记录缓存，break 进入下一次读取
					c.cache = append(c.cache, data...)
					break
				} else if length == HeaderLength {
					// 数据长度正好等于 HeaderLength 长度
					// 解析 bodyLength 完成，break 进入下一次读取
					bodyLength = Byte2Int(data[:HeaderLength])
					isHeader = false
					break
				} else {
					// 数据长度大于 HeaderLength
					// 解析 bodyLength 并将剩余的数据放到 data 中后继续解析 body
					bodyLength = Byte2Int(data[:length])
					isHeader = false
					data = data[HeaderLength:]
					length = int32(len(data))
				}
			} else {
				// 解析 body
				if length < bodyLength {
					// 读取到的数据长度不足 body 长度
					// 记录缓存，break 进入下一次读取
					c.cache = append(c.cache, data...)
					break
				} else {
					// 数据长度大于等于 bodyLength 长度
					// 解析 body，返回数据 packet，将剩余的数据放到 cache 中
					packet := UnmarshalBody(data[:bodyLength])
					c.cache = append(c.cache, data[bodyLength:]...)
					return packet, nil
				}
			}
		}
	}
}
func (c *Reader) Reset() []byte {
	cache := c.cache
	c.cache = []byte{}
	return cache
}
```

## 改造EchoServer程序

1. 定义数据包指令

   ```go
   const (
   	// CmdMsg 发送消息指令（服务端和客户端都需要处理）
   	CmdMsg int32 = iota + 1
   	// CmdExit 退出指令（由客户端发送，服务端断开连接）
   	CmdExit
   )
   ```

2. 服务端改造

   > 握手成功后创建`PacketReader`和`PacketWriter`，并按照数据包指令(`Cmd`)进行处理。

   ```go
   // PacketReader and PacketWriter
   reader := packet.NewReader(conn)
   writer := packet.NewWriter(conn)
   for {
     p, err := reader.Read()
     assert.NotNil(err)
     switch p.Cmd {
       case CmdMsg:
       // echo msg
       assert.NotNil(writer.Write(p))
       case CmdExit:
       // close conn
       _ := conn.Close()
       return
     }
   }
   ```

3. 客户端改造

   > 通过`PacketReader`读取服务端发送的数据包，并输出到`stdout`

   ```go
   reader := packet.NewReader(conn)
   go func() {
     // 此处省略 defer
     for {
       p, err := reader.Read()
       assert.NotNil(err)
       switch p.Cmd {
         case CmdMsg:
         fmt.Printf("echo: %s\n", string(p.Data))
       }
     }
   }()
   ```

   > 通过`PakcetWriter`向服务端发送指令(`CmdMsg`、`CmdExit`)

   ```go
   writer := packet.NewWriter(conn)
   stdinReader := bufio.NewReader(os.Stdin)
   for {
     data, _, _ := stdinReader.ReadLine()
     if string(data) == "exit" {
       // 发送 CmdExit 数据包
       assert.NotNil(writer.Write(packet.NewPacket(CmdExit, nil)))
     } else {
       // 发送 CmdMsg 数据包
       assert.NotNil(writer.Write(packet.NewPacket(CmdMsg, data)))
     }
   }
   ```

**改造完成，让我来测试下效果～**
![EchoServer](https://static.xzcoder.com/markdown/image-1678813314033.png)

## 总结

1. 通过本篇文章简单介绍了 TCP粘包是什么？为什么会产生粘包问题以及如何解决。
2. 统一设计了数据包格式。并通过`PacketReader`使我们可以逐个数据包进行读取数据。
3. 通过`Packet`结构体中的指令(`Cmd`)更好的区分消息的类型，方便对不同类型的消息进行处理。
4. `Packet`结构中预留了`TransactionId`字段，具体作用将放在下一篇文章讲解。
4. 文中涉及的源码可关注公众号领取哦～
