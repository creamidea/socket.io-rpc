import { Disposable } from './common';

export class DisposableCollection implements Disposable {
  protected readonly disposables: Disposable[] = [];

  constructor(...toDispose: Disposable[]) {
    toDispose.forEach((d) => this.push(d));
  }

  get disposed(): boolean {
    return this.disposables.length === 0;
  }

  dispose(): void {
    if (this.disposed) {
      return;
    }
    while (!this.disposed) {
      try {
        this.disposables.pop()!.dispose();
      } catch (e) {
        console.error(e);
      }
    }
  }

  push(disposable: any): void {
    const disposables = this.disposables;
    disposables.push(disposable);
  }
}
