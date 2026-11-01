/*
 * Switch Layout Tiling
 *
 * Copyright (C) 2026  shimamu
 *
 * https://github.com/shimamu/switch-layout-tiling
 *
 * SPDX-License-Identifier: GPL-3.0-or-later
 */
import { describe, expect, it } from 'vitest';
import {
  deepCopy,
  deepFreeze,
  has,
  addToArrayAt,
  update,
  range,
  maybe,
  pipe,
  clamp,
} from '../../extension/logic/functional.js';

describe('deepCopy', () => {
  it('returns primitive values unchanged', () => {
    expect(deepCopy(null)).toBe(null);
    expect(deepCopy(undefined)).toBe(undefined);
    expect(deepCopy(42)).toBe(42);
    expect(deepCopy('text')).toBe('text');
    expect(deepCopy(false)).toBe(false);
  });

  it('copies nested objects and arrays', () => {
    const original = {
      name: 'layout',
      areas: [{ x: 0, y: 0 }, { x: 0.5, y: 0 }],
    };

    const copy = deepCopy(original);

    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.areas).not.toBe(original.areas);
    expect(copy.areas[0]).not.toBe(original.areas[0]);
  });

  it('copies Date instances', () => {
    const original = new Date('2026-01-01T00:00:00Z');
    const copy = deepCopy(original);

    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.getTime()).toBe(original.getTime());
  });

  it('copies RegExp instances', () => {
    const original = /layout/gi;
    const copy = deepCopy(original);

    expect(copy).toEqual(original);
    expect(copy).not.toBe(original);
    expect(copy.source).toBe(original.source);
    expect(copy.flags).toBe(original.flags);
  });

  it('copies Map keys and values', () => {
    const originalKey = { id: 1 };
    const originalValue = { name: 'layout' };
    const original = new Map([[originalKey, originalValue]]);

    const copy = deepCopy(original);
    const [[copiedKey, copiedValue]] = [...copy.entries()];

    expect(copy).toBeInstanceOf(Map);
    expect(copiedKey).toEqual(originalKey);
    expect(copiedKey).not.toBe(originalKey);
    expect(copiedValue).toEqual(originalValue);
    expect(copiedValue).not.toBe(originalValue);
  });

  it('copies Set values', () => {
    const originalValue = { id: 1 };
    const original = new Set([originalValue]);

    const copy = deepCopy(original);
    const [copiedValue] = [...copy];

    expect(copy).toBeInstanceOf(Set);
    expect(copiedValue).toEqual(originalValue);
    expect(copiedValue).not.toBe(originalValue);
  });

  it('preserves circular references in plain objects', () => {
    const original = { name: 'layout' };
    original.self = original;

    const copy = deepCopy(original);

    expect(copy).not.toBe(original);
    expect(copy.self).toBe(copy);
  });
});

describe('deepFreeze', () => {
  it('freezes an object and its nested objects', () => {
    const obj = {
      layout: {
        areas: [{ x: 0, y: 0 }],
      },
    };

    const result = deepFreeze(obj);

    expect(result).toBe(obj);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.layout)).toBe(true);
    expect(Object.isFrozen(result.layout.areas)).toBe(true);
    expect(Object.isFrozen(result.layout.areas[0])).toBe(true);
  });

  it('handles primitive values and null', () => {
    expect(deepFreeze(null)).toBe(null);
    expect(deepFreeze(undefined)).toBe(undefined);
    expect(deepFreeze(42)).toBe(42);
    expect(deepFreeze('text')).toBe('text');
  });

  it('handles circular references in plain objects', () => {
    const obj = { name: 'layout' };
    obj.self = obj;

    expect(() => deepFreeze(obj)).not.toThrow();
    expect(Object.isFrozen(obj)).toBe(true);
  });
});

describe('has', () => {
  it('returns true for an own property', () => {
    expect(has({ layout: [] }, 'layout')).toBe(true);
  });

  it('returns true for an own property whose value is undefined', () => {
    expect(has({ layout: undefined }, 'layout')).toBe(true);
  });

  it('returns false for a missing property', () => {
    expect(has({}, 'layout')).toBe(false);
  });

  it('returns false for an inherited property', () => {
    const obj = Object.create({ layout: [] });

    expect(has(obj, 'layout')).toBe(false);
  });
});

describe('addToArrayAt', () => {
  it('adds a value to an existing array at the specified key', () => {
    const original = {
      items: ['a', 'b'],
      other: ['x'],
    };

    const result = addToArrayAt(original, 'items', 'c');

    expect(result.items).toEqual(['a', 'b', 'c']);
    expect(result.other).toEqual(['x']);
  });

  it('creates an array when the key does not exist', () => {
    const original = {};

    const result = addToArrayAt(original, 'items', 'a');

    expect(result.items).toEqual(['a']);
  });

  it('does not modify the original object or its arrays', () => {
    const original = {
      items: ['a', 'b'],
    };

    const result = addToArrayAt(original, 'items', 'c');

    expect(original.items).toEqual(['a', 'b']);
    expect(result).not.toBe(original);
    expect(result.items).not.toBe(original.items);
  });

  it('freezes the returned object and its array', () => {
    const original = {
      items: ['a', 'b'],
    };

    const result = addToArrayAt(original, 'items', 'c');

    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result.items)).toBe(true);
  });
});

