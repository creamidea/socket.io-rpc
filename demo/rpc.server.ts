import http from 'http';
import express from 'express';
import { MyStore } from './store';
import { SocketIORPC, SocketIORPCServer } from '../src';

const app = express();
const server = new http.Server(app);
const SERVER_PORT = 3001;

// #region Server
const rpc = new SocketIORPC();
rpc.register(new MyStore());

const rpcServer = new SocketIORPCServer(server, {
  path: '/v1/channels',
});
rpcServer.bind(rpc);

server.listen(SERVER_PORT, async () => {
  console.info(`---> server listening at ${SERVER_PORT}.\n`);
});
// #endregion
