<template>
  <section class="console-hub">
    <header class="console-hub__hero">
      <h1>Mission Console</h1>
      <p>
        Gestisci il ciclo di vita di Nebula orchestrando generazione, QA e monitoraggio dai moduli
        dedicati.
      </p>
    </header>

    <section class="console-hub__grid" aria-label="Aree principali">
      <RouterLink class="console-hub__card" :to="{ name: 'console-flow' }">
        <h2>Workflow Orchestrator</h2>
        <p>Sequenzia i passaggi di generazione specie, validazione e publishing.</p>
        <span>Apri flusso →</span>
      </RouterLink>

      <RouterLink class="console-hub__card" :to="{ name: 'console-atlas-overview' }">
        <h2>Nebula Atlas</h2>
        <p>Consulta dataset, telemetria e strumenti di laboratorio dedicati.</p>
        <span>Vai all&apos;Atlas →</span>
      </RouterLink>

      <RouterLink class="console-hub__card" :to="{ name: 'console-atlas-telemetry' }">
        <h2>Telemetria live</h2>
        <p>Monitoraggio eventi QA, readiness e sincronizzazioni generator.</p>
        <span>Apri dashboard →</span>
      </RouterLink>

      <RouterLink class="console-hub__card" :to="{ name: 'console-atlas-generator' }">
        <h2>Generatore Nebula</h2>
        <p>Controlla stato, metriche e trend di generazione delle specie.</p>
        <span>Consulta metriche →</span>
      </RouterLink>
    </section>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.console-hub {
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.console-hub__hero {
  padding: 2.5rem clamp(2rem, 4vw, 3.5rem);
  border-radius: 1.75rem;
  background: linear-gradient(135deg, rgba(56, 189, 248, 0.25), rgba(129, 140, 248, 0.25));
  box-shadow: 0 18px 40px rgba(15, 23, 42, 0.15);
  color: #0f172a;
}

.console-hub__hero h1 {
  font-size: clamp(2rem, 4vw, 2.6rem);
  margin-bottom: 0.75rem;
}

.console-hub__hero p {
  max-width: 48ch;
  font-size: 1.05rem;
  line-height: 1.6;
  color: rgba(15, 23, 42, 0.82);
}

.console-hub__grid {
  display: grid;
  gap: 1.5rem;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
}

.console-hub__card {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 1.75rem;
  border-radius: 1.5rem;
  background: #fff;
  box-shadow: 0 16px 36px rgba(15, 23, 42, 0.08);
  color: inherit;
  text-decoration: none;
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.console-hub__card h2 {
  font-size: 1.25rem;
  margin: 0;
  color: #111827;
}

.console-hub__card p {
  margin: 0;
  color: #475569;
  line-height: 1.5;
}

.console-hub__card span {
  margin-top: auto;
  font-weight: 600;
  color: #2563eb;
}

.console-hub__card:hover {
  transform: translateY(-4px);
  box-shadow: 0 22px 44px rgba(15, 23, 42, 0.12);
}
</style>
