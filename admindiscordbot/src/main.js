import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// Default to dark mode before mounting
try {
  const savedTheme = localStorage.getItem('theme')
  const isDark = savedTheme ? savedTheme === 'dark' : true
  document.documentElement.classList.toggle('dark-mode', isDark)
} catch {
  //
}

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')
