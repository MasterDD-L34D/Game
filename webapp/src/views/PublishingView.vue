<template>
  <section class="flow-view">
    <header class="flow-view__header">
      <h2>Publishing & Deliverable</h2>
      <p>Stato di confezionamento dei materiali e canali di uscita.</p>
    </header>
    <div class="flow-view__grid">
      <article class="flow-card">
        <h3 class="flow-card__title">Artefatti</h3>
        <p class="flow-card__body">
          {{ publishing.artifactsReady }} asset pronti su {{ publishing.totalArtifacts }} previsti.
        </p>
      </article>
      <article class="flow-card">
        <h3 class="flow-card__title">Canali</h3>
        <ul>
          <li v-for="channel in publishing.channels" :key="channel">{{ channel }}</li>
        </ul>
      </article>
      <article class="flow-card flow-card--action">
        <h3 class="flow-card__title">Prossime azioni</h3>
        <p class="flow-card__body">Coordinare il QA narrativo e validare la sincronizzazione media.</p>
      </article>
    </div>

    <section class="publishing-workflow">
      <header>
        <h3>Workflow di pubblicazione</h3>
        <p>Anteprima, approvazione e deploy con stato aggiornato e referenti di riferimento.</p>
      </header>
      <div class="publishing-workflow__steps">
        <article
          v-for="step in workflowSteps"
          :key="step.id"
          :class="['publishing-step', `publishing-step--${step.status}`]"
        >
          <header>
            <h4>{{ step.title }}</h4>
            <span class="publishing-step__status">{{ statusLabel(step.status) }}</span>
          </header>
          <p>{{ step.notes }}</p>
          <footer>
            <span class="publishing-step__meta">Owner · {{ step.owner }}</span>
            <span class="publishing-step__meta">ETA · {{ step.eta }}</span>
          </footer>
        </article>
      </div>
    </section>

    <div class="publishing-updates">
      <section class="publishing-timeline">
        <header>
          <h3>Cronologia release</h3>
          <p>Eventi recenti e milestone approvate per il pacchetto corrente.</p>
        </header>
        <ul>
          <li v-for="entry in historyEntries" :key="entry.id">
            <div>
              <strong>{{ entry.label }}</strong>
              <p>{{ entry.details }}</p>
            </div>
            <footer>
              <span>{{ entry.author }}</span>
              <time>{{ entry.timestamp }}</time>
            </footer>
          </li>
        </ul>
      </section>
      <section class="publishing-notifications">
        <header>
          <h3>Notifiche team</h3>
          <p>Avvisi inviati a stakeholder e canali di comunicazione.</p>
        </header>
        <ul>
          <li v-for="notification in notificationEntries" :key="notification.id">
            <div>
              <strong>{{ notification.channel }}</strong>
              <p>{{ notification.message }}</p>
            </div>
            <footer>
              <span v-if="notification.recipients?.length">{{ notification.recipients.join(', ') }}</span>
              <time>{{ notification.time }}</time>
            </footer>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>

<script setup>
import { computed, toRefs } from 'vue';

const props = defineProps({
  publishing: {
    type: Object,
    required: true,
  },
});

const { publishing } = toRefs(props);

const workflowSteps = computed(() => {
  const workflow = publishing.value.workflow || {};
  return [
    {
      id: 'preview',
      title: 'Anteprima',
      status: workflow.preview?.status || 'pending',
      owner: workflow.preview?.owner || '—',
      eta: workflow.preview?.eta || '—',
      notes: workflow.preview?.notes || '—',
    },
    {
      id: 'approval',
      title: 'Approvazione',
      status: workflow.approval?.status || 'pending',
      owner: workflow.approval?.owner || '—',
      eta: workflow.approval?.eta || '—',
      notes: workflow.approval?.notes || '—',
    },
    {
      id: 'deploy',
      title: 'Deploy sul sito',
      status: workflow.deploy?.status || 'pending',
      owner: workflow.deploy?.owner || '—',
      eta: workflow.deploy?.eta || '—',
      notes: workflow.deploy?.notes || '—',
    },
  ];
});

