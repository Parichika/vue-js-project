<template>
  <v-app>
    <v-main>
      <v-container>
        <v-table style="table-layout: fixed;">
          <thead style="background-color: #009199; color: white;">
            <tr>
              <th class="text-center text-white" style="width: 8%;">{{ t('col_date') }}</th>
              <th class="text-center text-white" style="width: 14%;">{{ t('col_time') }}</th>
              <th class="text-center text-white" style="width: 9%;">{{ t('col_location') }}</th>
              <th class="text-center text-white" style="width: 18%;">{{ t('col_type') }}</th>
              <th class="text-center text-white" style="width: 20%;">{{ t('col_name') }}</th>
              <th class="text-center text-white" style="width: 15%;">{{ t('col_email') }}</th>
              <th class="text-center text-white" style="width: 10%;">{{ t('col_phone') }}</th>
              <th class="text-center text-white" style="width: 12%;">{{ t('col_status') }}</th>
            </tr>
          </thead>
          <tbody style="background-color: #f0fafa;">
            <tr v-for="(item, index) in translatedBookings" :key="index">
              <td class="text-start">{{ item.date }}</td>
              <td class="text-start">{{ item.time }}</td>
              <td class="text-start">{{ item.location }}</td>
              <td class="text-start">{{ item.type }}</td>
              <td class="text-start">{{ item.name }}</td>
              <td class="text-start">{{ item.email }}</td>
              <td class="text-start">{{ item.phone }}</td>
              <td>
                <div class="d-flex align-center justify-center ga-2">
                  <v-btn v-if="item.status === 'pending'" size="small" variant="flat" :style="{
                    backgroundColor: '#EACE7B',
                    color: '#7A601D',

                  }" @click="openDetailDialog(index)">
                    <v-icon start small>mdi-timer-sand</v-icon>
                    {{ t('status_pending') }}
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-pagination v-model="page" :length="3" total-visible="5" class="mt-6 d-flex justify-center" />

        <!-- ✅ Dialog for approving or rejecting -->
        <v-dialog v-model="detailDialog" max-width="500px">
          <v-card>
            <span @click="detailDialog = false"
              style="position: absolute; right: 20px; top: 5px; cursor: pointer; font-size: 20px; color: #000;">
              x
            </span>
            <v-card-title class="text-h6 mt-6">
              <span>ข้อมูลผู้รับบริการ</span>
            </v-card-title>
            <v-card-text v-if="selectedBooking">
              <div><strong>{{ t('col_name') }}:</strong> {{ selectedBooking.name }}</div>
              <div><strong>{{ t('col_email') }}:</strong> {{ selectedBooking.email }}</div>
              <div><strong>{{ t('col_phone') }}:</strong> {{ selectedBooking.phone }}</div>
              <br />
              <div><strong>{{ t('col_date') }}:</strong> {{ selectedBooking.date }}</div>
              <div><strong>{{ t('col_time') }}:</strong> {{ selectedBooking.time }}</div>
              <div><strong>{{ t('col_location') }}:</strong> {{ selectedBooking.location }}</div>
              <div><strong>{{ t('col_type') }}:</strong> {{ selectedBooking.type }}</div>
            </v-card-text>
            <v-card-actions class="justify-end">
              <v-btn style="background-color: #0DC71D; color: white;"
                @click="acceptCase(selectedBooking.appointment_ID)">
                อนุมัติ
              </v-btn>
              <v-btn style="background-color: red; color: white;" @click="rejectRequest">ปฏิเสธ</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, defineProps } from 'vue'
import axios from "axios";

const props = defineProps({
  lang: String
})

const page = ref(1)
const selectedIndex = ref(null)
const detailDialog = ref(false)

const openDetailDialog = (index) => {
  selectedIndex.value = index
  detailDialog.value = true
}

const approveRequest = () => {
  const index = selectedIndex.value
  if (index !== null) {
    bookings.value[index].status = 'approved'
    detailDialog.value = false
  }
}

const rejectRequest = () => {
  const index = selectedIndex.value
  if (index !== null) {
    bookings.value[index].status = 'rejected'
    detailDialog.value = false
  }
}

