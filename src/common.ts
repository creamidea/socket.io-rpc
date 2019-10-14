// Response, Message, Notifaction

export interface Vendor {
  id: string;

  /**
   * TODO
   * 为了每个 Vendor 做好内存回收
   * 提供这些生命周期
   */
  onEnter?(client: SocketIOClient.Socket): void;
  onLeave?(client: SocketIOClient.Socket): void;

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

export interface ResponseError {
  code: number;
  message: string;
  data?: any;
}
