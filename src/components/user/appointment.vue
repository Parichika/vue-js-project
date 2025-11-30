<!-- src/views/appointment.vue -->
<template>
  <v-app>
    <v-main>
      <v-container max-width="600px">
        <h2 class="text-h5 text-center mb-6 font-weight-bold">
          {{ t('appointment.title') }}
        </h2>

        <v-form ref="formRef" @submit.prevent="submitForm">

          <!-- วันที่ -->
          <v-menu v-model="dateMenu" transition="scale-transition" offset-y :close-on-content-click="false"
            :max-width="360">
            <template #activator="{ props }">
              <v-text-field v-bind="props" v-model="displayDate" variant="outlined" density="comfortable"
                :rules="[v => !!v]" :readonly="true" prepend-inner-icon="mdi-calendar-outline">
                <template #label>
                  <span style="color:black">{{ t('appointment.date') }}</span>
                  <span style="color:red"> *</span>
                </template>
              </v-text-field>
            </template>

            <!-- กล่องปฏิทินให้ดูเป็น card ชัด ๆ -->
            <v-card class="date-popover" rounded="xl" elevation="8">
              <div class="header d-flex align-center justify-space-between">
                <div class="text-subtitle-2 font-weight-medium">
                  {{ t('appointment.select_date') }}
                </div>
                <div class="text-caption text-medium-emphasis">
                  {{ form.date ? dayjs(form.date).format('DD MMM YYYY') : '-' }}
                </div>
              </div>

              <v-divider class="my-1" />

              <v-date-picker v-model="form.date" :min="minDate" :allowed-dates="isAllowedDate" color="#009199"
                elevation="0" hide-header @update:model-value="onDateSelected" />

              <v-divider class="mt-1" />

              <!-- แถวปุ่มด้านล่าง -->
              <div class="d-flex justify-space-between align-center px-4 py-2 date-actions">
                <v-btn size="small" variant="text" @click="clearDate">
                  {{ t('common.clear') || 'Clear' }}
                </v-btn>
                <v-btn size="small" variant="text" @click="dateMenu = false">
                  {{ t('common.done') || 'Done' }}
                </v-btn>
              </div>
            </v-card>
          </v-menu>

          <!-- เวลา -->
          <v-select v-model="form.time" :items="availableTimeOptions" item-title="label" item-value="value"
            variant="outlined" density="comfortable" :loading="loadingOccupied" :disabled="!form.date">
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
              <h3 class="text-h6 font-weight-bold" style="color:#009199; white-space: pre-line;">
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
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

axios.defaults.withCredentials = true;

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
    const ymd = dayjs(form.value.date).format('YYYY-MM-DD');
    const res = await axios.get('/api/user/appointments/occupied', {
      params: { date: ymd, place_ID: form.value.channel }
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
  // เอาเฉพาะที่เปิดไว้ก่อน
  const openPlaces = allPlaces.value.filter(p => p.place_status === 'open')

  // กลุ่มเป้าหมายตามสัญชาติ
  const target = form.value.nationality === 'ไทย' ? 'ไทย' : 'ต่างชาติ'

  // กรองตาม target_group (เผื่อใน DB มีทั้ง 'ไทย', 'ต่างชาติ', 'all', 'both')
  const filtered = openPlaces.filter(
    p =>
      p.target_group === target ||
      p.target_group === 'all' ||
      p.target_group === 'both' ||
      p.target_group === 'ทั้งหมด'
  )

  // ถ้ากรองแล้วว่าง → fallback ใช้ openPlaces ทั้งหมด
  const finalList = filtered.length ? filtered : openPlaces

  return finalList.map(p => ({
    label: locale.value === 'th' ? p.name_th : p.name_en,
    value: p.place_ID
  }))
})

