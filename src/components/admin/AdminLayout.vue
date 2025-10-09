
<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar app flat color="white" height="100">
      <v-container fluid class="d-flex justify-space-between align-center px-6">
        <!-- โลโก้ -->
        <div class="d-flex align-center">
          <img src="/Header_Counseling_MFU_Thai.png" alt="MFU Logo" height="120" class="me-4" />
        </div>

        <!-- ส่วนขวา: ปุ่มออกจากระบบ + เปลี่ยนภาษา -->
        <div class="d-flex flex-column align-end">
          <v-btn size="small" variant="text" color="teal" class="mb-4 text-subtitle-1" @click="logout">
            {{ t('nav.logout') }}
            <v-icon size="25" class="mx-2">mdi-logout</v-icon>
          </v-btn>
          <div class="d-flex align-center">
            <div class="text-subtitle-1 text-grey-darken-2 me-3">
              {{ name }}
            </div>
            <v-btn
              icon size="small" class="me-2" color="teal"
              :variant="locale === 'th' ? 'flat' : 'outlined'"
              @click="setLang('th')"
            >
              <span class="text-button font-weight-bold">TH</span>
            </v-btn>
            <v-btn
              icon size="small" color="teal"
              :variant="locale === 'en' ? 'flat' : 'outlined'"
              @click="setLang('en')"
            >
              <span class="text-button font-weight-bold">EN</span>
            </v-btn>
          </div>
        </div>
      </v-container>

      <!-- ปุ่มเปลี่ยนหน้า -->
      <template #extension>
        <v-row no-gutters class="justify-center" style="background-color: #009199">
          <v-btn
            class="ma-2 text-subtitle-1"
            :color="activeMenu === 'booking' ? 'white' : '#009199'"
            :variant="activeMenu === 'booking' ? 'flat' : 'text'"
            rounded="sm" style="font-weight: bold; color: white"
            @click="activeMenu = 'booking'"
          >
            {{ t('admin.menu.request') }}
          </v-btn>

          <v-btn
            class="ma-2 text-subtitle-1"
            :color="activeMenu === 'history' ? 'white' : '#009199'"
            :variant="activeMenu === 'history' ? 'flat' : 'text'"
            rounded="sm" style="font-weight: bold; color: white"
            @click="activeMenu = 'history'"
          >
            {{ t('admin.menu.history') }}
          </v-btn>

          <v-btn
            class="ma-2 text-subtitle-1"
            :color="activeMenu === 'dashboard' ? 'white' : '#009199'"
            :variant="activeMenu === 'dashboard' ? 'flat' : 'text'"
            rounded="sm" style="font-weight: bold; color: white"
            @click="activeMenu = 'dashboard'"
          >
            {{ t('admin.menu.dashboard') }}
          </v-btn>

          <v-btn
            class="ma-2 text-subtitle-1"
            :color="activeMenu === 'AdminManageStaff' ? 'white' : '#009199'"
            :variant="activeMenu === 'AdminManageStaff' ? 'flat' : 'text'"
            rounded="sm" style="font-weight: bold; color: white"
            @click="activeMenu = 'AdminManageStaff'"
          >
            {{ t('admin.menu.staffmanage') }}
          </v-btn>
        </v-row>
      </template>
    </v-app-bar>

    <!-- ใช้ component ที่สลับตามเมนู -->
    <v-main>
      <component :is="activeMenuComponent" :lang="locale" :key="locale + '-' + activeMenu" />
    </v-main>

    <!-- Footer -->
    <div class="text-center py-6" style="background-color: #262a32">
      <div class="text-white text-subtitle-1 font-weight-regular">
        © สำนักงานให้คำปรึกษาและช่วยเหลือนักศึกษา มหาวิทยาลัยแม่ฟ้าหลวง
      </div>
      <div class="text-white text-subtitle-2">
        Counselling Service Center, Mae Fah Luang University
      </div>
    </div>
  </v-app>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useI18n } from 'vue-i18n'
import BookingRequest from './AdminRequest.vue'
import AdminHistory from './AdminHistory.vue'
import AdminDashboard from './AdminDashboard.vue'
import AdminManageStaff from './AdminManageStaff.vue'
import { useRouter, useRoute } from 'vue-router'

const router = useRouter()
const route = useRoute()

// i18n
const { t, locale: i18nLocale } = useI18n()
const STORAGE_KEY = 'app-locale'
const qpLang = (route.query.lang || '').toString()
const start =
  qpLang === 'th' || qpLang === 'en'
    ? qpLang
    : localStorage.getItem(STORAGE_KEY) || ((navigator.language || '').toLowerCase().startsWith('th') ? 'th' : 'en')

i18nLocale.value = start
const locale = computed({
  get: () => i18nLocale.value,
  set: (v) => (i18nLocale.value = v)
})
const setLang = (l) => {
  if (l !== 'th' && l !== 'en') return
  locale.value = l
  localStorage.setItem(STORAGE_KEY, l)
}

// user info
const name = ref(localStorage.getItem('name') || 'Guest')

// เมนู
const activeMenu = ref('booking')
const activeMenuComponent = computed(() => {
  return activeMenu.value === 'booking'
    ? BookingRequest
    : activeMenu.value === 'history'
    ? AdminHistory
    : activeMenu.value === 'dashboard'
    ? AdminDashboard
    : AdminManageStaff
})

// ออกจากระบบ
const logout = () => {
  localStorage.clear()
  router.push({ name: 'SignIn' })
}
</script>
