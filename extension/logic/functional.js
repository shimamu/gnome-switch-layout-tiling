/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
export const deepCopy = (obj, hash = new WeakMap()) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (hash.has(obj)) return hash.get(obj);
  if (obj instanceof Date) return new Date(obj);
  if (obj instanceof RegExp) return new RegExp(obj);
  if (obj instanceof Map) return new Map([...obj.entries()].map(([k, v]) => [deepCopy(k, hash), deepCopy(v, hash)]));
  if (obj instanceof Set) return new Set([...obj].map(v => deepCopy(v, hash)));
  if (Array.isArray(obj)) return obj.map(v => deepCopy(v, hash));

  const copy = {};
  hash.set(obj, copy);
  for (const key of Object.keys(obj)) {
    copy[key] = deepCopy(obj[key], hash);
  }

  return copy;
};

export const deepFreeze = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;

  Object.freeze(obj);
  Object.getOwnPropertyNames(obj).forEach(name => {
    const value = obj[name];
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) {
      deepFreeze(value);
    }
  });

  return obj;
};

export const has = (obj, key) => Object.prototype.hasOwnProperty.call(obj, key);

export const addToArrayAt = (obj, key, value) => {
  const copy = deepCopy(obj);
  copy[key] = has(obj, key) ? [...obj[key], value] : [value];

  return deepFreeze(copy);
};

export const update = (obj, key, value) => {
  const copy = deepCopy(obj);
  copy[key] = value;

  return deepFreeze(copy);
};

export const range = (start, end) =>
  Array.from({ length: end - start + 1 }, (_, i) => start + i);

const Just   = (v) => ({ kind: 'just', value: v });

const Nothing = { kind: 'nothing' };

export const maybe = {
  unit: (v) => (v === null || v === undefined ? Nothing : Just(v)),

  // map :: Maybe a -> (a -> b) -> Maybe b
  map: (fn) => (m) => m.kind === 'just' ? maybe.unit(fn(m.value)) : Nothing,

  // flatMap :: Maybe a -> (a -> Maybe b) -> Maybe b
  flatMap: (fn) => (m) => m.kind === 'just' ? fn(m.value) : Nothing,

  // unwrapOr :: Maybe a -> a | default
  unwrapOr: (def) => (m) => m.kind === 'just' ? m.value : def,
};

export const pipe = (value, ...functions) =>
  functions.reduce((result, fn) => fn(result), value);

export const clamp = (min, max) => (value) => Math.max(min, Math.min(max, value));
