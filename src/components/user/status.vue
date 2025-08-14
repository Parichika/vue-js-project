<template>
  <v-app>
    <v-main>
      <v-container>
        <v-table style="table-layout: fixed; width: 100%">
          <thead style="background-color: #009199; color: white">
            <tr>
              <th class="text-center text-white" style="width: 12%">{{ t("col_date") }}</th>
              <th class="text-center text-white" style="width: 12%">{{ t("col_time") }}</th>
              <th class="text-center text-white" style="width: 20%">{{ t("col_location") }}</th>
              <th class="text-center text-white" style="width: 25%">{{ t("col_type") }}</th>
              <th class="text-center text-white" style="width: 19%">{{ t("col_staff") }}</th>
              <th class="text-center text-white" style="width: 14%">{{ t("col_status") }}</th>
            </tr>
          </thead>

          <tbody style="background-color: #f0fafa">
            <tr v-for="(item, index) in paginatedBookings" :key="item.appointment_ID">
              <td class="text-start">{{ item.date }}</td>
              <td class="text-start">{{ item.time }}</td>
              <td class="text-start">{{ item.place_name }}</td>
              <td class="text-start">{{ item.type }}</td>
              <td class="text-start">{{ item.staff || "-" }}</td>
              <td>
                <div class="d-flex align-center justify-center ga-2">
                  <v-chip v-if="item.status === 'pending'" color="#FF6F00" text-color="black">
                    <v-icon start small>mdi-timer-sand</v-icon>
                    {{ t("status_pending") }}
                  </v-chip>
                  <v-chip v-else-if="item.status === 'approved'" color="green" text-color="white">
                    <v-icon start small>mdi-check-circle</v-icon>
                    {{ t("status_approved") }}
                  </v-chip>
                  <v-chip v-else-if="item.status === 'rejected'" color="red" text-color="white">
                    <v-icon start small>mdi-close-circle</v-icon>
                    {{ t("status_rejected") }}
                  </v-chip>
                  <v-chip v-else-if="item.status === 'cancelled'" color="grey" text-color="white">
                    <v-icon start small>mdi-cancel</v-icon>
                    {{ t("status_cancelled") }}
                  </v-chip>
                  <v-chip v-else-if="item.status === 'completed'" color="blue" text-color="white">
                    <v-icon start small>mdi-check-decagram</v-icon>
                    {{ t("status_completed") }}
                  </v-chip>

                  <!-- ปุ่มยกเลิก เฉพาะ pending -->
                  <v-btn
                    v-if="item.status === 'pending'"
                    icon size="small" color="red"
                    @click="openCancelDialog(index)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </div>
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

        <!-- Dialog ยืนยันการยกเลิก (ดีไซน์แบบตัวอย่าง) -->
        <v-dialog v-model="cancelDialog" max-width="520" persistent>
          <v-card class="pa-6 text-center" elevation="8">


            <!-- หัวข้อ -->
            <div class="text-h5 font-weight-bold mb-2">
              {{ props.lang === 'th' ? 'คุณต้องการยกเลิกการจองหรือไม่?' : 'Are you sure?' }}
            </div>

            <!-- ปุ่มล่าง -->
            <div class="d-flex justify-center ga-3 mt-4">
              <v-btn color="error" variant="flat" class="text-center"
                     @click="cancelDialog = false">
                {{ props.lang === 'th' ? 'ยกเลิก' : 'Cancel' }}
              </v-btn>
              <v-btn color="primary" variant="flat" class="text-center"
                     @click="confirmCancel">
                {{ props.lang === 'th' ? 'ยืนยัน' : 'Confirm' }}
              </v-btn>
            </div>
          </v-card>
        </v-dialog>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";

// props
const props = defineProps({
  lang: String,
  email: String,
});

const page = ref(1);
const cancelDialog = ref(false);
const selectedIndex = ref(null);
const bookings = ref([]);

