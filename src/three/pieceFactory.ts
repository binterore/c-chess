import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PIECE_GLYPHS } from '../i18n/chess';
import type { BoardSkin, Piece, PieceColor } from '../types/chess';
import { makeGlyphTexture, makeWoodTexture, palette } from './materials';

export type MaterialKind = 'primary' | 'metal' | 'dark' | 'skin' | 'accent' | 'ivory' | 'wood';

interface Part {
  geometry: THREE.BufferGeometry;
  kind: MaterialKind;
  position?: [number, number, number];
  rotation?: [number, number, number];
  scale?: [number, number, number];
}

export interface PieceObject extends THREE.Group {
  userData: {
    piece: Piece;
    baseMaterial: THREE.MeshStandardMaterial;
    glyphMaterial: THREE.MeshStandardMaterial;
    glyph: THREE.Mesh;
    figurine: THREE.Group;
    figurineMaterials?: Record<MaterialKind, THREE.Material>;
    intensity: number;
    selectionRing: THREE.Mesh;
    base: THREE.Mesh;
    rim: THREE.Mesh;
    badge?: THREE.Group;
  };
}

const colorMaterials = (color: PieceColor, intensity: number): Record<MaterialKind, THREE.Material> => ({
  primary: new THREE.MeshStandardMaterial({
    color: color === 'red' ? 0x9a291d : 0x212328,
    roughness: 0.42,
    metalness: 0.24,
    emissive: color === 'red' ? 0x2e0602 : 0x06080a,
    emissiveIntensity: intensity
  }),
  metal: new THREE.MeshStandardMaterial({
    color: color === 'red' ? palette.gold : 0xbcc5d0,
    roughness: 0.24,
    metalness: 0.84,
    emissive: color === 'red' ? 0x4a2704 : 0x141820,
    emissiveIntensity: intensity * 0.5
  }),
  dark: new THREE.MeshStandardMaterial({
    color: color === 'red' ? 0x2a110e : 0x111215,
    roughness: 0.68,
    metalness: 0.22
  }),
  skin: new THREE.MeshStandardMaterial({
    color: color === 'red' ? 0xd09672 : 0xb58062,
    roughness: 0.74,
    metalness: 0.02
  }),
  accent: new THREE.MeshStandardMaterial({
    color: color === 'red' ? 0xde2014 : 0x1ba385,
    roughness: 0.46,
    metalness: 0.12,
    emissive: color === 'red' ? 0x3d0600 : 0x02241d,
    emissiveIntensity: intensity * 0.6
  }),
  ivory: new THREE.MeshStandardMaterial({
    color: 0xf4eee2,
    roughness: 0.35,
    metalness: 0.06
  }),
  wood: new THREE.MeshStandardMaterial({
    color: 0x5a341c,
    roughness: 0.65,
    metalness: 0.1
  })
});

function addPart(
  parts: Part[],
  geometry: THREE.BufferGeometry,
  kind: MaterialKind,
  position: [number, number, number],
  rotation?: [number, number, number],
  scale?: [number, number, number]
): void {
  parts.push({ geometry, kind, position, rotation, scale });
}

