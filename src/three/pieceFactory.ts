import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { PIECE_GLYPHS } from '../i18n/chess';
import type { BoardSkin, Piece, PieceColor } from '../types/chess';
import { makeGlyphTexture, makeWoodTexture, palette } from './materials';

type MaterialKind = 'primary' | 'metal' | 'dark' | 'skin';

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

const colorMaterials = (color: PieceColor, intensity: number) => ({
  primary: new THREE.MeshStandardMaterial({
    color: color === 'red' ? 0x813127 : 0x252320,
    roughness: 0.5,
    metalness: 0.18,
    emissive: color === 'red' ? 0x300500 : 0x080808,
    emissiveIntensity: intensity
  }),
  metal: new THREE.MeshStandardMaterial({
    color: color === 'red' ? palette.gold : 0xa7a08e,
    roughness: 0.28,
    metalness: 0.78,
    emissive: color === 'red' ? 0x4d2304 : 0x181814,
    emissiveIntensity: intensity * 0.5
  }),
  dark: new THREE.MeshStandardMaterial({
    color: color === 'red' ? 0x2d120f : 0x0b0b0a,
    roughness: 0.68,
    metalness: 0.22
  }),
  skin: new THREE.MeshStandardMaterial({
    color: color === 'red' ? 0xb27c52 : 0x8d6f52,
    roughness: 0.74,
    metalness: 0.02
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

function generalParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.CylinderGeometry(0.36, 0.40, 0.05, 8), 'dark', [0, 0.025, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.32, 0.36, 0.02, 8), 'metal', [0, 0.06, 0]);
  addPart(parts, new THREE.BoxGeometry(0.11, 0.18, 0.14), 'dark', [-0.11, 0.16, 0.02]);
  addPart(parts, new THREE.BoxGeometry(0.11, 0.18, 0.14), 'dark', [0.11, 0.16, 0.02]);
  addPart(parts, new THREE.BoxGeometry(0.10, 0.12, 0.04), 'metal', [-0.11, 0.17, 0.08]);
  addPart(parts, new THREE.BoxGeometry(0.10, 0.12, 0.04), 'metal', [0.11, 0.17, 0.08]);
  addPart(parts, new THREE.CylinderGeometry(0.24, 0.31, 0.26, 8), 'primary', [0, 0.35, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.25, 0.24, 0.08, 8), 'dark', [0, 0.48, 0]);
  addPart(parts, new THREE.BoxGeometry(0.14, 0.10, 0.08), 'metal', [0, 0.48, 0.14]);
  addPart(parts, new THREE.BoxGeometry(0.36, 0.28, 0.22), 'primary', [0, 0.65, 0.02]);
  addPart(parts, new THREE.BoxGeometry(0.26, 0.24, 0.06), 'metal', [0, 0.66, 0.12]);
  addPart(parts, new THREE.SphereGeometry(0.11, 8, 8), 'metal', [-0.24, 0.74, 0.02]);
  addPart(parts, new THREE.SphereGeometry(0.11, 8, 8), 'metal', [0.24, 0.74, 0.02]);
  addPart(parts, new THREE.BoxGeometry(0.42, 0.58, 0.06), 'primary', [0, 0.54, -0.11], [0.12, 0, 0]);
  addPart(parts, new THREE.SphereGeometry(0.11, 10, 8), 'skin', [0, 0.86, 0.03]);
  addPart(parts, new THREE.CylinderGeometry(0.11, 0.13, 0.16, 8), 'metal', [0, 0.96, 0.02]);
  addPart(parts, new THREE.ConeGeometry(0.06, 0.22, 6), 'primary', [0, 1.10, 0.02]);
  addPart(parts, new THREE.BoxGeometry(0.04, 0.18, 0.12), 'metal', [-0.14, 0.98, 0.02], [0, 0, 0.3]);
  addPart(parts, new THREE.BoxGeometry(0.04, 0.18, 0.12), 'metal', [0.14, 0.98, 0.02], [0, 0, -0.3]);
  addPart(parts, new THREE.CylinderGeometry(0.018, 0.018, 0.76, 6), 'metal', [0.18, 0.44, 0.16], [0, 0, -0.1]);
  addPart(parts, new THREE.BoxGeometry(0.14, 0.04, 0.04), 'metal', [0.18, 0.78, 0.16]);
  addPart(parts, new THREE.SphereGeometry(0.035, 6, 6), 'metal', [0.18, 0.88, 0.16]);
  return parts;
}

function advisorParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.CylinderGeometry(0.36, 0.40, 0.05, 8), 'dark', [0, 0.025, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.20, 0.28, 0.46, 8), 'primary', [0, 0.28, 0]);
  addPart(parts, new THREE.BoxGeometry(0.28, 0.26, 0.18), 'dark', [0, 0.58, 0]);
  addPart(parts, new THREE.BoxGeometry(0.20, 0.20, 0.05), 'metal', [0, 0.58, 0.09]);
  addPart(parts, new THREE.BoxGeometry(0.09, 0.14, 0.12), 'metal', [-0.18, 0.64, 0]);
  addPart(parts, new THREE.BoxGeometry(0.09, 0.14, 0.12), 'metal', [0.18, 0.64, 0]);
  addPart(parts, new THREE.SphereGeometry(0.10, 10, 8), 'skin', [0, 0.77, 0.02]);
  addPart(parts, new THREE.ConeGeometry(0.12, 0.20, 7), 'metal', [0, 0.92, 0.02]);
  addPart(parts, new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), 'primary', [-0.08, 1.05, 0], [0, 0, 0.2]);
  addPart(parts, new THREE.CylinderGeometry(0.012, 0.012, 0.24, 6), 'primary', [0.08, 1.05, 0], [0, 0, -0.2]);
  addPart(parts, new THREE.CylinderGeometry(0.016, 0.016, 0.98, 6), 'dark', [0.20, 0.49, 0.12]);
  addPart(parts, new THREE.ConeGeometry(0.06, 0.22, 6), 'metal', [0.20, 1.06, 0.12]);
  addPart(parts, new THREE.BoxGeometry(0.12, 0.10, 0.02), 'metal', [0.24, 0.92, 0.12]);
  return parts;
}

function elephantParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.CylinderGeometry(0.38, 0.42, 0.05, 8), 'dark', [0, 0.025, 0]);
  const legPositions: Array<[number, number]> = [[-0.16, 0.14], [0.16, 0.14], [-0.16, -0.14], [0.16, -0.14]];
  legPositions.forEach(([lx, lz]) => {
    addPart(parts, new THREE.CylinderGeometry(0.065, 0.08, 0.26, 8), 'dark', [lx, 0.16, lz]);
    addPart(parts, new THREE.CylinderGeometry(0.075, 0.082, 0.06, 8), 'metal', [lx, 0.12, lz]);
  });
  addPart(parts, new THREE.BoxGeometry(0.42, 0.32, 0.48), 'primary', [0, 0.38, 0]);
  addPart(parts, new THREE.SphereGeometry(0.18, 10, 8), 'primary', [0, 0.42, 0.26], [0, 0, 0], [1, 1, 0.9]);
  addPart(parts, new THREE.BoxGeometry(0.14, 0.18, 0.03), 'dark', [-0.22, 0.45, 0.20], [0, 0.3, 0.1]);
  addPart(parts, new THREE.BoxGeometry(0.14, 0.18, 0.03), 'dark', [0.22, 0.45, 0.20], [0, -0.3, -0.1]);
  addPart(parts, new THREE.CylinderGeometry(0.04, 0.06, 0.28, 8), 'skin', [0, 0.28, 0.38], [0.35, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.025, 0.04, 0.14, 8), 'skin', [0, 0.18, 0.48], [1.1, 0, 0]);
  addPart(parts, new THREE.ConeGeometry(0.032, 0.22, 6), 'metal', [-0.13, 0.32, 0.42], [0.4, 0, -0.3]);
  addPart(parts, new THREE.ConeGeometry(0.032, 0.22, 6), 'metal', [0.13, 0.32, 0.42], [0.4, 0, 0.3]);
  addPart(parts, new THREE.BoxGeometry(0.36, 0.20, 0.34), 'metal', [0, 0.60, -0.02]);
  addPart(parts, new THREE.CylinderGeometry(0.014, 0.014, 0.42, 6), 'dark', [0, 0.85, -0.14]);
  addPart(parts, new THREE.BoxGeometry(0.24, 0.16, 0.02), 'primary', [-0.10, 0.95, -0.14]);
  return parts;
}

function horseParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.CylinderGeometry(0.38, 0.42, 0.05, 8), 'dark', [0, 0.025, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.04, 0.05, 0.32, 6), 'dark', [-0.14, 0.18, 0.18], [-0.15, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.04, 0.05, 0.32, 6), 'dark', [0.14, 0.18, 0.18], [-0.15, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.045, 0.05, 0.32, 6), 'dark', [-0.14, 0.18, -0.18], [0.15, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.045, 0.05, 0.32, 6), 'dark', [0.14, 0.18, -0.18], [0.15, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.32, 0.26, 0.48), 'primary', [0, 0.40, 0]);
  addPart(parts, new THREE.BoxGeometry(0.34, 0.08, 0.28), 'metal', [0, 0.46, -0.02]);
  addPart(parts, new THREE.CylinderGeometry(0.10, 0.14, 0.36, 7), 'primary', [0, 0.60, 0.16], [0.42, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.14, 0.18, 0.26), 'dark', [0, 0.74, 0.28], [0.22, 0, 0]);
  addPart(parts, new THREE.ConeGeometry(0.07, 0.14, 6), 'metal', [0, 0.86, 0.32]);
  addPart(parts, new THREE.BoxGeometry(0.05, 0.28, 0.08), 'primary', [0, 0.72, 0.06], [-0.3, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.016, 0.016, 0.98, 6), 'metal', [0.20, 0.52, 0.10], [0, 0, -0.12]);
  addPart(parts, new THREE.ConeGeometry(0.05, 0.20, 6), 'metal', [0.26, 1.05, 0.10], [0, 0, -0.12]);
  addPart(parts, new THREE.BoxGeometry(0.22, 0.14, 0.02), 'primary', [0.38, 0.95, 0.10]);
  return parts;
}

function chariotParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.CylinderGeometry(0.38, 0.42, 0.05, 8), 'dark', [0, 0.025, 0]);
  addPart(parts, new THREE.BoxGeometry(0.44, 0.24, 0.56), 'primary', [0, 0.26, 0]);
  addPart(parts, new THREE.BoxGeometry(0.46, 0.06, 0.58), 'metal', [0, 0.37, 0]);
  const wheelOffsets: Array<[number, number]> = [[0.28, 0.18], [-0.28, 0.18], [0.28, -0.18], [-0.28, -0.18]];
  wheelOffsets.forEach(([wx, wz]) => {
    addPart(parts, new THREE.CylinderGeometry(0.18, 0.18, 0.07, 16), 'metal', [wx, 0.22, wz], [0, 0, Math.PI / 2]);
    addPart(parts, new THREE.ConeGeometry(0.04, 0.12, 6), 'metal', [wx > 0 ? wx + 0.08 : wx - 0.08, 0.22, wz], [0, 0, wx > 0 ? -Math.PI / 2 : Math.PI / 2]);
  });
  addPart(parts, new THREE.BoxGeometry(0.36, 0.22, 0.36), 'dark', [0, 0.46, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.02, 0.02, 0.46, 6), 'metal', [0, 0.62, 0.08], [Math.PI / 2, 0, 0]);
  addPart(parts, new THREE.BoxGeometry(0.42, 0.03, 0.06), 'metal', [0, 0.62, 0.24]);
  addPart(parts, new THREE.CylinderGeometry(0.016, 0.016, 0.88, 6), 'dark', [-0.16, 0.66, -0.18]);
  addPart(parts, new THREE.BoxGeometry(0.24, 0.22, 0.02), 'primary', [-0.28, 0.96, -0.18]);
  return parts;
}

function cannonParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.CylinderGeometry(0.38, 0.42, 0.05, 8), 'dark', [0, 0.025, 0]);
  addPart(parts, new THREE.BoxGeometry(0.38, 0.18, 0.52), 'dark', [0, 0.22, -0.04], [0.15, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.22, 0.22, 0.08, 18), 'metal', [0.28, 0.22, 0.12], [0, 0, Math.PI / 2]);
  addPart(parts, new THREE.CylinderGeometry(0.22, 0.22, 0.08, 18), 'metal', [-0.28, 0.22, 0.12], [0, 0, Math.PI / 2]);
  addPart(parts, new THREE.CylinderGeometry(0.10, 0.15, 0.72, 14), 'primary', [0, 0.46, 0.08], [Math.PI / 2 - 0.35, 0, 0]);
  addPart(parts, new THREE.TorusGeometry(0.13, 0.025, 6, 16), 'metal', [0, 0.58, 0.40], [-0.35, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.13, 0.11, 0.12, 14), 'metal', [0, 0.58, 0.40], [Math.PI / 2 - 0.35, 0, 0]);
  addPart(parts, new THREE.SphereGeometry(0.09, 8, 8), 'metal', [0, 0.34, -0.24]);
  addPart(parts, new THREE.SphereGeometry(0.055, 8, 8), 'dark', [0.18, 0.34, -0.16]);
  addPart(parts, new THREE.SphereGeometry(0.055, 8, 8), 'dark', [0.18, 0.34, -0.05]);
  addPart(parts, new THREE.SphereGeometry(0.055, 8, 8), 'dark', [0.18, 0.43, -0.10]);
  return parts;
}

function soldierParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.CylinderGeometry(0.36, 0.40, 0.05, 8), 'dark', [0, 0.025, 0]);
  addPart(parts, new THREE.BoxGeometry(0.09, 0.18, 0.11), 'dark', [-0.09, 0.14, 0]);
  addPart(parts, new THREE.BoxGeometry(0.09, 0.18, 0.11), 'dark', [0.09, 0.14, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.18, 0.24, 0.26, 8), 'primary', [0, 0.32, 0]);
  addPart(parts, new THREE.BoxGeometry(0.28, 0.24, 0.18), 'primary', [0, 0.52, 0]);
  addPart(parts, new THREE.BoxGeometry(0.18, 0.18, 0.04), 'metal', [0, 0.52, 0.10]);
  addPart(parts, new THREE.SphereGeometry(0.095, 10, 8), 'skin', [0, 0.70, 0.02]);
  addPart(parts, new THREE.ConeGeometry(0.13, 0.16, 8), 'metal', [0, 0.82, 0.02]);
  addPart(parts, new THREE.CylinderGeometry(0.01, 0.01, 0.12, 6), 'primary', [0, 0.94, 0.02]);
  addPart(parts, new THREE.BoxGeometry(0.24, 0.42, 0.04), 'primary', [-0.20, 0.42, 0.14], [0, 0.25, 0]);
  addPart(parts, new THREE.BoxGeometry(0.20, 0.36, 0.02), 'metal', [-0.20, 0.42, 0.16], [0, 0.25, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.015, 0.015, 0.96, 6), 'dark', [0.18, 0.48, 0.12]);
  addPart(parts, new THREE.ConeGeometry(0.05, 0.20, 6), 'metal', [0.18, 1.02, 0.12]);
  addPart(parts, new THREE.CylinderGeometry(0.03, 0.03, 0.08, 6), 'primary', [0.18, 0.90, 0.12]);
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
  const radius = 0.42;
  const height = 0.30;
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

function createBadge(piece: Piece, glyphColor: string, outlineColor: string): THREE.Group {
  const badgeGroup = new THREE.Group();
  badgeGroup.name = 'badge-group';

  const plaqueMat = new THREE.MeshStandardMaterial({
    color: piece.color === 'red' ? 0x2b0d09 : 0x161817,
    roughness: 0.65,
    metalness: 0.35
  });
  const plaque = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.19, 0.024, 24), plaqueMat);
  plaque.rotation.x = Math.PI / 2;
  plaque.castShadow = true;
  badgeGroup.add(plaque);

  const rimMat = new THREE.MeshStandardMaterial({
    color: piece.color === 'red' ? palette.gold : 0xc7c0af,
    roughness: 0.35,
    metalness: 0.75
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.182, 0.012, 8, 24), rimMat);
  badgeGroup.add(rim);

  const badgeTex = makeGlyphTexture(PIECE_GLYPHS[piece.color][piece.type], glyphColor, outlineColor, 512, false);
  const faceMat = new THREE.MeshBasicMaterial({
    map: badgeTex,
    transparent: true,
    depthWrite: false
  });
  const face = new THREE.Mesh(new THREE.PlaneGeometry(0.34, 0.34), faceMat);
  face.position.z = 0.014;
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
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.418, 0.010, 8, 48), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.264;
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
  const glyph = new THREE.Mesh(new THREE.CircleGeometry(0.35, 36), glyphMaterial);
  glyph.rotation.x = -Math.PI / 2;
  glyph.position.set(0, 0.290, 0);
  glyph.renderOrder = 2;
  group.add(glyph);

  const { figurine, materials: figurineMaterials } = buildFigurine(piece, intensity);
  group.add(figurine);

  const badge = createBadge(piece, glyphColor, outlineColor);
  badge.position.set(0, 0.17, 0.36);
  badge.rotation.x = -0.46;
  group.add(badge);

  const selectionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.44, 0.52, 48),
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
      primaryMat.emissive.setHex(threatened ? 0x991b1b : object.userData.piece.color === 'red' ? 0x300500 : 0x080808);
      primaryMat.emissiveIntensity = threatened ? 0.95 : object.userData.intensity;
    }
  }
}