describe('update', () => {
  it('updates an existing property without modifying the original object', () => {
    const original = { layout: 'vertical' };

    const result = update(original, 'layout', 'horizontal');

    expect(result.layout).toBe('horizontal');
    expect(original.layout).toBe('vertical');
    expect(result).not.toBe(original);
    expect(Object.isFrozen(result)).toBe(true);
  });

  it('adds a property that does not exist', () => {
    const original = {};

    const result = update(original, 'layout', 'vertical');

    expect(result.layout).toBe('vertical');
    expect(original).toEqual({});
  });

  it('replaces a nested property with the supplied value', () => {
    const original = {
      layout: { pattern: 'full' },
    };
    const newLayout = { pattern: 'vertical' };

    const result = update(original, 'layout', newLayout);

    expect(result.layout).toBe(newLayout);
    expect(Object.isFrozen(newLayout)).toBe(true);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(original)).toBe(false);
  });
});

describe('range', () => {
  it('returns an inclusive range', () => {
    expect(range(1, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('returns a single-element array when start equals end', () => {
    expect(range(3, 3)).toEqual([3]);
  });

  it('returns an empty array when start is greater than end', () => {
    expect(range(5, 3)).toEqual([]);
  });

  it('supports a range starting at zero', () => {
    expect(range(0, 3)).toEqual([0, 1, 2, 3]);
  });
});

describe('maybe', () => {
  describe('unit', () => {
    it('returns Nothing for null and undefined', () => {
      expect(maybe.unit(null)).toEqual({ kind: 'nothing' });
      expect(maybe.unit(undefined)).toEqual({ kind: 'nothing' });
    });

    it('returns Just for non-nullish values', () => {
      expect(maybe.unit(0)).toEqual({ kind: 'just', value: 0 });
      expect(maybe.unit(false)).toEqual({ kind: 'just', value: false });
      expect(maybe.unit('')).toEqual({ kind: 'just', value: '' });
    });
  });

  describe('map', () => {
    it('applies a function to a Just value', () => {
      const result = maybe.map(value => value * 2)(maybe.unit(3));

      expect(result).toEqual({ kind: 'just', value: 6 });
    });

    it('returns Nothing when mapping Nothing', () => {
      const result = maybe.map(value => value * 2)(maybe.unit(null));

      expect(result).toEqual({ kind: 'nothing' });
    });

    it('returns Nothing when the mapping function returns null', () => {
      const result = maybe.map(() => null)(maybe.unit(3));

      expect(result).toEqual({ kind: 'nothing' });
    });
  });

  describe('flatMap', () => {
    it('applies a function returning a Maybe value', () => {
      const result = maybe.flatMap(value => maybe.unit(value * 2))(
        maybe.unit(3),
      );

      expect(result).toEqual({ kind: 'just', value: 6 });
    });

    it('returns Nothing when flatMapping Nothing', () => {
      const result = maybe.flatMap(value => maybe.unit(value * 2))(
        maybe.unit(null),
      );

      expect(result).toEqual({ kind: 'nothing' });
    });
  });

  describe('unwrapOr', () => {
    it('returns the value of Just', () => {
      const result = maybe.unwrapOr('default')(maybe.unit('value'));

      expect(result).toBe('value');
    });

    it('returns the default value for Nothing', () => {
      const result = maybe.unwrapOr('default')(maybe.unit(null));

      expect(result).toBe('default');
    });

    it('supports an object as the default value', () => {
      const defaultValue = { pattern: 'full' };
      const result = maybe.unwrapOr(defaultValue)(maybe.unit(null));

      expect(result).toBe(defaultValue);
    });
  });
});

describe('pipe', () => {
  it('applies functions from left to right', () => {
    const result = pipe(
      2,
      value => value + 3,
      value => value * 4,
      value => value - 1,
    );

    expect(result).toBe(19);
  });

  it('returns the original value when no functions are supplied', () => {
    const value = { layout: 'vertical' };

    expect(pipe(value)).toBe(value);
  });
});

describe('clamp', () => {
  it('returns a value within the specified range unchanged', () => {
    expect(clamp(0, 100)(50)).toBe(50);
  });

  it('limits a value below the minimum', () => {
    expect(clamp(0, 100)(-10)).toBe(0);
  });

  it('limits a value above the maximum', () => {
    expect(clamp(0, 100)(120)).toBe(100);
  });

  it('accepts the minimum and maximum boundaries', () => {
    expect(clamp(0, 100)(0)).toBe(0);
    expect(clamp(0, 100)(100)).toBe(100);
  });
});
