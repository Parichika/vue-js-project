<!-- src/views/status.vue -->
<template>
  <v-app>
    <v-main>
      <v-container>
        <!-- Info icon มุมขวาบน ของบล็อกตาราง -->
        <!-- Info text + icon มุมขวาบน -->
        <div class="table-header-actions">
          <div class="info-inline clickable" @click="cancelInfoDialog = true">
            <span class="info-text">{{ t('status.cancel_info_title') }}</span>
            <v-avatar class="info-badge" size="26">
              <v-icon size="16">mdi-information</v-icon>
            </v-avatar>
          </div>
        </div>

        <v-table style="table-layout: fixed; width: 100%">
          <thead style="background-color: #009199; color: white">
            <tr>
              <th class="text-center text-white" style="width: 10%">{{ t('status.title_date') }}</th>
              <th class="text-center text-white" style="width: 12%">{{ t('status.title_time') }}</th>
              <th class="text-center text-white" style="width: 18%">{{ t('status.title_location') }}</th>
              <th class="text-center text-white" style="width: 22%">{{ t('status.title_type') }}</th>
              <th class="text-center text-white" style="width: 15%">{{ t('status.title_staff') }}</th>
              <th class="text-center text-white" style="width: 12%">{{ t('status.title_status') }}</th>
              <th class="text-center text-white" style="width: 11%">{{ t('status.title_note') }}</th>
            </tr>
          </thead>

          <tbody style="background-color: #f0fafa">
            <tr v-for="(item, index) in paginatedBookings" :key="item.appointment_ID">
              <td class="text-start">{{ item.date }}</td>
              <td class="text-start"><span class="one-line">{{ item.time }}</span></td>

              <!-- ✅ แปลสถานที่ตามภาษา -->
              <td class="text-start">
                <span class="one-line">{{ displayPlaceName(item) }}</span>
              </td>

              <!-- ✅ แปลประเภทบริการตามภาษา -->
              <td class="text-start">
                <span class="one-line">
                  {{ serviceLabel(item.service_ID, item.service_type, item.other_type) }}</span>
              </td>

              <td class="text-start"><span class="one-line">{{ staffLabel(item) }}</span></td>

              <td>
                <div class="d-flex align-center justify-center ga-2">
                  <v-chip v-if="item.status === 'pending'" color="#FF6F00" text-color="black"
                    @click="openCancelDialog(index)">
                    <v-icon start small>mdi-timer-sand</v-icon>
                    {{ t('status.pending') }}
                  </v-chip>
                  <v-chip v-else-if="item.status === 'approved'" color="green" text-color="white">
                    <v-icon start small>mdi-check-circle</v-icon>
                    {{ t('status.approved') }}
                  </v-chip>
                  <v-chip v-else-if="item.status === 'rejected'" color="red" text-color="white">
                    <v-icon start small>mdi-close-circle</v-icon>
                    {{ t('status.rejected') }}
                  </v-chip>
                  <v-chip v-else-if="item.status === 'cancelled'" color="grey" text-color="white">
                    <v-icon start small>mdi-cancel</v-icon>
                    {{ t('status.cancelled') }}
                  </v-chip>
                  <v-chip v-else-if="item.status === 'completed'" color="blue" text-color="white">
                    <v-icon start small>mdi-check-decagram</v-icon>
                    {{ t('status.completed') }}
                  </v-chip>
                </div>
              </td>

              <td class="text-start">
                <span v-if="item.status === 'rejected' && item.note" class="one-line" :title="item.note">
                  {{ item.note }}
                </span>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- Pagination -->
        <v-pagination v-model="page" :length="pageCount" :total-visible="5" next-icon="mdi-chevron-right"
          prev-icon="mdi-chevron-left" class="mt-6 d-flex justify-center" />

        <!-- Dialog ยืนยันการยกเลิก -->
        <v-dialog v-model="cancelDialog" max-width="420" persistent>
          <v-card class="py-6 px-4" elevation="12" rounded="xl">
            <v-card-title class="d-flex flex-column align-center">
              <div class="confirm-icon">
                <v-icon size="48">mdi-alert-circle-outline</v-icon>
              </div>
              <span class="text-h6 font-weight-bold mt-3">
                {{ props.lang === 'th' ? 'คุณต้องการยกเลิกการนัดหมายหรือไม่?' : 'Cancel appointment?' }}
              </span>
            </v-card-title>

            <v-card-actions class="d-flex justify-center mt-4 ga-4">
              <v-btn color="grey-lighten-2" variant="flat" rounded="lg" @click="cancelDialog = false">
                {{ props.lang === 'th' ? 'กลับ' : 'Back' }}
              </v-btn>

              <v-btn color="error" variant="flat" rounded="lg" @click="confirmCancel">
                {{ props.lang === 'th' ? 'ยืนยัน' : 'Confirm' }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

        <!-- Dialog ข้อมูลวิธียกเลิก (modern) -->
        <v-dialog v-model="cancelInfoDialog" max-width="420" transition="dialog-bottom-transition"
          scrim="rgba(0,0,0,.35)">
          <v-card class="modern-dialog" elevation="0" rounded="xl">
            <div class="modern-title">
              <div class="title-icon info">
                <v-icon size="22">mdi-information</v-icon>
              </div>
              <div class="title-text">
                {{ t('status.cancel_info_title') }}
              </div>
            </div>

            <div class="modern-body">
              <p class="content">
                {{ t('status.cancel_info_desc') }}
              </p>
            </div>

            <div class="modern-actions right">
              <v-btn class="btn-primary" @click="cancelInfoDialog = false">
                {{ t('status.cancel_info_ok') }}
              </v-btn>
            </div>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const cancelInfoDialog = ref(false)

const props = defineProps({
  lang: String,
  email: String
})

// i18n: sync locale จาก props.lang
const { t, locale } = useI18n()
watch(
  () => props.lang,
  (l) => {
    if (l === 'th' || l === 'en') locale.value = l
  },
  { immediate: true }
)

const page = ref(1)
const cancelDialog = ref(false)
const selectedIndex = ref(null)
const bookings = ref([])

// ดึงข้อมูลการจอง
const fetchBookings = async () => {
  try {
    const response = await axios.get('/api/appointments/status', {
      params: { email: props.email }
    })
    bookings.value = response.data.map((item) => {
      let formattedDate = '-'
      if (item.date) {
        const d = new Date(item.date)
        const day = String(d.getDate()).padStart(2, '0')
        const month = String(d.getMonth() + 1).padStart(2, '0')
        const year = d.getFullYear()
        formattedDate = `${day}/${month}/${year}`
      }
      return {
        ...item,
        date: formattedDate,
        // ไม่ตั้งค่า staff ที่นี่
        type: item.service_ID === 4 && item.other_type ? item.other_type : (item.service_type || '-'),
        place_name_th: item.place_name_th,
        place_name_en: item.place_name_en,
        status: item.status || 'pending',
        appointment_ID: item.appointment_ID || '',
        note: item.reject_reason || ''
      }
    })
  } catch (error) {
    console.error('Error fetching bookings:', error)
  }
}
onMounted(fetchBookings)

function staffLabel(item) {
  const th = [item.first_name_th, item.last_name_th].filter(Boolean).join(' ').trim()
  const en = [item.first_name_en, item.last_name_en].filter(Boolean).join(' ').trim()
  return (locale.value === 'en' ? (en || th) : (th || en)) || '-'
}

function displayPlaceName(p = {}) {
  const code = String(locale.value || '').toLowerCase()
  const th = (p.place_name_th || p.name_th || '').trim()
  const en = (p.place_name_en || p.name_en || '').trim()
  const name = code.startsWith('en') ? (en || th) : (th || en);
  return name || '-'             // <- เผื่อว่างทั้งคู่
}

// ✅ ฟังก์ชันแปล "ประเภทบริการ" ตามภาษา (ใช้รหัสก่อน, ถ้าไม่มีเดาจากข้อความ)
function serviceLabel(serviceId, serviceType, otherType) {
  if (serviceId === 1) return t('appointment.life')
  if (serviceId === 2) return t('appointment.study')
  if (serviceId === 3) return t('appointment.emotion')
  if (serviceId === 4) return otherType || t('appointment.other')

  const norm = (serviceType || '').toLowerCase()
  if (!norm) return '-'
  if (/(ชีวิต|ปรับตัว|life|adjustment)/.test(norm)) return t('appointment.life')
  if (/(เรียน|academic|study)/.test(norm)) return t('appointment.study')
  if (/(สุขภาพจิต|emotion|mental)/.test(norm)) return t('appointment.emotion')
  if (/(other|อื่น)/.test(norm)) return otherType || t('appointment.other')
  return serviceType
}

// เปิด dialog (รองรับเพจิเนชัน)
const openCancelDialog = (pageIndex) => {
  selectedIndex.value = (page.value - 1) * 7 + pageIndex
  cancelDialog.value = true
}

// ยกเลิกโดยไม่ต้องกรอกเหตุผล
const confirmCancel = async () => {
  if (selectedIndex.value == null || !bookings.value[selectedIndex.value]) {
    alert(t('status.err_not_found'))
    return
  }
  const item = bookings.value[selectedIndex.value]
  if (!item.appointment_ID) {
    alert(t('status.err_no_id'))
    return
  }

  try {
    const res = await axios.put(`/api/appointments/${item.appointment_ID}/cancel`)
    const okMsg = ['Appointment cancelled and reason saved', 'Appointment cancelled']
    if (okMsg.includes(res?.data?.message)) {
      bookings.value[selectedIndex.value].status = 'cancelled'
      cancelDialog.value = false
      alert(t('status.msg_cancelled'))
    } else {
      alert(t('status.err_cancel_failed'))
    }
  } catch (e) {
    console.error('cancel error:', e)
    alert(t('status.err_cancel_failed'))
  }
}

// เพจิเนชัน
const filteredBookings = computed(() => bookings.value)
const paginatedBookings = computed(() => {
  const start = (page.value - 1) * 7
  return filteredBookings.value.slice(start, start + 7)
})
const pageCount = computed(() => Math.ceil(filteredBookings.value.length / 7))
</script>

<style scoped>
.confirm-icon {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin-top: 8px;
  background: #fff3e0;
  color: #ff9800;
}

.one-line {
  display: inline-block;
  max-width: 100%;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-header-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 8px;
}

/* ===== Modern Dialog Base ===== */
.modern-dialog {
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  border-radius: 20px;
  border: 1px solid rgba(0, 0, 0, .06);
  box-shadow:
    0 20px 40px rgba(0, 0, 0, .16),
    0 2px 6px rgba(0, 0, 0, .08);
  padding: 18px 18px 16px;
}

/* ===== Title Row ===== */
.modern-title {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 6px 4px 2px;
}

.title-icon {
  width: 36px;
  height: 36px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, .6);
}