function mergeParts(parts: Part[], materials: Record<MaterialKind, THREE.Material>): THREE.Group {
  const group = new THREE.Group();
  (Object.keys(materials) as MaterialKind[]).forEach((kind) => {
    const list = parts.filter((part) => part.kind === kind);
    if (list.length === 0) return;
    const geometries = list.map((part) => {
      const geometry = part.geometry.clone();
      const matrix = new THREE.Matrix4();
      const quaternion = new THREE.Quaternion();
      if (part.rotation) quaternion.setFromEuler(new THREE.Euler(...part.rotation));
      matrix.compose(
        new THREE.Vector3(...(part.position ?? [0, 0, 0])),
        quaternion,
        new THREE.Vector3(...(part.scale ?? [1, 1, 1]))
      );
      geometry.applyMatrix4(matrix);
      return geometry;
    });
    const merged = mergeGeometries(geometries, false);
    geometries.forEach((geometry) => geometry.dispose());
    list.forEach((part) => part.geometry.dispose());
    if (!merged) return;
    const mesh = new THREE.Mesh(merged, materials[kind]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  });
  return group;
}

// ----------------------------------------------------
// 1. General (帅 / 将) - 镇国统帅
// ----------------------------------------------------
function generalParts(): Part[] {
  const parts: Part[] = [];
  // Pedestal base
  addPart(parts, new THREE.CylinderGeometry(0.44, 0.46, 0.07, 8), 'dark', [0, 0.035, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.40, 0.44, 0.025, 8), 'metal', [0, 0.08, 0]);
  addPart(parts, new THREE.BoxGeometry(0.20, 0.06, 0.08), 'metal', [0, 0.06, 0.38]);

  // Armored boots & greaves
  addPart(parts, new THREE.BoxGeometry(0.13, 0.18, 0.16), 'dark', [-0.13, 0.16, 0.02]);
  addPart(parts, new THREE.BoxGeometry(0.13, 0.18, 0.16), 'dark', [0.13, 0.16, 0.02]);
  addPart(parts, new THREE.BoxGeometry(0.12, 0.14, 0.06), 'metal', [-0.13, 0.18, 0.10]);
  addPart(parts, new THREE.BoxGeometry(0.12, 0.14, 0.06), 'metal', [0.13, 0.18, 0.10]);

  // War skirt & lower cuirass
  addPart(parts, new THREE.CylinderGeometry(0.28, 0.36, 0.32, 8), 'primary', [0, 0.38, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.29, 0.37, 0.06, 8), 'metal', [0, 0.25, 0]);
  addPart(parts, new THREE.BoxGeometry(0.14, 0.22, 0.04), 'metal', [0, 0.34, 0.26]);

  // Wide leather belt & golden lion buckle
  addPart(parts, new THREE.CylinderGeometry(0.28, 0.28, 0.08, 8), 'dark', [0, 0.53, 0]);
  addPart(parts, new THREE.BoxGeometry(0.16, 0.12, 0.08), 'metal', [0, 0.53, 0.18]);
  addPart(parts, new THREE.BoxGeometry(0.08, 0.24, 0.03), 'accent', [0.05, 0.40, 0.18], [0, 0, -0.1]);

  // Heavy cuirass (明光重铠)
  addPart(parts, new THREE.BoxGeometry(0.44, 0.34, 0.26), 'primary', [0, 0.72, 0.02]);
  // Dual Heart-Protecting Mirrors (护心金镜)
  addPart(parts, new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), 'metal', [-0.11, 0.74, 0.15], [Math.PI / 2, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.09, 0.09, 0.04, 16), 'metal', [0.11, 0.74, 0.15], [Math.PI / 2, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.36, 0.04, 0.05), 'metal', [0, 0.86, 0.14]);

  // Lion Pauldrons (金兽吞肩甲) & arms
  addPart(parts, new THREE.SphereGeometry(0.13, 10, 8), 'metal', [-0.28, 0.82, 0.02]);
  addPart(parts, new THREE.SphereGeometry(0.13, 10, 8), 'metal', [0.28, 0.82, 0.02]);
  addPart(parts, new THREE.CylinderGeometry(0.07, 0.08, 0.26, 8), 'primary', [-0.27, 0.65, 0.03]);
  addPart(parts, new THREE.CylinderGeometry(0.07, 0.08, 0.26, 8), 'primary', [0.27, 0.65, 0.03]);
  addPart(parts, new THREE.SphereGeometry(0.065, 8, 8), 'skin', [-0.25, 0.50, 0.14]);
  addPart(parts, new THREE.SphereGeometry(0.065, 8, 8), 'skin', [0.25, 0.50, 0.12]);

  // Commander Sword (尚方宝剑)
  addPart(parts, new THREE.BoxGeometry(0.05, 0.68, 0.08), 'primary', [0.26, 0.38, 0.10], [0.15, 0, -0.2]);
  addPart(parts, new THREE.BoxGeometry(0.06, 0.10, 0.09), 'metal', [0.23, 0.56, 0.09], [0.15, 0, -0.2]);
  addPart(parts, new THREE.BoxGeometry(0.15, 0.04, 0.06), 'metal', [0.22, 0.62, 0.08], [0.15, 0, -0.2]);
  addPart(parts, new THREE.CylinderGeometry(0.022, 0.022, 0.18, 6), 'dark', [0.20, 0.70, 0.07], [0.15, 0, -0.2]);
  addPart(parts, new THREE.SphereGeometry(0.045, 8, 8), 'metal', [0.18, 0.79, 0.06]);
  addPart(parts, new THREE.CylinderGeometry(0.02, 0.04, 0.18, 6), 'accent', [0.18, 0.68, 0.06]);

  // Tiger command tally in left hand
  addPart(parts, new THREE.BoxGeometry(0.05, 0.16, 0.08), 'metal', [-0.22, 0.54, 0.18], [0.2, 0, 0.3]);

  // Battle cloak (战袍大披风)
  addPart(parts, new THREE.BoxGeometry(0.52, 0.82, 0.07), 'accent', [0, 0.60, -0.14], [0.12, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.56, 0.28, 0.08), 'primary', [0, 0.84, -0.12], [0.10, 0, 0]);

  // Neck & Head
  addPart(parts, new THREE.CylinderGeometry(0.13, 0.15, 0.14, 8), 'metal', [0, 0.94, 0.02]);
  addPart(parts, new THREE.SphereGeometry(0.13, 12, 10), 'skin', [0, 1.05, 0.04]);

  // Phoenix-Wing Commander Helmet (凤翅金盔)
  addPart(parts, new THREE.SphereGeometry(0.15, 12, 10), 'metal', [0, 1.15, 0.02], undefined, [1, 1.1, 1]);
  addPart(parts, new THREE.BoxGeometry(0.24, 0.05, 0.16), 'metal', [0, 1.12, 0.08]);
  addPart(parts, new THREE.BoxGeometry(0.04, 0.28, 0.14), 'metal', [-0.18, 1.24, 0.02], [0, 0, 0.35]);
  addPart(parts, new THREE.BoxGeometry(0.04, 0.28, 0.14), 'metal', [0.18, 1.24, 0.02], [0, 0, -0.35]);
  addPart(parts, new THREE.CylinderGeometry(0.04, 0.07, 0.14, 8), 'metal', [0, 1.30, 0.02]);
  addPart(parts, new THREE.ConeGeometry(0.08, 0.34, 8), 'accent', [0, 1.49, -0.02], [-0.2, 0, 0]);

  return parts;
}

