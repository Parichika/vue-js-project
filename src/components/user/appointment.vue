<!-- src/views/appointment.vue -->
<template>
  <v-app>
    <v-main>
      <v-container max-width="600px">
        <h2 class="text-h5 text-center mb-6 font-weight-bold">
          {{ t('appointment.title') }}
        </h2>

        <v-form ref="formRef" @submit.prevent="submitForm">
          <!-- ชื่อ-นามสกุล -->
          <v-text-field v-model="form.fullName" :rules="[v => !!v]" variant="outlined" density="comfortable">
            <template #label>
              <span style="color:black">{{ t('appointment.full_name') }}</span>
              <span style="color:red"> *</span>
            </template>
          </v-text-field>

          <!-- วันที่ -->
          <v-text-field v-model="form.date" type="date" :min="today" :rules="[v => !!v]" variant="outlined"
            density="comfortable">
            <template #label>
              <span style="color:black">{{ t('appointment.date') }}</span>
              <span style="color:red"> *</span>
            </template>
          </v-text-field>

          <!-- เวลา -->
          <v-select v-model="form.time" :items="availableTimeOptions" item-title="label" item-value="value"
            variant="outlined" density="comfortable" :loading="loadingOccupied" :disabled="!form.date || !form.channel">
            <template #label>
              <span style="color:black">{{ t('appointment.time') }}</span>
              <span style="color:red"> *</span>
            </template>
          </v-select>

          <!-- สัญชาติ -->
          <v-radio-group v-model="form.nationality" :rules="[v => !!v]" class="mt-4">
            <template #label>
              <span style="color:black">{{ t('appointment.nationality') }}</span>
              <span style="color:red; margin-left:4px">*</span>
            </template>
            <v-radio :label="t('appointment.thai')" value="ไทย" />
            <v-radio :label="t('appointment.foreign')" value="ต่างชาติ" />
          </v-radio-group>

          <!-- ช่องทาง/สถานที่ -->
          <v-radio-group v-model="form.channel" :rules="[v => !!v]" class="mt-4">
            <template #label>
              <span style="color:black">{{ t('appointment.channel') }}</span>
              <span style="color:red; margin-left:4px">*</span>
            </template>
            <v-radio v-for="opt in channelOptions" :key="opt.value" :label="opt.label" :value="opt.value" />
          </v-radio-group>

          <!-- โทรศัพท์: ตัวเลขเท่านั้น + ยาว 9–10 -->
          <v-text-field v-model="form.phone" variant="outlined" density="comfortable"
            :rules="[v => !!v, v => phoneOk(v)]" :maxlength="10" counter inputmode="numeric" pattern="[0-9]*"
            @keydown="onlyDigits" @paste="pasteDigits">
            <template #label>
              <span style="color:black">{{ t('appointment.phone') }}</span>
              <span style="color:red"> *</span>
            </template>
          </v-text-field>

          <!-- ประเภทบริการ -->
          <v-radio-group v-model="form.serviceType" :rules="[v => !!v]" class="mt-4">
            <template #label>
              <span style="color:black">{{ t('appointment.service_type') }}</span>
              <span style="color:red; margin-left:4px">*</span>
            </template>
            <v-radio :label="t('appointment.life')" value="life" />
            <v-radio :label="t('appointment.study')" value="study" />
            <v-radio :label="t('appointment.emotion')" value="emotion" />
            <v-radio :label="t('appointment.other')" value="other" />
          </v-radio-group>

          <!-- อื่น ๆ -->
          <v-text-field v-if="form.serviceType === 'other'" v-model="form.otherService"
            :rules="[v => (form.serviceType !== 'other' || !!v)]" variant="outlined" density="comfortable">
            <template #label>
              <span style="color:black">{{ t('appointment.specify') }}</span>
              <span style="color:red"> *</span>
            </template>
          </v-text-field>

          <!-- หมายเหตุความเป็นส่วนตัว -->
          <p class="text-body-2 mb-6" style="color:#009199">
            {{ t('appointment.privacy_note') }}
          </p>

          <v-btn class="mt-6" color="#009199" variant="flat" size="large" block type="submit" :loading="submitting"
            :disabled="submitting">
            {{ t('appointment.submit') }}
          </v-btn>
        </v-form>

        <!-- Dialog จองสำเร็จ -->
        <v-dialog v-model="successDialog" max-width="400" transition="dialog-bottom-transition" scrim="rgba(0,0,0,.35)">
          <v-card class="success-card" rounded="xl" elevation="10">
            <!-- ปุ่มกากบาท -->
            <v-btn icon variant="text" class="close-btn" :aria-label="locale === 'th' ? 'ปิด' : 'Close'"
              @click="successDialog = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>

            <div class="success-hero">
              <svg viewBox="0 0 320 120" class="hero-svg" aria-hidden="true">
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stop-opacity="1" />
                    <stop offset="100%" stop-opacity=".85" />
                  </linearGradient>
                </defs>
                <g class="puffs">
                  <rect x="20" y="40" width="130" height="18" rx="9"></rect>
                  <rect x="60" y="60" width="90" height="14" rx="7"></rect>
                  <rect x="180" y="48" width="120" height="16" rx="8"></rect>
                  <rect x="210" y="68" width="70" height="12" rx="6"></rect>
                </g>

                <g class="badge">
                  <circle cx="160" cy="60" r="30" class="ring"></circle>
                  <path d="M148 60 l8 8 l16 -18" class="tick"></path>
                </g>

                <g class="sprinkles">
                  <circle cx="120" cy="30" r="6"></circle>
                  <circle cx="210" cy="92" r="6"></circle>
                  <rect x="250" y="38" width="10" height="10" rx="2"></rect>
                </g>
              </svg>
            </div>

            <div class="text-center">
              <h3 class="text-h6 font-weight-bold" style="color:#009199;">
                {{ t('appointment.success_alert') }}
              </h3>
            </div>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, defineProps, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import dayjs from 'dayjs'

