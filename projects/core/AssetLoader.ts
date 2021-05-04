import {promises as fs} from 'fs';

/** @internal */
export class AssetLoader {
  private readonly map: Map<string, Promise<Buffer>> = new Map();

  public invalidate(id: string): void {
    this.map.delete(id);
  }

  public load(id: string): Promise<Buffer> {
    return this.map.get(id) || this.doLoad(id);
  }

  private doLoad(id: string): Promise<Buffer> {
    const p$: Promise<Buffer> = fs.readFile(id);
    this.map.set(id, p$);
    p$.catch(() => {
      this.invalidate(id);
    });

    return p$;
  }
}
