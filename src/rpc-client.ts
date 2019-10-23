import io from 'socket.io-client';
import { Response, Message, Notifaction } from './common';

interface Handler {
  id: string;
  seq: number;
  channel: string;
  params: any[];
  callback: Function;
}

export class SocketIORPCClient {
  private readonly client: SocketIOClient.Socket;

  private seq = 0;
  private readonly handlers = new Map<number, Handler>();

  constructor(readonly endpoint: string, readonly opts: SocketIOClient.ConnectOpts) {
    this.client = io(
      endpoint,
      Object.assign({}, opts, {
        transports: ['websocket'],
      }),
    );

    this.client.on('notify', (seq: number, message: Message) => {
      // console.log(new Date(), '--> receive notification:', seq, message);
      const h = this.handlers.get(seq);
      if (h && typeof h.callback === 'function') {
        h.callback.apply(null, message.params);
      }
    });

    this.client.on('reconnect', () => {
      this.handlers.forEach((h) => {
        this.send(h.seq);
      });
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

  close() {
    this.client.close();
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
    const packet = {
      id,
      seq,
      channel: name.replace(/^on/, ''),
      params,
    } as Notifaction;

    this.handlers.set(seq, {
      ...packet,
      callback: cb,
    } as Handler);

    this.send(seq);
  }

  private send(seq: number) {
    const h = this.handlers.get(seq);
    if (h) {
      this.client.emit('listen', {
        id: h.id,
        seq: h.seq,
        channel: h.channel,
        params: h.params,
      });
    }
  }
}
