/**
 * 处理客户端调用远程服务的请求
 * 分为远程过程调用和消息通知 2 个部分
 * 协议：
 * - 远程过程的实现必须返回 Promise
 * - 消息通知的实现函数签名是以 callback 形式
 */
import * as EventEmitter from 'events';
import SocketIO from 'socket.io';
import { Response, Message, Notifaction, Vendor } from './common';

export function NotFoundResponse(id: string) {
  return {
    id,
    error: {
      code: -32601,
      message: 'Method not found',
    },
  };
}
export function ErrorResponse(id: string, err: Error) {
  return {
    id,
    error: {
      code: 1,
      message: err.message,
    },
  };
}
export function SuccessResponse(id: string, result: any) {
  return {
    id,
    result,
  };
}

export class SocketIORPC {
  private readonly pool = new Map<string, Vendor>();

  register(vendor: Vendor) {
    this.pool.set(vendor.id, vendor);
  }

  /**
   * @param client
   */
  join(client: SocketIO.Socket) {
    // console.log('[RPC Server] join', client.id);
    client.on('call', (message, callback) => {
      // console.log('[RPC Server] call', message);
      this.call(message, callback);
    });

    client.on('listen', (message) => {
      this.notify(message, client.emit.bind(client));
    });
  }

  private notify(msg: Notifaction, emit: typeof EventEmitter.prototype.emit) {
    const { id, channel, params, seq } = msg;
    const vendor = this.pool.get(id);

    if (!vendor) {
      console.info('not found vendor', id);
      return;
    }

    const method = `on${channel}`;

    function callback(...result: any[]) {
      emit('notify', seq, {
        id,
        method,
        params: result,
      } as Message);
    }

    if (typeof vendor[method] === 'function') {
      try {
        params.push(callback);
        vendor[method](...params);
      } catch (err) {
        console.error('invalid notify', err);
      }

      return;
    }
  }

  private call(msg: Message, callback: (res: Response) => void) {
    // 普通调用函数
    const { id, method, params } = msg;
    const vendor = this.pool.get(id);
    if (!vendor) {
      console.info('not found vendor', id);
      return;
    }

    if (typeof vendor[method] === 'function') {
      vendor[method](...params)
        .then((result: any) => {
          callback(SuccessResponse(id, result));
        })
        .catch((err: Error) => {
          callback(ErrorResponse(id, err));
        });

      return;
    }

    callback(NotFoundResponse(id));
  }
}

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
