<template>
  <v-app>
    <v-main>
      <v-container>

        <!-- หัวเรื่อง + ช่องค้นหา -->
        <v-row class="mb-4" align="center" justify="space-between">
          <v-col cols="auto" class="text-center">
            <h2 class="text-h5 font-weight-bold mb-0" style="color:#009199;">
              รายการประวัติคำขอเข้ารับคำปรึกษา
            </h2>
          </v-col>

          <!-- ช่องค้นหาอยู่ขวา -->
          <v-col cols="12" sm="5" md="4" lg="3" class="d-flex justify-end">
            <v-text-field
              v-model="search"
              label="ค้นหา"
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
              <th class="text-center" style="width:8%;">{{ t('col_date') }}</th>
              <th class="text-center" style="width:14%;">{{ t('col_time') }}</th>
              <th class="text-center" style="width:19%;">{{ t('col_location') }}</th>
              <th class="text-center" style="width:18%;">{{ t('col_type') }}</th>
              <th class="text-center" style="width:20%;">{{ t('col_name') }}</th>
              <th class="text-center" style="width:15%;">{{ t('col_email') }}</th>
              <th class="text-center" style="width:10%;">{{ t('col_phone') }}</th>
              <th class="text-center" style="width:12%;">{{ t('col_status') }}</th>
            </tr>
          </thead>

          <tbody style="background-color:#f0fafa;">
            <tr v-for="item in paginatedBookings" :key="item.appointment_ID">
              <td class="text-center">{{ formatDate(item.date) }}</td>
              <td class="text-center">{{ item.time }}</td>
              <td class="text-center">{{ item.place_name }}</td>
              <td class="text-center">
                <div style="padding:8px 12px;">
                  {{ item.service_ID == 4 && item.other_type ? item.other_type : (item.service_type || 'ไม่ระบุ') }}
                </div>
              </td>
              <td class="text-center">{{ item.full_name }}</td>
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
                    {{ t('status_approved') }}
                  </v-chip>

                  <v-chip v-else-if="item.status === 'rejected'" color="red" text-color="white">
                    <v-icon start small>mdi-close-circle</v-icon>
                    {{ t('status_rejected') }}
                  </v-chip>

                  <v-chip v-else-if="item.status === 'completed'" color="blue" text-color="white">
                    <v-icon start small>mdi-check-decagram</v-icon>
                    {{ t('status_completed') }}
                  </v-chip>

                  <!-- ✅ รองรับสถานะยกเลิก -->
                  <v-chip v-else-if="item.status === 'cancelled'" color="grey" text-color="white">
                    <v-icon start small>mdi-cancel</v-icon>
                    {{ t('status_cancelled') }}
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
          <v-card-title class="text-h6">ระบุคำแนะนำที่ให้</v-card-title>
          <v-card-text>
            <v-textarea v-model="adviceDetail" label="คำแนะนำ" rows="4" auto-grow required />
          </v-card-text>
          <v-card-actions>
            <v-spacer />
            <v-btn text @click="dialog = false">ยกเลิก</v-btn>
            <v-btn color="primary" @click="submitCompletion">บันทึก</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

const lang = localStorage.getItem('lang') || 'th'
const staffId = localStorage.getItem('staff_ID')
const role = localStorage.getItem('role') || 'staff'  // 'admin' | 'staff'

const page = ref(1)
const staffBookings = ref([])
const dialog = ref(false)
const selectedItem = ref(null)
const adviceDetail = ref('')
const search = ref('')

const translations = {
  th: {
    col_date: 'วันที่นัด',
    col_time: 'เวลาที่จอง',
    col_location: 'สถานที่',
    col_type: 'ประเภท',
    col_name: 'ชื่อ - นามสกุล',
    col_email: 'อีเมล',
    col_phone: 'เบอร์โทร',
    col_status: 'สถานะ',
    status_approved: 'อนุมัติ',
    status_rejected: 'ปฏิเสธ',
    status_completed: 'เสร็จสิ้น',
    status_cancelled: 'ยกเลิก'
  },
  en: {
    col_date: 'Date',
    col_time: 'Time',
    col_location: 'Location',
    col_type: 'Type',
    col_name: 'Name',
    col_email: 'Email',
    col_phone: 'Phone Number',
    col_status: 'Status',
    status_approved: 'Approved',
    status_rejected: 'Rejected',
    status_completed: 'Completed',
    status_cancelled: 'Cancelled'
  }
}
const t = (key) => computed(() => translations[lang][key]).value

function formatDate(dateStr) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  if (isNaN(d.getTime())) return '-'
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear() + 543
  return `${day}/${month}/${year}`
}

/* รวมสถานะ: approved / rejected / completed / cancelled */
const translatedBookings = computed(() =>
  staffBookings.value.filter(item =>
    ['approved', 'rejected', 'completed', 'cancelled'].includes(item.status)
  )
)

/*  ค้นหาจากชื่อ, อีเมล, เบอร์, สถานที่, ประเภท, สถานะ, รหัสนักศึกษาหน้าอีเมล */
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

/* เพจิเนชัน */
const paginatedBookings = computed(() => {
  const start = (page.value - 1) * 5
  return filteredBookings.value.slice(start, start + 5)
})
const pageCount = computed(() => Math.ceil(filteredBookings.value.length / 5))

/* Dialog บันทึกคำแนะนำ -> เปลี่ยนสถานะเป็น completed */
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

/* ดึงข้อมูล: แอดมินไม่ต้องส่ง staff_ID, สตาฟต้องส่ง */
onMounted(async () => {
  try {
    let params = { role }
    if (role !== 'admin') {
      if (!staffId) {
        console.warn('staff_ID not found in localStorage')
        return
      }
      params.staff_ID = staffId
    }

    const res = await axios.get('http://localhost:3000/api/history', { params })
    staffBookings.value = res.data
  } catch (error) {
    console.error('Error loading appointments history:', error)
  }
})
</script>
