import { createApp } from "vue";
import App from "./App.vue";
import { i18n } from "./i18n.js";

import "vuetify/styles";
import { createVuetify } from "vuetify";
import router from "./router";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";
import * as labs from "vuetify/labs/components";

import axios from "axios";
axios.defaults.withCredentials = true;

// เพิ่ม fontFamily ใน Vuetify config
const vuetify = createVuetify({
  components: {
    ...components,
    ...labs,
  },
  directives,
  defaults: {
    global: {
      style: {
        fontFamily: "Sarabun, sans-serif",
      },
    },
  },
  theme: {
    defaultTheme: "myTheme",
    themes: {
      myTheme: {
        dark: false,
        colors: {
          primary: "#009199",
          secondary: "#005e63",
          success: "#2e7d32",
          warning: "#f9a825",
          error: "#ff0000",
          info: "#1976d2",
          background: "#FFFFFF",
          surface: "#FFFFFF",
        },
      },
    },
  },
});

createApp(App)
  .use(router) // เพิ่ม router ที่นี่
  .use(vuetify) // เพิ่ม vuetify ที่นี่
  .use(i18n)
  .mount("#app");
