<template>
  <v-app>
    <!-- App Bar -->
    <v-app-bar app flat color="white" height="100">
      <v-container fluid class="d-flex justify-space-between align-center px-6">
        <!-- โลโก้ -->
        <div class="d-flex align-center">
          <img
            src="/Header_Counseling_MFU_Thai.png"
            alt="MFU Logo"
            height="120"
            class="me-4"
          />
        </div>

        <!-- ส่วนขวา: ปุ่มออกจากระบบ + เปลี่ยนภาษา -->
        <div class="d-flex flex-column align-end">
          <v-btn
            size="small"
            variant="text"
            color="teal"
            class="mb-4 text-subtitle-1"
            @click="logout"
          >
            {{ t("logout") }}
            <v-icon size="25" class="mx-2">mdi-logout</v-icon>
          </v-btn>
          <div class="d-flex align-center">
            <div class="text-subtitle-1 text-grey-darken-2 me-3">
              {{ lang === "th" ? "ปริชิกา ภูมิโคกรักษ์" : "Parichika Phumkhokrak" }}
            </div>
            <v-btn
              icon
              size="small"
              class="me-2"
              color="teal"
              :variant="lang === 'th' ? 'flat' : 'outlined'"
              @click="lang = 'th'"
            >
              <span class="text-button font-weight-bold">TH</span>
            </v-btn>
            <v-btn
              icon
              size="small"
              color="teal"
              :variant="lang === 'en' ? 'flat' : 'outlined'"
              @click="lang = 'en'"
            >
              <span class="text-button font-weight-bold">EN</span>
            </v-btn>
          </div>
        </div>
      </v-container>

      <!-- เมนูด้านล่างของแถบ App Bar -->
      <template #extension>
        <v-row
          no-gutters
          class="justify-center"
          style="background-color: #009199"
        >
          <v-btn
            class="ma-2 text-subtitle-1"
            :color="activeMenu === 'booking' ? 'white' : '#009199'"
            :variant="activeMenu === 'booking' ? 'flat' : 'text'"
            rounded="sm"
            style="font-weight: bold; color: white"
            @click="activeMenu = 'booking'"
          >
            {{ t("menu_booking") }}
          </v-btn>

          <v-btn
            class="ma-2 text-subtitle-1"
            :color="activeMenu === 'status' ? 'white' : '#009199'"
            :variant="activeMenu === 'status' ? 'flat' : 'text'"
            rounded="sm"
            style="font-weight: bold; color: white"
            @click="activeMenu = 'status'"
          >
            {{ t("menu_status") }}
          </v-btn>
        </v-row>
      </template>
    </v-app-bar>

    <!-- เนื้อหาเมนูสลับ (form หรือ status) -->
    <v-main>
      <component
        :is="activeMenuComponent"
        :lang="lang"
        :key="lang + '-' + activeMenu"
      />
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
import { useRouter } from "vue-router";
import BookingForm from "./appointment.vue";
import BookingStatus from "./status.vue"; // ต้องมีไฟล์นี้ด้วย

// router
const router = useRouter();

// ภาษาและเมนูที่ใช้งาน
const lang = ref("th");
const activeMenu = ref("booking");

const activeMenuComponent = computed(() => {
  return activeMenu.value === "booking" ? BookingForm : BookingStatus;
});

// การแปลข้อความใน layout
const translations = {
  th: {
    logout: "ออกจากระบบ",
    menu_booking: "จองเข้ารับบริการ",
    menu_status: "สถานะการจอง",
  },
  en: {
    logout: "Logout",
    menu_booking: "Book Appointment",
    menu_status: "Booking Status",
  },
};

const t = (key) => computed(() => translations[lang.value][key]).value;

// ออกจากระบบ
const logout = () => {
  alert(
    lang.value === "th"
      ? "ออกจากระบบแล้ว"
      : "You have been logged out"
  );
  router.push({ name: "RoleSelect" }) // ชื่อ route สำหรับหน้า login
};
</script>
