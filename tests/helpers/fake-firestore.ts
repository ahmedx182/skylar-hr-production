/** A tiny in-memory stand-in for the parts of Firestore the repositories use. */
type Data = Record<string, unknown>;
type Filter = { field: string; op: "==" | "<="; value: unknown };

export const ts = (millis: number) => ({ toMillis: () => millis });

function toComparable(value: unknown): unknown {
  return value && typeof value === "object" && "toMillis" in value ? (value as { toMillis(): number }).toMillis() : value;
}

export function createFakeDb(seed: Record<string, Record<string, Data>>, options: { deleteSentinel?: unknown } = {}) {
  let autoId = 0;
  const store = new Map<string, Map<string, Data>>(
    Object.entries(seed).map(([name, docs]) => [name, new Map(Object.entries(docs).map(([id, data]) => [id, { ...data }]))]),
  );
  const table = (name: string) => {
    if (!store.has(name)) store.set(name, new Map());
    return store.get(name)!;
  };

  const snapshotOf = (name: string, id: string) => {
    const data = table(name).get(id);
    return {
      id,
      exists: data !== undefined,
      ref: refOf(name, id),
      data: () => (data ? { ...data } : undefined),
      get: (field: string) => data?.[field],
    };
  };

  const applyPatch = (current: Data, patch: Data): Data => {
    const next = { ...current, ...patch };
    for (const key of Object.keys(patch)) {
      if (options.deleteSentinel !== undefined && patch[key] === options.deleteSentinel) delete next[key];
    }
    return next;
  };

  const refOf = (name: string, id: string) => ({
    id,
    path: `${name}/${id}`,
    get: async () => snapshotOf(name, id),
    update: async (patch: Data) => {
      if (!table(name).has(id)) throw new Error("not found");
      table(name).set(id, applyPatch(table(name).get(id)!, patch));
    },
    set: async (data: Data, setOptions?: { merge?: boolean }) => {
      table(name).set(id, setOptions?.merge ? applyPatch(table(name).get(id) ?? {}, data) : applyPatch({}, data));
    },
    delete: async () => void table(name).delete(id),
  });

  type Ref = ReturnType<typeof refOf>;

  const query = (name: string, filters: Filter[] = [], max?: number) => ({
    where: (field: string, op: Filter["op"], value: unknown) => query(name, [...filters, { field, op, value }], max),
    limit: (n: number) => query(name, filters, n),
    select: () => query(name, filters, max),
    get: async () => {
      const docs = Array.from(table(name).entries())
        .filter(([, data]) =>
          filters.every(({ field, op, value }) => {
            const actual = toComparable(data[field]);
            if (actual === undefined || actual === null) return false;
            return op === "==" ? actual === toComparable(value) : (actual as number) <= (toComparable(value) as number);
          }),
        )
        .slice(0, max)
        .map(([id]) => snapshotOf(name, id));
      return { docs, size: docs.length, empty: docs.length === 0 };
    },
  });

  return {
    collection: (name: string) => ({
      ...query(name),
      doc: (id?: string) => refOf(name, id ?? `auto_${(autoId += 1)}`),
      add: async (data: Data) => {
        const ref = refOf(name, `auto_${(autoId += 1)}`);
        await ref.set(data);
        return ref;
      },
    }),
    batch: () => {
      const ops: Array<() => Promise<void>> = [];
      return {
        update: (ref: Ref, patch: Data) => void ops.push(() => ref.update(patch)),
        set: (ref: Ref, data: Data, setOptions?: { merge?: boolean }) => void ops.push(() => ref.set(data, setOptions)),
        delete: (ref: Ref) => void ops.push(() => ref.delete()),
        commit: async () => {
          for (const op of ops) await op();
        },
      };
    },
    read: (name: string, id: string) => {
      const data = table(name).get(id);
      return data ? { ...data } : undefined;
    },
    all: (name: string) => Array.from(table(name).values()).map((data) => ({ ...data })),
    bulkWriter: () => {
      const pending: Array<() => Promise<void>> = [];
      return {
        delete: (ref: { delete(): Promise<void> }) => void pending.push(() => ref.delete()),
        close: async () => {
          for (const task of pending) await task();
        },
      };
    },
    ids: (name: string) => Array.from(table(name).keys()).sort(),
  };
}
