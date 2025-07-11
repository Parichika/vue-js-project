<template>
    <v-app>
        <v-main class="main-bg">
            <!-- Language Bar -->
            <div class="lang-bar">
                <span class="white--text mr-4">{{ text.home }}</span>
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
                        <v-btn class="google-signin-btn" @click="signInWithGoogle">
                            <img src="/google.png" alt="Google Logo" class="google-icon" />
                            <span>{{ text.signin }}</span>
                        </v-btn>
                    </div>

                    <!-- Note -->
                    <p class="login-note mt-4">{{ text.note }}</p>
                </v-card>
            </v-container>
        </v-main>
    </v-app>
</template>

<script setup>
import { reactive, computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import { auth } from '@/firebase'
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth'

const router = useRouter()
const lang = ref('th')

const messages = reactive({
    th: {
        home: 'หน้าแรก',
        title_th: 'ระบบจองคิวเข้ารับการให้คำปรึกษา',
        title_en: 'Counselling Queue Booking',
        signin: 'เข้าสู่ระบบด้วยบัญชี Google',
        note: 'เข้าสู่ระบบด้วยบัญชีของมหาวิทยาลัยแม่ฟ้าหลวงเท่านั้น',
    },
    en: {
        home: 'Home',
        title_th: 'Counselling Queue Booking System',
        title_en: 'Counselling Queue Booking',
        signin: 'Sign in with Google',
        note: 'Sign in with your MFU account only.',
    },
})

const text = computed(() => messages[lang.value])

const setLang = (l) => {
    lang.value = l
}

const signInWithGoogle = async () => {
    try {
        const provider = new GoogleAuthProvider()
        const result = await signInWithPopup(auth, provider)
        const user = result.user
        console.log('User signed in:', user)

        // ตรวจ email แล้วไปตาม role
        if (user.email.includes("@lamduan.mfu.ac.th")) {
            router.push({ name: "Appointment" }) // นักศึกษา
        } else {
            router.push({ name: "AdminRequest" }) // เจ้าหน้าที่
        }
    } catch (error) {
        console.error('Error signing in with Google:', error)
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
    font-size: 18px;
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
    margin-right: 10px;
}

.login-note {
    font-size: 18px;
    color: white;
}
</style>
