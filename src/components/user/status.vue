<template>
  <v-app>
    <!-- Main -->
    <v-main>
      <v-container>
        <v-table style="table-layout: fixed; width: 100%">
          <thead style="background-color: #009199; color: white">
            <tr>
              <th class="text-center text-white" style="width: 12%">
                {{ t("col_date") }}
              </th>
              <th class="text-center text-white" style="width: 12%">
                {{ t("col_time") }}
              </th>
              <th class="text-center text-white" style="width: 20%">
                {{ t("col_location") }}
              </th>
              <th class="text-center text-white" style="width: 25%">
                {{ t("col_type") }}
              </th>
              <th class="text-center text-white" style="width: 19%">
                {{ t("col_staff") }}
              </th>
              <th class="text-center text-white" style="width: 14%">
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
              <td class="text-start">{{ item.staff }}</td>
              <td>
                <div class="d-flex align-center justify-center ga-2">
                  <v-chip
                    v-if="item.status === 'pending'"
                    color="yellow-darken-2"
                    text-color="black"
                  >
                    <v-icon start small>mdi-timer-sand</v-icon>
                    {{ t("status_pending") }}
                  </v-chip>
                  <v-chip
                    v-else-if="item.status === 'approved'"
                    color="green"
                    text-color="white"
                  >
                    <v-icon start small>mdi-check-circle</v-icon>
                    {{ t("status_approved") }}
                  </v-chip>
                  <v-chip
                    v-else-if="item.status === 'rejected'"
                    color="red"
                    text-color="white"
                  >
                    <v-icon start small>mdi-close-circle</v-icon>
                    {{ t("status_rejected") }}
                  </v-chip>
                  <v-btn
                    v-if="item.status === 'pending'"
                    icon
                    size="small"
                    color="red"
                    @click="openCancelDialog(index)"
                  >
                    <v-icon>mdi-delete</v-icon>
                  </v-btn>
                  <v-btn
                    v-if="item.status === 'cancelled'"
                    variant="flat"
                    color="grey"
                    size="small"
                    disabled
                  >
                    {{ t("status_cancelled") }}
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

        <v-dialog v-model="cancelDialog" width="500">
          <v-card>
            <v-card-title class="text-h6 font-weight-bold">{{
              t("cancel_reason") || "เหตุผล"
            }}</v-card-title>
            <v-card-text>
              <v-text-field
                v-model="cancelReason"
                variant="outlined"
                density="comfortable"
              />
            </v-card-text>
            <v-card-actions class="justify-end">
              <v-btn color="red" @click="confirmCancel">{{
                t("status_cancelled")
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

// ✅ รับ props.lang จากภายนอก
const props = defineProps({
  lang: String,
});

const page = ref(1);
const cancelDialog = ref(false);
const cancelReason = ref("");
const selectedIndex = ref(null);

const openCancelDialog = (index) => {
  selectedIndex.value = index;
  cancelReason.value = "";
  cancelDialog.value = true;
};

const confirmCancel = () => {
  if (selectedIndex.value !== null) {
    bookings.value[selectedIndex.value].status = "cancelled";
    cancelDialog.value = false;
  }
};

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
    booking_1: {
      type: "ปรึกษาด้านการใช้ชีวิตและสุขภาพจิต",
      location: "อาคาร C1 ห้อง 112",
      staff: "สยุมพร ไชยวงค์",
    },
    booking_2: {
      type: "ปรึกษาด้านการเรียน",
      location: "ออนไลน์",
      staff: "แววดาว บังเมฆ",
    },
    booking_3: {
      type: "ระบายความรู้สึกต่าง ๆ",
      location: "ออนไลน์",
      staff: "สุภาภรณ์ กัลยา",
    },
    booking_4: {
      type: "ปรึกษาด้านการเรียน",
      location: "อาคาร C1 ห้อง 112",
      staff: "กรรณิกา มาโน",
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
    col_staff: "Staff",
    col_status: "Status",
    status_pending: "Pending",
    status_approved: "Approved",
    status_rejected: "Rejected",
    status_cancelled: "Cancelled",
    cancel_reason: "Cancellation Reason",
    booking_1: {
      type: "Request for life and mental health consultation",
      location: "Building C1 Room 112",
      staff: "Sayumporn Chaiyavong",
    },
    booking_2: {
      type: "Request for academic consultation",
      location: "Online",
      staff: "Waewdao Bangmek",
    },
    booking_3: {
      type: "Vent your feelings",
      location: "Online",
      staff: "Supaporn Kalaya",
    },
    booking_4: {
      type: "Request for academic consultation",
      location: "Building C1 Room 112",
      staff: "Kannika Mano",
    },
  },
};

// ✅ ใช้ props.lang ในการแปลข้อความ
const t = (key) => computed(() => translations[props.lang][key]).value;

// ✅ ใช้ props.lang ในการแปลข้อมูลการจอง
const bookings = ref([
  {
    date: "09/04/2568",
    time: "14.30–16.00 น.",
    key: "booking_1",
    status: "pending",
  },
  {
    date: "18/02/2568",
    time: "09.00–10.30 น.",
    key: "booking_2",
    status: "approved",
  },
  {
    date: "02/02/2568",
    time: "13.00–14.30 น.",
    key: "booking_3",
    status: "rejected",
  },
  {
    date: "29/01/2568",
    time: "13.00–14.30 น.",
    key: "booking_4",
    status: "cancelled",
  },
]);

const translatedBookings = computed(() => {
  return bookings.value.map((item) => {
    const translation = translations[props.lang][item.key] || {};
    return {
      ...item,
      location: translation.location,
      type: translation.type,
      staff: translation.staff,
    };
  });
});

const logout = () => {
  alert(translations[props.lang].logout);
};
</script>
