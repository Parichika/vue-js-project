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
            <tr v-for="item in paginatedBookings" :key="item.appointment_ID">
              <td class="text-start">{{ item.date }}</td>
              <td class="text-start">{{ item.time }}</td>
              <td class="text-start">{{ item.place_name }}</td>
              <td class="text-start">{{ item.type }}</td>
              <td class="text-start">{{ item.staff || "-" }}</td>
              <td>
                <div class="d-flex align-center justify-center ga-2">
                  <v-chip v-if="item.status === 'pending'" color="yellow-darken-2" text-color="black">
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

                  <v-btn v-if="item.status === 'pending'" icon size="small" color="red"
                    @click="openCancelDialog(index)">
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                </div>
              </td>
            </tr>
          </tbody>
        </v-table>

         <v-pagination v-model="page" :length="pageCount" :total-visible="5" next-icon="mdi-chevron-right"
          prev-icon="mdi-chevron-left" class="mt-6 d-flex justify-center" />

        <!-- Dialog สำหรับยกเลิก -->
        <v-dialog v-model="cancelDialog" width="500">
          <v-card>
            <v-btn icon density="compact" elevation="0" @click="cancelDialog = false"
              style="position: absolute; top: 8px; right: 8px; min-width: 28px; height: 28px;">
              <v-icon size="18">mdi-close</v-icon>
            </v-btn>

            <v-card-title class="text-h6 font-weight-bold">
              {{ t("cancel_reason") }}
            </v-card-title>

            <v-card-text>
              <v-text-field v-model="cancelReason" label="กรอกเหตุผลในการยกเลิก" variant="outlined"
                density="comfortable" required />
            </v-card-text>

            <v-card-actions class="justify-end">
              <v-btn color="red" @click="confirmCancel">
                {{ t("status_cancelled") }}
              </v-btn>
            </v-card-actions>
          </v-card>
        </v-dialog>

      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, onMounted } from "vue";
import axios from "axios";

// รับ props.lang และ props.email
const props = defineProps({
  lang: String,
  email: String,
});
const translatedBookings = computed(() => bookings.value);

const page = ref(1);
const cancelDialog = ref(false);
const cancelReason = ref("");
const selectedIndex = ref(null);
const bookings = ref([]);

// ฟังก์ชันดึงข้อมูลการจอง
const fetchBookings = async () => {
  try {
    const response = await axios.get("/api/appointments/status", {
      params: { email: props.email },
    });
    console.log("📦 bookings response =", response.data);
    console.log("Received booking data:", response.data);

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
        type:
          item.service_ID === 4 && item.other_type
            ? item.other_type
            : item.service_type || "-",
        location: item.place_name || "-",
        status: item.status || "pending",
        appointment_ID: item.appointment_ID || "",
        service_ID: item.service_ID,
        other_type: item.other_type,
      };
    });

  } catch (error) {
    console.error("❌ Error fetching bookings:", error);
  }
};

onMounted(() => {
  fetchBookings();
});

const openCancelDialog = (index) => {
  selectedIndex.value = index;
  console.log("Selected booking index:", selectedIndex.value);  // ตรวจสอบว่า selectedIndex มีค่าถูกต้อง
  cancelReason.value = "";
  cancelDialog.value = true;
};



// ฟังก์ชันสำหรับยกเลิกการจอง
const confirmCancel = async () => {
  if (!cancelReason.value.trim()) {
    alert("กรุณากรอกเหตุผลในการยกเลิก");
    return;
  }

  if (selectedIndex.value !== null && bookings.value[selectedIndex.value]) {
    const item = bookings.value[selectedIndex.value];
    console.log("Cancel request data: ", {
      appointmentID: item.appointment_ID,
      reason: cancelReason.value
    });

    // ตรวจสอบว่า appointment_ID ถูกต้อง
    if (!item.appointment_ID) {
      alert("ไม่พบ ID ของการจองนี้");
      return;
    }

    try {
      // ส่งคำขอ PUT ไปที่เซิร์ฟเวอร์เพื่อยกเลิกการจอง
      const response = await axios.put(`/api/appointments/${item.appointment_ID}/cancel`, {
        reason: cancelReason.value,
      });

      if (response.data.message === "Appointment cancelled and reason saved") {
        bookings.value[selectedIndex.value].status = "cancelled";
        cancelDialog.value = false;
        alert("ยกเลิกการจองเรียบร้อยแล้ว ✅");
      } else {
        alert("เกิดข้อผิดพลาดในการยกเลิกการจอง");
      }
    } catch (error) {
      console.error("❌ cancel error:", error);
      alert("เกิดข้อผิดพลาดในการยกเลิกการจอง");
    }
  }
};




// ภาษา
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

// ✅ แสดงเฉพาะหน้าปัจจุบัน
const filteredBookings = computed(() => bookings.value)

const paginatedBookings = computed(() => {
  const start = (page.value - 1) * 7
  return filteredBookings.value.slice(start, start + 7)
})

const pageCount = computed(() =>
  Math.ceil(filteredBookings.value.length / 7)
)
</script>
