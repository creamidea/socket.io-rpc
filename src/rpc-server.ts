/**
 * 处理客户端调用远程服务的请求
 * 分为远程过程调用和消息通知 2 个部分
 * 协议：
 * - 远程过程的实现必须返回 Promise
 * - 消息通知的实现函数签名是以 callback 形式
 */
import SocketIO, { Socket } from 'socket.io';
import { Response, Message, Notifaction, Vendor, isDisposable } from './common';
import { DisposableCollection } from './disposable';
import { isFunction } from 'util';

function createCallback({ seq, id, method }: any, client: Socket) {
  // console.info('---> create notify callback');
  function cb(...result: any[]) {
    if (client.connected) {
      // console.info(new Date(), 'notify', seq, id, method, result);
      client.emit('notify', seq, {
        id,
        method,
        params: result,
      } as Message);
    }
  }

  return cb;
}

export function NotFoundResponse(id: string, method: string) {
  return {
    id,
    method,
    error: {
      code: -32601,
      message: 'Method not found',
    },
  };
}
export function ErrorResponse(id: string, method: string, err: Error) {
  return {
    id,
    method,
    error: {
      code: (err as any).code || -32000,
      name: err.name,
      message: err.message,
    },
  };
}
export function SuccessResponse(id: string, method: string, result: any) {
  return {
    id,
    method,
    result,
  };
}

export class SocketIORPC {
  private readonly vendors = new Map<string, Vendor>();

  register(vendor: Vendor) {
    this.vendors.set(vendor.id, vendor);
  }

  /**
   * @param client
   */
  join(client: SocketIO.Socket) {
    // console.log('[RPC Server] join', client.id);

    (client as any).toDispose = new DisposableCollection();

    client.on('call', (message, callback) => {
      // console.log('[RPC Server] call', message);
      this.call(message, callback);
    });

    client.on('listen', (message) => {
      this.notify(message, client);
    });

    client.on('disconnect', () => {
      const toDispose = (client as any).toDispose as DisposableCollection;
      toDispose.dispose();
      // console.log('disposaled');
    });
  }

  private notify(msg: Notifaction, client: Socket) {
    const { id, channel, params, seq } = msg;
    const vendor = this.vendors.get(id);

    if (!vendor) {
      console.info('not found vendor', id);
      return;
    }

    const method = `on${channel}`;

    if (isFunction(vendor[method])) {
      try {
        const cb = createCallback({ seq, id, method }, client);
        params.push(cb);
        const disposable = vendor[method](...params);
        if (isDisposable(disposable)) {
          (client as any).toDispose.push(disposable);
        }
      } catch (err) {
        console.error('invalid notify', err);
      }

      return;
    }
  }

  private call(msg: Message, callback: (res: Response) => void) {
    // 普通调用函数
    const { id, method, params } = msg;
    const vendor = this.vendors.get(id);
    if (!vendor) {
      console.info('not found vendor', id);
      return;
    }

    if (typeof vendor[method] === 'function') {
      const p = vendor[method](...params);
      if (isFunction(p.then) && isFunction(p.catch)) {
        p.then((result: any) => {
          callback(SuccessResponse(id, method, result));
        }).catch((err: Error) => {
          callback(ErrorResponse(id, method, err));
        });
      } else {
        callback(ErrorResponse(id, method, new Error(`faild: the method must return a promise.`)));
      }

      return;
    }

    callback(NotFoundResponse(id, method));
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
