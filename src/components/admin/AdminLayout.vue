<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar app flat color="white" height="150">
      <v-container fluid class="d-flex justify-space-between align-center px-6">
        <div class="d-flex align-center">
          <img src="/Header_Counseling_MFU_Thai.png" alt="MFU Logo" height="120" class="me-4" />
        </div>
        <div class="d-flex flex-column align-end">
          <v-btn size="small" variant="text" color="teal" class="mb-4 text-subtitle-1" @click="logout">
            {{ t("logout") }}
            <v-icon size="25" class="mx-2">mdi-logout</v-icon>
          </v-btn>
                 <div class="text-subtitle-1 text-grey-darken-2 me-3" style="transform: translateY(-4px)">
            {{ name }}
          </div>
          <v-row align="center" class="px-6">
            <v-col cols="auto">
              <v-btn icon size="small" class="me-2" color="teal" :variant="lang === 'th' ? 'flat' : 'outlined'"
                @click="lang = 'th'">
                <span class="text-button font-weight-bold">TH</span>
              </v-btn>
              <v-btn icon size="small" color="teal" :variant="lang === 'en' ? 'flat' : 'outlined'" @click="lang = 'en'">
                <span class="text-button font-weight-bold">EN</span>
              </v-btn>
            </v-col>
          </v-row>
        </div>
      </v-container>

      <!-- ปุ่มเปลี่ยนหน้า -->
      <template #extension>
        <v-row no-gutters class="justify-center" style="background-color: #009199">
          <v-btn class="ma-2 text-subtitle-1" :color="activeMenu === 'booking' ? 'white' : '#009199'"
            :variant="activeMenu === 'booking' ? 'flat' : 'text'" rounded="sm" style="font-weight: bold; color: white"
            @click="activeMenu = 'booking'">
            {{ t("menu_request") }}
          </v-btn>

          <v-btn class="ma-2 text-subtitle-1" :color="activeMenu === 'history' ? 'white' : '#009199'"
            :variant="activeMenu === 'history' ? 'flat' : 'text'" rounded="sm" style="font-weight: bold; color: white"
            @click="activeMenu = 'history'">
            {{ t("menu_history") }}
          </v-btn>

          <v-btn class="ma-2 text-subtitle-1" :color="activeMenu === 'dashboard' ? 'white' : '#009199'"
            :variant="activeMenu === 'dashboard' ? 'flat' : 'text'" rounded="sm" style="font-weight: bold; color: white"
            @click="activeMenu = 'dashboard'">
            {{ t("menu_dashboard") }}
          </v-btn>

          <v-btn class="ma-2 text-subtitle-1" :color="activeMenu === 'AdminManageStaff' ? 'white' : '#009199'"
            :variant="activeMenu === 'AdminManageStaff' ? 'flat' : 'text'" rounded="sm"
            style="font-weight: bold; color: white" @click="activeMenu = 'AdminManageStaff'">
            {{ t("menu_staffmanage") }}
          </v-btn>
        </v-row>
      </template>
    </v-app-bar>

    <!-- ใช้ component ที่สลับตามเมนู -->
    <v-main>
      <component :is="activeMenuComponent" :lang="lang" :key="lang + '-' + activeMenu" />
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
import { ref, computed } from "vue";
import BookingRequest from "./AdminRequest.vue";
import AdminHistory from "./AdminHistory.vue";
import AdminDashboard from "./AdminDashboard.vue";
import AdminManageStaff from "./AdminManageStaff.vue";
import { useRouter } from "vue-router";

// ชื่อผู้ใช้จาก localStorage
const name = ref(localStorage.getItem("name") || "Guest");
const userEmail = localStorage.getItem("email") || ""; 


// router
const router = useRouter();

const lang = ref("th");
const activeMenu = ref("booking");

const activeMenuComponent = computed(() => {
  return activeMenu.value === "booking"
    ? BookingRequest
    : activeMenu.value === "history"
      ? AdminHistory
      : activeMenu.value === "dashboard"
        ? AdminDashboard
        : AdminManageStaff;
});

const translations = {
  th: {
    menu_request: "คำขอบริการ",
    menu_history: "ประวัติการให้บริการ",
    menu_dashboard: "สถิติการให้บริการ",
    menu_staffmanage: "จัดการบุคลากร",
    logout: "ออกจากระบบ",
  },
  en: {
    menu_request: "Service request",
    menu_history: "Service History",
    menu_dashboard: "Service dashboard",
    menu_staffmanage: "Staff Management",
    logout: "Logout",
  },
};

const t = (key) => computed(() => translations[lang.value][key]).value;

// ออกจากระบบ
const logout = () => {
  localStorage.clear();
  alert(
    lang.value === "th"
      ? "ออกจากระบบแล้ว"
      : "You have been logged out"
  );
  router.push({ name: "RoleSelect" });
};
</script>