// ----------------------------------------------------
// 2. Advisor (仕 / 士) - 决胜军师
// ----------------------------------------------------
function advisorParts(): Part[] {
  const parts: Part[] = [];
  // Stepped scholar plinth
  addPart(parts, new THREE.CylinderGeometry(0.44, 0.46, 0.07, 8), 'dark', [0, 0.035, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.40, 0.44, 0.025, 8), 'metal', [0, 0.08, 0]);

  // Scholar Robes (鹤氅)
  addPart(parts, new THREE.CylinderGeometry(0.26, 0.38, 0.55, 8), 'primary', [0, 0.35, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.28, 0.39, 0.08, 8), 'dark', [0, 0.11, 0]);
  addPart(parts, new THREE.BoxGeometry(0.38, 0.36, 0.24), 'primary', [0, 0.70, 0]);
  addPart(parts, new THREE.BoxGeometry(0.18, 0.24, 0.06), 'dark', [0, 0.74, 0.11]);
  addPart(parts, new THREE.BoxGeometry(0.36, 0.10, 0.26), 'metal', [0, 0.60, 0]);
  addPart(parts, new THREE.BoxGeometry(0.10, 0.32, 0.03), 'accent', [0, 0.44, 0.13]);
  addPart(parts, new THREE.TorusGeometry(0.05, 0.016, 6, 16), 'ivory', [0, 0.48, 0.14]);

  // Wide Billowing Sleeves (垂云大袖)
  addPart(parts, new THREE.BoxGeometry(0.16, 0.38, 0.20), 'primary', [-0.25, 0.62, 0.02], [0, 0, 0.18]);
  addPart(parts, new THREE.BoxGeometry(0.16, 0.38, 0.20), 'primary', [0.25, 0.62, 0.02], [0, 0, -0.18]);
  addPart(parts, new THREE.BoxGeometry(0.17, 0.05, 0.21), 'metal', [-0.27, 0.44, 0.02], [0, 0, 0.18]);
  addPart(parts, new THREE.BoxGeometry(0.17, 0.05, 0.21), 'metal', [0.27, 0.44, 0.02], [0, 0, -0.18]);
  addPart(parts, new THREE.SphereGeometry(0.06, 8, 8), 'skin', [-0.18, 0.68, 0.15]);
  addPart(parts, new THREE.SphereGeometry(0.06, 8, 8), 'skin', [0.18, 0.68, 0.15]);

  // Zhuge White Feather Fan (诸葛羽扇)
  addPart(parts, new THREE.CylinderGeometry(0.014, 0.014, 0.32, 6), 'dark', [0.22, 0.78, 0.20], [0.4, 0, -0.3]);
  addPart(parts, new THREE.BoxGeometry(0.24, 0.34, 0.03), 'ivory', [0.28, 0.96, 0.24], [0.4, 0, -0.3]);
  addPart(parts, new THREE.BoxGeometry(0.04, 0.36, 0.04), 'metal', [0.28, 0.96, 0.25], [0.4, 0, -0.3]);

  // Bamboo Strategy Scroll (兵法竹简)
  addPart(parts, new THREE.CylinderGeometry(0.045, 0.045, 0.28, 8), 'wood', [-0.22, 0.74, 0.18], [0.3, 0.4, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.048, 0.048, 0.06, 8), 'metal', [-0.22, 0.74, 0.18], [0.3, 0.4, 0]);

  // Head & Strategist Headdress (诸葛纶巾)
  addPart(parts, new THREE.SphereGeometry(0.12, 10, 8), 'skin', [0, 0.95, 0.02]);
  addPart(parts, new THREE.ConeGeometry(0.04, 0.14, 6), 'dark', [0, 0.86, 0.12], [0.2, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.22, 0.20, 0.22), 'dark', [0, 1.10, 0.01]);
  addPart(parts, new THREE.BoxGeometry(0.08, 0.08, 0.04), 'metal', [0, 1.12, 0.12]);
  addPart(parts, new THREE.BoxGeometry(0.16, 0.12, 0.18), 'primary', [0, 1.22, 0]);
  // Trailing ribbons
  addPart(parts, new THREE.BoxGeometry(0.04, 0.42, 0.02), 'accent', [-0.08, 0.96, -0.12], [0.1, 0, 0.08]);
  addPart(parts, new THREE.BoxGeometry(0.04, 0.42, 0.02), 'accent', [0.08, 0.96, -0.12], [0.1, 0, -0.08]);

  return parts;
}

