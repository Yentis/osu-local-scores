<template>
  <q-layout view="lHh Lpr lFf">
    <Header />

    <q-page-container>
      <router-view />
    </q-page-container>
  </q-layout>
</template>

<script lang="ts">
import { defineComponent } from 'vue'
import Header from 'src/components/Header.vue'

export default defineComponent({
  components: {
    Header
  }
})
</script>
