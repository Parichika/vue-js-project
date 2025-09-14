<!-- src/views/AdminHistory.vue -->
<template>
  <v-app>
    <v-main>
      <v-container>

        <!-- หัวเรื่อง + ช่องค้นหา -->
        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="auto" class="text-center">
            <h2 class="text-h5 font-weight-bold mb-0" style="color:#009199;">
              {{ t('history.title') }}
            </h2>
          </v-col>

          <!-- ช่องค้นหาอยู่ขวา -->
          <v-col cols="12" sm="5" md="4" lg="3" class="d-flex justify-end">
            <v-text-field
              v-model="search"
              :label="t('history.search')"
              prepend-inner-icon="mdi-magnify"
              variant="outlined"
              density="compact"
              hide-details
              style="min-height:38px; max-width:260px;"
              clearable
            />
          </v-col>
        </v-row>

        <v-table style="table-layout:fixed;">
          <thead style="background-color:#009199; color:white;">
            <tr>
              <th class="text-center" style="width:8%;">{{ t('history.col_date') }}</th>
              <th class="text-center" style="width:14%;">{{ t('history.col_time') }}</th>
              <th class="text-center" style="width:16%;">{{ t('history.col_location') }}</th>
              <th class="text-center" style="width:18%;">{{ t('history.col_type') }}</th>
              <th class="text-center" style="width:22%;">{{ t('history.col_name') }}</th>
              <th class="text-center" style="width:15%;">{{ t('history.col_email') }}</th>
              <th class="text-center" style="width:10%;">{{ t('history.col_phone') }}</th>
              <th class="text-center" style="width:12%;">{{ t('history.col_status') }}</th>
            </tr>
          </thead>

        <tbody style="background-color:#f0fafa;">
          <tr v-for="item in paginatedBookings" :key="item.appointment_ID">
            <td class="text-center">{{ formatDate(item.date) }}</td>
            <td class="text-center">{{ item.time }}</td>

            <!-- ✅ แปลสถานที่ตามภาษา -->
            <td >{{ placeLabel(item.place_name) }}</td>

            <!-- ✅ แปลประเภทบริการตามภาษา -->
            <td >
              <div style="padding:8px 12px;">
                {{ serviceLabel(item.service_ID, item.service_type, item.other_type) }}
              </div>
            </td>

            <td >{{ item.full_name }}</td>
            <td class="text-center">{{ item.user_email }}</td>
            <td class="text-center">{{ item.phone_number }}</td>

            <td>
              <div class="d-flex align-center justify-center">
                <v-chip
                  v-if="item.status === 'approved'"
                  color="green" text-color="white"
                  @click="openDialog(item)" class="cursor-pointer"
                >
                  <v-icon start small>mdi-check-circle</v-icon>
                  {{ t('status.approved') }}
                </v-chip>

                <v-chip v-else-if="item.status === 'rejected'" color="red" text-color="white">
                  <v-icon start small>mdi-close-circle</v-icon>
                  {{ t('status.rejected') }}
                </v-chip>

                <v-chip v-else-if="item.status === 'completed'" color="blue" text-color="white">
                  <v-icon start small>mdi-check-decagram</v-icon>
                  {{ t('status.completed') }}
                </v-chip>

                <v-chip v-else-if="item.status === 'cancelled'" color="grey" text-color="white">
                  <v-icon start small>mdi-cancel</v-icon>
                  {{ t('status.cancelled') }}
                </v-chip>
              </div>
            </td>
          </tr>
        </tbody>
        </v-table>

        <v-pagination
          v-model="page"
          :length="pageCount"
          :total-visible="5"
          next-icon="mdi-chevron-right"
          prev-icon="mdi-chevron-left"
          class="mt-6 d-flex justify-center"
        />
      </v-container>

      <!-- Dialog สำหรับใส่คำแนะนำ (กดจากสถานะ approved) -->
      <v-dialog v-model="dialog" width="500">
        <v-card>
          <v-card-title class="text-h6">{{ t('history.advice_title') }}</v-card-title>
          <v-card-text>
            <v-textarea v-model="adviceDetail" :label="t('history.advice_label')" rows="4" auto-grow required />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn variant="text" @click="dialog = false">{{ t('history.btn_cancel') }}</v-btn>
            <v-btn color="primary" @click="submitCompletion">{{ t('history.btn_save') }}</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import axios from 'axios'

const { t, locale } = useI18n()