// ----------------------------------------------------
// 3. Elephant (相 / 象) - 重装战象
// ----------------------------------------------------
function elephantParts(): Part[] {
  const parts: Part[] = [];
  // Plinth
  addPart(parts, new THREE.CylinderGeometry(0.44, 0.46, 0.07, 8), 'dark', [0, 0.035, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.41, 0.44, 0.025, 8), 'metal', [0, 0.08, 0]);

  // Sturdy Column Legs (4 legs)
  const legs: Array<[number, number]> = [[-0.18, 0.18], [0.18, 0.18], [-0.18, -0.18], [0.18, -0.18]];
  legs.forEach(([lx, lz]) => {
    addPart(parts, new THREE.CylinderGeometry(0.09, 0.11, 0.34, 10), 'dark', [lx, 0.22, lz]);
    addPart(parts, new THREE.CylinderGeometry(0.10, 0.11, 0.08, 10), 'metal', [lx, 0.12, lz]);
  });

  // Elephant Muscular Torso
  addPart(parts, new THREE.BoxGeometry(0.50, 0.42, 0.58), 'dark', [0, 0.48, -0.02]);
  addPart(parts, new THREE.SphereGeometry(0.24, 10, 8), 'dark', [0, 0.52, -0.18]);
  addPart(parts, new THREE.SphereGeometry(0.24, 10, 8), 'dark', [0, 0.52, 0.14]);

  // Head & Chamfron
  addPart(parts, new THREE.SphereGeometry(0.22, 12, 10), 'dark', [0, 0.60, 0.32]);
  addPart(parts, new THREE.SphereGeometry(0.12, 8, 8), 'dark', [0, 0.74, 0.34]);
  addPart(parts, new THREE.BoxGeometry(0.24, 0.28, 0.06), 'metal', [0, 0.68, 0.42], [0.35, 0, 0]);
  addPart(parts, new THREE.ConeGeometry(0.04, 0.14, 6), 'metal', [0, 0.72, 0.48], [Math.PI / 2 - 0.2, 0, 0]);

  // Wide Flapping Ears
  addPart(parts, new THREE.BoxGeometry(0.18, 0.26, 0.03), 'dark', [-0.26, 0.62, 0.24], [0.2, 0.35, 0.15]);
  addPart(parts, new THREE.BoxGeometry(0.18, 0.26, 0.03), 'dark', [0.26, 0.62, 0.24], [0.2, -0.35, -0.15]);
  addPart(parts, new THREE.BoxGeometry(0.03, 0.27, 0.04), 'metal', [-0.34, 0.62, 0.22]);
  addPart(parts, new THREE.BoxGeometry(0.03, 0.27, 0.04), 'metal', [0.34, 0.62, 0.22]);

  // Long Ivory Tusks
  addPart(parts, new THREE.CylinderGeometry(0.04, 0.05, 0.28, 8), 'ivory', [-0.14, 0.48, 0.46], [0.6, 0, -0.28]);
  addPart(parts, new THREE.CylinderGeometry(0.04, 0.05, 0.28, 8), 'ivory', [0.14, 0.48, 0.46], [0.6, 0, 0.28]);
  addPart(parts, new THREE.ConeGeometry(0.04, 0.22, 6), 'metal', [-0.18, 0.58, 0.58], [0.9, 0, -0.35]);
  addPart(parts, new THREE.ConeGeometry(0.04, 0.22, 6), 'metal', [0.18, 0.58, 0.58], [0.9, 0, 0.35]);

  // S-curved Trumpeting Trunk
  addPart(parts, new THREE.CylinderGeometry(0.065, 0.085, 0.22, 8), 'dark', [0, 0.48, 0.46], [0.4, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.05, 0.065, 0.20, 8), 'dark', [0, 0.38, 0.54], [1.1, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.035, 0.05, 0.18, 8), 'dark', [0, 0.42, 0.62], [-0.6, 0, 0]);

  // Embroidered Saddle Blanket (锦绣象毯)
  addPart(parts, new THREE.BoxGeometry(0.54, 0.32, 0.52), 'primary', [0, 0.60, -0.02]);
  addPart(parts, new THREE.BoxGeometry(0.56, 0.05, 0.54), 'metal', [0, 0.45, -0.02]);

  // Fortified Battle Howdah (象舆战楼)
  addPart(parts, new THREE.BoxGeometry(0.44, 0.06, 0.42), 'wood', [0, 0.74, -0.04]);
  addPart(parts, new THREE.BoxGeometry(0.05, 0.28, 0.05), 'wood', [-0.18, 0.88, 0.13]);
  addPart(parts, new THREE.BoxGeometry(0.05, 0.28, 0.05), 'wood', [0.18, 0.88, 0.13]);
  addPart(parts, new THREE.BoxGeometry(0.05, 0.28, 0.05), 'wood', [-0.18, 0.88, -0.21]);
  addPart(parts, new THREE.BoxGeometry(0.05, 0.28, 0.05), 'wood', [0.18, 0.88, -0.21]);
  addPart(parts, new THREE.SphereGeometry(0.04, 6, 6), 'metal', [-0.18, 1.03, 0.13]);
  addPart(parts, new THREE.SphereGeometry(0.04, 6, 6), 'metal', [0.18, 1.03, 0.13]);
  addPart(parts, new THREE.SphereGeometry(0.04, 6, 6), 'metal', [-0.18, 1.03, -0.21]);
  addPart(parts, new THREE.SphereGeometry(0.04, 6, 6), 'metal', [0.18, 1.03, -0.21]);
  addPart(parts, new THREE.BoxGeometry(0.42, 0.16, 0.04), 'metal', [0, 0.84, 0.13]);
  addPart(parts, new THREE.BoxGeometry(0.42, 0.16, 0.04), 'metal', [0, 0.84, -0.21]);
  addPart(parts, new THREE.BoxGeometry(0.04, 0.16, 0.38), 'metal', [-0.19, 0.84, -0.04]);
  addPart(parts, new THREE.BoxGeometry(0.04, 0.16, 0.38), 'metal', [0.19, 0.84, -0.04]);

  // War Pennant
  addPart(parts, new THREE.CylinderGeometry(0.016, 0.016, 0.65, 6), 'dark', [0, 1.15, -0.20]);
  addPart(parts, new THREE.ConeGeometry(0.035, 0.14, 6), 'metal', [0, 1.50, -0.20]);
  addPart(parts, new THREE.BoxGeometry(0.32, 0.22, 0.02), 'accent', [-0.15, 1.34, -0.20]);

  return parts;
}

