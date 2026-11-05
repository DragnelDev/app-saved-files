import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useTema = defineStore('tema', () => {
  const oscuro = ref(document.documentElement.classList.contains('dark'))
  function alternar() {
    oscuro.value = !oscuro.value
    document.documentElement.classList.toggle('dark', oscuro.value)
    localStorage.setItem('tema', oscuro.value ? 'oscuro' : 'claro')
  }
  return { oscuro, alternar }
})
