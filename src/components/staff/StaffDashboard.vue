<template>
  <v-container class="py-6">
    <!-- ✅ Header -->
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

    <!-- ✅ Summary Numbers -->
    <v-row class="justify-center">
      <v-col cols="6" md="4">
        <v-card class="pa-4 text-center">
          <div class="caption d-flex align-center justify-center mb-1">
            <v-icon size="20" color="#009199" class="mr-1">mdi-clipboard-list</v-icon>
            จำนวนคำขอเข้ารับบริการทั้งหมด
          </div>
          <div class="text-h4 font-weight-bold" style="color: #009199;">200</div>
        </v-card>
      </v-col>

      <v-col cols="6" md="4">
        <v-card class="pa-4 text-center">
          <div class="caption d-flex align-center justify-center mb-1">
            <v-icon size="20" color="#009199" class="mr-1">mdi-calendar-week</v-icon>
            {{ serviceRequestLabel }}
          </div>
          <div class="text-h4 font-weight-bold" style="color: #009199;">40</div>
        </v-card>
      </v-col>
    </v-row>

    <!-- ✅ Line Chart -->
    <v-row class="justify-center">
      <v-col cols="12" md="8">
        <v-card class="pa-4">
          <!-- หัวข้อพร้อมไอคอน -->
          <div class="d-flex align-center justify-center mb-2">
            <v-icon size="20" color="#009199" class="mr-2">mdi-chart-line</v-icon>
            <h3 class="subtitle-1 mb-0 font-weight-bold">คำขอบริการยอดนิยม</h3>
          </div>

          <!-- Line Chart -->
          <Line :data="lineChartData" :options="lineChartOptions" style="height:300px" />
        </v-card>
      </v-col>
    </v-row>

    <!-- ✅ Pie Charts -->
    <v-row>
      <v-col cols="12" md="6">
        <v-card class="pa-4">
          <!-- หัวข้อพร้อมไอคอน ชิดซ้าย -->
          <div class="d-flex align-center mb-2">
            <v-icon size="20" color="#009199" class="mr-2">mdi-check-circle</v-icon>
            <h3 class="subtitle-1 mb-0">จำนวนคำขอบริการที่เสร็จสิ้น</h3>
          </div>
          <Pie :data="pieChartData1" :options="pieChartOptions" style="height:300px" />
        </v-card>
      </v-col>


      <v-col cols="12" md="6">
        <v-card class="pa-4">
          <!-- หัวข้อพร้อมไอคอน ชิดซ้าย -->
          <div class="d-flex align-center mb-2">
            <v-icon size="20" color="#009199" class="mr-2">mdi-folder-multiple</v-icon>
            <h3 class="subtitle-1 mb-0">ประเภทคำขอบริการ</h3>
          </div>
          <Pie :data="pieChartData2" :options="pieChartOptions" style="height:300px" />
        </v-card>
      </v-col>
    </v-row>

    <!-- ✅ Bar Charts -->
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
import { ref, computed, watch } from 'vue'
import { Line, Pie, Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
} from 'chart.js'

ChartJS.register(
  Title,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement
)

const periodOptions = [
  'สัปดาห์นี้',
  'สัปดาห์ที่ผ่านมา',
  'เดือนนี้',
  'เดือนที่ผ่านมา',
  'ปีนี้ (จนถึงปัจจุบัน)'
]
const selectedPeriod = ref(periodOptions[0])
const serviceRequestLabel = computed(() => `จำนวนคำขอเข้ารับบริการ${selectedPeriod.value}`)

watch(selectedPeriod, val => {
  console.log('selectedPeriod:', val)
  console.log('serviceRequestLabel:', serviceRequestLabel.value)
})

// Line Chart Data
const lineChartData = {
  labels: ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.'],
  datasets: [
    {
      label: 'ด้านการเรียน',
      borderColor: '#009199',
      data: [50, 40, 30, 20, 10],
      fill: false,
    },
    {
      label: 'ด้านการใช้ชีวิต',
      borderColor: '##109100',
      data: [40, 35, 25, 15, 5],
      fill: false,
    },
    {
      label: 'ระบายความรู้สึก',
      borderColor: '#d50000',
      data: [30, 25, 20, 10, 2],
      fill: false,
    },
    {
      label: 'อื่นๆ',
      borderColor: '#009100',
      data: [15, 17, 10, 5, 1],
      fill: false,
    },
  ],
}

const lineChartOptions = {
  responsive: true,
  plugins: { legend: { position: 'bottom' } },
}

// Pie Charts
const pieChartData1 = {
  labels: ['ด้านการเรียน', 'ด้านการใช้ชีวิต', 'ระบายความรู้สึก', 'อื่นๆ'],
  datasets: [
    {
      backgroundColor: ['#F2C894', '#F7D9AE', '#E6AFA3', '#D8C3A5'],
      data: [56, 64, 68, 17],
    },
  ],
}

const pieChartData2 = {
  labels: ['ด้านการเรียน', 'ด้านการใช้ชีวิต', 'ระบายความรู้สึก', 'อื่นๆ'],
  datasets: [
    {
      backgroundColor: ['#90B4CA', '#91C7B1', '#A6A6CC', '#BFCFD6'],
      data: [55, 62, 68, 17],
    },
  ],
}

const pieChartOptions = {
  responsive: true,
  plugins: {
    legend: { position: 'bottom' },
    tooltip: {
      callbacks: {
        label: (context) => `${context.label}: ${context.raw}`,
      },
    },
  },
}

// Bar Charts
const barChartDayData = {
  labels: ['จันทร์', 'อังคาร', 'พุธ', 'พฤหัสบดี', 'ศุกร์'],
  datasets: [
    {
      label: 'การสร้างรายการจอง',
      backgroundColor: '#009199',
      data: [9, 5, 1, 2, 6],
    },
  ],
}

const barChartTimeData = {
  labels: ['09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '18:00'],
  datasets: [
    {
      label: 'การสร้างรายการจอง',
      backgroundColor: '#009199',
      data: [1, 1, 2, 3, 2, 1, 1],
    },
  ],
}

const barChartOptions = {
  responsive: true,
  plugins: { legend: { display: false } },
  scales: { y: { beginAtZero: true } },
}
</script>

<style scoped>
.text-right {
  text-align: right;
}
</style>