import { Vector } from "./vector.js";

export interface VectorEntry<T = Record<string, unknown>> {
  id: string;
  vector: Vector;
  metadata: T;
}

export interface SearchResult<T = Record<string, unknown>> {
  id: string;
  score: number;           // cosine similarity
  distance: number;        // euclidean distance
  metadata: T;
}

export type DistanceMetric = "cosine" | "euclidean" | "manhattan";

/**
 * In-memory vector store — no external dependencies.
 * Supports insert, upsert, delete, and k-NN search.
 */
export class VectorStore<T = Record<string, unknown>> {
  private store = new Map<string, VectorEntry<T>>();

  // ── Mutations ────────────────────────────────────────────────────────────────

  insert(id: string, vector: Vector, metadata: T): void {
    if (this.store.has(id)) throw new Error(`Entry "${id}" already exists — use upsert`);
    this.store.set(id, { id, vector, metadata });
  }

  upsert(id: string, vector: Vector, metadata: T): void {
    this.store.set(id, { id, vector, metadata });
  }

  delete(id: string): boolean {
    return this.store.delete(id);
  }

  get(id: string): VectorEntry<T> | undefined {
    return this.store.get(id);
  }

  get size(): number {
    return this.store.size;
  }

  // ── Search ───────────────────────────────────────────────────────────────────

  /**
   * k-nearest-neighbour search (brute-force, exact).
   *
   * @param query   The query vector
   * @param k       How many results to return (default 5)
   * @param metric  Distance metric (default "cosine")
   */
  search(
    query: Vector,
    k = 5,
    metric: DistanceMetric = "cosine"
  ): SearchResult<T>[] {
    const scored: Array<{ entry: VectorEntry<T>; score: number; distance: number }> = [];

    for (const entry of this.store.values()) {
      const score = entry.vector.cosineSimilarity(query);
      const distance =
        metric === "euclidean"
          ? entry.vector.euclideanDistance(query)
          : metric === "manhattan"
          ? entry.vector.manhattanDistance(query)
          : 1 - score; // cosine distance

      scored.push({ entry, score, distance });
    }

    // Sort by ascending distance (most similar first)
    scored.sort((a, b) => a.distance - b.distance);

    return scored.slice(0, k).map(({ entry, score, distance }) => ({
      id: entry.id,
      score,
      distance,
      metadata: entry.metadata,
    }));
  }

  // ── Bulk helpers ─────────────────────────────────────────────────────────────

  /** Return all entries as an array */
  all(): VectorEntry<T>[] {
    return Array.from(this.store.values());
  }

  /** Serialize the store to a plain JSON-compatible object */
  serialize(): object {
    return Array.from(this.store.entries()).map(([id, e]) => ({
      id,
      vector: e.vector.toArray(),
      metadata: e.metadata,
    }));
  }

  /** Restore a store from serialized data */
  static deserialize<T>(data: Array<{ id: string; vector: number[]; metadata: T }>): VectorStore<T> {
    const store = new VectorStore<T>();
    for (const { id, vector, metadata } of data) {
      store.upsert(id, new Vector(vector), metadata);
    }
    return store;
  }
}