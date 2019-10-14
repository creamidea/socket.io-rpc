import io from 'socket.io-client';
import { Response, Message, Notifaction } from './common';

export class SocketIORPCClient {
  private readonly client: SocketIOClient.Socket;

  private seq = 0;
  private readonly handlers = new Map<number, Function>();

  constructor(readonly endpoint: string, readonly opts: SocketIOClient.ConnectOpts) {
    this.client = io(
      endpoint,
      Object.assign({}, opts, {
        transports: ['websocket'],
      }),
    );

    this.client.on('notify', (seq: number, message: Message) => {
      // console.log('receive notification:', seq, message);
      const cb = this.handlers.get(seq);
      if (typeof cb === 'function') {
        cb(...message.params);
      }
    });
  }

  create<T extends object>(id: string): T {
    const target: any = {
      id,
    };

    return new Proxy<T>(target, {
      get: (target, name: string) => {
        const id = (target as any).id;
        if (name.startsWith('on')) {
          return (...params: any[]) => this.createNotify(id, name, params);
        }
        return (...params: any[]) => this.createCall(id, name, params);
      },

      set() {
        throw new Error('method not implementation');
      },
    });
  }

  private createCall(id: string, name: string, params: any[]) {
    return new Promise((resolve, reject) => {
      this.client.emit(
        'call',
        {
          id,
          method: name,
          params: params,
        },
        (message: Response) => {
          // console.log('receive call result:', message);
          // { id: 'store', result: { price: 10, name: 'xx' } }
          const { result, error } = message;

          if (error) {
            reject(new Error(`[SocketIO RPC Error] ${error.message}`));
            return;
          }

          resolve(result);
        },
      );
    });
  }

  private createNotify(id: string, name: string, params: any[]) {
    const cb = params.pop();

    if (typeof cb !== 'function') {
      throw new Error('must have callback!');
    }

    const seq = this.seq++;
    this.handlers.set(seq, cb);
    this.client.emit('listen', {
      id,
      seq,
      channel: name.replace(/^on/, ''),
      params,
    } as Notifaction);
  }
}
