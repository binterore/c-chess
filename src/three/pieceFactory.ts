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
    selectionRing: THREE.Mesh;
    base: THREE.Mesh;
    rim: THREE.Mesh;
    badge?: THREE.Mesh;
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
  addPart(parts, new THREE.ConeGeometry(0.27, 0.48, 6), 'dark', [0, 0.24, 0.09], [0.12, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.15, 0.22, 0.34, 7), 'primary', [0, 0.42, 0]);
  addPart(parts, new THREE.SphereGeometry(0.135, 12, 9), 'skin', [0, 0.63, 0]);
  addPart(parts, new THREE.ConeGeometry(0.17, 0.11, 7), 'metal', [0, 0.76, 0]);
  addPart(parts, new THREE.BoxGeometry(0.32, 0.34, 0.13), 'primary', [0, 0.46, 0.19]);
  addPart(parts, new THREE.BoxGeometry(0.035, 0.52, 0.035), 'metal', [0.25, 0.34, 0.06], [0, 0, -0.12]);
  addPart(parts, new THREE.BoxGeometry(0.17, 0.035, 0.035), 'metal', [0.24, 0.48, 0.06], [0, 0, -0.12]);
  addPart(parts, new THREE.TorusGeometry(0.13, 0.018, 5, 12), 'metal', [0, 0.52, 0.19], [0, 0, 0]);
  return parts;
}

function advisorParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.ConeGeometry(0.25, 0.52, 7), 'primary', [0, 0.28, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.09, 0.14, 0.2, 7), 'primary', [0, 0.52, 0]);
  addPart(parts, new THREE.SphereGeometry(0.12, 12, 8), 'skin', [0, 0.67, 0]);
  addPart(parts, new THREE.ConeGeometry(0.13, 0.16, 7), 'dark', [0, 0.8, 0]);
  addPart(parts, new THREE.TorusGeometry(0.21, 0.012, 4, 20), 'metal', [0, 0.28, 0], [Math.PI / 2, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.012, 0.012, 0.43, 6), 'metal', [0.22, 0.4, 0.08]);
  addPart(parts, new THREE.CircleGeometry(0.1, 16), 'metal', [0.22, 0.63, 0.08], [0, 0, 0]);
  return parts;
}

function elephantParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.SphereGeometry(0.28, 12, 9), 'primary', [0, 0.4, 0], [0, 0, 0], [1, 0.8, 1.2]);
  addPart(parts, new THREE.SphereGeometry(0.2, 10, 8), 'primary', [0, 0.46, 0.27], [0, 0, 0], [1, 1, 0.9]);
  addPart(parts, new THREE.SphereGeometry(0.08, 8, 6), 'skin', [0.12, 0.45, 0.43]);
  addPart(parts, new THREE.SphereGeometry(0.08, 8, 6), 'skin', [-0.12, 0.45, 0.43]);
  addPart(parts, new THREE.CylinderGeometry(0.04, 0.055, 0.3, 7), 'skin', [0, 0.28, 0.45], [0.3, 0, 0]);
  addPart(parts, new THREE.ConeGeometry(0.035, 0.16, 6), 'metal', [0.16, 0.37, 0.46], [0.1, 0, -0.3]);
  addPart(parts, new THREE.ConeGeometry(0.035, 0.16, 6), 'metal', [-0.16, 0.37, 0.46], [0.1, 0, 0.3]);
  for (const x of [-0.18, 0.18]) {
    addPart(parts, new THREE.CylinderGeometry(0.06, 0.075, 0.3, 7), 'dark', [x, 0.18, 0.12]);
    addPart(parts, new THREE.CylinderGeometry(0.06, 0.075, 0.3, 7), 'dark', [x, 0.18, -0.13]);
  }
  addPart(parts, new THREE.TorusGeometry(0.17, 0.026, 5, 12), 'metal', [0, 0.52, 0.23], [0, 0, 0], [1.2, 0.8, 1]);
  return parts;
}

function horseParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.SphereGeometry(0.24, 10, 8), 'primary', [0, 0.38, -0.02], [0, 0, 0], [0.8, 0.75, 1.25]);
  addPart(parts, new THREE.CylinderGeometry(0.11, 0.17, 0.38, 7), 'primary', [0, 0.57, 0.17], [0.28, 0, 0]);
  addPart(parts, new THREE.SphereGeometry(0.15, 10, 8), 'primary', [0, 0.72, 0.34], [0.12, 0, 0], [0.8, 0.9, 1.3]);
  addPart(parts, new THREE.BoxGeometry(0.09, 0.2, 0.08), 'metal', [0.12, 0.9, 0.31], [0.15, 0, 0.25]);
  addPart(parts, new THREE.BoxGeometry(0.09, 0.2, 0.08), 'metal', [-0.12, 0.9, 0.31], [0.15, 0, -0.25]);
  addPart(parts, new THREE.BoxGeometry(0.26, 0.11, 0.18), 'metal', [0, 0.62, 0.42], [0.16, 0, 0]);
  for (const x of [-0.15, 0.15]) {
    addPart(parts, new THREE.CylinderGeometry(0.038, 0.055, 0.34, 6), 'dark', [x, 0.18, 0.2], [-0.12, 0, 0]);
    addPart(parts, new THREE.CylinderGeometry(0.038, 0.05, 0.32, 6), 'dark', [x, 0.18, -0.19], [0.1, 0, 0]);
  }
  addPart(parts, new THREE.CylinderGeometry(0.018, 0.018, 0.94, 6), 'metal', [0.19, 0.5, 0.15], [0, 0, -0.12]);
  addPart(parts, new THREE.ConeGeometry(0.06, 0.18, 6), 'metal', [0.25, 0.97, 0.15], [0, 0, -0.12]);
  return parts;
}

function chariotParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.BoxGeometry(0.43, 0.22, 0.58), 'primary', [0, 0.31, 0]);
  addPart(parts, new THREE.BoxGeometry(0.36, 0.2, 0.3), 'dark', [0, 0.5, -0.04]);
  addPart(parts, new THREE.CylinderGeometry(0.17, 0.17, 0.07, 16), 'metal', [0.26, 0.28, 0.17], [0, 0, Math.PI / 2]);
  addPart(parts, new THREE.CylinderGeometry(0.17, 0.17, 0.07, 16), 'metal', [-0.26, 0.28, 0.17], [0, 0, Math.PI / 2]);
  addPart(parts, new THREE.CylinderGeometry(0.17, 0.17, 0.07, 16), 'metal', [0.26, 0.28, -0.17], [0, 0, Math.PI / 2]);
  addPart(parts, new THREE.CylinderGeometry(0.17, 0.17, 0.07, 16), 'metal', [-0.26, 0.28, -0.17], [0, 0, Math.PI / 2]);
  addPart(parts, new THREE.CylinderGeometry(0.018, 0.018, 0.9, 5), 'dark', [-0.18, 0.62, -0.2]);
  addPart(parts, new THREE.PlaneGeometry(0.22, 0.28), 'primary', [-0.29, 0.94, -0.2], [0, Math.PI / 2, 0]);
  addPart(parts, new THREE.ConeGeometry(0.06, 0.16, 6), 'metal', [0.18, 0.99, 0.1]);
  addPart(parts, new THREE.CylinderGeometry(0.018, 0.018, 0.78, 5), 'dark', [0.18, 0.59, 0.1]);
  return parts;
}

function cannonParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.BoxGeometry(0.4, 0.2, 0.55), 'dark', [0, 0.28, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.2, 0.2, 0.07, 18), 'metal', [0.28, 0.25, 0.15], [0, 0, Math.PI / 2]);
  addPart(parts, new THREE.CylinderGeometry(0.2, 0.2, 0.07, 18), 'metal', [-0.28, 0.25, 0.15], [0, 0, Math.PI / 2]);
  addPart(parts, new THREE.CylinderGeometry(0.1, 0.14, 0.64, 12), 'primary', [0, 0.56, 0.03], [Math.PI / 2, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.11, 0.11, 0.16, 12), 'metal', [0, 0.62, 0.38], [Math.PI / 2, 0, 0]);
  addPart(parts, new THREE.TorusGeometry(0.12, 0.024, 5, 14), 'metal', [0, 0.64, 0.47], [0, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.035, 0.045, 0.28, 7), 'metal', [0, 0.36, -0.2], [0.5, 0, 0]);
  return parts;
}

function soldierParts(): Part[] {
  const parts: Part[] = [];
  addPart(parts, new THREE.ConeGeometry(0.2, 0.46, 7), 'primary', [0, 0.29, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.13, 0.16, 0.2, 7), 'primary', [0, 0.51, 0]);
  addPart(parts, new THREE.SphereGeometry(0.105, 10, 8), 'skin', [0, 0.64, 0]);
  addPart(parts, new THREE.ConeGeometry(0.15, 0.13, 7), 'metal', [0, 0.75, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.16, 0.16, 0.05, 14), 'dark', [0.19, 0.4, 0.18], [Math.PI / 2, 0, 0]);
  addPart(parts, new THREE.CylinderGeometry(0.018, 0.018, 0.9, 5), 'dark', [-0.2, 0.42, 0.05]);
  addPart(parts, new THREE.ConeGeometry(0.06, 0.16, 6), 'metal', [-0.2, 0.94, 0.05]);
  addPart(parts, new THREE.BoxGeometry(0.23, 0.035, 0.035), 'metal', [-0.2, 0.74, 0.05]);
  return parts;
}

function buildFigurine(piece: Piece, intensity: number): THREE.Group {
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
  figurine.rotation.y = piece.color === 'red' ? 0 : Math.PI;
  figurine.position.y = 0.02;
  return figurine;
}