const successDialog = ref(false)
const submitting = ref(false)

/** sync locale จากพาเรนต์ */
const props = defineProps({ lang: { type: String, default: 'th' } })
const { t, locale } = useI18n()
watch(
  () => props.lang,
  l => { if (l === 'th' || l === 'en') locale.value = l },
  { immediate: true }
)

// phone number 10 number
const onlyDigits = (e) => {
  const allow = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Home', 'End']
  if (allow.includes(e.key)) return
  if (!/^\d$/.test(e.key)) e.preventDefault()
}

const pasteDigits = (e) => {
  e.preventDefault()
  const raw = (e.clipboardData?.getData('text') || '').replace(/\D/g, '')
  const input = e.target
  if (input) {
    const start = input.selectionStart ?? input.value.length
    const end = input.selectionEnd ?? input.value.length
    const next = input.value.slice(0, start) + raw + input.value.slice(end)
    input.value = next.slice(0, 10)
    input.dispatchEvent(new Event('input', { bubbles: true }))
  }
}

/** validation helpers */
const phoneOk = (v) => /^0\d{8,9}$/.test(String(v || '').replace(/\s|-/g, ''))
const formRef = ref(null)

/** form state */
const form = ref({
  fullName: '',
  date: '',
  time: '',
  nationality: 'ไทย',
  channel: '',
  phone: '',
  serviceType: '',
  otherService: ''
})

/** time options (label 2 ภาษา) */
const rawTimeSlots = [
  { th: '09.00 - 10.30 น.', en: '09:00 - 10:30', value: '09:00-10:30' },
  { th: '10.30 - 12.00 น.', en: '10:30 - 12:00', value: '10:30-12:00' },
  { th: '13.00 - 14.30 น.', en: '13:00 - 14:30', value: '13:00-14:30' },
  { th: '14.30 - 16.00 น.', en: '14:30 - 16:00', value: '14:30-16:00' }
]

