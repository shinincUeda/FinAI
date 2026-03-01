import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    // ポートを固定する。localhost:5173以外のポートで起動するとlocalStorageのオリジンが変わり、
    // 保存したデータが参照できなくなるため。
    port: 5173,
  },
});
