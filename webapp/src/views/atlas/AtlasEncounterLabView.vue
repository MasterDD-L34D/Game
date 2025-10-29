<template>
  <section class="atlas-encounter">
    <header class="atlas-encounter__header">
      <h3>Encounter Lab</h3>
      <p>
        Varianti Nebula già filtrate per il laboratorio incontri. Ogni scenario eredita slot e squadre dalla pipeline QA e
        mette in evidenza approvazioni mancanti.
      </p>
    </header>

    <div class="atlas-encounter__grid">
      <article v-for="encounter in encounters" :key="encounter.id" class="atlas-encounter__card">
        <header>
          <div>
            <h4>{{ encounter.name }}</h4>
            <p class="atlas-encounter__focus">{{ encounter.focus }}</p>
          </div>
          <span class="atlas-encounter__badge" :data-state="badgeState(encounter.readiness)">
            {{ encounter.readiness }}
          </span>
        </header>
        <dl class="atlas-encounter__meta" aria-label="Parametri">
          <div>
            <dt>Biome</dt>
            <dd>{{ encounter.biomeId }}</dd>
          </div>
          <div>
            <dt>Cadenza</dt>
            <dd>{{ encounter.cadence }}</dd>
          </div>
          <div>
            <dt>Densità</dt>
            <dd>{{ encounter.density }}</dd>
          </div>
          <div>
            <dt>Ingressi</dt>
            <dd>{{ encounter.entryPoints.join(', ') }}</dd>
          </div>
        </dl>
        <section class="atlas-encounter__squads" aria-label="Squadre">
          <article v-for="squad in encounter.squads" :key="`${encounter.id}-${squad.role}`">
            <h5>{{ squad.role }}</h5>
            <ul>
              <li v-for="unit in squad.units" :key="unit">{{ unit }}</li>
            </ul>
          </article>
        </section>
        <footer class="atlas-encounter__footer">
          <div class="atlas-encounter__approvals" aria-label="Approvazioni">
            <strong>Approvazioni richieste</strong>
            <ul>
              <li v-for="approval in encounter.approvals" :key="approval">{{ approval }}</li>
            </ul>
          </div>
          <button type="button" class="atlas-encounter__notify" @click="emitNotification(encounter)">
            Notifica team QA
          </button>
        </footer>
      </article>
    </div>
  </section>
</template>

<script setup>
import { computed } from 'vue';

const emit = defineEmits(['notify']);

const props = defineProps({
  dataset: {
    type: Object,
    required: true,
  },
});

const encounters = computed(() => (Array.isArray(props.dataset.encounters) ? props.dataset.encounters : []));

function badgeState(readiness) {
  if (!readiness) return 'unknown';
  const normalised = readiness.toLowerCase();
  if (normalised.includes('approvazione')) return 'pending';
  if (normalised.includes('monitoraggio')) return 'progress';
  if (normalised.includes('staging') || normalised.includes('pronto')) return 'ready';
  return 'info';
}

function emitNotification(encounter) {
  emit('notify', {
    id: encounter.id,
    name: encounter.name,
    readiness: encounter.readiness,
    approvals: encounter.approvals,
  });
}
</script>

<style scoped>
.atlas-encounter {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.atlas-encounter__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: rgba(15, 23, 42, 0.75);
}

.atlas-encounter__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(20rem, 1fr));
  gap: 1.75rem;
}

.atlas-encounter__card {
  padding: 2rem;
  border-radius: 1.35rem;
  background: radial-gradient(circle at 0% 0%, rgba(30, 64, 175, 0.18), transparent 55%),
    radial-gradient(circle at 100% 0%, rgba(124, 58, 237, 0.18), transparent 55%),
    rgba(15, 23, 42, 0.92);
  color: #f8fafc;
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.35);
  border: 1px solid rgba(96, 165, 250, 0.2);
}

.atlas-encounter__card header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.atlas-encounter__focus {
  margin: 0.4rem 0 0;
  font-size: 0.95rem;
  color: rgba(224, 231, 255, 0.78);
}

.atlas-encounter__badge {
  padding: 0.35rem 0.85rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  background: rgba(96, 165, 250, 0.15);
  color: #bfdbfe;
  text-transform: uppercase;
}

.atlas-encounter__badge[data-state='pending'] {
  background: rgba(251, 191, 36, 0.22);
  color: #fef3c7;
}

.atlas-encounter__badge[data-state='ready'] {
  background: rgba(74, 222, 128, 0.2);
  color: #bbf7d0;
}

.atlas-encounter__badge[data-state='progress'] {
  background: rgba(129, 140, 248, 0.18);
  color: #ddd6fe;
}

.atlas-encounter__meta {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(9rem, 1fr));
  gap: 0.75rem;
}

.atlas-encounter__meta div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  color: rgba(226, 232, 240, 0.8);
}

.atlas-encounter__meta dt {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(191, 219, 254, 0.75);
}

.atlas-encounter__meta dd {
  margin: 0;
  font-weight: 600;
}

.atlas-encounter__squads {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(10rem, 1fr));
  gap: 1rem;
}

.atlas-encounter__squads article {
  padding: 1rem;
  border-radius: 0.85rem;
  background: rgba(30, 58, 138, 0.35);
  border: 1px solid rgba(96, 165, 250, 0.18);
}

.atlas-encounter__squads h5 {
  margin: 0 0 0.5rem;
  font-size: 0.8rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: rgba(191, 219, 254, 0.85);
}

.atlas-encounter__squads ul {
  margin: 0;
  padding-left: 1.2rem;
  color: rgba(224, 231, 255, 0.85);
}

.atlas-encounter__footer {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  align-items: center;
  justify-content: space-between;
}

.atlas-encounter__approvals {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.atlas-encounter__approvals strong {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.12em;
  color: rgba(191, 219, 254, 0.75);
}

.atlas-encounter__approvals ul {
  margin: 0;
  padding-left: 1.2rem;
  color: rgba(224, 231, 255, 0.85);
}

.atlas-encounter__notify {
  padding: 0.55rem 1.4rem;
  border-radius: 999px;
  border: 1px solid rgba(129, 140, 248, 0.45);
  background: rgba(129, 140, 248, 0.16);
  color: #ede9fe;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  cursor: pointer;
  transition: background 0.18s ease, transform 0.18s ease;
}

.atlas-encounter__notify:hover {
  background: rgba(99, 102, 241, 0.3);
  transform: translateY(-1px);
}
</style>