// ----------------------------------------------------
// 4. Horse (马) - 铁骑烈马
// ----------------------------------------------------
function horseParts(): Part[] {
  const parts: Part[] = [];
  // Plinth
  addPart(parts, new THREE.CylinderGeometry(0.44, 0.46, 0.07, 8), 'dark', [0, 0.035, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.41, 0.44, 0.025, 8), 'metal', [0, 0.08, 0]);

  // Legs & Iron-Shod Hooves
  addPart(parts, new THREE.CylinderGeometry(0.05, 0.065, 0.38, 8), 'dark', [-0.16, 0.22, 0.20], [-0.12, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.05, 0.065, 0.38, 8), 'dark', [0.16, 0.22, 0.20], [-0.12, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.055, 0.07, 0.38, 8), 'dark', [-0.16, 0.22, -0.20], [0.15, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.055, 0.07, 0.38, 8), 'dark', [0.16, 0.22, -0.20], [0.15, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.06, 0.07, 0.06, 8), 'metal', [-0.16, 0.09, 0.22]);
  addPart(parts, new THREE.CylinderGeometry(0.06, 0.07, 0.06, 8), 'metal', [0.16, 0.09, 0.22]);
  addPart(parts, new THREE.CylinderGeometry(0.06, 0.07, 0.06, 8), 'metal', [-0.16, 0.09, -0.22]);
  addPart(parts, new THREE.CylinderGeometry(0.06, 0.07, 0.06, 8), 'metal', [0.16, 0.09, -0.22]);

  // Torso
  addPart(parts, new THREE.BoxGeometry(0.38, 0.34, 0.54), 'dark', [0, 0.48, 0]);
  addPart(parts, new THREE.SphereGeometry(0.22, 10, 8), 'dark', [0, 0.50, -0.20]);
  addPart(parts, new THREE.SphereGeometry(0.20, 10, 8), 'dark', [0, 0.50, 0.22]);

  // Arched Neck & Expressive Head
  addPart(parts, new THREE.CylinderGeometry(0.12, 0.17, 0.46, 8), 'dark', [0, 0.74, 0.20], [0.45, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.17, 0.22, 0.32), 'dark', [0, 0.94, 0.34], [0.22, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.13, 0.12, 0.16), 'dark', [0, 0.88, 0.48], [0.15, 0, 0]);
  addPart(parts, new THREE.ConeGeometry(0.035, 0.14, 6), 'dark', [-0.06, 1.12, 0.32], [-0.1, 0, -0.1]);
  addPart(parts, new THREE.ConeGeometry(0.035, 0.14, 6), 'dark', [0.06, 1.12, 0.32], [-0.1, 0, 0.1]);
  addPart(parts, new THREE.BoxGeometry(0.06, 0.42, 0.12), 'primary', [0, 0.86, 0.10], [-0.35, 0, 0]);

  // Chamfron & Tack
  addPart(parts, new THREE.BoxGeometry(0.14, 0.20, 0.04), 'metal', [0, 0.98, 0.40], [0.25, 0, 0]);
  addPart(parts, new THREE.TorusGeometry(0.04, 0.012, 6, 12), 'metal', [-0.09, 0.88, 0.46]);
  addPart(parts, new THREE.TorusGeometry(0.04, 0.012, 6, 12), 'metal', [0.09, 0.88, 0.46]);
  addPart(parts, new THREE.BoxGeometry(0.40, 0.08, 0.24), 'primary', [0, 0.54, 0.24]);
  addPart(parts, new THREE.SphereGeometry(0.04, 6, 6), 'metal', [0, 0.54, 0.36]);

  // Saddle & Stirrups
  addPart(parts, new THREE.BoxGeometry(0.42, 0.12, 0.34), 'primary', [0, 0.56, -0.02]);
  addPart(parts, new THREE.BoxGeometry(0.36, 0.10, 0.06), 'metal', [0, 0.65, -0.16]);
  addPart(parts, new THREE.BoxGeometry(0.36, 0.10, 0.06), 'metal', [0, 0.65, 0.12]);
  addPart(parts, new THREE.TorusGeometry(0.05, 0.015, 6, 12), 'metal', [-0.22, 0.38, -0.02]);
  addPart(parts, new THREE.TorusGeometry(0.05, 0.015, 6, 12), 'metal', [0.22, 0.38, -0.02]);

  // Cavalry Lance & Pennant (红缨战槊)
  addPart(parts, new THREE.CylinderGeometry(0.016, 0.016, 1.15, 6), 'dark', [0.24, 0.68, 0.10], [0, 0, -0.14]);
  addPart(parts, new THREE.ConeGeometry(0.05, 0.24, 6), 'metal', [0.32, 1.28, 0.10], [0, 0, -0.14]);
  addPart(parts, new THREE.CylinderGeometry(0.04, 0.05, 0.12, 6), 'accent', [0.30, 1.15, 0.10]);
  addPart(parts, new THREE.BoxGeometry(0.28, 0.18, 0.02), 'accent', [0.45, 1.05, 0.10]);

  // Equine Tail
  addPart(parts, new THREE.CylinderGeometry(0.04, 0.07, 0.42, 8), 'dark', [0, 0.42, -0.34], [-0.45, 0, 0]);

  return parts;
}

// ----------------------------------------------------
// 5. Chariot (车) - 破阵铁甲战车
// ----------------------------------------------------
function chariotParts(): Part[] {
  const parts: Part[] = [];
  // Plinth
  addPart(parts, new THREE.CylinderGeometry(0.44, 0.46, 0.07, 8), 'dark', [0, 0.035, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.41, 0.44, 0.025, 8), 'metal', [0, 0.08, 0]);

  // Spoked War Wheels with Scythe Hubs
  const wheels: Array<[number, number]> = [[0.34, 0.20], [-0.34, 0.20], [0.34, -0.20], [-0.34, -0.20]];
  wheels.forEach(([wx, wz]) => {
    addPart(parts, new THREE.CylinderGeometry(0.22, 0.22, 0.08, 18), 'metal', [wx, 0.25, wz], [0, 0, Math.PI / 2]);
    addPart(parts, new THREE.TorusGeometry(0.21, 0.025, 6, 18), 'wood', [wx, 0.25, wz], [0, Math.PI / 2, 0]);
    addPart(
      parts,
      new THREE.ConeGeometry(0.045, 0.16, 6),
      'metal',
      [wx > 0 ? wx + 0.10 : wx - 0.10, 0.25, wz],
      [0, 0, wx > 0 ? -Math.PI / 2 : Math.PI / 2]
    );
  });

  // Armored Combat Chassis
  addPart(parts, new THREE.BoxGeometry(0.50, 0.28, 0.62), 'primary', [0, 0.32, 0]);
  addPart(parts, new THREE.BoxGeometry(0.52, 0.06, 0.64), 'metal', [0, 0.45, 0]);
  addPart(parts, new THREE.BoxGeometry(0.04, 0.18, 0.58), 'metal', [-0.26, 0.52, 0]);
  addPart(parts, new THREE.BoxGeometry(0.04, 0.18, 0.58), 'metal', [0.26, 0.52, 0]);

  // Dragon-head Battering Ram (青铜龙首撞角)
  addPart(parts, new THREE.BoxGeometry(0.32, 0.20, 0.22), 'metal', [0, 0.35, 0.36]);
  addPart(parts, new THREE.ConeGeometry(0.09, 0.24, 6), 'metal', [0, 0.35, 0.54], [Math.PI / 2, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.42, 0.06, 0.08), 'metal', [0, 0.42, 0.38]);

  // Rear Heavy Ballista / Crossbow
  addPart(parts, new THREE.CylinderGeometry(0.09, 0.11, 0.18, 8), 'dark', [0, 0.54, -0.06]);
  addPart(parts, new THREE.BoxGeometry(0.52, 0.04, 0.06), 'wood', [0, 0.64, 0.08]);
  addPart(parts, new THREE.BoxGeometry(0.08, 0.06, 0.44), 'metal', [0, 0.64, 0.04]);

  // Twin War Flags
  addPart(parts, new THREE.CylinderGeometry(0.016, 0.016, 0.95, 6), 'dark', [-0.18, 0.72, -0.22]);
  addPart(parts, new THREE.CylinderGeometry(0.016, 0.016, 0.95, 6), 'dark', [0.18, 0.72, -0.22]);
  addPart(parts, new THREE.ConeGeometry(0.035, 0.14, 6), 'metal', [-0.18, 1.22, -0.22]);
  addPart(parts, new THREE.ConeGeometry(0.035, 0.14, 6), 'metal', [0.18, 1.22, -0.22]);
  addPart(parts, new THREE.BoxGeometry(0.28, 0.26, 0.02), 'accent', [-0.32, 1.05, -0.22]);
  addPart(parts, new THREE.BoxGeometry(0.28, 0.26, 0.02), 'accent', [0.32, 1.05, -0.22]);

  return parts;
}

