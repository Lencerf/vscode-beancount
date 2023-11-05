export interface InputMethod {
  getLetterRepresentation(w: string, config?: InputMethodConfig): string;
}

export class InputMethodConfig {
  keepPunctuation: boolean = false;
}
