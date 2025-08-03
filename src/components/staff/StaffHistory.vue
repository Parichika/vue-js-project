<template>
  <v-app>
    <v-main>
      <v-container>
        <v-table style="table-layout: fixed;">
          <thead style="background-color: #009199; color: white;">
            <tr>
              <th class="text-center" style="width: 8%;">{{ t('col_date') }}</th>
              <th class="text-center" style="width: 14%;">{{ t('col_time') }}</th>
              <th class="text-center" style="width: 9%;">{{ t('col_location') }}</th>
              <th class="text-center" style="width: 18%;">{{ t('col_type') }}</th>
              <th class="text-center" style="width: 20%;">{{ t('col_name') }}</th>
              <th class="text-center" style="width: 15%;">{{ t('col_email') }}</th>
              <th class="text-center" style="width: 10%;">{{ t('col_phone') }}</th>
              <th class="text-center" style="width: 12%;">{{ t('col_status') }}</th>
            </tr>
          </thead>
          <tbody style="background-color: #f0fafa;">
            <tr v-for="(item, index) in translatedBookings" :key="index">
              <td>{{ formatDate(item.date) }}</td>
              <td>{{ item.time }}</td>
              <td>{{ item.place_name }}</td>
              <td>
                <div style="padding: 8px 12px;">{{ item.service_type || item.other_type }} </div>
              </td>
              <td>{{ item.name }}</td>
              <td>{{ item.user_email }}</td>
              <td>{{ item.phone_number }}</td>
              <td>
                <div class="d-flex align-center justify-center ga-2">
                  <v-btn v-if="item.status === 'approved'" size="small" variant="flat"
                    :style="{ backgroundColor: '#C7EFCF', color: '#157145' }">
                    <v-icon start small>mdi-check-circle</v-icon>
                    {{ t('status_approved') }}
                  </v-btn>
                  <v-btn v-else-if="item.status === 'rejected'" size="small" variant="flat"
                    :style="{ backgroundColor: '#F7C8C8', color: '#B42318' }">
                    <v-icon start small>mdi-close-circle</v-icon>
                    {{ t('status_rejected') }}
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-pagination v-model="page" :length="Math.ceil(translatedBookings.length / 10)" total-visible="5"
          class="mt-6 d-flex justify-center" />
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import axios from 'axios'

// ✅ ดึงค่าจาก localStorage
const lang = localStorage.getItem("lang") || "th"
const staffId = localStorage.getItem("staff_ID")
const role = localStorage.getItem("role") || "staff"

const page = ref(1)
const staffBookings = ref([])

// ✅ คำแปลสองภาษา
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
    status_rejected: 'ปฏิเสธ'
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
    status_rejected: 'Rejected'
  }
}

const t = (key) => computed(() => translations[lang][key]).value

function formatDate(dateStr) {
  const d = new Date(dateStr)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear() + 543
  return `${day}/${month}/${year}`
}

// ✅ filter เฉพาะที่อนุมัติหรือปฏิเสธ
const translatedBookings = computed(() =>
  staffBookings.value.filter(
    (item) => item.status === 'approved' || item.status === 'rejected'
  )
)

onMounted(async () => {
  try {
    if (!staffId) {
      console.warn("❌ staff_ID not found in localStorage")
      return
    }

    const res = await axios.get('http://localhost:3000/api/history', {
      params: {
    staff_ID: staffId,
    role: role
  }
    })

    staffBookings.value = res.data
  } catch (error) {
    console.error('❌ Error loading staff appointments:', error)
  }
})
</script>