// ----------------------------------------------------
// 6. Cannon (炮) - 龙吞霹雳火炮
// ----------------------------------------------------
function cannonParts(): Part[] {
  const parts: Part[] = [];
  // Timber plinth
  addPart(parts, new THREE.CylinderGeometry(0.44, 0.46, 0.07, 8), 'dark', [0, 0.035, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.41, 0.44, 0.025, 8), 'metal', [0, 0.08, 0]);

  // Wheels & Axle
  addPart(parts, new THREE.CylinderGeometry(0.25, 0.25, 0.09, 18), 'wood', [-0.32, 0.26, 0.08], [0, 0, Math.PI / 2]);
  addPart(parts, new THREE.CylinderGeometry(0.25, 0.25, 0.09, 18), 'wood', [0.32, 0.26, 0.08], [0, 0, Math.PI / 2]);
  addPart(parts, new THREE.TorusGeometry(0.25, 0.02, 6, 20), 'metal', [-0.32, 0.26, 0.08], [0, Math.PI / 2, 0]);
  addPart(parts, new THREE.TorusGeometry(0.25, 0.02, 6, 20), 'metal', [0.32, 0.26, 0.08], [0, Math.PI / 2, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.04, 0.04, 0.70, 8), 'metal', [0, 0.26, 0.08], [0, 0, Math.PI / 2]);

  // Wooden Trail Chassis
  addPart(parts, new THREE.BoxGeometry(0.42, 0.20, 0.58), 'wood', [0, 0.24, -0.10], [0.18, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.44, 0.05, 0.60), 'metal', [0, 0.32, -0.10], [0.18, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.18, 0.12, 0.16), 'metal', [0, 0.40, -0.06]);

  // Cast Dragon Barrel (龙吞火炮)
  addPart(parts, new THREE.CylinderGeometry(0.12, 0.17, 0.82, 16), 'primary', [0, 0.52, 0.06], [Math.PI / 2 - 0.35, 0, 0]);
  // Reinforcing collars
  addPart(parts, new THREE.TorusGeometry(0.15, 0.026, 6, 16), 'metal', [0, 0.65, 0.42], [-0.35, 0, 0]);
  addPart(parts, new THREE.TorusGeometry(0.16, 0.024, 6, 16), 'metal', [0, 0.56, 0.18], [-0.35, 0, 0]);
  addPart(parts, new THREE.TorusGeometry(0.17, 0.024, 6, 16), 'metal', [0, 0.48, -0.04], [-0.35, 0, 0]);
  addPart(parts, new THREE.TorusGeometry(0.18, 0.026, 6, 16), 'metal', [0, 0.40, -0.24], [-0.35, 0, 0]);
  // Flared muzzle & bore
  addPart(parts, new THREE.CylinderGeometry(0.16, 0.13, 0.15, 16), 'metal', [0, 0.65, 0.42], [Math.PI / 2 - 0.35, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.085, 0.085, 0.12, 14), 'dark', [0, 0.67, 0.47], [Math.PI / 2 - 0.35, 0, 0]);
  addPart(parts, new THREE.SphereGeometry(0.11, 10, 8), 'metal', [0, 0.38, -0.30]);
  addPart(parts, new THREE.BoxGeometry(0.08, 0.04, 0.08), 'metal', [0, 0.52, -0.15], [-0.35, 0, 0]);

  // Cannonball Stack & Ramrod
  addPart(parts, new THREE.BoxGeometry(0.18, 0.06, 0.24), 'wood', [0.22, 0.12, -0.24]);
  addPart(parts, new THREE.SphereGeometry(0.065, 10, 10), 'dark', [0.17, 0.18, -0.28]);
  addPart(parts, new THREE.SphereGeometry(0.065, 10, 10), 'dark', [0.26, 0.18, -0.28]);
  addPart(parts, new THREE.SphereGeometry(0.065, 10, 10), 'dark', [0.21, 0.28, -0.28]);
  addPart(parts, new THREE.CylinderGeometry(0.015, 0.015, 0.85, 6), 'dark', [-0.24, 0.38, -0.16], [0.4, 0, -0.2]);

  return parts;
}