function createTokenGeometry(): THREE.BufferGeometry {
  const radius = 0.42;
  const height = 0.24;
  const points: THREE.Vector2[] = [
    new THREE.Vector2(0, 0),
    new THREE.Vector2(radius * 0.88, 0),
    new THREE.Vector2(radius, height * 0.12),
    new THREE.Vector2(radius * 0.98, height * 0.36),
    new THREE.Vector2(radius * 0.95, height * 0.58),
    new THREE.Vector2(radius * 0.99, height * 0.84),
    new THREE.Vector2(radius * 0.95, height * 0.98),
    new THREE.Vector2(radius * 0.88, height),
    new THREE.Vector2(radius * 0.84, height - 0.006),
    new THREE.Vector2(0, height - 0.006)
  ];
  return new THREE.LatheGeometry(points, 48);
}

export function createPieceObject(piece: Piece, skin: BoardSkin, intensity: number): PieceObject {
  const group = new THREE.Group() as PieceObject;
  group.name = `piece-${piece.id}`;
  const glyphColor = piece.color === 'red' ? '#ffd88a' : '#f0f5f2';
  const glowColor = piece.color === 'red' ? 'rgba(255,75,30,0.85)' : 'rgba(100,230,200,0.65)';

  const woodMap = makeWoodTexture(piece.color);
  const baseMaterial = new THREE.MeshStandardMaterial({
    map: woodMap,
    color: piece.color === 'red' ? 0xfff0ed : 0xf2f2f0,
    metalness: 0.18,
    roughness: 0.3,
    emissive: piece.color === 'red' ? 0x240401 : 0x070c0a,
    emissiveIntensity: 0.25
  });
  const base = new THREE.Mesh(createTokenGeometry(), baseMaterial);
  base.position.y = 0;
  base.castShadow = true;
  base.receiveShadow = true;
  group.add(base);

  const rimMaterial = new THREE.MeshStandardMaterial({
    color: piece.color === 'red' ? palette.gold : 0xcdc6b8,
    metalness: 0.88,
    roughness: 0.22,
    emissive: piece.color === 'red' ? 0x4a2208 : 0x111b18,
    emissiveIntensity: 0.25
  });
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.395, 0.012, 8, 48), rimMaterial);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.202;
  rim.castShadow = true;
  group.add(rim);

  const glyphMaterial = new THREE.MeshStandardMaterial({
    map: makeGlyphTexture(PIECE_GLYPHS[piece.color][piece.type], glyphColor, glowColor, 512, true),
    transparent: true,
    roughness: 0.26,
    metalness: 0.42,
    depthWrite: false,
    side: THREE.DoubleSide
  });
  const glyph = new THREE.Mesh(new THREE.CircleGeometry(0.345, 36), glyphMaterial);
  glyph.rotation.x = -Math.PI / 2;
  glyph.position.set(0, 0.235, 0);
  glyph.renderOrder = 2;
  group.add(glyph);

  const figurine = buildFigurine(piece, intensity);
  figurine.visible = skin === 'figurine';
  group.add(figurine);

  const badgeMaterial = new THREE.MeshStandardMaterial({
    map: makeGlyphTexture(PIECE_GLYPHS[piece.color][piece.type], glyphColor, glowColor, 256, true),
    transparent: true,
    roughness: 0.3,
    metalness: 0.4,
    side: THREE.DoubleSide
  });
  const badge = new THREE.Mesh(new THREE.PlaneGeometry(0.36, 0.36), badgeMaterial);
  badge.position.set(0, 0.22, piece.color === 'red' ? 0.41 : -0.41);
  badge.rotation.y = piece.color === 'red' ? 0 : Math.PI;
  badge.visible = skin === 'figurine';
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

  group.userData = { piece, baseMaterial, glyphMaterial, glyph, figurine, selectionRing, base, rim, badge };
  if (skin === 'figurine') {
    setPieceSkin(group, 'figurine');
  }
  return group;
}

export function setPieceSkin(object: PieceObject, skin: BoardSkin): void {
  const isFigurine = skin === 'figurine';
  object.userData.figurine.visible = isFigurine;
  if (object.userData.badge) object.userData.badge.visible = isFigurine;
  object.userData.base.scale.set(isFigurine ? 0.92 : 1, isFigurine ? 0.65 : 1, isFigurine ? 0.92 : 1);
  object.userData.rim.position.y = isFigurine ? 0.131 : 0.202;
  object.userData.rim.scale.setScalar(isFigurine ? 0.92 : 1);
  object.userData.glyph.scale.setScalar(isFigurine ? 0.85 : 1);
  object.userData.glyph.position.y = isFigurine ? 0.152 : 0.235;
}

export function setPieceSelected(object: PieceObject, selected: boolean): void {
  const material = object.userData.selectionRing.material as THREE.MeshBasicMaterial;
  material.opacity = selected ? 0.95 : 0;
}

export function setPieceThreatened(object: PieceObject, threatened: boolean): void {
  object.userData.baseMaterial.emissive.setHex(threatened ? 0xff2c12 : object.userData.piece.color === 'red' ? 0x280400 : 0x07100e);
  object.userData.baseMaterial.emissiveIntensity = threatened ? 0.9 : 0.36;
}
