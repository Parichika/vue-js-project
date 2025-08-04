<template>
    <v-app>
        <v-main class="main-bg">
            <!-- Language Bar -->
            <div class="lang-bar">
                <span class="white--text mr-4 cursor-pointer" @click="goHome">{{ text.home }}</span>
                <v-btn class="lang-btn mr-2" depressed @click="setLang('th')"
                    :class="{ 'selected-lang': lang === 'th' }">TH</v-btn>
                <v-btn class="lang-btn" depressed @click="setLang('en')"
                    :class="{ 'selected-lang': lang === 'en' }">EN</v-btn>
            </div>

            <v-container class="fill-height d-flex align-center justify-center">
                <v-card class="center-card text-center px-8 py-10" elevation="0">
                    <!-- Logo -->
                    <v-img src="/logo_mfu.png" max-width="100" class="mx-auto mb-4" />

                    <!-- Titles -->
                    <h2 class="thai-title">{{ text.title_th }}</h2>
                    <h3 class="eng-title font-weight-bold mb-8">{{ text.title_en }}</h3>

                    <!-- Sign-in Button -->
                    <div class="d-flex justify-center">
                        <v-btn class="google-signin-btn" @click="signInWithGoogle" style="width: 300px; height: 50px;">
                            <img src="/google.png" alt="Google Logo" class="google-icon" style="margin-right: 8px;" />
                            <span>{{ text.signin }}</span>
                        </v-btn>
                    </div>

                    <!-- Alert error Message -->
                    <v-alert v-if="errorMessage" type="error" class="error-alert mt-3 mx-auto" border="start"
                        icon="mdi-close-circle" density="compact" style="padding-right: 12px ; font-weight: bold;">
                        {{ errorMessage }}
                    </v-alert>

                    <!-- Note -->
                    <p class="login-note mt-4">{{ text.note }}</p>
                </v-card>
            </v-container>
        </v-main>
    </v-app>
</template>

<script setup>
import { reactive, computed, ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { auth } from '@/firebase'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'
import axios from 'axios'

const router = useRouter()
const route = useRoute()
const lang = ref('th')
const errorMessage = ref('') // ใช้กับ v-alert

const messages = reactive({
    th: {
        home: 'หน้าแรก',
        title_th: 'ระบบจองคิวเข้ารับการให้คำปรึกษา',
        title_en: 'Counselling Queue Booking',
        signin: 'เข้าสู่ระบบด้วยบัญชี Google',
        note: 'เข้าสู่ระบบด้วยบัญชีของมหาวิทยาลัยแม่ฟ้าหลวงเท่านั้น',
        error_role: 'อีเมลไม่ตรงกับบทบาทที่เลือก',
    },
    en: {
        home: 'Home',
        title_th: 'Counselling Queue Booking System',
        title_en: 'Counselling Queue Booking',
        signin: 'Sign in with Google',
        note: 'Sign in with your MFU account only.',
        error_role: 'Email does not match with your selected role.',
    },
})

const text = computed(() => messages[lang.value])
const setLang = (l) => (lang.value = l)

const goHome = () => {
    router.push({ name: 'RoleSelect' })
}

const signInWithGoogle = async () => {
    errorMessage.value = '' // clear ทุกครั้งก่อน sign in

    try {
        const provider = new GoogleAuthProvider()
        const result = await signInWithPopup(auth, provider)
        const user = result.user

        const res = await axios.post('http://localhost:3000/api/login', {
            email: user.email
        })

        const roleFromBackend = res.data.role
        const roleFromQuery = route.query.role || ''

        const isValid =
            (roleFromQuery === 'admin' && ['admin', 'staff'].includes(roleFromBackend)) ||
            (roleFromQuery === 'staff' && roleFromBackend === 'staff') ||
            (roleFromQuery === 'student' && roleFromBackend === 'student')

        if (!isValid) {
            errorMessage.value = messages[lang.value].error_role
            return
        }

        // ✅ ใช้ชื่อจาก backend ที่ส่งมาจากฐานข้อมูล
        localStorage.setItem('name', res.data.name)
        localStorage.setItem('email', user.email)

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
    } catch (error) {
        console.error('❌ Sign in or login error:', error)
        errorMessage.value = 'เข้าสู่ระบบล้มเหลว'
    }
}
watch(lang, () => {
    if (errorMessage.value === messages.th.error_role || errorMessage.value === messages.en.error_role) {
        errorMessage.value = messages[lang.value].error_role
    }
})
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
    /* สีแดงอ่อนทึบ */
    color: #b71c1c !important;
    /* สีตัวอักษร */
    font-size: 14px;
    border-radius: 8px;
    text-align: center;
    display: flex;
    justify-content: center;
    align-items: center;
}
</style>