// ----------------------------------------------------
// 7. Soldier (兵 / 卒) - 陷阵铁卫
// ----------------------------------------------------
function soldierParts(): Part[] {
  const parts: Part[] = [];
  // Plinth
  addPart(parts, new THREE.CylinderGeometry(0.42, 0.44, 0.07, 8), 'dark', [0, 0.035, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.39, 0.42, 0.025, 8), 'metal', [0, 0.08, 0]);

  // Boots & Greaves
  addPart(parts, new THREE.BoxGeometry(0.12, 0.18, 0.15), 'dark', [-0.11, 0.16, 0.02]);
  addPart(parts, new THREE.BoxGeometry(0.12, 0.18, 0.15), 'dark', [0.11, 0.16, 0.02]);
  addPart(parts, new THREE.BoxGeometry(0.11, 0.16, 0.06), 'metal', [-0.11, 0.18, 0.08]);
  addPart(parts, new THREE.BoxGeometry(0.11, 0.16, 0.06), 'metal', [0.11, 0.18, 0.08]);

  // Lower Skirt & Belt
  addPart(parts, new THREE.CylinderGeometry(0.24, 0.30, 0.28, 8), 'primary', [0, 0.36, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.24, 0.24, 0.07, 8), 'dark', [0, 0.48, 0]);
  addPart(parts, new THREE.BoxGeometry(0.12, 0.09, 0.06), 'metal', [0, 0.48, 0.14]);

  // Torso / Cuirass
  addPart(parts, new THREE.BoxGeometry(0.36, 0.30, 0.22), 'primary', [0, 0.64, 0]);
  addPart(parts, new THREE.BoxGeometry(0.22, 0.24, 0.05), 'metal', [0, 0.64, 0.11]);
  addPart(parts, new THREE.SphereGeometry(0.10, 8, 8), 'metal', [-0.22, 0.72, 0.02]);
  addPart(parts, new THREE.SphereGeometry(0.10, 8, 8), 'metal', [0.22, 0.72, 0.02]);
  addPart(parts, new THREE.CylinderGeometry(0.06, 0.07, 0.22, 8), 'primary', [-0.22, 0.56, 0.06]);
  addPart(parts, new THREE.CylinderGeometry(0.06, 0.07, 0.22, 8), 'primary', [0.22, 0.56, 0.08]);
  addPart(parts, new THREE.SphereGeometry(0.06, 8, 8), 'skin', [-0.20, 0.46, 0.16]);
  addPart(parts, new THREE.SphereGeometry(0.06, 8, 8), 'skin', [0.20, 0.50, 0.14]);

  // Head & Helmet
  addPart(parts, new THREE.SphereGeometry(0.11, 10, 8), 'skin', [0, 0.86, 0.02]);
  addPart(parts, new THREE.CylinderGeometry(0.20, 0.14, 0.06, 8), 'metal', [0, 0.96, 0.02]);
  addPart(parts, new THREE.ConeGeometry(0.16, 0.24, 8), 'metal', [0, 1.08, 0.02]);
  addPart(parts, new THREE.CylinderGeometry(0.15, 0.17, 0.14, 8), 'dark', [0, 0.88, -0.02]);
  addPart(parts, new THREE.CylinderGeometry(0.015, 0.015, 0.16, 6), 'metal', [0, 1.24, 0.02]);
  addPart(parts, new THREE.ConeGeometry(0.06, 0.22, 6), 'accent', [0, 1.32, -0.01], [-0.15, 0, 0]);

  // Tiger Beast Shield (兽面虎头盾)
  addPart(parts, new THREE.BoxGeometry(0.30, 0.52, 0.05), 'primary', [-0.24, 0.52, 0.18], [0, 0.25, 0]);
  addPart(parts, new THREE.BoxGeometry(0.32, 0.54, 0.03), 'metal', [-0.24, 0.52, 0.19], [0, 0.25, 0]);
  addPart(parts, new THREE.SphereGeometry(0.11, 8, 8), 'metal', [-0.24, 0.52, 0.22], [0, 0.25, 0], [1, 1.2, 0.5]);
  addPart(parts, new THREE.ConeGeometry(0.03, 0.10, 4), 'metal', [-0.24, 0.62, 0.23], [-0.2, 0.25, 0]);

  // Battle Spear with Red Tassel (红缨长枪)
  addPart(parts, new THREE.CylinderGeometry(0.018, 0.018, 1.18, 6), 'wood', [0.22, 0.58, 0.14], [-0.08, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6), 'metal', [0.22, 1.08, 0.18]);
  addPart(parts, new THREE.ConeGeometry(0.07, 0.20, 8), 'accent', [0.22, 1.14, 0.18], [Math.PI, 0, 0]);
  addPart(parts, new THREE.ConeGeometry(0.06, 0.26, 6), 'metal', [0.22, 1.28, 0.18]);
  addPart(parts, new THREE.BoxGeometry(0.02, 0.24, 0.04), 'metal', [0.22, 1.28, 0.18]);

  return parts;
}

function buildFigurine(
  piece: Piece,
  intensity: number
): { figurine: THREE.Group; materials: Record<MaterialKind, THREE.Material> } {
  const materials = colorMaterials(piece.color, intensity);
  const partMap: Record<Piece['type'], () => Part[]> = {
    general: generalParts,
    advisor: advisorParts,
    elephant: elephantParts,
    horse: horseParts,
    chariot: chariotParts,
    cannon: cannonParts,
    soldier: soldierParts
  };
  const figurine = mergeParts(partMap[piece.type](), materials);
  figurine.rotation.y = piece.color === 'red' ? Math.PI : 0;
  figurine.position.y = 0.02;
  return { figurine, materials };
}

function createTokenGeometry(): THREE.BufferGeometry {
  const radius = 0.45;
  const height = 0.32;
  const points: THREE.Vector2[] = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(radius * 0.90, 0),
    new THREE.Vector2(radius, height * 0.12),
    new THREE.Vector2(radius * 0.98, height * 0.28),
    new THREE.Vector2(radius * 0.95, height * 0.50),
    new THREE.Vector2(radius * 0.98, height * 0.75),
    new THREE.Vector2(radius * 1.00, height * 0.88),
    new THREE.Vector2(radius * 0.96, height * 0.97),
    new THREE.Vector2(radius * 0.88, height),
    new THREE.Vector2(radius * 0.84, height - 0.012),
    new THREE.Vector2(0, height - 0.012)
  ];
  return new THREE.LatheGeometry(points, 48);
}

