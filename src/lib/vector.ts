/**
 * Vector — a typed wrapper around a Float32Array for high-performance
 * embedding math. All operations are non-mutating unless noted.
 */
export class Vector {
    readonly data: Float32Array;

    constructor(data: number[] | Float32Array) {
        this.data = data instanceof Float32Array ? data : new Float32Array(data);
    }

    get dimensions(): number {
        return this.data.length;
    }

    // ── Arithmetic ──────────────────────────────────────────────────────────────

    add(other: Vector): Vector {
        this.assertSameDim(other);
        const out = new Float32Array(this.data.length);
        for (let i = 0; i < this.data.length; i++) out[i] = this.data[i] + other.data[i];
        return new Vector(out);
    }

    subtract(other: Vector): Vector {
        this.assertSameDim(other);
        const out = new Float32Array(this.data.length);
        for (let i = 0; i < this.data.length; i++) out[i] = this.data[i] - other.data[i];
        return new Vector(out);
    }

    scale(scalar: number): Vector {
        const out = new Float32Array(this.data.length);
        for (let i = 0; i < this.data.length; i++) out[i] = this.data[i] * scalar;
        return new Vector(out);
    }

    // ── Norms & normalisation ────────────────────────────────────────────────────

    /** Euclidean (L2) magnitude */
    magnitude(): number {
        let sum = 0;
        for (const v of this.data) sum += v * v;
        return Math.sqrt(sum);
    }

    /** Return a unit vector (magnitude = 1) */
    normalize(): Vector {
        const mag = this.magnitude();
        if (mag === 0) throw new Error("Cannot normalize a zero vector");
        return this.scale(1 / mag);
    }

    // ── Similarity / distance ────────────────────────────────────────────────────

    /** Dot product */
    dot(other: Vector): number {
        this.assertSameDim(other);
        let sum = 0;
        for (let i = 0; i < this.data.length; i++) sum += this.data[i] * other.data[i];
        return sum;
    }

    /**
     * Cosine similarity — range [-1, 1].
     * 1 = identical direction, 0 = orthogonal, -1 = opposite.
     */
    cosineSimilarity(other: Vector): number {
        const denom = this.magnitude() * other.magnitude();
        if (denom === 0) throw new Error("Cannot compute cosine similarity with a zero vector");
        return Math.max(-1, Math.min(1, this.dot(other) / denom));
    }

    /** Euclidean (L2) distance */
    euclideanDistance(other: Vector): number {
        return this.subtract(other).magnitude();
    }

    /**
     * Manhattan (L1) distance
     */
    manhattanDistance(other: Vector): number {
        this.assertSameDim(other);
        let sum = 0;
        for (let i = 0; i < this.data.length; i++) sum += Math.abs(this.data[i] - other.data[i]);
        return sum;
    }

    // ── Utilities ────────────────────────────────────────────────────────────────

    toArray(): number[] {
        return Array.from(this.data);
    }

    toString(): string {
        const preview = this.toArray().slice(0, 6).map(v => v.toFixed(4)).join(", ");
        return `Vector(dims=${this.dimensions}, [${preview}${this.dimensions > 6 ? ", ..." : ""}])`;
    }

    private assertSameDim(other: Vector): void {
        if (this.dimensions !== other.dimensions) {
            throw new Error(
                `Dimension mismatch: ${this.dimensions} vs ${other.dimensions}`
            );
        }
    }
}