import { createApp } from 'vue'
import App from './App.vue'

import 'vuetify/styles'
import { createVuetify } from 'vuetify'
import router from './router'
import * as components from 'vuetify/components'
import * as directives from 'vuetify/directives'
import '@mdi/font/css/materialdesignicons.css'

const vuetify = createVuetify({
  components,
  directives
})

createApp(App)
  .use(router)  // เพิ่ม router ที่นี่
  .use(vuetify)  // เพิ่ม vuetify ที่นี่
  .mount('#app')
