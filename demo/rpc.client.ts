import { Store } from './store';
import { SocketIORPCClient } from '../src/rpc-client';

const SERVER_PORT = 3002;

// #region Client
function createDemoClient() {
  const rpc = new SocketIORPCClient(`http://127.0.0.1:${SERVER_PORT}`, {
    path: '/v1/channels',
  });

  const store = rpc.create<Store>('store');
  // const store2 = rpc.create<Store>('store');

  store.query('100').then((data: any) => {
    console.log('--> query', data);
  });

  // store.xx().catch((err: Error) => {
  //   console.error(err);
  // });

  store.onPriceChange('xxx', (data: any) => {
    console.log('--> xxx price change', data);
  });

  // store.onPriceChange('yyy', (data: any) => {
  //   console.log('--> yyy price change', data);
  // });

  // store2.onPriceChange('2y2y2y', (data: any) => {
  //   console.log('--> 2y2y2y price change', data);
  // });

  // store.onChange((data: any) => {
  //   console.log('--> onchange', data);
  // });
}
// #endregion

createDemoClient();
