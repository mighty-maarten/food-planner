<script setup lang="ts">
import { useRoute } from 'vue-router';
import DefaultLayout from './layouts/DefaultLayout.vue';

const route = useRoute();
</script>

<template>
    <component :is="route.meta.layout ?? DefaultLayout" />
</template>
