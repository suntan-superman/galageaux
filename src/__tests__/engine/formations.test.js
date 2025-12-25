/**
 * Formations System Tests
 * Tests for enemy formation layouts and positioning
 */

import {
  getFormationOffsets,
  createFormation,
  updateFormation,
} from '../../engine/formations';

describe('formations', () => {
  describe('getFormationOffsets', () => {
    describe('v formation', () => {
      it('creates correct number of offsets', () => {
        const offsets = getFormationOffsets('v', 5);
        expect(offsets.length).toBe(5);
      });

      it('center enemy has zero x offset', () => {
        const offsets = getFormationOffsets('v', 5);
        const midIndex = Math.floor(5 / 2);
        expect(offsets[midIndex].dx).toBe(0);
      });

      it('center enemy has zero y offset', () => {
        const offsets = getFormationOffsets('v', 5);
        const midIndex = Math.floor(5 / 2);
        expect(offsets[midIndex].dy).toBe(0);
      });

      it('outer enemies have larger y offset', () => {
        const offsets = getFormationOffsets('v', 5);
        expect(offsets[0].dy).toBeGreaterThan(offsets[2].dy);
        expect(offsets[4].dy).toBeGreaterThan(offsets[2].dy);
      });

      it('respects custom spacing', () => {
        const spacing = 50;
        const offsets = getFormationOffsets('v', 3, spacing);
        expect(Math.abs(offsets[0].dx - offsets[1].dx)).toBe(spacing);
      });
    });

    describe('line formation', () => {
      it('creates horizontal line', () => {
        const offsets = getFormationOffsets('line', 5);
        offsets.forEach(offset => {
          expect(offset.dy).toBe(0);
        });
      });

      it('spreads enemies horizontally', () => {
        const offsets = getFormationOffsets('line', 3);
        expect(offsets[0].dx).toBeLessThan(offsets[1].dx);
        expect(offsets[1].dx).toBeLessThan(offsets[2].dx);
      });
    });

    describe('staggered formation', () => {
      it('alternates y positions', () => {
        const offsets = getFormationOffsets('staggered', 4);
        expect(offsets[0].dy).not.toBe(offsets[1].dy);
        expect(offsets[0].dy).toBe(offsets[2].dy);
      });
    });
  });

  describe('createFormation', () => {
    describe('grid formation', () => {
      it('creates correct number of enemies', () => {
        const formation = createFormation('grid', { rows: 3, cols: 4 });
        expect(formation.enemies.length).toBe(12);
      });

      it('sets formation type correctly', () => {
        const formation = createFormation('grid');
        expect(formation.type).toBe('grid');
      });

      it('assigns unique ids to enemies', () => {
        const formation = createFormation('grid', { rows: 2, cols: 3 });
        const ids = formation.enemies.map(e => e.id);
        const uniqueIds = new Set(ids);
        expect(uniqueIds.size).toBe(ids.length);
      });

      it('sets correct row and column for each enemy', () => {
        const formation = createFormation('grid', { rows: 2, cols: 2 });
        
        const enemy00 = formation.enemies.find(e => e.row === 0 && e.col === 0);
        const enemy11 = formation.enemies.find(e => e.row === 1 && e.col === 1);
        
        expect(enemy00).toBeDefined();
        expect(enemy11).toBeDefined();
      });

      it('respects custom spacing', () => {
        const spacing = 50;
        const formation = createFormation('grid', { rows: 2, cols: 2, spacing });
        
        const col0 = formation.enemies.filter(e => e.col === 0);
        const col1 = formation.enemies.filter(e => e.col === 1);
        
        expect(col1[0].offsetX - col0[0].offsetX).toBe(spacing);
      });

      it('initializes all enemies with idle behavior', () => {
        const formation = createFormation('grid');
        formation.enemies.forEach(e => {
          expect(e.behavior).toBe('idle');
        });
      });
    });

    describe('v formation', () => {
      it('creates v-shaped arrangement', () => {
        const formation = createFormation('v', { size: 5 });
        expect(formation.type).toBe('v');
        expect(formation.enemies.length).toBe(5);
      });

      it('center enemy is at lowest y', () => {
        const formation = createFormation('v', { size: 5 });
        const yOffsets = formation.enemies.map(e => e.offsetY);
        const minY = Math.min(...yOffsets);
        const centerEnemy = formation.enemies[Math.floor(5 / 2)];
        
        expect(centerEnemy.offsetY).toBe(minY);
      });

      it('sets baseX and baseY for each enemy', () => {
        const formation = createFormation('v', { size: 3, width: 400 });
        formation.enemies.forEach(e => {
          expect(e.baseX).toBeDefined();
          expect(e.baseY).toBeDefined();
        });
      });
    });

    describe('wave formation', () => {
      it('creates wave pattern', () => {
        const formation = createFormation('wave', { count: 6 });
        expect(formation.type).toBe('wave');
        expect(formation.enemies.length).toBe(6);
      });

      it('starts above screen', () => {
        const formation = createFormation('wave', { count: 4 });
        expect(formation.baseY).toBeLessThan(0);
      });

      it('initializes waveOffset', () => {
        const formation = createFormation('wave');
        expect(formation.waveOffset).toBe(0);
      });
    });

    describe('circle formation', () => {
      it('creates circular arrangement', () => {
        const formation = createFormation('circle', { count: 6 });
        expect(formation.type).toBe('circle');
        expect(formation.enemies.length).toBe(6);
      });

      it('distributes enemies around circle', () => {
        const formation = createFormation('circle', { count: 4, radius: 100 });
        
        // Check enemies are at expected angles
        formation.enemies.forEach((e, i) => {
          const expectedAngle = (Math.PI * 2 * i) / 4;
          expect(e.baseAngle).toBeCloseTo(expectedAngle, 5);
        });
      });

      it('respects radius parameter', () => {
        const radius = 120;
        const formation = createFormation('circle', { count: 4, radius });
        
        formation.enemies.forEach(e => {
          const distance = Math.sqrt(e.offsetX ** 2 + e.offsetY ** 2);
          expect(distance).toBeCloseTo(radius, 0);
        });
      });

      it('has rotation properties', () => {
        const formation = createFormation('circle');
        expect(formation.angle).toBe(0);
        expect(formation.rotationSpeed).toBeGreaterThan(0);
      });
    });

    it('returns null for unknown formation type', () => {
      const formation = createFormation('unknown');
      expect(formation).toBeNull();
    });
  });

  describe('updateFormation', () => {
    it('returns null if formation is null', () => {
      const result = updateFormation(null, 0.016, 400, 800);
      expect(result).toBeNull();
    });

    describe('wave formation update', () => {
      it('updates waveOffset over time', () => {
        const formation = createFormation('wave', { count: 4 });
        const initialOffset = formation.waveOffset;
        
        updateFormation(formation, 0.5, 400, 800);
        
        expect(formation.waveOffset).toBeGreaterThan(initialOffset);
      });

      it('moves enemies in sinusoidal pattern', () => {
        const formation = createFormation('wave', { count: 4, width: 400 });
        
        updateFormation(formation, 0.1, 400, 800);
        
        formation.enemies.forEach(e => {
          expect(e.x).toBeDefined();
          expect(e.y).toBeDefined();
        });
      });

      it('enemies move downward over time', () => {
        const formation = createFormation('wave', { count: 4 });
        const initialY = formation.enemies[0].baseY;
        
        updateFormation(formation, 1, 400, 800);
        
        expect(formation.enemies[0].y).toBeGreaterThan(initialY);
      });
    });

    describe('circle formation update', () => {
      it('rotates formation over time', () => {
        const formation = createFormation('circle', { count: 4 });
        const initialAngle = formation.angle;
        
        updateFormation(formation, 1, 400, 800);
        
        expect(formation.angle).toBeGreaterThan(initialAngle);
      });

      it('updates enemy positions based on rotation', () => {
        const formation = createFormation('circle', { count: 4, radius: 100 });
        
        // First update
        updateFormation(formation, 0.1, 400, 800);
        const firstPos = { x: formation.enemies[0].x, y: formation.enemies[0].y };
        
        // Second update
        updateFormation(formation, 0.5, 400, 800);
        const secondPos = { x: formation.enemies[0].x, y: formation.enemies[0].y };
        
        // Position should have changed due to rotation
        expect(firstPos.x).not.toBe(secondPos.x);
      });
    });

    describe('grid formation update', () => {
      it('sets enemy positions to base positions', () => {
        const formation = createFormation('grid', { rows: 2, cols: 2 });
        
        updateFormation(formation, 0.1, 400, 800);
        
        formation.enemies.forEach(e => {
          expect(e.x).toBe(e.baseX);
          expect(e.y).toBe(e.baseY);
        });
      });
    });

    describe('v formation update', () => {
      it('sets enemy positions to base positions', () => {
        const formation = createFormation('v', { size: 5 });
        
        updateFormation(formation, 0.1, 400, 800);
        
        formation.enemies.forEach(e => {
          expect(e.x).toBe(e.baseX);
          expect(e.y).toBe(e.baseY);
        });
      });
    });
  });
});
