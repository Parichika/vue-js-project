<!-- src/views/status.vue -->
<template>
  <v-app>
    <v-main>
      <v-container>
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
              <td class="text-start">{{ item.time }}</td>

              <!-- ✅ แปลสถานที่ตามภาษา -->
              <td class="text-start">{{ placeLabel(item.place_name) }}</td>

              <!-- ✅ แปลประเภทบริการตามภาษา -->
              <td class="text-start">{{ serviceLabel(item.service_ID, item.service_type, item.other_type) }}</td>

              <td class="text-start">{{ item.staff || '-' }}</td>
              <td>
                <div class="d-flex align-center justify-center ga-2">
                  <v-chip v-if="item.status === 'pending'" color="#FF6F00" text-color="black" @click="openCancelDialog(index)">
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
                <span v-if="item.status === 'rejected' && item.note" :title="item.note">
                  {{ item.note }}
                </span>
                <span v-else>-</span>
              </td>
            </tr>
          </tbody>
        </v-table>

        <!-- Pagination -->
        <v-pagination
          v-model="page"
          :length="pageCount"
          :total-visible="5"
          next-icon="mdi-chevron-right"
          prev-icon="mdi-chevron-left"
          class="mt-6 d-flex justify-center"
        />

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
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

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
        staff: item.first_name ? `${item.first_name} ${item.last_name}` : '-',
        type: item.service_ID === 4 && item.other_type ? item.other_type : (item.service_type || '-'),
        place_name: item.place_name || '-',
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

// ✅ ฟังก์ชันแปล "สถานที่" ตามภาษา (ใช้คีย์ในไฟล์ appointment.*)
function placeLabel(name) {
  const map = new Map([
    ['อาคาร C1 ห้อง 112', 'appointment.on_site'],
    ['ออนไลน์', 'appointment.online'],
    ['M4U (ตึก M-square)', 'appointment.msquare'],
    // รองรับกรณีฝั่ง EN ส่งมา
    ['Building C1 Room 112', 'appointment.on_site'],
    ['Online', 'appointment.online'],
    ['M4U (M-square building)', 'appointment.msquare']
  ])
  const key = map.get(name)
  return key ? t(key) : name
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
    alert(t('status.err_cancel_error'))
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
</style>
