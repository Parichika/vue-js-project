<template>
  <v-app>
    <v-main class="login-background">
      <v-container class="fill-height d-flex align-center justify-center" fluid>
        <v-row align="center" justify="center">
          <v-col cols="12" sm="8" md="4">
            <!-- Header -->
            <div class="d-flex align-center justify-center mb-4 logo-header">
              <v-img src="/logo_mfu.png" max-width="55" class="mr-2" />
              <div class="d-flex align-center">
                <div class="separator-line mx-2"></div>
                <h2 class="title-text">Counselling Queue Booking</h2>
              </div>
            </div>

            <!-- Login Card -->
            <v-card flat class="pa-6 login-card text-left">
              <h3 class="font-weight-bold mb-4">Sign in</h3>

              <v-text-field v-model="studentId" label="Student ID" outlined dense class="mb-3 custom-field" />
              <v-text-field v-model="password" label="Password" type="password" outlined dense
                class="mb-3 custom-field" />
              <v-checkbox v-model="remember" label="Remember me" dense class="mb-4" />

              <!-- Buttons -->
              <div class="d-flex align-center">
                <v-btn class="sign-in-btn" height="36" @click="signIn">
                  SIGN IN
                </v-btn>

                <v-btn class="google-icon-btn ml-3" icon height="36" width="36" @click="signInWithGoogle">
                  <v-icon color="red">mdi-google</v-icon>
                </v-btn>
              </div>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();

const studentId = ref("");
const password = ref("");
const remember = ref(false);

// ข้อมูลจำลองสำหรับทดสอบ
const mockUsers = [
  { studentId: "6531501077", password: "1234567", role: "user" },
  { studentId: "admin001", password: "adminpass", role: "admin" },
  { studentId: "staff001", password: "staffpass", role: "staff" }
];

const signIn = () => {
  const found = mockUsers.find(
    (user) =>
      user.studentId === studentId.value && user.password === password.value
  );

  if (found) {
    if (found.role === "user") router.push("/user/appointment");
    else if (found.role === "admin") router.push("/admin/AdminRequest");
    else if (found.role === "staff") router.push("/staff/StaffRequest");
  } else {
    alert("Invalid student ID or password.");
  }
};

const signInWithGoogle = () => {
  alert("Google Sign-In is disabled in mock mode.");
};
</script>

<style scoped>
.custom-field .v-input__control {
  border: 2px solid white !important;
  border-radius: 100px !important;
  background-color: rgba(255, 255, 255, 0.15);
  /* สีพื้นหลังโปร่งใส */
  padding: 6px 12px;
}

.custom-field input {
  color: white !important;
}

.custom-field .v-label {
  color: white !important;
}

.custom-field .v-field__outline {
  border: none !important;
  /* ซ่อน outline เดิมของ vuetify */
}

.login-background {
  background-color: #008d94;
  height: 100vh;
  color: white;
}

.title-text {
  font-size: 18px;
  font-weight: bold;
  color: white;
  white-space: nowrap;
}

.separator-line {
  width: 1px;
  height: 40px;
  background-color: white;
}

.login-card {
  background-color: transparent;
  box-shadow: none;
  color: white;
}

.v-input input {
  background-color: #e0f7fa !important;
  /* สีพื้นหลังที่สว่างขึ้น */
  color: #000 !important;
  border-radius: 20px;
}

.v-label {
  color: #ffffff;
}

.sign-in-btn {
  background-color: white;
  color: #555;
  font-weight: bold;
  text-transform: none;
  min-width: 100px;
}

.google-icon-btn {
  background-color: white;
  border: 1px solid #ccc;
}
</style>