/** จัดการเวลาที่ถูกจอง */
const loadingOccupied = ref(false)
const occupiedTimes = ref([])

const availableTimeOptions = computed(() => {
  const set = new Set(occupiedTimes.value || [])
  return rawTimeSlots
    .filter(s => !set.has(s.value)) // ซ่อนเวลาที่ถูกจอง
    .map(s => ({ label: locale.value === 'th' ? s.th : s.en, value: s.value }))
})

const occupiedHint = computed(() => {
  if (!form.value.date || !form.value.channel) return ''
  const count = (occupiedTimes.value || []).length
  if (count === 0) return (locale.value === 'th')
    ? 'เวลายังว่างทั้งหมด'
    : 'All times are available'
  return (locale.value === 'th')
    ? `ปิด ${count} ช่วงเวลาที่ถูกจองแล้ว`
    : `Closed ${count} time slot(s) already booked`
})

const fetchOccupiedTimes = async () => {
  if (!form.value.date || !form.value.channel) { occupiedTimes.value = []; return }
  loadingOccupied.value = true
  try {
    const res = await axios.get('http://localhost:3000/api/appointments/occupied', {
      params: { date: form.value.date, place_ID: form.value.channel }
    })
    occupiedTimes.value = res.data || []
    // ถ้าผู้ใช้เลือกช่วงเวลาที่ถูกจองไปแล้ว → ล้างค่าออก
    if (occupiedTimes.value.includes(form.value.time)) {
      form.value.time = ''
    }
  } catch {
    occupiedTimes.value = []
  } finally {
    loadingOccupied.value = false
  }
}

watch([() => form.value.date, () => form.value.channel], fetchOccupiedTimes, { immediate: true })

/** ช่องทาง/สถานที่: แสดง label ตามภาษา แต่ส่งค่าเดิมกลับ backend */
const allPlaces = ref([])
const channelOptions = computed(() => {
  return allPlaces.value
    .filter(p =>
      p.place_status === 'open' &&
      p.target_group === (form.value.nationality === 'ไทย' ? 'ไทย' : 'ต่างชาติ')
    )
    .map(p => ({
      label: locale.value === 'th' ? p.name_th : p.name_en,
      value: p.place_ID // ส่งค่า place_ID กลับ backend
    }));
})

/** today */
const today = computed(() => dayjs().format('YYYY-MM-DD'))

/** places + default channel */
const fetchPlaces = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/places')
    allPlaces.value = res.data || []
    if (!form.value.channel && form.value.nationality) {
      const firstOpenPlace = allPlaces.value.find(
        p =>
          p.place_status === 'open' &&
          p.target_group === (form.value.nationality === 'ไทย' ? 'ไทย' : 'ต่างชาติ')
      )
      if (firstOpenPlace) form.value.channel = firstOpenPlace.place_ID
    }
  } catch {
    allPlaces.value = []
  }
}

onMounted(() => {
  fetchPlaces()
  fetchOccupiedTimes()
})

// เมื่อผู้ใช้เปลี่ยนสัญชาติ → ตั้งค่า default channel อัตโนมัติ
watch(() => form.value.nationality, (newNat) => {
  const target = newNat === 'ไทย' ? 'ไทย' : 'ต่างชาติ'
  const found = allPlaces.value.find(p => p.place_status === 'open' && p.target_group === target)
  if (found) {
    form.value.channel = found.place_ID
  } else {
    const fallback = allPlaces.value.find(p => p.place_status === 'open' && p.target_group === 'ไทย')
    form.value.channel = fallback ? fallback.place_ID : ''
  }

  // โหลดเวลาว่างใหม่ตาม channel ที่เลือก
  fetchOccupiedTimes()
})

