<template>
  <v-app>
    <v-main>
      <v-container>
        <v-table style="table-layout: fixed">
          <thead style="background-color: #009199; color: white">
            <tr>
              <th class="text-center" style="width: 8%">{{ t("col_date") }}</th>
              <th class="text-center" style="width: 14%">
                {{ t("col_time") }}
              </th>
              <th class="text-center" style="width: 9%">
                {{ t("col_location") }}
              </th>
              <th class="text-center" style="width: 18%">
                {{ t("col_type") }}
              </th>
              <th class="text-center" style="width: 20%">
                {{ t("col_name") }}
              </th>
              <th class="text-center" style="width: 15%">
                {{ t("col_email") }}
              </th>
              <th class="text-center" style="width: 10%">
                {{ t("col_phone") }}
              </th>
              <th class="text-center" style="width: 12%">
                {{ t("col_status") }}
              </th>
            </tr>
          </thead>
          <tbody style="background-color: #f0fafa">
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
                  <!-- Approved Button -->
                  <v-btn
                    v-if="item.status === 'approved'"
                    size="small"
                    variant="flat"
                    :style="{ backgroundColor: '#C7EFCF', color: '#157145' }"
                    @click="openConfirmDialog(index)"
                  >
                    <v-icon start small>mdi-check-circle</v-icon>
                    {{ t("status_approved") }}
                  </v-btn>

                  <!-- Completed Button -->
                  <v-btn
                    v-else-if="item.status === 'completed'"
                    size="small"
                    variant="flat"
                    :style="{ backgroundColor: '#E0E0E0', color: '#424242' }"
                  >
                    <v-icon start small>mdi-check-bold</v-icon>
                    {{ t("status_completed") }}
                  </v-btn>

                  <!-- Rejected Button -->
                  <v-btn
                    v-else-if="item.status === 'rejected'"
                    size="small"
                    variant="flat"
                    :style="{ backgroundColor: '#F7C8C8', color: '#B42318' }"
                  >
                    <v-icon start small>mdi-close-circle</v-icon>
                    {{ t("status_rejected") }}
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>

        <v-pagination
          v-model="page"
          :length="3"
          total-visible="5"
          class="mt-6 d-flex justify-center"
        />

        <!-- Confirm Dialog -->
        <v-dialog v-model="confirmDialog" max-width="400">
          <v-card>
            <v-card-title class="text-h6">{{
              t("confirm_title")
            }}</v-card-title>
            <v-card-text>{{ t("confirm_message") }}</v-card-text>
            <v-card-actions class="justify-end">
              <v-btn text @click="confirmDialog = false">{{
                t("cancel")
              }}</v-btn>
              <v-btn color="primary" @click="markAsCompleted">{{
                t("confirm")
              }}</v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, defineProps } from "vue";

const props = defineProps({
  lang: String,
});

const page = ref(1);
const confirmDialog = ref(false);
const selectedIndex = ref(null);

const translations = {
  th: {
    logout: "ออกจากระบบ",
    menu_booking: "จองเข้ารับบริการ",
    menu_status: "สถานะการจอง",
    title: "สถานะการจอง",
    col_date: "วันที่นัด",
    col_time: "เวลาที่จอง",
    col_location: "สถานที่",
    col_type: "ประเภท",
    col_name: "ชื่อ - นามสกุล",
    col_email: "อีเมล",
    col_phone: "เบอร์โทร",
    col_status: "สถานะ",
    status_pending: "รอดำเนินการ",
    status_approved: "อนุมัติ",
    status_completed: "เสร็จสิ้น",
    status_rejected: "ปฏิเสธ",
    status_cancelled: "ยกเลิกการจอง",
    cancel_reason: "เหตุผลในการยกเลิก",
    confirm_title: "ยืนยันการเสร็จสิ้น",
    confirm_message: 'คุณต้องการเปลี่ยนสถานะเป็น "เสร็จสิ้น" หรือไม่?',
    cancel: "ยกเลิก",
    confirm: "ยืนยัน",
    booking_1: {
      type: "ปรึกษาด้านการใช้ชีวิตและสุขภาพจิต",
      location: "อาคาร C1 ห้อง 112",
      name: "ธัญชนก โกมลนาค",
      email: "6531501059@lamduan.mfu.ac.th",
      phone: "0651501059",
    },
    booking_2: {
      type: "ปรึกษาด้านการเรียน",
      location: "ออนไลน์",
      name: "ธัญญารัตน์ ศรีพรมมา",
      email: "6531501060@lamduan.mfu.ac.th",
      phone: "0651501060",
    },
    booking_3: {
      type: "ปรึกษาด้านการใช้ชีวิตและสุขภาพจิต",
      location: "อาคาร C1 ห้อง 112",
      name: "ปริชิกา ภูมิโคกรักษ์",
      email: "6531501077@lamduan.mfu.ac.th",
      phone: "0651501077",
    },
  },
  en: {
    logout: "Logout",
    menu_booking: "Book Appointment",
    menu_status: "Booking Status",
    title: "Booking Status",
    col_date: "Date",
    col_time: "Time",
    col_location: "Location",
    col_type: "Type",
    col_name: "Name",
    col_email: "Email",
    col_phone: "Phone Number",
    col_status: "Status",
    status_pending: "Pending",
    status_approved: "Approved",
    status_completed: "Completed",
    status_rejected: "Rejected",
    status_cancelled: "Cancelled",
    cancel_reason: "Cancellation Reason",
    confirm_title: "Confirm Completion",
    confirm_message: 'Do you want to mark this counseling as "Completed"?',
    cancel: "Cancel",
    confirm: "Confirm",
    booking_1: {
      type: "Life & Mental Health Counseling",
      location: "Building C1 Room 112",
      name: "Thanychanok Komolnak",
      email: "6531501059@lamduan.mfu.ac.th",
      phone: "06531501059",
    },
    booking_2: {
      type: "Academic Counseling",
      location: "Online",
      name: "Thanyarat Sriphonma",
      email: "6531501060@lamduan.mfu.ac.th",
      phone: "06531501060",
    },
    booking_3: {
      type: "Life & Mental Health Counseling",
      location: "Building C1 Room 112",
      name: "Parichika Phumkhokrak",
      email: "6531501077@lamduan.mfu.ac.th",
      phone: "06531501059",
    },
  },
};

const t = (key) => computed(() => translations[props.lang][key]).value;

const bookings = ref([
  {
    date: "20/02/2568",
    time: "14.30–16.00 น.",
    key: "booking_1",
    status: "approved",
  },
  {
    date: "14/04/2568",
    time: "09.00–10.30 น.",
    key: "booking_2",
    status: "rejected",
  },
  {
    date: "09/04/2568",
    time: "14.30–16.00 น.",
    key: "booking_3",
    status: "pending",
  },
]);

const translatedBookings = computed(() => {
  return bookings.value
    .filter((item) => item.status !== "pending") // ซ่อน pending
    .map((item) => {
      const translation = translations[props.lang][item.key] || {};
      return {
        ...item,
        location: translation.location,
        type: translation.type,
        name: translation.name,
        email: translation.email,
        phone: translation.phone,
      };
    });
});

function openConfirmDialog(index) {
  selectedIndex.value = index;
  confirmDialog.value = true;
}

function markAsCompleted() {
  if (selectedIndex.value !== null) {
    const item = bookings.value[selectedIndex.value];
    if (item.status === "approved") {
      item.status = "completed";
    }
  }
  confirmDialog.value = false;
}
</script>
