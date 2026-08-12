import { COLS } from "../core/Grid.js";
import { Obstacle } from "./Obstacle.js";
import { randInt, randFloat, chance } from "../util/rng.js";

const START_SAFE_ROWS = 5;
const DIFFICULTY_ROW_SPAN = 140;

// Fraction of full difficulty per speed-up level - also drives the meow
// level-up cue in main.js, so the chime and the speed jump land together.
export const DIFFICULTY_TIER_STEP = 0.15;
const TIER_ROW_SPAN = DIFFICULTY_ROW_SPAN * DIFFICULTY_TIER_STEP;
const SPEED_PER_TIER = 0.35;

export class World {
  constructor() {
    this.rows = new Map();
    this.pool = [];
    this.lastGenerated = -1;
    this.hazardStreak = 0;
    this.nextForceSafeAt = randInt(1, 2);
    this.generateRow(0);
  }

  acquireObstacle(props) {
    const recycled = this.pool.pop();
    return recycled ? recycled.reset(props) : new Obstacle(props);
  }

  releaseObstacle(obstacle) {
    this.pool.push(obstacle);
  }

  difficultyAt(rowIndex) {
    return Math.min(1, Math.max(0, (rowIndex - START_SAFE_ROWS) / DIFFICULTY_ROW_SPAN));
  }

  // Unlike difficultyAt (which plateaus so lane density/openness stay fair
  // forever), the tier keeps climbing the deeper the run goes - that's what
  // makes obstacle speed keep ramping "level after level" with no ceiling.
  tierAt(rowIndex) {
    return Math.max(0, Math.floor((rowIndex - START_SAFE_ROWS) / TIER_ROW_SPAN));
  }

  generateRow(index) {
    if (this.rows.has(index)) return this.rows.get(index);

    const diff = this.difficultyAt(index);
    const tier = this.tierAt(index);
    const hazardChance = 0.5 + diff * 0.35; // ramps 0.5 -> 0.85

    let type = "safe";
    if (index >= START_SAFE_ROWS) {
      if (this.hazardStreak >= this.nextForceSafeAt) {
        type = "safe";
      } else {
        type = chance(hazardChance) ? "hazard" : "safe";
      }
    }

    const row = { index, type, floorVariant: index % 2, obstacles: [] };

    if (type === "hazard") {
      this.hazardStreak += 1;
      const isCart = chance(0.05 + diff * 0.25);
      const dir = chance(0.5) ? 1 : -1;
      const speed = (isCart ? 1.15 : 0.75) + tier * SPEED_PER_TIER + randFloat(-0.1, 0.1);
      const widthCols = isCart ? 1.5 : 1;
      // Open space between obstacles (gap - widthCols) shrinks with difficulty
      // but never below OPEN_MIN, so there's always a real window to slip
      // through - difficulty ramps via speed/frequency instead of choking
      // the gap down to an unfair sliver.
      const openMax = isCart ? 1.9 : 2.4;
      const openMin = isCart ? 1.3 : 1.3;
      const gap = widthCols + (openMax - diff * (openMax - openMin));
      const variant = randInt(0, 2);

      const count = Math.ceil((COLS + 4) / gap) + 1;
      row.cycleLength = count * gap; // exact lane length one lap covers
      const phase = randFloat(0, gap);
      for (let i = 0; i < count; i++) {
        const t = i * gap + phase;
        const colX = dir === 1 ? -2 + t : COLS + 2 - t - widthCols;
        row.obstacles.push(
          this.acquireObstacle({
            type: isCart ? "cart" : "server",
            row: index,
            colX,
            dir,
            speed,
            widthCols,
            variant,
          })
        );
      }
    } else {
      this.hazardStreak = 0;
      this.nextForceSafeAt = randInt(1 + Math.round(diff), 2 + Math.round(diff * 2));
    }

    this.rows.set(index, row);
    this.lastGenerated = Math.max(this.lastGenerated, index);
    return row;
  }

  ensureGenerated(uptoIndex) {
    for (let i = this.lastGenerated + 1; i <= uptoIndex; i++) {
      this.generateRow(i);
    }
  }

  getRow(index) {
    return this.rows.get(index);
  }

  update(dt) {
    for (const row of this.rows.values()) {
      if (row.type !== "hazard") continue;
      for (const obstacle of row.obstacles) {
        obstacle.update(dt);
        // Wrap by exactly one lane-cycle length (not a fixed screen edge,
        // and not relative to other obstacles' current position) so every
        // obstacle keeps its original spacing forever with zero drift.
        // Must only check the edge this obstacle is actually travelling
        // toward: isOffscreen() checks both edges, and the position we
        // wrap a dir=1 obstacle *to* is itself past the left edge, which
        // re-triggered isOffscreen() every subsequent frame and wrapped
        // it again and again - a runaway loop that sent it thousands of
        // tiles away within seconds and never let it return.
        if (obstacle.dir === 1 && obstacle.colX > COLS + 1) {
          obstacle.colX -= row.cycleLength;
        } else if (obstacle.dir === -1 && obstacle.colX + obstacle.widthCols < -1) {
          obstacle.colX += row.cycleLength;
        }
      }
    }
  }

  prune(minRow) {
    for (const [key, row] of this.rows) {
      if (key >= minRow) continue;
      for (const obstacle of row.obstacles) {
        this.releaseObstacle(obstacle);
      }
      this.rows.delete(key);
    }
  }
}
