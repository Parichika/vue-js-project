<template>
  <v-container class="py-6">
    <!-- Header -->
    <v-row>
      <v-col cols="12" class="d-flex justify-space-between align-center">
        <div class="d-flex align-center gap-2">
          <v-icon size="30" color="#009199" class="mr-2">mdi-chart-bar</v-icon>
          <h1 class="text-h5 font-weight-bold">รายงานคำขอเข้ารับบริการ</h1>
        </div>
        <v-select :items="periodOptions" v-model="selectedPeriod" label="เลือกช่วงเวลา" density="comfortable"
          variant="outlined" color="#009199" style="max-width: 200px;" />
      </v-col>
    </v-row>

    <!-- Summary Cards -->
    <v-row class="d-flex flex-wrap justify-center" style="gap: 24px;">
      <div v-for="(item, index) in summaryCards" :key="index" style="width: 220px;">
        <v-card class="pa-4 text-center" :style="{ backgroundColor: item.color }">
          <div class="caption d-flex align-center justify-center mb-1">
            <v-icon size="20" color="white" class="mr-1">{{ item.icon }}</v-icon>
            <span style="color: white !important;">{{ item.label }}</span>
          </div>
          <div class="text-h4 font-weight-bold" style="color: white;">
            {{ item.value }}
          </div>
        </v-card>
      </div>
    </v-row>

    <!-- Bar Charts -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="pa-4">
          <div class="d-flex align-center mb-2">
            <v-icon size="20" color="#009199" class="mr-2">mdi-check-circle</v-icon>
            <h3 class="subtitle-1 mb-0">จำนวนคำขอบริการที่เสร็จสิ้น</h3>
          </div>
          <Bar :data="barChartCompletedTypeData" :options="barChartOptions" style="height:300px" />
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card class="pa-4">
          <div class="d-flex align-center mb-2">
            <v-icon size="20" color="#009199" class="mr-2">mdi-folder-multiple</v-icon>
            <h3 class="subtitle-1 mb-0">ประเภทคำขอบริการ</h3>
          </div>
          <Bar :data="barChartServiceTypeData" :options="barChartOptions" style="height:300px" />
        </v-card>
      </v-col>
    </v-row>

    <!-- Bar Charts by day/time -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="pa-4">
          <h3 class="subtitle-1 mb-2">แยกตามวัน</h3>
          <Bar :data="barChartDayData" :options="barChartOptions" style="height:300px" />
        </v-card>
      </v-col>
      <v-col cols="12" md="6">
        <v-card class="pa-4">
          <h3 class="subtitle-1 mb-2">แยกตามเวลา</h3>
          <Bar :data="barChartTimeData" :options="barChartOptions" style="height:300px" />
        </v-card>
      </v-col>
    </v-row>
  </v-container>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import axios from 'axios'
import { Bar } from 'vue-chartjs'
import ChartDataLabels from 'chartjs-plugin-datalabels'
import {
  Chart as ChartJS,
  Title, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement
} from 'chart.js'

ChartJS.register(
  Title, Tooltip, Legend, CategoryScale, LinearScale,
  BarElement, ChartDataLabels
)

// period filter
const periodOptions = [
  'ทั้งหมด',
  'สัปดาห์นี้',
  'สัปดาห์ที่ผ่านมา',
  'เดือนนี้',
  'เดือนที่ผ่านมา',
  'ปีนี้ (จนถึงปัจจุบัน)'
]
const selectedPeriod = ref(periodOptions[0])
const serviceRequestLabel = computed(() =>
  `จำนวนคำขอเข้ารับบริการ${selectedPeriod.value}`
)

// dashboard data
const dashboardData = ref({
  summary: {},
  serviceTypes: [],
  byDay: [],
  byTime: [],
})

const loadDashboardData = async () => {
  try {
    const res = await axios.get('http://localhost:3000/api/dashboard', {
      params: { period: selectedPeriod.value }
    })
    dashboardData.value = res.data
  } catch (err) {
    console.error('❌ โหลด dashboard ล้มเหลว:', err)
  }
}

onMounted(loadDashboardData)
watch(selectedPeriod, loadDashboardData)

