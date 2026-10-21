declare module '*.css' {
  const css: string
  export default css
}

// Vite's ?inline imports: the file's text at build time (the web component's stylesheet).
declare module '*?inline' {
  const text: string
  export default text
}
