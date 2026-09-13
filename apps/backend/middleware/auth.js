const { verifyJwt } = require('../utils/jwt');
const { createAuditLogger } = require('../services/auditLogger');

function normaliseRole(value) {
  if (!value && value !== 0) {
    return null;
  }
  return String(value).trim().toLowerCase() || null;
}

function normaliseAudience(value) {
  if (!value) {
    return null;
  }
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }
  if (typeof value !== 'string') {
    return null;
  }
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractBearerToken(req) {
  const header = req.get && req.get('Authorization');
  if (header && typeof header === 'string') {
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (match) {
      return match[1].trim();
    }
  }
  return null;
}

function extractRolesFromClaims(claims, options = {}) {
  const rolesClaim = options.rolesClaim || process.env.AUTH_ROLES_CLAIM || 'roles';
  const raw = claims ? claims[rolesClaim] : null;
  let roles = [];
  if (Array.isArray(raw)) {
    roles = raw;
  } else if (typeof raw === 'string' && raw.trim()) {
    roles = raw.split(',');
  } else if (raw && typeof raw === 'object') {
    roles = Object.keys(raw).filter((key) => raw[key]);
  } else if (claims && typeof claims.role === 'string') {
    roles = [claims.role];
  }
  const mapped = roles.map((value) => normaliseRole(value)).filter((value) => Boolean(value));
  const unique = Array.from(new Set(mapped));
  if (!unique.length && options.fallbackRoles) {
    return options.fallbackRoles;
  }
  return unique;
}

function resolveUserId(claims, options = {}) {
  if (!claims || typeof claims !== 'object') {
    return null;
  }
  const preferredClaim = options.userIdClaim || process.env.AUTH_USERID_CLAIM || null;
  if (preferredClaim && claims[preferredClaim]) {
    return String(claims[preferredClaim]);
  }
  const candidates = ['sub', 'email', 'user', 'username', 'uid'];
  for (const key of candidates) {
    if (claims[key]) {
      return String(claims[key]);
    }
  }
  return null;
}

function attachAuthContext(req, context = {}) {
  if (!req.auth || typeof req.auth !== 'object') {
    req.auth = {};
  }
  req.auth = {
    ...req.auth,
    ...context,
    roles: Array.isArray(context.roles) ? context.roles : req.auth.roles || [],
  };
}

function createRoleChecker(requiredRoles, options = {}) {
  const allowAdmin = options.allowAdmin !== false;
  const required = Array.from(
    new Set((requiredRoles || []).map((role) => normaliseRole(role)).filter(Boolean)),
  );
  return (req, res, next) => {
    if (!required.length) {
      next();
      return;
    }
    const roles = Array.isArray(req?.auth?.roles)
      ? req.auth.roles.map((role) => normaliseRole(role)).filter(Boolean)
      : [];
    if (!roles.length) {
      res.status(403).json({ error: 'Permessi insufficienti' });
      return;
    }
    const allowed = roles.some(
      (role) => required.includes(role) || (allowAdmin && role === 'admin'),
    );
    if (!allowed) {
      res.status(403).json({ error: 'Permessi insufficienti' });
      return;
    }
    next();
  };
}

function createAuditTrail(logger) {
  if (!logger || typeof logger.record !== 'function') {
    return async () => {};
  }
  return async (req, action, metadata = {}) => {
    try {
      await logger.record(req, action, metadata || {});
    } catch (error) {
      console.warn('[audit] registrazione fallita', error);
    }
  };
}

function createNoopMiddleware() {
  return (req, res, next) => {
    attachAuthContext(req, { provider: 'none', roles: req?.auth?.roles || [] });
    next();
  };
}

function createLegacyTokenMiddleware(token, options = {}) {
  const headerName = options.headerName || 'X-Trait-Editor-Token';
  const bearerEnabled = options.allowBearer !== false;
  const legacyRoles = options.roles || ['admin'];
  const legacyUserId = options.userId || 'legacy-token-user';
  return (req, res, next) => {
    const headerToken = req.get && req.get(headerName);
    if (headerToken && String(headerToken).trim() === token) {
      attachAuthContext(req, {
        provider: 'legacy-token',
        roles: legacyRoles,
        userId: legacyUserId,
      });
      next();
      return;
    }
    if (bearerEnabled) {
      const bearerToken = extractBearerToken(req);
      if (bearerToken && bearerToken === token) {
        attachAuthContext(req, {
          provider: 'legacy-token',
          roles: legacyRoles,
          userId: legacyUserId,
        });
        next();
        return;
      }
    }
    res.status(401).json({ error: 'Token mancante o non valido' });
  };
}

function createJwtMiddleware(config = {}) {
  const secret = config.secret || process.env.AUTH_SECRET || null;
  if (!secret) {
    throw new Error("AUTH_SECRET non configurato per l'autenticazione JWT");
  }
  const audience = normaliseAudience(config.audience || process.env.AUTH_AUDIENCE || null);
  const issuer = config.issuer || process.env.AUTH_ISSUER || null;
  const clockTolerance = config.clockTolerance || process.env.AUTH_CLOCK_TOLERANCE || 0;
  const maxAge =
    config.maxAge || process.env.AUTH_TOKEN_MAX_AGE || process.env.AUTH_MAX_AGE || null;
  const fallbackRoles =
    config.fallbackRoles || normaliseAudience(process.env.AUTH_DEFAULT_ROLES) || [];

  return (req, res, next) => {
    const token = extractBearerToken(req);
    if (!token) {
      res.status(401).json({ error: 'Token mancante o non valido' });
      return;
    }
    try {
      const claims = verifyJwt(token, secret, {
        audience: audience && audience.length ? audience : null,
        issuer,
        clockTolerance,
        maxAge,
      });
      const roles = extractRolesFromClaims(claims, {
        rolesClaim: config.rolesClaim,
        fallbackRoles,
      });
      attachAuthContext(req, {
        provider: 'jwt',
        userId: resolveUserId(claims, { userIdClaim: config.userIdClaim }),
        roles,
        claims,
      });
      next();
    } catch (error) {
      res.status(401).json({ error: 'Token mancante o non valido' });
    }
  };
}

function createAuthHandlers(options = {}) {
  const disabled = options.disabled === true;
  const auditLogger = options.auditLogger || createAuditLogger(options.audit || {});
  const auditTrail = createAuditTrail(auditLogger);
  if (disabled) {
    return {
      authenticate: createNoopMiddleware(),
      requireRoles: () => createNoopMiddleware(),
      auditTrail,
    };
  }
  const legacyToken =
    options.legacyToken !== undefined
      ? options.legacyToken
      : options.token !== undefined
        ? options.token
        : process.env.TRAIT_EDITOR_TOKEN || process.env.TRAITS_API_TOKEN || null;
  const secret = options.secret || process.env.AUTH_SECRET || null;

  if (secret) {
    const authenticate = createJwtMiddleware(options);
    return {
      authenticate,
      requireRoles: (roles, config) => createRoleChecker(roles, config),
      auditTrail,
    };
  }

  if (legacyToken) {
    const authenticate = createLegacyTokenMiddleware(legacyToken, options.legacy || {});
    return {
      authenticate,
      requireRoles: () => createNoopMiddleware(),
      auditTrail,
    };
  }

  console.warn('[auth] nessun provider configurato: gli endpoint non sono protetti');
  return {
    authenticate: createNoopMiddleware(),
    requireRoles: () => createNoopMiddleware(),
    auditTrail,
  };
}

module.exports = {
  createAuthHandlers,
  extractBearerToken,
};