function createBadge(
  piece: Piece,
  glyphColor: string,
  outlineColor: string
): THREE.Group {
  const badgeGroup = new THREE.Group();
  badgeGroup.name = 'badge-group';

  const radius = 0.23;
  const plaqueMat = new THREE.MeshStandardMaterial({
    color: piece.color === 'red' ? 0x240b08 : 0x141615,
    roughness: 0.45,
    metalness: 0.45
  });
  const plaque = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.04, 0.026, 32), plaqueMat);
  plaque.rotation.x = Math.PI / 2;
  plaque.castShadow = true;
  badgeGroup.add(plaque);

  const rimMat = new THREE.MeshStandardMaterial({
    color: piece.color === 'red' ? palette.gold : 0xd2cec2,
    roughness: 0.25,
    metalness: 0.85
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius * 1.02, 0.015, 10, 32), rimMat);
  badgeGroup.add(rim);

  const badgeTex = makeGlyphTexture(PIECE_GLYPHS[piece.color][piece.type], glyphColor, outlineColor, 512, false);
  const faceMat = new THREE.MeshBasicMaterial({
    map: badgeTex,
    transparent: true,
    depthWrite: false
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(radius * 1.95, radius * 1.95), faceMat);
  face.position.z = 0.016;
  badgeGroup.add(face);

  return badgeGroup;
}

export function createPieceObject(piece: Piece, skin: BoardSkin, intensity: number): PieceObject {
  const group = new THREE.Group() as PieceObject;
  group.name = `piece-${piece.id}`;
  const glyphColor = piece.color === 'red' ? '#ffebb5' : '#d4f7ea';
  const outlineColor = piece.color === 'red' ? '#1a0402' : '#05110d';

  const woodMap = makeWoodTexture(piece.color);
  const baseMaterial = new THREE.MeshStandardMaterial({
    map: woodMap,
    color: piece.color === 'red' ? 0xfff0ed : 0xf2f2f0,
    metalness: 0.08,
    roughness: 0.45,
    emissive: piece.color === 'red' ? 0x180301 : 0x050706,
    emissiveIntensity: 0.18
  });
  const base = new THREE.Mesh(createTokenGeometry(), baseMaterial);
  base.position.y = 0;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: piece.color === 'red' ? palette.gold : 0xcdc6b8,
    metalness: 0.75,
    roughness: 0.3,
    emissive: piece.color === 'red' ? 0x2d1505 : 0x111b18,
    emissiveIntensity: 0.2
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.448, 0.011, 8, 48), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.282;
  rim.castShadow = true;
  group.add(rim);

  const glyphTex = makeGlyphTexture(PIECE_GLYPHS[piece.color][piece.type], glyphColor, outlineColor, 512, true);
  const glyphMaterial = new THREE.MeshStandardMaterial({
    map: glyphTex,
    transparent: true,
    roughness: 0.85,
    metalness: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const glyph = new THREE.Mesh(new THREE.CircleGeometry(0.38, 36), glyphMaterial);
  glyph.rotation.x = -Math.PI / 2;
  glyph.position.set(0, 0.310, 0);
  glyph.renderOrder = 2;
  group.add(glyph);

  const { figurine, materials: figurineMaterials } = buildFigurine(piece, intensity);
  group.add(figurine);

  // Single, noble, highly readable seal badge on front of pedestal - ONE clean badge per piece!
  const badge = createBadge(piece, glyphColor, outlineColor);
  badge.position.set(0, 0.20, 0.38);
  badge.rotation.x = -0.96;
  group.add(badge);

  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.46, 0.54, 48),
    new THREE.MeshBasicMaterial({
      color: piece.color === 'red' ? 0xff9944 : 0x8ff5df,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  selectionRing.rotation.x = -Math.PI / 2;
  selectionRing.position.y = 0.012;
  group.add(selectionRing);

  group.userData = {
    piece,
    baseMaterial,
    glyphMaterial,
    glyph,
    figurine,
    figurineMaterials,
    intensity,
    selectionRing,
    base,
    rim,
    badge
  };
  setPieceSkin(group, skin);
  return group;
}

export function setPieceSkin(object: PieceObject, skin: BoardSkin): void {
  const isFigurine = skin === 'figurine';
  object.userData.figurine.visible = isFigurine;
  if (object.userData.badge) object.userData.badge.visible = isFigurine;
  object.userData.base.visible = !isFigurine;
  object.userData.rim.visible = !isFigurine;
  object.userData.glyph.visible = !isFigurine;
}

export function setPieceSelected(object: PieceObject, selected: boolean): void {
  const material = object.userData.selectionRing.material as THREE.MeshBasicMaterial;
  material.opacity = selected ? 0.95 : 0;
}

export function setPieceThreatened(object: PieceObject, threatened: boolean): void {
  object.userData.baseMaterial.emissive.setHex(threatened ? 0xff2c12 : object.userData.piece.color === 'red' ? 0x280400 : 0x07100e);
  object.userData.baseMaterial.emissiveIntensity = threatened ? 0.9 : 0.36;
  if (object.userData.figurineMaterials) {
    const primaryMat = object.userData.figurineMaterials.primary as THREE.MeshStandardMaterial;
    if (primaryMat) {
      primaryMat.emissive.setHex(threatened ? 0x991b1b : object.userData.piece.color === 'red' ? 0x2e0602 : 0x06080a);
      primaryMat.emissiveIntensity = threatened ? 0.95 : object.userData.intensity;
    }
  }
}
