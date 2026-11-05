<script setup lang="ts">
import { ref, watch } from 'vue'
import Modal from './Modal.vue'

const props = defineProps<{ abierto: boolean; titulo: string; etiqueta: string; tipo?: 'text' | 'number'; requerido?: boolean; inicial?: string; boton?: string }>()
const emit = defineEmits<{ cerrar: []; aceptar: [valor: string] }>()
const valor = ref('')
watch(() => props.abierto, (a) => { if (a) valor.value = props.inicial ?? '' })
</script>

<template>
  <Modal :abierto="abierto" :titulo="titulo" @cerrar="emit('cerrar')">
    <label class="label">{{ etiqueta }}</label>
    <textarea v-if="(tipo ?? 'text') === 'text'" v-model="valor" class="input" rows="3" />
    <input v-else v-model="valor" type="number" min="1" class="input" />
    <div class="mt-4 flex justify-end gap-2">
      <button class="btn-ghost" @click="emit('cerrar')">Cancelar</button>
      <button class="btn-primary" :disabled="requerido && !valor.trim()" @click="emit('aceptar', valor.trim())">{{ boton ?? 'Aceptar' }}</button>
    </div>
  </Modal>
</template>
