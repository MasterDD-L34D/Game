<template>
  <section class="flow-view">
    <NebulaProgressModule
      :header="moduleState.header"
      :cards="moduleState.cards"
      :timeline-entries="moduleState.timelineEntries"
      :evolution-matrix="moduleState.evolutionMatrix"
      :share="moduleState.share"
    />
  </section>
</template>

<script setup>
import { toRefs } from 'vue';
import NebulaProgressModule from '../components/flow/NebulaProgressModule.vue';
import { useNebulaProgressModule } from '../modules/useNebulaProgressModule';

const props = defineProps({
  overview: {
    type: Object,
    required: true,
  },
  timeline: {
    type: Object,
    required: true,
  },
  qualityRelease: {
    type: Object,
    default: () => ({}),
  },
});

const { overview, timeline, qualityRelease } = toRefs(props);

const moduleState = useNebulaProgressModule({
  overview,
  timeline,
  qualityRelease,
});
</script>

<style scoped>
.flow-view {
  display: grid;
}
</style>
