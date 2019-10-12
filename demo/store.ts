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

  onPriceChange(name: string, callback: Function) {
    setInterval(() => {
      const price = Math.floor(Math.random() * 1000);
      const data = {
        name,
        price,
      };
      // console.log('send data', data);
      callback(data);
    }, 1000);
  }

  onChange(callback: Function) {
    setInterval(() => {
      callback(new Date());
    }, 3000);
  }
}
