import {defineConfig} from 'vite'
import {builtinModules} from 'module'
import react from '@vitejs/plugin-react'

const {resolve} = require('path')

// https://vitejs.dev/config/
export default defineConfig((env) => {
    return {
        plugins: [react()],
        base: './',
        build: {
            assetsDir: '',
            outDir: '../app/webdist',
            rollupOptions: {
                output: {
                    format: 'commonjs',     // Electron 目前只支持 CommonJs 格式
                },
                external: [                 // 告诉 Rollup 不要打包内建 API
                    'electron',
                    'got',
                    '@electron/remote',
                    ...builtinModules,
                ],
            },
        },
        optimizeDeps: {
            exclude: ['electron', 'got', '@electron/remote'],
        }
    }
})