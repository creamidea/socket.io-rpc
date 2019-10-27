/**
 * 处理客户端调用远程服务的请求
 * 分为远程过程调用和消息通知 2 个部分
 * 协议：
 * - 远程过程的实现必须返回 Promise
 * - 消息通知的实现函数签名是以 callback 形式
 */
import SocketIO from 'socket.io';
import { SocketIORPC } from './rpc';

export class SocketIORPCServer {
  private readonly server: SocketIO.Server;
  constructor(srv: any, opts?: SocketIO.ServerOptions) {
    this.server = SocketIO(
      srv,
      Object.assign({}, opts, {
        transports: ['websocket'],
      }),
    );
  }

  bind(rpc: SocketIORPC) {
    this.server.on('connect', (client) => {
      rpc.join(client);
    });
  }
}
