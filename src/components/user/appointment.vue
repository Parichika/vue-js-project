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
          <v-text-field
            v-model="form.date"
            type="date"
            :min="today"
            :rules="[v => !!v]"
            variant="outlined"
            density="comfortable"
          >
            <template #label>
              <span style="color:black">{{ t('appointment.date') }}</span>
              <span style="color:red"> *</span>
            </template>
          </v-text-field>

          <!-- เวลา -->
          <v-select
            v-model="form.time"
            :items="timeOptions"
            item-title="label"
            item-value="value"
            :rules="[v => !!v]"
            variant="outlined"
            density="comfortable"
          >
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
            <v-radio
              v-for="opt in channelOptions"
              :key="opt.value"
              :label="opt.label"
              :value="opt.value"
            />
          </v-radio-group>

          <!-- โทรศัพท์ -->
          <v-text-field
            v-model="form.phone"
            type="tel"
            :rules="[v => !!v, v => phoneOk(v)]"
            variant="outlined"
            density="comfortable"
          >
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
          <v-text-field
            v-if="form.serviceType === 'other'"
            v-model="form.otherService"
            :rules="[v => (form.serviceType !== 'other' || !!v)]"
            variant="outlined"
            density="comfortable"
          >
            <template #label>
              <span style="color:black">{{ t('appointment.specify') }}</span>
              <span style="color:red"> *</span>
            </template>
          </v-text-field>

          <!-- หมายเหตุความเป็นส่วนตัว -->
          <p class="text-body-2 mb-6" style="color:#009199">
            {{ t('appointment.privacy_note') }}
          </p>

          <v-btn class="mt-6" color="#009199" variant="flat" size="large" block type="submit">
            {{ t('appointment.submit') }}
          </v-btn>
        </v-form>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, defineProps, watch, onMounted, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'
import dayjs from 'dayjs'

/** sync locale จากพาเรนต์ */
const props = defineProps({ lang: { type: String, default: 'th' } })
const { t, locale } = useI18n()
watch(
  () => props.lang,
  l => { if (l === 'th' || l === 'en') locale.value = l },
  { immediate: true }
)

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
const timeOptions = computed(() =>
  rawTimeSlots.map(s => ({ label: locale.value === 'th' ? s.th : s.en, value: s.value }))
)

/** แปลชื่อสถานที่ตามคีย์ appointment.* */
function placeLabel(rawName = '') {
  const map = new Map([
    // TH -> key
    ['อาคาร C1 ห้อง 112', 'appointment.on_site'],
    ['ออนไลน์', 'appointment.online'],
    ['M4U (ตึก M-square)', 'appointment.msquare'],
    // EN -> key (กรณี backend ส่ง EN)
    ['Building C1 Room 112', 'appointment.on_site'],
    ['Online', 'appointment.online'],
    ['M4U (M-square building)', 'appointment.msquare']
  ])
  const key = map.get((rawName || '').trim())
  return key ? t(key) : rawName
}

/** ช่องทาง/สถานที่: แสดง label ตามภาษา แต่ส่งค่าเดิมกลับ backend */
const allPlaces = ref([])
const channelOptions = computed(() => {
  if (!form.value.nationality) return []
  return allPlaces.value
    .filter(
      p =>
        p.place_status === 'open' &&
        p.target_group === (form.value.nationality === 'ไทย' ? 'ไทย' : 'ต่างชาติ')
    )
    .map(p => ({ label: placeLabel(p.place_name), value: p.place_name }))
})

/** today */
const today = computed(() => dayjs().format('YYYY-MM-DD'))

/** occupied (เตรียมไว้ในอนาคต) */
const occupiedTimes = ref([])
const fetchOccupiedTimes = async () => {
  if (!form.value.date || !form.value.channel) { occupiedTimes.value = []; return }
  try {
    const res = await axios.get('http://localhost:3000/api/appointments/occupied', {
      params: { date: form.value.date, place_name: form.value.channel }
    })
    occupiedTimes.value = res.data || []
  } catch {
    occupiedTimes.value = []
  }
}

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
      if (firstOpenPlace) form.value.channel = firstOpenPlace.place_name
    }
  } catch {
    allPlaces.value = []
  }
}

watch([() => form.value.date, () => form.value.channel], fetchOccupiedTimes)
onMounted(() => {
  fetchPlaces()
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
  const result = await formRef.value?.validate()
  const valid = result?.valid ?? result
  if (!valid) {
    alert(t('appointment.required_alert'))
    await scrollToFirstError()
    return
  }

  const payload = {
    full_name: form.value.fullName,
    date: form.value.date,
    time: form.value.time,
    phone: form.value.phone,
    serviceType: form.value.serviceType,
    otherService: form.value.otherService || null,
    channel: form.value.channel,       // ส่งชื่อสถานที่ดิบ
    nationality: form.value.nationality,
    email: localStorage.getItem('email') || null,
    name: localStorage.getItem('name') || null
  }

  try {
    await axios.post('http://localhost:3000/api/appointments', payload)
    alert(t('appointment.success_alert'))
    resetForm()
    fetchOccupiedTimes()
    formRef.value?.resetValidation()
  } catch (err) {
    const fallback = locale.value === 'th' ? 'เกิดข้อผิดพลาด' : 'Error occurred'
    const msgErr = err.response?.data?.error || err.message || fallback
    alert(msgErr)
  }
}

const resetForm = () => {
  form.value = {
    fullName: '',
    date: '',
    time: '',
    nationality: 'ไทย',
    channel: '',
    phone: '',
    serviceType: '',
    otherService: ''
  }
  occupiedTimes.value = []
}
</script>