const historyEntries = computed(() => (Array.isArray(publishing.value.history) ? publishing.value.history : []));

const notificationEntries = computed(() =>
  Array.isArray(publishing.value.notifications) ? publishing.value.notifications : []
);

function statusLabel(status) {
  if (status === 'ready') {
    return 'Pronto';
  }
  if (status === 'scheduled') {
    return 'Programmato';
  }
  if (status === 'in-progress') {
    return 'In corso';
  }
  if (status === 'done') {
    return 'Completato';
  }
  return 'In attesa';
}
</script>

<style scoped>
.flow-view {
  display: grid;
  gap: 1.5rem;
}

.flow-view__header h2 {
  margin: 0;
  font-size: 1.45rem;
}

.flow-view__header p {
  margin: 0.35rem 0 0;
  color: rgba(240, 244, 255, 0.7);
}

.flow-view__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 1rem;
}

.flow-card {
  background: rgba(9, 14, 20, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1rem;
  display: grid;
  gap: 0.5rem;
}

.flow-card--action {
  border-color: rgba(87, 202, 138, 0.55);
}

.flow-card__title {
  margin: 0;
  text-transform: uppercase;
  font-size: 0.85rem;
  letter-spacing: 0.08em;
  color: rgba(240, 244, 255, 0.65);
}

.flow-card__body {
  margin: 0;
  font-size: 1rem;
  color: #f0f4ff;
}

.flow-card ul {
  margin: 0;
  padding-left: 1.25rem;
  color: rgba(240, 244, 255, 0.85);
  display: grid;
  gap: 0.25rem;
}

.publishing-workflow {
  display: grid;
  gap: 0.75rem;
  background: rgba(9, 14, 20, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.1rem;
}

.publishing-workflow header h3,
.publishing-timeline header h3,
.publishing-notifications header h3 {
  margin: 0;
  font-size: 1.05rem;
}

.publishing-workflow header p,
.publishing-timeline header p,
.publishing-notifications header p {
  margin: 0.35rem 0 0;
  color: rgba(240, 244, 255, 0.65);
}

.publishing-workflow__steps {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.75rem;
}

.publishing-step {
  background: rgba(12, 18, 26, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
  padding: 0.9rem;
  display: grid;
  gap: 0.6rem;
}

.publishing-step header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
}

.publishing-step h4 {
  margin: 0;
  font-size: 1rem;
}

.publishing-step__status {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  border-radius: 999px;
  padding: 0.25rem 0.6rem;
  border: 1px solid rgba(96, 213, 255, 0.45);
  color: rgba(96, 213, 255, 0.85);
}

.publishing-step p {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(240, 244, 255, 0.75);
}

.publishing-step__meta {
  font-size: 0.8rem;
  color: rgba(240, 244, 255, 0.6);
}

.publishing-step--ready {
  border-color: rgba(129, 255, 199, 0.55);
}

.publishing-step--scheduled {
  border-color: rgba(96, 213, 255, 0.45);
}

.publishing-updates {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 1rem;
}

.publishing-timeline,
.publishing-notifications {
  background: rgba(9, 14, 20, 0.65);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.1rem;
  display: grid;
  gap: 0.75rem;
}

.publishing-timeline ul,
.publishing-notifications ul {
  list-style: none;
  margin: 0;
  padding: 0;
  display: grid;
  gap: 0.65rem;
}

.publishing-timeline li,
.publishing-notifications li {
  background: rgba(12, 18, 26, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 0.75rem;
  display: grid;
  gap: 0.5rem;
}

.publishing-timeline strong,
.publishing-notifications strong {
  font-size: 0.95rem;
  color: rgba(240, 244, 255, 0.85);
}

.publishing-timeline p,
.publishing-notifications p {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(240, 244, 255, 0.7);
}

.publishing-timeline footer,
.publishing-notifications footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.75rem;
  color: rgba(240, 244, 255, 0.6);
}

@media (max-width: 720px) {
  .publishing-workflow__steps {
    grid-template-columns: 1fr;
  }

  .publishing-updates {
    grid-template-columns: 1fr;
  }
}
</style>
