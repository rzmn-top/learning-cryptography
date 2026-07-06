declare module 'katex/contrib/auto-render' {
  export interface Delimiter {
    left: string;
    right: string;
    display: boolean;
  }
  export interface AutoRenderOptions {
    delimiters?: Delimiter[];
    throwOnError?: boolean;
    ignoredTags?: string[];
  }
  const renderMathInElement: (el: HTMLElement, options?: AutoRenderOptions) => void;
  export default renderMathInElement;
}
