<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import Badge from '@/components/Badge.vue'
import { api } from '@/lib/api'
import { fecha, fechaHora } from '@/lib/format'
import { error } from '@/lib/toast'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type R = Record<string, any>
const d = ref<R | null>(null)
onMounted(async () => { try { d.value = await api('/dashboard') } catch (e) { error(e) } })
const total = (l: R[] = []) => l.reduce((s, x) => s + x.n, 0)
</script>

<template>
  <div v-if="!d" class="text-slate-500">Cargando…</div>

  <!-- Archivista / Administrador -->
  <div v-else-if="d.tipo === 'ARCHIVO'" class="space-y-4">
    <div class="grid gap-4 md:grid-cols-4">
      <div class="card md:col-span-2">
        <div class="label">Capacidad ocupacional del depósito</div>
        <div class="text-3xl font-bold">{{ d.ocupacion.porcentaje }}%</div>
        <div class="mt-2 h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
          <div class="h-full rounded-full" :class="d.ocupacion.porcentaje > 90 ? 'bg-rose-500' : 'bg-emerald-500'" :style="{ width: Math.min(100, d.ocupacion.porcentaje) + '%' }" />
        </div>
        <div class="mt-2 text-xs text-slate-500 dark:text-slate-400">{{ d.ocupacion.cajasUsadas }} de {{ d.ocupacion.capacidadCajas }} cajas · {{ d.ocupacion.expedientesEnArchivo }} expedientes en archivo</div>
      </div>
      <div class="card"><div class="label">Transferencias pendientes</div><div class="text-3xl font-bold">{{ d.transferenciasPendientes.length }}</div></div>
      <div class="card"><div class="label">Préstamos vencidos</div><div class="text-3xl font-bold" :class="d.prestamosVencidos.length ? 'text-rose-600' : ''">{{ d.prestamosVencidos.length }}</div></div>
    </div>

    <div class="grid gap-4 lg:grid-cols-2">
      <section class="card">
        <h2 class="mb-2 font-semibold">Transferencias pendientes de aprobación</h2>
        <p v-if="!d.transferenciasPendientes.length" class="text-sm text-slate-500">Sin transferencias pendientes.</p>
        <RouterLink v-for="t in d.transferenciasPendientes" :key="t.id" to="/transferencias" class="flex items-center justify-between border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-700">
          <span><strong>{{ t.codigo }}</strong> · {{ t.unidad }} · {{ t.expedientes }} exp.</span><Badge :valor="t.estado" />
        </RouterLink>
      </section>
      <section class="card">
        <h2 class="mb-2 font-semibold">Préstamos vencidos</h2>
        <p v-if="!d.prestamosVencidos.length" class="text-sm text-slate-500">Ningún préstamo en mora.</p>
        <RouterLink v-for="p in d.prestamosVencidos" :key="p.id" to="/prestamos" class="flex items-center justify-between border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-700">
          <span><strong>{{ p.codigo }}</strong> · {{ p.solicitante }}<span class="block text-xs text-slate-500">{{ p.expediente }}</span></span><span class="font-medium text-rose-600">{{ p.diasMora }} día(s)</span>
        </RouterLink>
      </section>
      <section class="card">
        <div class="mb-2 flex items-center justify-between"><h2 class="font-semibold">Alertas de disposición final</h2><RouterLink to="/disposicion" class="text-xs text-emerald-700 hover:underline dark:text-emerald-300">Gestionar →</RouterLink></div>
        <p v-if="!d.alertasDisposicion.length" class="text-sm text-slate-500">Ningún expediente cumplió su plazo de retención.</p>
        <RouterLink v-for="a in d.alertasDisposicion" :key="a.id" :to="`/expedientes/${a.id}`" class="block border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-700">
          <strong>{{ a.codigo }}</strong> <span class="text-slate-500">· {{ a.asunto }}</span>
          <div class="text-xs text-amber-600 dark:text-amber-300">Plazo cumplido en {{ a.anioCumplimiento }} → {{ a.disposicionFinal.replaceAll('_', ' ').toLowerCase() }}</div>
        </RouterLink>
      </section>
      <section class="card">
        <h2 class="mb-2 font-semibold">Expedientes recién foliados</h2>
        <p v-if="!d.recienFoliados.length" class="text-sm text-slate-500">Todavía no hay expedientes foliados.</p>
        <RouterLink v-for="e in d.recienFoliados" :key="e.id" :to="`/expedientes/${e.id}`" class="flex justify-between border-t border-slate-100 py-2 text-sm first:border-0 dark:border-slate-700">
          <span><strong>{{ e.codigo }}</strong> · {{ e.fojaFin }} fojas</span><span class="text-xs text-slate-500">{{ fechaHora(e.fecha) }}</span>
        </RouterLink>
      </section>
    </div>
  </div>

  <!-- Responsable de unidad -->
  <div v-else-if="d.tipo === 'UNIDAD'" class="space-y-4">
    <div class="grid gap-4 md:grid-cols-3">
      <section class="card">
        <h2 class="mb-2 font-semibold">Mis expedientes en custodia ({{ total(d.misExpedientes) }})</h2>
        <p v-if="!d.misExpedientes.length" class="text-sm text-slate-500">Aún no tienes expedientes.</p>
        <div v-for="x in d.misExpedientes" :key="x.estado" class="flex items-center justify-between py-1 text-sm"><Badge :valor="x.estado" /><strong>{{ x.n }}</strong></div>
        <RouterLink to="/expedientes" class="btn-ghost mt-3 w-full">Ver expedientes</RouterLink>
      </section>
      <section class="card">
        <h2 class="mb-2 font-semibold">Transferencias en borrador ({{ d.transferenciasBorrador.length }})</h2>
        <p v-if="!d.transferenciasBorrador.length" class="text-sm text-slate-500">No tienes borradores.</p>
        <RouterLink v-for="t in d.transferenciasBorrador" :key="t.id" to="/transferencias" class="block border-t border-slate-100 py-1.5 text-sm first:border-0 dark:border-slate-700"><strong>{{ t.codigo }}</strong></RouterLink>
      </section>
      <section class="card">
        <h2 class="mb-2 font-semibold">Estado de mis préstamos ({{ total(d.prestamos) }})</h2>
        <p v-if="!d.prestamos.length" class="text-sm text-slate-500">Sin préstamos solicitados.</p>
        <div v-for="x in d.prestamos" :key="x.estado" class="flex items-center justify-between py-1 text-sm"><Badge :valor="x.estado" /><strong>{{ x.n }}</strong></div>
        <RouterLink to="/prestamos" class="btn-ghost mt-3 w-full">Ver préstamos</RouterLink>
      </section>
    </div>
  </div>

  <!-- Consultor -->
  <div v-else class="card max-w-md">
    <h2 class="mb-2 font-semibold">Expedientes públicos o auditables ({{ total(d.expedientesPublicos) }})</h2>
    <div v-for="x in d.expedientesPublicos" :key="x.estado" class="flex items-center justify-between py-1 text-sm"><Badge :valor="x.estado" /><strong>{{ x.n }}</strong></div>
    <p class="mt-2 text-xs text-slate-500">Acceso de solo lectura. Última consulta: {{ fecha(new Date().toISOString()) }}</p>
  </div>
</template>
