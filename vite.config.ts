import { defineConfig } from 'vite'
import react, { reactCompilerPreset } from '@vitejs/plugin-react'
import babel from '@rolldown/plugin-babel'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] })
  ],
  resolve: {
    alias:{
      // 告诉vite，cesium这个包不要按普通的npm包处理，用我指定的路径
      cesium:path.resolve(__dirname,'node_modules/cesium'),
      '@':path.resolve(__dirname,'src')
    }
  },
  define:{
    // 定义全局变量  告诉cesium：“你的静态资源都在/public/cesium目录下”
    CESIUM_BASE_URL:JSON.stringify('/cesium')
  },
  build:{
    rollupOptions:{
      output:{
        // 告诉rollup，不要打包cesium这个包
        manualChunks(id:string):string|void{
          if(id.includes('cesium')){
            return 'cesium'
          }
          if(id.includes('mapbox-gl')){
            return 'mapbox'
          }
          if(id.includes('node_modules')){
            return 'vendor'
          }
        }
      }
    }
  }
})
