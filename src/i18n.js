// src/i18n.js
import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import th from './locales/th.json'

const STORAGE_KEY = 'app-locale'
const browser = (navigator.language || '').toLowerCase().startsWith('th') ? 'th' : 'en'
const saved = localStorage.getItem(STORAGE_KEY)
const start = saved === 'th' ? 'th' : saved === 'en' ? 'en' : browser

export const i18n = createI18n({
  legacy: false,
  locale: start,
  fallbackLocale: 'en',
  messages: { en, th }
})

export function setLocale(l) {
  if (l !== 'th' && l !== 'en') return
  i18n.global.locale.value = l
  localStorage.setItem(STORAGE_KEY, l)
}
