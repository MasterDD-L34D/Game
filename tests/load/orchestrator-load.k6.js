import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3333';

const generationPayload = {
  trait_ids: ['artigli_sette_vie', 'coda_frusta_cinetica', 'scheletro_idro_regolante'],
  seed: 421,
  biome_id: 'caverna_risonante',
  base_name: 'Predatore Load',
};

const validatorPayload = {
  kind: 'species',
  payload: {
    biomeId: 'caverna_risonante',
    entries: [
      { id: 'specimen-1', trait_ids: ['artigli_sette_vie'], seed: 7 },
      { id: 'specimen-2', trait_ids: ['coda_frusta_cinetica'], seed: 8 },
    ],
  },
};

export const options = {
  scenarios: {
    generation: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 4 },
        { duration: '2m', target: 10 },
        { duration: '2m', target: 12 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'runGeneration',
    },
    validators: {
      executor: 'ramping-vus',
      startVUs: 0,
      startTime: '30s',
      stages: [
        { duration: '1m', target: 3 },
        { duration: '2m', target: 6 },
        { duration: '2m', target: 8 },
        { duration: '1m', target: 0 },
      ],
      gracefulRampDown: '30s',
      exec: 'runValidator',
    },
  },
  thresholds: {
    'http_req_duration{scenario:generation}': ['p(95)<90000'],
    'http_req_duration{scenario:validators}': ['p(95)<10000'],
    'http_req_failed{scenario:generation}': ['rate<0.01'],
    'http_req_failed{scenario:validators}': ['rate<0.01'],
  },
};

export function runGeneration() {
  const res = http.post(
    `${BASE_URL}/api/v1/generation/species`,
    JSON.stringify(generationPayload),
    {
      headers: { 'Content-Type': 'application/json' },
      timeout: '95s',
      tags: { endpoint: 'generation' },
    },
  );

  check(res, {
    'generation status is 200': (r) => r.status === 200,
    'generation within 90s': (r) => r.timings.duration < 90000,
  });

  sleep(1);
}

export function runValidator() {
  const res = http.post(`${BASE_URL}/api/v1/validators/runtime`, JSON.stringify(validatorPayload), {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
    tags: { endpoint: 'validators' },
  });

  check(res, {
    'validator status is 200': (r) => r.status === 200,
    'validator within 10s': (r) => r.timings.duration < 10000,
  });

  sleep(0.5);
}