const translations = {
  th: {
    logout: 'ออกจากระบบ',
    menu_booking: 'จองเข้ารับบริการ',
    menu_status: 'สถานะการจอง',
    title: 'สถานะการจอง',
    col_date: 'วันที่นัด',
    col_time: 'เวลาที่จอง',
    col_location: 'สถานที่',
    col_type: 'ประเภท',
    col_name: 'ชื่อ - นามสกุล',
    col_email: 'อีเมล',
    col_phone: 'เบอร์โทร',
    col_status: 'สถานะ',
    status_pending: 'รอดำเนินการ',
    status_approved: 'อนุมัติ',
    status_rejected: 'ปฏิเสธ',
    status_cancelled: 'ยกเลิกการจอง',
    cancel_reason: 'เหตุผลในการยกเลิก',
    booking_1: {
      type: 'ปรึกษาด้านการใช้ชีวิตและสุขภาพจิต',
      location: 'อาคาร C1 ห้อง 112',
      name: 'ธัญชนก โกมลนาค',
      email: '6531501059@lamduan.mfu.ac.th',
      phone: '0651501059',
    },
    booking_2: {
      type: 'ปรึกษาด้านการเรียน',
      location: 'ออนไลน์',
      name: 'ธัญญารัตน์ ศรีพรมมา',
      email: '6531501060@lamduan.mfu.ac.th',
      phone: '0651501060',
    },
    booking_3: {
      type: 'ปรึกษาด้านการใช้ชีวิตและสุขภาพจิต',
      location: 'อาคาร C1 ห้อง 112',
      name: 'ปริชิกา ภูมิโคกรักษ์',
      email: '6531501077@lamduan.mfu.ac.th',
      phone: '0651501077',
    }
  },
  en: {
    logout: 'Logout',
    menu_booking: 'Book Appointment',
    menu_status: 'Booking Status',
    title: 'Booking Status',
    col_date: 'Date',
    col_time: 'Time',
    col_location: 'Location',
    col_type: 'Type',
    col_name: 'Name',
    col_email: 'Email',
    col_phone: 'Phone Number',
    col_status: 'Status',
    status_pending: 'Pending',
    status_approved: 'Approved',
    status_rejected: 'Rejected',
    status_cancelled: 'Cancelled',
    cancel_reason: 'Cancellation Reason',
    booking_1: {
      type: 'Life & Mental Health Counseling',
      location: 'Building C1 Room 112',
      name: 'Thanychanok Komolnak',
      email: '6531501059@lamduan.mfu.ac.th',
      phone: '06531501059'
    },
    booking_2: {
      type: 'Academic Counseling',
      location: 'Online',
      name: 'Thanyarat Sriphonma',
      email: '6531501060@lamduan.mfu.ac.th',
      phone: '06531501060'
    },
    booking_3: {
      type: 'Life & Mental Health Counseling',
      location: 'Building C1 Room 112',
      name: 'Parichika Phumkhokrak',
      email: '6531501077@lamduan.mfu.ac.th',
      phone: '06531501059'
    }
  }
}

const t = (key) => computed(() => translations[props.lang][key]).value

const bookings = ref([
  { date: '20/02/2568', time: '14.30–16.00 น.', key: 'booking_1', status: 'pending' },
  { date: '14/04/2568', time: '09.00–10.30 น.', key: 'booking_2', status: 'pending' },
  { date: '09/04/2568', time: '14.30–16.00 น.', key: 'booking_3', status: 'pending' }
])

const translatedBookings = computed(() => {
  return bookings.value
    .filter((item) => item.status === 'pending') // ✅ แสดงเฉพาะ pending
    .map((item) => {
      const translation = translations[props.lang][item.key] || {}
      return {
        ...item,
        location: translation.location,
        type: translation.type,
        name: translation.name,
        email: translation.email,
        phone: translation.phone,
      }
    })
})

const selectedBooking = computed(() => {
  if (selectedIndex.value !== null) {
    return translatedBookings.value[selectedIndex.value]
  }
  return null
})

// สมมติว่าเก็บ staff_ID หลัง login ไว้ใน localStorage หรือ state อื่น
const loggedInStaffID = 1; // ตรงนี้ต้องดึงจากระบบ login จริง เช่น localStorage.getItem('staff_ID')

// ฟังก์ชันโหลดรายการใหม่ (ตอนนี้คุณมี translatedBookings ที่ดึงจาก bookings mock ไว้)
// ในการใช้งานจริงคุณอาจจะเปลี่ยนไป fetch จาก backend
const fetchAppointments = async () => {
  const res = await axios.get("http://localhost:3000/api/appointments");
  // เอา res.data ไปแทน bookings.value แล้ว map/แปลค่าเหมือนเดิม
};

// ฟังก์ชันรับเคส
const acceptCase = async (appointmentID) => {
  try {
    await axios.put(`http://localhost:3000/api/appointments/${appointmentID}/assign`, {
      staff_ID: loggedInStaffID,
    });
    alert("รับเคสสำเร็จ");
    fetchAppointments(); // โหลดรายการใหม่
    detailDialog.value = false;
  } catch (err) {
    alert(err.response?.data?.error || "เกิดข้อผิดพลาด");
  }
};
</script>
