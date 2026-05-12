import { createApp } from 'vue'
import { createPinia } from 'pinia'
import Antd from 'ant-design-vue'
import 'ant-design-vue/dist/reset.css'
import App from './App.vue'

// Electron bridge placeholder
// In the future, when running under Electron, window.electronBridge will be injected here.

const app = createApp(App)

app.use(createPinia())
app.use(Antd)

app.mount('#app')
