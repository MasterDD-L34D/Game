const crypto = require('node:crypto');

function base64UrlEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/=+$/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input) {
  const normalized = input.replace(/-/g, '+').replace(/_/g, '/');
  const padLength = (4 - (normalized.length % 4)) % 4;
  const padded = normalized + '='.repeat(padLength);
  return Buffer.from(padded, 'base64');
}

function parseTimespan(value) {
  if (value == null) {
    return null;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }
  const numeric = Number(trimmed);
  if (Number.isFinite(numeric)) {
    return numeric;
  }
  const match = trimmed.match(/^(\d+)([smhdw])$/i);
  if (!match) {
    return null;
  }
  const amount = Number(match[1]);
  if (!Number.isFinite(amount)) {
    return null;
  }
  const unit = match[2].toLowerCase();
  const multipliers = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
    w: 7 * 24 * 60 * 60,
  };
  return amount * multipliers[unit];
}

function createSigningInput(header, payload) {
  const encodedHeader = base64UrlEncode(Buffer.from(JSON.stringify(header)));
  const encodedPayload = base64UrlEncode(Buffer.from(JSON.stringify(payload)));
  return `${encodedHeader}.${encodedPayload}`;
}

function signJwt(payload, secret, options = {}) {
  if (!secret) {
    throw new Error('Secret richiesto per firmare il token');
  }
  const header = {
    alg: 'HS256',
    typ: 'JWT',
    ...(options.header || {}),
  };
  if (header.alg !== 'HS256') {
    throw new Error(`Algoritmo non supportato: ${header.alg}`);
  }
  const issuedAt = Math.floor(Date.now() / 1000);
  const timespan = parseTimespan(options.expiresIn);
  const notBefore = parseTimespan(options.notBefore);
  const payloadData = { ...payload };
  if (timespan) {
    payloadData.exp = issuedAt + timespan;
  }
  if (notBefore) {
    payloadData.nbf = issuedAt + notBefore;
  }
  payloadData.iat = payloadData.iat || issuedAt;
  const signingInput = createSigningInput(header, payloadData);
  const signature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest();
  const encodedSignature = base64UrlEncode(signature);
  return `${signingInput}.${encodedSignature}`;
}

function isAudienceAllowed(expected, audienceClaim) {
  if (!expected) {
    return true;
  }
  const audiences = Array.isArray(expected) ? expected : [expected];
  if (Array.isArray(audienceClaim)) {
    return audienceClaim.some((aud) => audiences.includes(aud));
  }
  return audiences.includes(audienceClaim);
}

function verifyJwt(token, secret, options = {}) {
  if (!token || typeof token !== 'string') {
    throw Object.assign(new Error('Token JWT richiesto'), { code: 'EJWTEMPTY' });
  }
  if (!secret) {
    throw Object.assign(new Error('Secret mancante per verificare il token'), {
      code: 'EJWTSECRET',
    });
  }
  const segments = token.split('.');
  if (segments.length !== 3) {
    throw Object.assign(new Error('Token JWT non valido'), { code: 'EJWTMALFORMED' });
  }
  const [encodedHeader, encodedPayload, encodedSignature] = segments;
  let header;
  let payload;
  try {
    header = JSON.parse(base64UrlDecode(encodedHeader).toString('utf8'));
    payload = JSON.parse(base64UrlDecode(encodedPayload).toString('utf8'));
  } catch (error) {
    throw Object.assign(new Error('Token JWT non decodificabile'), { code: 'EJWTPARSE' });
  }
  if (!header || header.alg !== 'HS256') {
    throw Object.assign(new Error('Algoritmo JWT non supportato'), { code: 'EJWTALG' });
  }
  const signingInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signingInput)
    .digest();
  const providedSignature = base64UrlDecode(encodedSignature);
  if (providedSignature.length !== expectedSignature.length) {
    throw Object.assign(new Error('Firma JWT non valida'), { code: 'EJWTSIGNATURE' });
  }
  if (!crypto.timingSafeEqual(providedSignature, expectedSignature)) {
    throw Object.assign(new Error('Firma JWT non valida'), { code: 'EJWTSIGNATURE' });
  }
  const now = Math.floor(Date.now() / 1000);
  const tolerance = parseTimespan(options.clockTolerance || 0) || 0;
  if (payload.exp != null) {
    const exp = Number(payload.exp);
    if (Number.isFinite(exp) && now > exp + tolerance) {
      throw Object.assign(new Error('Token JWT scaduto'), { code: 'EJWTEXPIRED' });
    }
  } else if (options.maxAge) {
    const maxAge = parseTimespan(options.maxAge);
    if (maxAge) {
      const issuedAt = Number(payload.iat) || 0;
      if (issuedAt && now > issuedAt + maxAge + tolerance) {
        throw Object.assign(new Error('Token JWT oltre la durata massima'), {
          code: 'EJWTMAXAGE',
        });
      }
    }
  }
  if (payload.nbf != null) {
    const nbf = Number(payload.nbf);
    if (Number.isFinite(nbf) && now + tolerance < nbf) {
      throw Object.assign(new Error('Token JWT non ancora valido'), { code: 'EJWTNOTBEFORE' });
    }
  }
  if (options.issuer && payload.iss && payload.iss !== options.issuer) {
    throw Object.assign(new Error('Issuer JWT non valido'), { code: 'EJWTISSUER' });
  }
  if (options.audience && payload.aud && !isAudienceAllowed(options.audience, payload.aud)) {
    throw Object.assign(new Error('Audience JWT non valida'), { code: 'EJWTAUDIENCE' });
  }
  return payload;
}

module.exports = {
  signJwt,
  verifyJwt,
};
