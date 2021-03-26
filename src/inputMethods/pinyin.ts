import {InputMethod} from './inputMethod';
import {readFileSync} from 'fs';

export class Pinyin implements InputMethod {
  private _pyData: Map<string, string>;
  constructor(pyDataPath: string) {
    const rawData = readFileSync(pyDataPath, 'utf-8');
    const parsedData = JSON.parse(rawData);
    this._pyData = new Map<string, string>();
    for (const letter of Object.keys(parsedData)) {
      for (const char of parsedData[letter]) {
        this._pyData.set(char, letter);
      }
    }
  }

  getLetterRepresentation(w: string): string {
    const result = [];
    for (let i = 0; i < w.length; i += 1) {
      const r = this._pyData.get(w[i]) || '';
      if (r.length === 0) {
        continue;
      }
      result.push(r);
    }
    return result.join('');
  }
}
