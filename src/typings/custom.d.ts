/// <reference types="vite/client" />

// Vite worker import (use ?worker or &worker suffix or import from URL)
declare module '*?worker' {
  const workerConstructor: new () => Worker;
  export default workerConstructor;
}
