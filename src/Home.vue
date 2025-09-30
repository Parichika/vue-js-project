<template>
  <v-app>
    <v-main class="main-bg">
      <!-- Language Bar -->
      <div class="lang-bar">
        <v-btn class="lang-btn mr-2" depressed @click="setLang('th')"
          :class="{ 'selected-lang': lang === 'th' }">TH</v-btn>
        <v-btn class="lang-btn" depressed @click="setLang('en')" :class="{ 'selected-lang': lang === 'en' }">EN</v-btn>
      </div>

      <v-container class="fill-height d-flex align-center justify-center">
        <v-card class="center-card text-center px-8 py-10" elevation="0">
          <!-- Logo -->
          <v-img src="/logo_mfu.png" max-width="100" class="mx-auto mb-4" />

          <!-- Titles -->
          <h2 class="thai-title">{{ t('app.title') }}</h2>
          <h3 class="eng-title font-weight-bold mb-8">{{ t('app.subtitle') }}</h3>

          <!-- Sign-in Button -->
          <div class="d-flex justify-center">
            <v-btn class="google-signin-btn" @click="signInWithGoogle" style="width: 300px; height: 50px;">
              <img src="/google.png" alt="Google Logo" class="google-icon" style="margin-right: 8px;" />
              <span>{{ t('auth.signInGoogle') }}</span>
            </v-btn>
          </div>

          <!-- Alert error Message -->
          <v-alert v-if="errorKey" type="error" class="error-alert mt-3 mx-auto" border="start" icon="mdi-close-circle"
            density="compact" style="padding-right: 12px ; font-weight: bold;">
            {{ t(errorKey) }}
          </v-alert>

          <!-- Note -->
          <p class="login-note mt-4">{{ t('auth.mfuOnly') }}</p>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { auth } from '@/firebase'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import axios from 'axios'

const router = useRouter()
const route = useRoute()

// i18n
const { t, locale } = useI18n()
const STORAGE_KEY = 'app-locale'

// อนุญาตสลับภาษาผ่าน ?lang=en|th ถ้าไม่มีใช้ค่าจำไว้ หรือเดาจากเบราว์เซอร์
const qpLang = (route.query.lang || '').toString()
const initial =
  (qpLang === 'th' || qpLang === 'en')
    ? qpLang
    : localStorage.getItem(STORAGE_KEY) || (navigator.language.toLowerCase().startsWith('th') ? 'th' : 'en')

const lang = ref(initial)
locale.value = lang.value
watch(lang, (l) => {
  locale.value = l
  localStorage.setItem(STORAGE_KEY, l)
})
const setLang = (l) => (lang.value = l)

// error แทนด้วย key เพื่อให้แปลอัตโนมัติ
const errorKey = ref('') // 'auth.roleMismatch' | 'auth.signInFailed' | ''

const goHome = () => {
  router.push({ name: 'SignIn' })
}

const signInWithGoogle = async () => {
  errorKey.value = ''
  try {
    const provider = new GoogleAuthProvider()
    const result = await signInWithPopup(auth, provider)
    const user = result.user

    const res = await axios.post('http://localhost:3000/api/login', {
      email: user.email
    })

    const roleFromBackend = res.data.role
    const roleFromQuery = route.query.role || ''

    if (roleFromQuery) {
      const isValid =
        (roleFromQuery === 'admin' && ['admin', 'staff'].includes(roleFromBackend)) ||
        (roleFromQuery === 'staff' && roleFromBackend === 'staff') ||
        (roleFromQuery === 'student' && roleFromBackend === 'student')
      if (!isValid) {
        errorKey.value = 'auth.roleMismatch'
        return
      }
    }

    // เก็บชื่อให้เหมาะกับบทบาท
    localStorage.setItem('email', user.email)
    if (roleFromBackend === 'student') {
      const displayName = (user.displayName || '').trim()
      localStorage.setItem('name', displayName || user.email.split('@')[0])
    } else {
      // staff/admin: รองรับ name_th / name_en จาก backend (ถ้า backend ยังไม่ส่งมาก็ fallback)
      const nameTh = (res.data.name_th || '').trim()
      const nameEn = (res.data.name_en || '').trim()
      const legacy = (res.data.name || user.displayName || '').trim() // เผื่อโค้ดเดิมยังใช้ 'name'

      // เก็บทั้งสาม key ไว้เพื่อ backward-compat
      localStorage.setItem('name_th', nameTh)
      localStorage.setItem('name_en', nameEn)
      localStorage.setItem('name', legacy)
    }

    // นำทางตามบทบาท
    if (roleFromBackend === 'admin') {
      localStorage.setItem('staff_ID', res.data.staff_ID)
      localStorage.setItem('role', 'admin')
      router.push('/admin/AdminRequest')
    } else if (roleFromBackend === 'staff') {
      localStorage.setItem('staff_ID', res.data.staff_ID)
      localStorage.setItem('role', 'staff')
      router.push('/staff/StaffRequest')
    } else if (roleFromBackend === 'student') {
      localStorage.setItem('role', 'student')
      router.push('/user/appointment')
    }
  } catch (e) {
    console.error('Sign in or login error:', e)
    errorKey.value = 'auth.signInFailed'
  }
}
</script>

<style scoped>
.main-bg {
  background-color: #008d94;
  height: 100vh;
  color: white;
  position: relative;
}

.lang-bar {
  position: absolute;
  top: 20px;
  right: 20px;
  z-index: 10;
  display: flex;
  align-items: center;
}

.lang-btn {
  min-width: 36px;
  height: 36px;
  background-color: #bbbbbb;
  border-radius: 50%;
  font-size: 14px;
  color: white;
  padding: 0;
  text-transform: none;
}

.selected-lang {
  background-color: white !important;
  color: #008d94 !important;
}

.center-card {
  background-color: #2bb4b8;
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
}

.thai-title {
  font-size: 22px;
  color: white;
  margin-bottom: 4px;
}

.eng-title {
  font-size: 20px;
  color: white;
}

.google-signin-btn {
  background-color: white;
  color: #555;
  font-weight: 500;
  font-size: 16px;
  height: 56px;
  border-radius: 40px;
  padding: 0 24px;
  text-transform: none;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
}

.google-icon {
  width: 24px;
  height: 24px;
  display: block;
}

.login-note {
  font-size: 14px;
  color: white;
}

.error-alert {
  max-width: 400px;
  width: 100%;
  background-color: #ffcdd2 !important;
  color: #b71c1c !important;
  font-size: 14px;
  border-radius: 8px;
  text-align: center;
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