const staffId = localStorage.getItem('staff_ID')
const role = localStorage.getItem('role') || 'staff'  // 'admin' | 'staff'

const page = ref(1)
const staffBookings = ref([])
const dialog = ref(false)
const selectedItem = ref(null)
const adviceDetail = ref('')
const search = ref('')

/** ===== Utils: วันที่ตาม locale (TH ใช้ พ.ศ.) ===== */
function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  if (locale.value === 'th') {
    const day = String(d.getDate()).padStart(2, '0')
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const year = d.getFullYear() + 543
    return `${day}/${month}/${year}`
  }
  return d.toLocaleDateString('en-US', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/** ===== แปลสถานที่ & ประเภทบริการ ===== */

// สถานที่: map ชื่อจาก backend -> คีย์ i18n ใน appointment.*
function placeLabel(name) {
  const map = new Map([
    ['อาคาร C1 ห้อง 112', 'appointment.on_site'],
    ['ออนไลน์', 'appointment.online'],
    ['M4U (ตึก M-square)', 'appointment.msquare'],
    // รองรับเคส EN ถ้าฝั่ง backend ส่งอังกฤษมา
    ['Building C1 Room 112', 'appointment.on_site'],
    ['Online', 'appointment.online'],
    ['M4U (M-square building)', 'appointment.msquare']
  ])
  const key = map.get(name)
  return key ? t(key) : name
}

// ประเภทบริการ: ใช้รหัสก่อน ถ้าไม่มีลองเดาจากข้อความ
function serviceLabel(serviceId, serviceType, otherType) {
  if (serviceId === 1) return t('appointment.life')
  if (serviceId === 2) return t('appointment.study')
  if (serviceId === 3) return t('appointment.emotion')
  if (serviceId === 4) return otherType || t('appointment.other')

  const norm = (serviceType || '').toLowerCase()
  if (!norm) return t('history.unspecified')
  if (/(ชีวิต|ปรับตัว|life|adjustment)/.test(norm)) return t('appointment.life')
  if (/(เรียน|academic|study)/.test(norm)) return t('appointment.study')
  if (/(สุขภาพจิต|emotion|mental)/.test(norm)) return t('appointment.emotion')
  if (/(other|อื่น)/.test(norm)) return otherType || t('appointment.other')
  return serviceType || t('history.unspecified')
}

/** ===== Data ===== */
const translatedBookings = computed(() =>
  staffBookings.value.filter(item =>
    ['approved', 'rejected', 'completed', 'cancelled'].includes(item.status)
  )
)

/** ค้นหา: ชื่อ, อีเมล, เบอร์, สถานที่, ประเภท, สถานะ, รหัสนักศึกษาหน้าอีเมล */
const filteredBookings = computed(() => {
  const keyword = (search.value || '').toLowerCase().trim()
  if (!keyword) return translatedBookings.value

  return translatedBookings.value.filter((item) => {
    const studentIdPart = item.user_email?.split('@')[0]?.toLowerCase() || ''
    const fields = [
      item.full_name,
      item.user_email,
      item.phone_number,
      item.place_name,
      item.other_type,
      item.service_type,
      item.status
    ]
    return studentIdPart.includes(keyword) ||
      fields.some(x => (x || '').toString().toLowerCase().includes(keyword))
  })
})

/** เพจิเนชัน */
const paginatedBookings = computed(() => {
  const start = (page.value - 1) * 5
  return filteredBookings.value.slice(start, start + 5)
})
const pageCount = computed(() => Math.ceil(filteredBookings.value.length / 5))

/** Dialog: บันทึกคำแนะนำ -> เปลี่ยนสถานะเป็น completed */
function openDialog(item) {
  selectedItem.value = item
  adviceDetail.value = ''
  dialog.value = true
}

async function submitCompletion() {
  try {
    await axios.post('http://localhost:3000/api/appointments/complete', {
      appointment_ID: selectedItem.value.appointment_ID,
      advice_detail: adviceDetail.value
    })
    selectedItem.value.status = 'completed'
    dialog.value = false
  } catch (error) {
    console.error('Error submitting completion:', error)
  }
}

/** โหลดข้อมูล */
onMounted(async () => {
  try {
    const params = role !== 'admin'
      ? (staffId ? { role, staff_ID: staffId } : { role })
      : { role }

    const res = await axios.get('http://localhost:3000/api/history', { params })
    staffBookings.value = res.data
  } catch (error) {
    console.error('Error loading appointments history:', error)
  }
})
</script>
