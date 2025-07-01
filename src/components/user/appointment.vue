<template>
  <v-app>
    <v-main>
      <v-container max-width="600px">
        <h2 class="text-h5 text-center mb-6 font-weight-bold">
          {{ t("title") }}
        </h2>

        <v-text-field
          v-model="form.date"
          :label="t('date')"
          type="date"
          variant="outlined"
          density="comfortable"
          required
        />

        <v-select
          v-model="form.time"
          :label="t('time')"
          :items="timeOptions"
          variant="outlined"
          density="comfortable"
          required
        />

        <v-radio-group
          v-model="form.nationality"
          :label="t('nationality')"
          class="mt-4"
        >
          <v-radio :label="t('thai')" value="ไทย" />
          <v-radio :label="t('foreign')" value="ต่างชาติ" />
        </v-radio-group>

        <v-radio-group
          v-model="form.channel"
          :label="t('channel')"
          class="mt-4"
        >
          <v-radio
            v-for="option in channelOptions"
            :key="option"
            :label="option"
            :value="option"
          />
        </v-radio-group>

        <v-text-field
          v-model="form.phone"
          :label="t('phone')"
          type="tel"
          variant="outlined"
          density="comfortable"
          required
        />

        <v-radio-group
          v-model="form.serviceType"
          :label="t('service_type')"
          class="mt-4"
        >
          <v-radio :label="t('life')" value="life" />
          <v-radio :label="t('study')" value="study" />
          <v-radio :label="t('emotion')" value="emotion" />
          <v-radio :label="t('other')" value="other" />
        </v-radio-group>

        <v-text-field
          v-if="form.serviceType === 'other'"
          v-model="form.otherService"
          :label="t('specify')"
          variant="outlined"
          density="comfortable"
        />

        <v-btn
          class="mt-6"
          color="#009199"
          variant="flat"
          size="large"
          block
          @click="submitForm"
        >
          {{ t("submit") }}
        </v-btn>
      </v-container>
    </v-main>
  </v-app>
</template>

<script setup>
import { ref, computed, defineProps } from "vue";

const props = defineProps({
  lang: {
    type: String,
    default: "th",
  },
});

const lang = computed(() =>
  ["th", "en"].includes(props.lang) ? props.lang : "th"
);

const translations = {
  th: {
    title: "จองคิวเข้ารับการปรึกษา",
    date: "วันที่ สะดวกในการรับบริการ*",
    time: "เวลาสะดวกในการรับบริการ*",
    nationality: "สัญชาติ*",
    thai: "นักศึกษาไทย",
    foreign: "นักศึกษาต่างชาติ",
    channel: "ช่องทางการรับบริการ*",
    on_site: "อาคาร C1 ห้อง 112",
    online: "ออนไลน์",
    msquare: "M4U (ตึก M-square)",
    phone: "หมายเลขโทรศัพท์*",
    service_type: "ประเภทการบริการ*",
    life: "ขอรับการปรึกษาด้านการใช้ชีวิต และสุขภาพจิต",
    study: "ขอรับการปรึกษาด้านการเรียน",
    emotion: "ระบายความรู้สึกต่างๆ",
    other: "อื่น ๆ",
    specify: "กรุณาพิมพ์ตัวเลือกอื่นที่นี่",
    submit: "ยืนยัน",
  },
  en: {
    title: "Booking Counseling Appointment",
    date: "Preferred Date*",
    time: "Preferred Time*",
    nationality: "Nationality*",
    thai: "Thai Student",
    foreign: "International Student",
    channel: "Service Channel*",
    on_site: "Building C1 Room 112",
    online: "Online",
    msquare: "M4U (M-square building)",
    phone: "Phone Number*",
    service_type: "Service Type*",
    life: "Request for life and mental health consultation",
    study: "Request for academic consultation",
    emotion: "Vent your feelings",
    other: "Other",
    specify: "Please specify other",
    submit: "Submit",
  },
};

const t = (key) =>
  computed(() => translations[lang.value]?.[key] ?? `[${key}]`).value;

const form = ref({
  date: "",
  time: "",
  nationality: "",
  channel: "",
  phone: "",
  serviceType: "",
  otherService: "",
});

const timeOptions = [
  "09.00 - 10.30 น.",
  "10.30 - 12.00 น.",
  "13.00 - 14.30 น.",
  "14.30 - 16.00 น.",
];

const channelOptions = computed(() => {
  if (form.value.nationality === "ต่างชาติ") {
    return [translations[lang.value].msquare];
  }
  return [
    translations[lang.value].on_site,
    translations[lang.value].online,
  ];
});

const submitForm = () => {
  if (!form.value.date || !form.value.time || !form.value.phone) {
    alert(
      lang.value === "th"
        ? "กรุณากรอกข้อมูลให้ครบถ้วน"
        : "Please fill out all required fields"
    );
    return;
  }
  console.log("Form Submitted:", form.value);
  alert(
    lang.value === "th"
      ? "ส่งแบบฟอร์มเรียบร้อยแล้ว!"
      : "Form submitted successfully!"
  );
};
</script>
