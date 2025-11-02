<template>
  <section class="not-found">
    <div class="not-found__card">
      <span class="not-found__tag">{{ t('views.notFound.tag') }}</span>
      <h1>{{ t('views.notFound.title') }}</h1>
      <p>{{ t('views.notFound.body') }}</p>
      <RouterLink :to="{ name: 'console-home' }" class="not-found__link">{{ t('views.notFound.cta') }}</RouterLink>
    </div>
    <div class="not-found__bg" aria-hidden="true"></div>
  </section>
</template>

<script setup>
import { RouterLink } from 'vue-router';
import { useI18n } from 'vue-i18n';

const { t } = useI18n();
</script>

<style scoped>
.not-found {
  min-height: 60vh;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
  gap: 2rem;
  align-items: center;
  color: #0f172a;
}

.not-found__card {
  display: grid;
  gap: 1rem;
  padding: clamp(2rem, 4vw, 3rem);
  border-radius: 1.5rem;
  background: #ffffff;
  box-shadow: 0 18px 36px rgba(15, 23, 42, 0.12);
}

.not-found__tag {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.4rem 0.9rem;
  border-radius: 999px;
  background: rgba(59, 130, 246, 0.12);
  color: #2563eb;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.75rem;
}

.not-found h1 {
  margin: 0;
  font-size: clamp(2.5rem, 5vw, 3.5rem);
}

.not-found p {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.6;
  color: #475569;
}

.not-found__link {
  margin-top: 1rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem 1.5rem;
  border-radius: 999px;
  background: #2563eb;
  color: #fff;
  font-weight: 600;
  text-decoration: none;
  transition: background 0.2s ease, transform 0.2s ease;
}

.not-found__link:hover {
  background: #1d4ed8;
  transform: translateY(-1px);
}

.not-found__bg {
  height: 100%;
  border-radius: 1.75rem;
  background: radial-gradient(circle at 25% 25%, rgba(59, 130, 246, 0.18), transparent 60%),
    radial-gradient(circle at 75% 25%, rgba(14, 165, 233, 0.18), transparent 55%),
    radial-gradient(circle at 50% 75%, rgba(99, 102, 241, 0.15), transparent 55%),
    linear-gradient(135deg, rgba(226, 232, 240, 0.95), rgba(248, 250, 252, 0.75));
}
</style>