/** scroll ไป field แรกที่ error */
const scrollToFirstError = async () => {
  await nextTick()
  const firstError = document.querySelector('.v-input.v-input--error, .v-radio-group.v-input--error')
  if (firstError) {
    firstError.scrollIntoView({ behavior: 'smooth', block: 'center' })
    const input = firstError.querySelector('input, select, textarea')
    if (input) input.focus()
  }
}

/** submit */
const submitForm = async () => {
  if (submitting.value) return
  submitting.value = true

  const result = await formRef.value?.validate()
  const valid = result?.valid ?? result
  if (!valid) {
    await scrollToFirstError()
    submitting.value = false
    return
  }

  const payload = {
    full_name: form.value.fullName,
    date: form.value.date,
    time: form.value.time,
    phone: form.value.phone,
    serviceType: form.value.serviceType,
    otherService: form.value.otherService || null,
    place_ID: form.value.channel,
    nationality: form.value.nationality,
    email: localStorage.getItem('email') || null,
    name: localStorage.getItem('name') || null
  }

  // check ยังว่างไหมก่อนกดจองจริง
  try {
    const check = await axios.get('http://localhost:3000/api/appointments/occupied', {
      params: { date: form.value.date, place_ID: form.value.channel }
    })
    const occupied = new Set(check.data || [])
    if (occupied.has(form.value.time)) {
      await fetchOccupiedTimes()   // รีเฟรช UI ให้เห็นเวลาที่ปิด
      submitting.value = false
      return
    }
  } catch (e) {
  }

  try {
    await axios.post('http://localhost:3000/api/appointments', payload)
    successDialog.value = true
    await resetForm()
  } catch (err) {
    const fallback = locale.value === 'th' ? 'เกิดข้อผิดพลาด' : 'Error occurred'
    const msgErr = err.response?.data?.error || err.message || fallback
    console.error(msgErr)
  } finally {
    submitting.value = false
  }
}

const initialForm = () => ({
  fullName: '',
  date: '',
  time: '',
  nationality: 'ไทย',
  channel: '',
  phone: '',
  serviceType: '',
  otherService: ''
})

const setDefaultChannel = () => {
  const firstOpen = allPlaces.value.find(
    p => p.place_status === 'open' &&
      p.target_group === (form.value.nationality === 'ไทย' ? 'ไทย' : 'ต่างชาติ')
  )
  if (firstOpen) form.value.channel = firstOpen.place_ID
}

const resetForm = async () => {
  form.value = initialForm()
  await nextTick()
  formRef.value?.resetValidation()
  setDefaultChannel()
  occupiedTimes.value = []
}
</script>

<style scoped>
.success-card {
  position: relative;
  padding: 22px 22px 18px;
  background: #fff;
  border: 1px solid rgba(0, 0, 0, .06);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, .16),
    0 2px 8px rgba(0, 0, 0, .08);
}

.close-btn {
  position: absolute;
  top: 6px;
  right: 6px;
  color: rgba(0, 0, 0, .45);
}

.close-btn:hover {
  color: rgba(0, 0, 0, .7);
}

.success-hero {
  display: grid;
  place-items: center;
  margin: 6px 0 10px;
}

.hero-svg {
  width: 100%;
  max-width: 420px;
  height: auto;
}

.puffs rect {
  fill: #dff6df;
  opacity: .8;
}

.badge .ring {
  fill: #e9f9e9;
  stroke: #5fbf53;
  stroke-width: 4;
}

.badge .tick {
  fill: none;
  stroke: #43a047;
  stroke-width: 6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.sprinkles circle,
.sprinkles rect {
  fill: #98d89a;
}

.puffs {
  animation: float 3s ease-in-out infinite;
}

.badge {
  animation: pop 280ms ease-out;
  transform-origin: 160px 60px;
}

@keyframes float {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-2px);
  }
}

@keyframes pop {
  0% {
    transform: scale(.85);
    opacity: .2;
  }

  100% {
    transform: scale(1);
    opacity: 1;
  }
}
</style>