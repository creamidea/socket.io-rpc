import http from 'http';
import express from 'express';
import { MyStore, Store } from './store';
import { SocketIORPC, SocketIORPCServer } from '../src/rpc-server';
import { SocketIORPCClient } from '../src/rpc-client';

const app = express();
const server = new http.Server(app);
const SERVER_PORT = 3001;

// #region Client
function createDemoClient() {
  const rpc = new SocketIORPCClient(`http://127.0.0.1:${SERVER_PORT}`, {
    path: '/v1/channels',
  });

  const store = rpc.create<Store>('store');

  store.query('100').then((data: any) => {
    console.log('--> query', data);
  });

  // store.xx().catch((err: Error) => {
  //   console.error(err);
  // });

  store.onPriceChange('xxx', (data: any) => {
    console.log('--> xxx price change', data);
  });

  store.onPriceChange('yyy', (data: any) => {
    console.log('--> yyy price change', data);
  });

  store.onChange((data: any) => {
    console.log('--> onchange', data);
  });
}
// #endregion

// #region Server
const rpc = new SocketIORPC();
rpc.register(new MyStore());

const rpcServer = new SocketIORPCServer(server, {
  path: '/v1/channels',
});
rpcServer.bind(rpc);

server.listen(SERVER_PORT, async () => {
  console.info(`---> server listening at ${SERVER_PORT}.\n`);
  createDemoClient();
});
// #endregion