// ดึงข้อมูลการจอง
const fetchBookings = async () => {
  try {
    const response = await axios.get("/api/appointments/status", {
      params: { email: props.email },
    });
    bookings.value = response.data.map((item) => {
      let formattedDate = "-";
      if (item.date) {
        const d = new Date(item.date);
        const day = String(d.getDate()).padStart(2, "0");
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const year = d.getFullYear();
        formattedDate = `${day}/${month}/${year}`;
      }

      return {
        ...item,
        date: formattedDate,
        staff: item.first_name ? `${item.first_name} ${item.last_name}` : "-",
        type: item.service_ID === 4 && item.other_type ? item.other_type : (item.service_type || "-"),
        place_name: item.place_name || "-",
        status: item.status || "pending",
        appointment_ID: item.appointment_ID || "",
      };
    });
  } catch (error) {
    console.error("Error fetching bookings:", error);
  }
};

onMounted(fetchBookings);

// เปิด dialog และ map index ให้ตรงกับอาร์เรย์จริง (รองรับเพจิเนชัน)
const openCancelDialog = (pageIndex) => {
  selectedIndex.value = (page.value - 1) * 7 + pageIndex;
  cancelDialog.value = true;
};

// ยกเลิกโดยไม่ต้องกรอกเหตุผล (ไม่ส่ง reason)
const confirmCancel = async () => {
  if (selectedIndex.value == null || !bookings.value[selectedIndex.value]) {
    alert(props.lang === 'th' ? "ไม่พบรายการที่ต้องการยกเลิก" : "Booking not found");
    return;
  }

  const item = bookings.value[selectedIndex.value];
  if (!item.appointment_ID) {
    alert(props.lang === 'th' ? "ไม่พบ ID ของการจองนี้" : "Appointment ID not found");
    return;
  }

  try {
    const res = await axios.put(`/api/appointments/${item.appointment_ID}/cancel`);
    const okMsg = ["Appointment cancelled and reason saved", "Appointment cancelled"];
    if (okMsg.includes(res?.data?.message)) {
      bookings.value[selectedIndex.value].status = "cancelled";
      cancelDialog.value = false;
      alert(props.lang === 'th' ? "ยกเลิกการจองเรียบร้อยแล้ว" : "Appointment cancelled");
    } else {
      alert(props.lang === 'th' ? "เกิดข้อผิดพลาดในการยกเลิกการจอง" : "Cancellation failed");
    }
  } catch (e) {
    console.error("cancel error:", e);
    alert(props.lang === 'th' ? "เกิดข้อผิดพลาดในการยกเลิกการจอง" : "Cancellation error");
  }
};

// แปลภาษา
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
    col_staff: "ผู้ดูแล",
    col_status: "สถานะ",
    status_pending: "รอดำเนินการ",
    status_approved: "อนุมัติ",
    status_rejected: "ปฏิเสธ",
    status_cancelled: "ยกเลิกการจอง",
    cancel_reason: "เหตุผลในการยกเลิก",
    status_completed: "เสร็จสิ้น",
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
    col_staff: "Staff",
    col_status: "Status",
    status_pending: "Pending",
    status_approved: "Approved",
    status_rejected: "Rejected",
    status_cancelled: "Cancelled",
    cancel_reason: "Cancellation Reason",
    status_completed: "Completed",
  },
};
const t = (key) => computed(() => translations[props.lang][key]).value;

// เพจิเนชัน
const filteredBookings = computed(() => bookings.value);
const paginatedBookings = computed(() => {
  const start = (page.value - 1) * 7;
  return filteredBookings.value.slice(start, start + 7);
});
const pageCount = computed(() => Math.ceil(filteredBookings.value.length / 7));
</script>

<style scoped>
.confirm-icon {
  width: 96px;
  height: 96px;
  border-radius: 999px;
  display: grid;
  place-items: center;
  margin-top: 8px;
  background: #fff3e0;  /* ส้มอ่อน */
  color: #ff9800;       /* ส้ม */
}
</style>
