/**
 * 处理客户端调用远程服务的请求
 * 分为远程过程调用和消息通知 2 个部分
 * 协议：
 * - 远程过程的实现必须返回 Promise
 * - 消息通知的实现函数签名是以 callback 形式
 */
import * as EventEmitter from 'events';
import SocketIO from 'socket.io';

export interface Vendor {
  id: string;

  // 远程调用的方法
  // - 普通调用始终返回 Promise
  // - 如果是监听某些变化，则函数签名通 callback 形式
  [key: string]: any;
}

export interface Message {
  id: string;
  method: string;
  params: any[];
}

export interface Notifaction {
  id: string;

  /**
   * 消息序列
   */
  seq: number;

  /**
   * Attention: 首字母大写
   * 通讯的频道
   * 构造形式 onXxxx => Xxxx
   */
  channel: string;

  params: any[];
}

export interface Response {
  id: string;
  result?: any;
  error?: ResponseError;
}

interface ResponseError {
  code: number;
  message: string;
  data?: any;
}

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
    client.on('call', (message, callback) => {
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

    function callback(result: any) {
      emit('notify', seq, {
        id,
        method,
        params: Array.isArray(result) ? result : [result],
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