// summary card info
const summaryCards = computed(() => [
  {
    label: 'คำขอทั้งหมด',
    icon: 'mdi-clipboard-list',
    color: '#009199',
    value: dashboardData.value.summary.total || 0
  },
  {
    label: 'รอดำเนินการ',
    icon: 'mdi-timer-sand',
    color: '#E1BF63',
    value: dashboardData.value.summary.pending || 0
  },
  {
    label: 'อนุมัติแล้ว',
    icon: 'mdi-check-circle',
    color: 'green',
    value: dashboardData.value.summary.approved || 0
  },
  {
    label: 'ให้คำปรึกษาเสร็จสิ้น',
    icon: 'mdi-check-decagram',
    color: '#8BADD3',
    value: dashboardData.value.summary.completed || 0
  },
  {
    label: 'ถูกปฏิเสธ',
    icon: 'mdi-close-circle',
    color: 'red',
    value: dashboardData.value.summary.rejected || 0
  },
  {
    label: 'ยกเลิก',
    icon: 'mdi-cancel',
    color: 'grey',
    value: dashboardData.value.summary.cancelled || 0
  }
])

// สีตามประเภท
const labelColorMap = {
  'ขอรับการปรึกษาด้านการใช้ชีวิต และสุขภาพจิต': '#4CAF50',
  'ขอรับการปรึกษาด้านการเรียน': '#8BADD3',
  'ระบายความรู้สึกต่างๆ': '#F44336',
  'อื่น ๆ': '#E1BF63'
}

// ย่อชื่อให้อ่านง่ายบนแกน X
const shortLabelMap = {
  'ขอรับการปรึกษาด้านการใช้ชีวิต และสุขภาพจิต': 'ชีวิตและสุขภาพ',
  'ขอรับการปรึกษาด้านการเรียน': 'การเรียน',
  'ระบายความรู้สึกต่างๆ': 'ระบายความรู้สึก',
  'อื่น ๆ': 'อื่นๆ'
}

// แผนภูมิแท่ง - ประเภทที่ "เสร็จสิ้น"
const barChartCompletedTypeData = computed(() => {
  const items = dashboardData.value.serviceTypes || []
  return {
    labels: items.map(i => shortLabelMap[i.service_type?.trim()] || i.service_type?.trim()),
    datasets: [{
      label: 'เสร็จสิ้น',
      backgroundColor: items.map(i => labelColorMap[i.service_type?.trim()] || '#ccc'),
      data: items.map(i => i.countCompleted || 0)
    }]
  }
})
// แผนภูมิแท่ง - ประเภท "ทั้งหมด"
const barChartServiceTypeData = computed(() => {
  const items = dashboardData.value.serviceTypes || []
  return {
    labels: items.map(i => shortLabelMap[i.service_type?.trim()] || i.service_type?.trim()),
    datasets: [{
      label: 'คำขอทั้งหมด',
      backgroundColor: items.map(i => labelColorMap[i.service_type?.trim()] || '#ccc'),
      data: items.map(i => i.count || 0)
    }]
  }
})

// กราฟแยกตามวัน
const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const thaiDays = {
  Monday: 'จันทร์', Tuesday: 'อังคาร', Wednesday: 'พุธ',
  Thursday: 'พฤหัสบดี', Friday: 'ศุกร์', Saturday: 'เสาร์', Sunday: 'อาทิตย์'
}
const barChartDayData = computed(() => {
  const map = Object.fromEntries(dashboardData.value.byDay.map(i => [i.day, i.count]))
  return {
    labels: dayOrder.map(d => thaiDays[d]),
    datasets: [{
      label: 'การสร้างรายการจอง',
      backgroundColor: '#009199',
      data: dayOrder.map(d => map[d] || 0)
    }]
  }
})

// กราฟแยกตามเวลา
const fixedTimeSlots = [
  '09:00–10:30',
  '10:30–12:00',
  '13:00–14:30',
  '14:30–16:00',
]

const barChartTimeData = computed(() => {
  const timeMap = Object.fromEntries(
    (dashboardData.value.byTime || []).map(i => [
      i.time.trim().replaceAll(' ', '').replaceAll('-', '–'),
      i.count
    ])
  )

  return {
    labels: fixedTimeSlots, 
    datasets: [{
      label: 'การสร้างรายการจอง',
      backgroundColor: '#009199',
      data: fixedTimeSlots.map(time => timeMap[time] || 0),
    }]
  }
})


// chart options
const barChartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    datalabels: {
      display: true,
      color: '#000',
      anchor: 'end',
      align: 'end',
      offset: 6,
      font: {
        weight: 'bold',
        size: 14
      },
      formatter: value => value
    }
  },
  scales: {
    y: {
      beginAtZero: true,
      ticks: { precision: 0 },
      afterDataLimits: (scale) => {
        scale.max += 1  //เพิ่มจาก max จริง ไปอีก 1
      }
    }
  }
}

</script>

<style scoped>
.text-right {
  text-align: right;
}
</style>
