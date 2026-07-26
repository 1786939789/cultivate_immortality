import { createHash } from "node:crypto";

export const persistenceDomains = Object.freeze({
  sections: "sections",
  cultivators: "cultivators",
  equipment: "equipment",
  duels: "duels",
  dungeons: "dungeons",
  provinceWars: "provinceWars",
  adminProfiles: "adminProfiles"
});

export const allPersistenceDomains = Object.freeze(Object.values(persistenceDomains));

const metadataKeys = new Set(["day", "rebirth", "calendarStartDate", "lastSettlementDate"]);
const extractedKeys = new Set(["player", "npcs", "equipment", "duelDays", "dungeonDays", "provinceWars", "adminProfiles"]);

function digest(value) {
  return createHash("sha256").update(JSON.stringify(value ?? null)).digest("hex");
}

function topLevelPersistenceDomain(key) {
  if (metadataKeys.has(key) || key.startsWith("__")) return null;
  if (key === "player" || key === "npcs") return persistenceDomains.cultivators;
  if (key === "equipment") return persistenceDomains.equipment;
  if (key === "duelDays") return persistenceDomains.duels;
  if (key === "dungeonDays") return persistenceDomains.dungeons;
  if (key === "provinceWars") return persistenceDomains.provinceWars;
  if (key === "adminProfiles") return persistenceDomains.adminProfiles;
  return persistenceDomains.sections;
}

function trackable(value) {
  if (!value || typeof value !== "object") return false;
  const prototype = Object.getPrototypeOf(value);
  return Array.isArray(value) || prototype === Object.prototype || prototype === null;
}

export function trackPersistenceDomains(state) {
  const changed = new Set();
  const proxies = new WeakMap();
  const targets = new WeakMap();

  const unwrap = (value) => targets.get(value) || value;

  const wrap = (value, domain = null, root = false) => {
    if (!trackable(value)) return value;
    if (proxies.has(value)) return proxies.get(value);
    const proxy = new Proxy(value, {
      get(target, property, receiver) {
        const childDomain = root && typeof property === "string" ? topLevelPersistenceDomain(property) : domain;
        return wrap(Reflect.get(target, property, receiver), childDomain);
      },
      set(target, property, nextValue, receiver) {
        const changedDomain = root && typeof property === "string" ? topLevelPersistenceDomain(property) : domain;
        if (changedDomain) changed.add(changedDomain);
        return Reflect.set(target, property, unwrap(nextValue), receiver);
      },
      deleteProperty(target, property) {
        const changedDomain = root && typeof property === "string" ? topLevelPersistenceDomain(property) : domain;
        if (changedDomain) changed.add(changedDomain);
        return Reflect.deleteProperty(target, property);
      }
    });
    proxies.set(value, proxy);
    targets.set(proxy, value);
    return proxy;
  };

  return { state: wrap(state, null, true), domains: changed };
}

export function persistenceDomainHashes(state, domains = allPersistenceDomains) {
  const requested = normalizePersistenceDomains(domains);
  const sections = {};
  if (requested.has(persistenceDomains.sections)) {
    for (const [key, value] of Object.entries(state || {})) {
      if (metadataKeys.has(key) || extractedKeys.has(key) || key.startsWith("__")) continue;
      sections[key] = value;
    }
  }
  const hashes = {};
  if (requested.has(persistenceDomains.sections)) hashes.sections = digest(sections);
  if (requested.has(persistenceDomains.cultivators)) hashes.cultivators = digest({ player: state?.player || {}, npcs: state?.npcs || [] });
  if (requested.has(persistenceDomains.equipment)) hashes.equipment = digest(state?.equipment || []);
  if (requested.has(persistenceDomains.duels)) hashes.duels = digest(state?.duelDays || []);
  if (requested.has(persistenceDomains.dungeons)) hashes.dungeons = digest(state?.dungeonDays || []);
  if (requested.has(persistenceDomains.provinceWars)) hashes.provinceWars = digest(state?.provinceWars || []);
  if (requested.has(persistenceDomains.adminProfiles)) hashes.adminProfiles = digest(state?.adminProfiles || {});
  return hashes;
}

export function changedPersistenceDomains(previousState, nextState, candidates = allPersistenceDomains) {
  const requested = [...normalizePersistenceDomains(candidates)];
  if (!previousState) return requested;
  const previous = persistenceDomainHashes(previousState, requested);
  const next = persistenceDomainHashes(nextState, requested);
  return requested.filter((domain) => previous[domain] !== next[domain]);
}

export function normalizePersistenceDomains(domains) {
  if (!domains) return new Set(allPersistenceDomains);
  const allowed = new Set(allPersistenceDomains);
  return new Set((Array.isArray(domains) ? domains : [domains]).filter((domain) => allowed.has(domain)));
}