.title-icon.info {
  background: linear-gradient(180deg, #f3e7da, #e7d5c2);
  color: #8b5e3c;
}

.title-icon.warn {
  background: linear-gradient(180deg, #ffe8d3, #ffd9c2);
  color: #d6631e;
}

.title-text {
  font-weight: 800;
  font-size: 1.25rem;
  /* ~20px */
  letter-spacing: .2px;
  color: #222;
}

/* ===== Body ===== */
.modern-body {
  padding: 10px 4px 2px;
}

.modern-body .content,
.modern-body .hint {
  margin: 0;
  color: #333;
  line-height: 1.55;
  font-size: 0.98rem;
}

/* ===== Actions ===== */
.modern-actions {
  display: flex;
  gap: 10px;
  padding-top: 14px;
  margin-top: 6px;
}

.modern-actions.right {
  justify-content: flex-end;
}

.modern-actions:not(.right) {
  justify-content: flex-end;
}

/* ===== Buttons (utility) ===== */
.btn-primary {
  background: #009199;
  color: white;
  border-radius: 12px;
  text-transform: none;
  letter-spacing: .2px;
  padding: 8px 16px;
}

.btn-primary:hover {
  filter: brightness(1.05);
}

.btn-danger {
  background: #e53935;
  color: white;
  border-radius: 12px;
  text-transform: none;
  padding: 8px 16px;
}

.btn-danger:hover {
  filter: brightness(1.05);
}

.btn-ghost {
  background: #f2f4f5;
  color: #333;
  border-radius: 12px;
  text-transform: none;
  padding: 8px 16px;
}

.btn-ghost:hover {
  background: #e9eef0;
}

.info-badge {
  background: #f1e3d0;
  color: #8b5e3c;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
  transition: transform .12s ease, box-shadow .12s ease;
}

.info-badge:hover {
  transform: scale(1.05);
  background: rgba(255, 0, 0, 0.15);
}

.table-header-actions {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 12px;
}

.info-inline {
  display: flex;
  align-items: center;
  gap: 6px;
}

.info-text {
  color: #ff0000;
  font-weight: 400;
  font-size: 1rem;
}

.info-badge {
  background: rgba(255, 0, 0, 0.1);
  color: #ff0000;
  display: grid;
  place-items: center;
  cursor: default;
  box-shadow: 0 1px 2px rgba(0, 0, 0, .08);
}
</style>
