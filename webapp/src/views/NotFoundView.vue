<template>
  <section class="not-found">
    <h1>404</h1>
    <p>La pagina richiesta non è disponibile o è stata spostata.</p>
    <RouterLink :to="{ name: 'console-home' }" class="not-found__link">Torna alla console</RouterLink>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
</script>

<style scoped>
.not-found {
  min-height: 60vh;
  display: grid;
  place-content: center;
  gap: 1rem;
  text-align: center;
  color: #0f172a;
}

.not-found h1 {
  font-size: clamp(3rem, 10vw, 6rem);
  margin: 0;
}

.not-found p {
  font-size: 1.1rem;
  color: #475569;
}

.not-found__link {
  margin-top: 0.5rem;
  display: inline-block;
  padding: 0.6rem 1.2rem;
  border-radius: 0.75rem;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  text-decoration: none;
}

.not-found__link:hover {
  background: #1d4ed8;
}
</style>
