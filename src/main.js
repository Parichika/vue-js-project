import { createApp } from "vue";
import App from "./App.vue";
import { i18n } from "./i18n.js";

import "vuetify/styles";
import { createVuetify } from "vuetify";
import router from "./router";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";

// เพิ่ม fontFamily ใน Vuetify config
const vuetify = createVuetify({
  components,
  directives,
  defaults: {
    global: {
      style: {
        fontFamily: "Sarabun, sans-serif",
      },
    },
  },
});

createApp(App)
  .use(router) // เพิ่ม router ที่นี่
  .use(vuetify) // เพิ่ม vuetify ที่นี่
  .use(i18n)
  .mount("#app");
