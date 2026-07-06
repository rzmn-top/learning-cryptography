import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
  appType: 'mpa',
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        ch00: resolve(__dirname, 'chapters/ch00-intro.html'),
        ch01: resolve(__dirname, 'chapters/ch01-groups.html'),
        ch02: resolve(__dirname, 'chapters/ch02-rings.html'),
        ch03: resolve(__dirname, 'chapters/ch03-symmetric.html'),
        ch04: resolve(__dirname, 'chapters/ch04-rsa-dh.html'),
        ch05: resolve(__dirname, 'chapters/ch05-elliptic.html'),
        ch06: resolve(__dirname, 'chapters/ch06-qubits.html'),
        ch07: resolve(__dirname, 'chapters/ch07-shor-grover.html'),
        ch08: resolve(__dirname, 'chapters/ch08-lattices.html'),
        ch09: resolve(__dirname, 'chapters/ch09-pqc.html'),
        ch10: resolve(__dirname, 'chapters/ch10-fhe.html'),
      },
    },
  },
});
