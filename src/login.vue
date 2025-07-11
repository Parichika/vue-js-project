<template>
  <v-app>
    <v-main class="main-bg">
      <v-container class="fill-height d-flex align-center justify-center">
        <v-card class="center-card text-center px-8 py-10" elevation="0">
          <!-- Logo -->
          <v-img src="/logo_mfu.png" max-width="100" class="mx-auto mb-4" />

          <!-- Title -->
          <h2 class="thai-title">ระบบจองคิวเข้ารับการให้คำปรึกษา</h2>
          <h3 class="eng-title font-weight-bold mb-6">Counselling Queue Booking</h3>

          <!-- Role Buttons -->
          <v-row justify="center" align="center" dense no-gutters>
            <v-col cols="6" class="d-flex justify-end pr-5">
              <v-card class="role-box" elevation="2" @click="goToLogin('student')">
                <v-icon size="70" color="#00293f" class="mb-1">mdi-school</v-icon>
                <div class="role-label">Student</div>
                <div class="role-sub">นักศึกษา</div>
              </v-card>
            </v-col>

            <v-col cols="6" class="d-flex justify-start pl-5">
              <v-card class="role-box" elevation="2" @click="goToLogin('admin')">
                <v-icon size="70" color="#00293f" class="mb-1">mdi-account-tie</v-icon>
                <div class="role-label">Admin</div>
                <div class="role-sub">เจ้าหน้าที่</div>
              </v-card>
            </v-col>
          </v-row>
        </v-card>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { useRouter } from 'vue-router'
const router = useRouter()

const goToLogin = (role) => {
  router.push({ name: 'SignIn', query: { role } })
}
</script>

<style scoped>
.main-bg {
  background-color: #008d94;
  height: 100vh;
  color: white;
}

.center-card {
  background-color: #2bb4b8;
  border-radius: 20px;
  max-width: 600px;
  width: 100%;
}

.thai-title {
  font-size: 25px;
  color: white;
  margin-bottom: 4px;
}

.eng-title {
  font-size: 25px;
  color: white;
}

.role-box {
  background-color: white;
  border-radius: 16px;
  width: 100%;
  max-width: 170px;
  height: 150px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: 0.2s;
}

.role-box:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.role-label {
  font-size: 20px;
  font-weight: bold;
  color: #00293f;
  margin-top: 2px;
}

.role-sub {
  font-size: 17px;
  color: #666;
}
</style>
