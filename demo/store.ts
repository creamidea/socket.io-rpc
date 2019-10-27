import { createDisposable } from '../src/common';

export interface Store {
  query(name: string): Promise<{ name: string; price: number }>;
  onPriceChange(name: string, callback: Function): void;
  onChange(callback: Function): void;
}

export class MyStore implements Store {
  constructor(readonly id = 'store') {}

  async query(name: string) {
    return {
      price: 10,
      name,
    };
  }

  onPriceChange(name: string, callback: (data: any) => void) {
    const timer = setInterval(() => {
      const price = Math.floor(Math.random() * 1000);
      const data = {
        name,
        price,
      };
      console.log('send data', data);
      callback(data);
    }, 1000);

    return createDisposable(() => {
      clearInterval(timer);
    });
  }

  onChange(callback: Function) {
    const timer = setInterval(() => {
      callback(new Date());
    }, 3000);
    return createDisposable(() => {
      clearInterval(timer);
    });
  }
}