/** places + default channel */
const fetchPlaces = async () => {
  try {
    const res = await axios.get('/api/user/places')
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

onMounted(async () => {
  await fetchPlaces()
  await fetchHolidays();
  setDefaultChannel()
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
    // full_name: form.value.fullName,
    date: dayjs(form.value.date).format('YYYY-MM-DD'),
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
    const ymd = dayjs(form.value.date).format('YYYY-MM-DD');
    const check = await axios.get('/api/user/appointments/occupied', {
      params: { date: ymd, place_ID: form.value.channel }
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
    await axios.post('/api/user/appointments', payload)
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
  date: '',
  time: '',
  nationality: 'ไทย',
  channel: '',
  phone: '',
  serviceType: '',
  otherService: ''
})

const setDefaultChannel = () => {
  const openPlaces = allPlaces.value.filter(p => p.place_status === 'open')
  const target = form.value.nationality === 'ไทย' ? 'ไทย' : 'ต่างชาติ'

  const filtered = openPlaces.filter(
    p =>
      p.target_group === target ||
      p.target_group === 'all' ||
      p.target_group === 'both' ||
      p.target_group === 'ทั้งหมด'
  )

  const finalList = filtered.length ? filtered : openPlaces

  const firstOpen = finalList[0]
  if (firstOpen) form.value.channel = firstOpen.place_ID
}

const resetForm = async () => {
  form.value = initialForm()
  await nextTick()
  formRef.value?.resetValidation()
  setDefaultChannel()
  occupiedTimes.value = []
}

// ---- แคชวันหยุดแยกตามปี (year -> Set<YYYY-MM-DD>) ----
const holidaysByYear = ref({})      // { 2025: Set([...]), 2026: Set([...]) }
const thaiHolidays = ref(new Set()) // รวมทุกปีเอาไว้ใช้เช็คใน isAllowedDate

// รวมวันหยุดทุกปีใน holidaysByYear เข้าเป็นชุดเดียว
const rebuildThaiHolidays = () => {
  const all = []
  Object.values(holidaysByYear.value).forEach((set) => {
    if (set instanceof Set) {
      all.push(...set)
    }
  })
  thaiHolidays.value = new Set(all)
}

// ดึงวันหยุดของ "ปีเดียว" (เรียกแค่ครั้งแรกของปีนั้น)
const fetchHolidaysForYear = async (year) => {
  if (holidaysByYear.value[year]) return  // เคยโหลดแล้ว ไม่ต้องโหลดซ้ำ

  try {
    const res = await axios.get('/api/user/holidays', { params: { year } })
    holidaysByYear.value[year] = new Set(res.data || [])
    rebuildThaiHolidays()
  } catch (err) {
    console.error('fetchHolidaysForYear error:', year, err?.response?.data || err.message)
  }
}

// preload วันหยุดช่วงหลายปีล่วงหน้า (ปรับจำนวนปีได้ตามต้องการ)
const fetchHolidays = async () => {
  try {
    const currentYear = dayjs().year()
    const lastYear = currentYear + 10   // <<-- อยากรองรับกี่ปี ก็เปลี่ยนเลขนี้ เช่น +20

    for (let y = currentYear; y <= lastYear; y++) {
      await fetchHolidaysForYear(y)
    }
  } catch (err) {
    console.error('fetchHolidays (range) error:', err?.response?.data || err.message)
  }
}

const dateMenu = ref(false)

const minDate = computed(() =>
  dayjs().add(1, 'day').format('YYYY-MM-DD')
)

const isAllowedDate = (dateString) => {
  const d = dayjs(dateString, 'YYYY-MM-DD', true)
  if (!d.isValid()) return false

  const today = dayjs().startOf('day')

  // ต้องเป็น "หลังวันนี้" → อย่างน้อยคือพรุ่งนี้ขึ้นไป
  if (!d.isAfter(today, 'day')) return false

  // ไม่ให้จองเสาร์–อาทิตย์
  const dow = d.day()
  if (dow === 0 || dow === 6) return false

  // ไม่ให้จองวันหยุดนักขัตฤกษ์
  if (thaiHolidays.value.has(d.format('YYYY-MM-DD'))) return false

  return true
}

// แสดงผลในช่องเป็น DD/MM/YYYY แต่เก็บจริงใน form.date เป็น YYYY-MM-DD
const displayDate = computed({
  get() {
    if (!form.value.date) return ''
    return dayjs(form.value.date, 'YYYY-MM-DD').format('DD/MM/YYYY')
  },
  set(val) {
    if (!val) {
      form.value.date = ''
      return
    }
    const d = dayjs(val, 'DD/MM/YYYY', true)
    form.value.date = d.isValid() ? d.format('YYYY-MM-DD') : ''
  }
})

// ปุ่ม Clear ในปฏิทิน
const clearDate = () => {
  form.value.date = ''
  dateMenu.value = false
}

const onDateSelected = () => {
  // เลือกวันแล้วปิดเมนู (displayDate จะอัปเดตอัตโนมัติจาก computed)
  dateMenu.value = false
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

/* ทำให้ปฏิทินไม่กว้างเกินไป */
.date-popover {
  width: 90vw;
  /* 90% ของหน้าจอมือถือ */
  max-width: 320px;
  /* สูงสุดแค่ 320px */
  border-radius: 16px;
  padding-bottom: 4px;
}

/* ลด padding ด้านบน */
.date-popover .header {
  padding: 12px 16px 4px 16px;
}

/* ลด padding ของ date-picker */
.date-popover .v-date-picker {
  padding: 0 4px 4px 4px !important;
}

/* ปุ่มล่าง */
.date-actions {
  border-top: 1px solid rgba(0, 0, 0, 0.05);
  padding: 4px 8px;
}

/* ขนาดปุ่มเล็กลง */
.date-actions .v-btn {
  font-size: 0.8rem;
  min-width: 60px;
  padding: 0 6px;
}

/* ตรงปฏิทินให้วันที่เล็กลง */
.date-popover .v-date-picker-month__day {
  font-size: 0.8rem !important;
  width: 34px !important;
  height: 34px !important;
}

@media (min-width: 600px) {
  .date-popover {
    width: 340px;
    max-width: 360px;
  }
}
</style>