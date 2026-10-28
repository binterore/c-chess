import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { copy } from '../i18n';
import type { EffectIntensity } from '../types/chess';
import { makeBoardTexture, makeStoneTexture, palette } from './materials';

export const BOARD_TOP = 0.34;
export const BOARD_CELL = 1.02;

export interface Battlefield {
  group: THREE.Group;
  dustGeometry: THREE.BufferGeometry;
  emberGeometry: THREE.BufferGeometry;
  flames: THREE.Mesh[];
  torchLights: THREE.PointLight[];
  update: (elapsed: number, delta: number, intensity: EffectIntensity) => void;
}

function makeBannerTexture(glyph: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 768;
  const context = canvas.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, 256, 768);
  gradient.addColorStop(0, '#5b160f');
  gradient.addColorStop(0.5, '#8f2517');
  gradient.addColorStop(1, '#2d0c08');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 256, 768);
  context.strokeStyle = 'rgba(225,177,99,0.55)';
  context.lineWidth = 7;
  context.strokeRect(15, 15, 226, 738);
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = '900 150px "Noto Serif SC", "Songti SC", serif';
  context.shadowColor = 'rgba(255,180,86,0.5)';
  context.shadowBlur = 18;
  context.fillStyle = '#d8ad66';
  context.fillText(glyph, 128, 380);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function createBanner(glyph: string, x: number, z: number, rotation: number): THREE.Group {
  const banner = new THREE.Group();
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.045, 0.065, 4.8, 8),
    new THREE.MeshStandardMaterial({ color: 0x2c2118, metalness: 0.48, roughness: 0.48 })
  );
  pole.position.y = 2.4;
  pole.castShadow = true;
  banner.add(pole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(0.95, 2.85),
    new THREE.MeshStandardMaterial({
      map: makeBannerTexture(glyph),
      side: THREE.DoubleSide,
      roughness: 0.82,
      transparent: true
    })
  );
  flag.position.set(0.49, 3.25, 0);
  flag.rotation.y = Math.PI / 2;
  flag.castShadow = true;
  banner.add(flag);

  const spear = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.45, 6),
    new THREE.MeshStandardMaterial({ color: palette.gold, metalness: 0.82, roughness: 0.24 })
  );
  spear.position.y = 4.98;
  banner.add(spear);

  banner.position.set(x, -0.16, z);
  banner.rotation.y = rotation;
  return banner;
}

function createTorch(x: number, z: number): { group: THREE.Group; flame: THREE.Mesh; light: THREE.PointLight } {
  const group = new THREE.Group();
  const stone = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.24, 1.05, 8),
    new THREE.MeshStandardMaterial({ color: 0x33251a, roughness: 0.8, metalness: 0.22 })
  );
  stone.position.y = 0.42;
  stone.castShadow = true;
  group.add(stone);

  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.1, 0.16, 12),
    new THREE.MeshStandardMaterial({ color: palette.gold, metalness: 0.7, roughness: 0.32 })
  );
  bowl.position.y = 1.02;
  bowl.castShadow = true;
  group.add(bowl);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.13, 0.42, 10),
    new THREE.MeshBasicMaterial({
      color: 0xff7a28,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  flame.position.y = 1.28;
  group.add(flame);

  const light = new THREE.PointLight(0xff7b36, 4.2, 8, 1.8);
  light.position.y = 1.4;
  group.add(light);

  group.position.set(x, -0.14, z);
  return { group, flame, light };
}

export function createBattlefield(scene: THREE.Scene, intensity: EffectIntensity, mobile: boolean): Battlefield {
  const group = new THREE.Group();
  group.name = 'battlefield';
  scene.add(group);

  scene.fog = new THREE.FogExp2(0x090806, 0.032);

  const groundTexture = makeStoneTexture();
  groundTexture.repeat.set(7, 7);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(34, 34, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x30261d, map: groundTexture, roughness: 0.96, metalness: 0.02 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.26;
  ground.receiveShadow = true;
  group.add(ground);

  const boardMaterial = new THREE.MeshStandardMaterial({
    color: 0x3f2d1d,
    map: makeStoneTexture(),
    roughness: 0.65,
    metalness: 0.12
  });
  const slab = new THREE.Mesh(new RoundedBoxGeometry(10.65, 0.5, 11.85, 5, 0.13), boardMaterial);
  slab.position.y = 0.03;
  slab.castShadow = true;
  slab.receiveShadow = true;
  group.add(slab);

  const boardTexture = makeBoardTexture([copy.board.riverRed, copy.board.riverBlack]);
  const boardTop = new THREE.Mesh(
    new THREE.PlaneGeometry(9.6, 10.8),
    new THREE.MeshStandardMaterial({
      map: boardTexture,
      color: 0xf4e4c1,
      roughness: 0.73,
      metalness: 0.04
    })
  );
  boardTop.rotation.x = -Math.PI / 2;
  boardTop.position.y = BOARD_TOP;
  boardTop.receiveShadow = true;
  group.add(boardTop);

  const railMaterial = new THREE.MeshStandardMaterial({
    color: palette.gold,
    metalness: 0.76,
    roughness: 0.3,
    emissive: 0x2b1705,
    emissiveIntensity: 0.25
  });
  const rails: Array<[number, number, number, number, number, number]> = [
    [10.85, 0.09, 0.09, 0, BOARD_TOP + 0.02, 5.94],
    [10.85, 0.09, 0.09, 0, BOARD_TOP + 0.02, -5.94],
    [0.09, 0.09, 11.97, 5.36, BOARD_TOP + 0.02, 0],
    [0.09, 0.09, 11.97, -5.36, BOARD_TOP + 0.02, 0]
  ];
  rails.forEach(([width, height, depth, x, y, z]) => {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), railMaterial);
    rail.position.set(x, y, z);
    rail.castShadow = true;
    group.add(rail);
  });

  const cornerMaterial = new THREE.MeshStandardMaterial({
    color: palette.gold,
    metalness: 0.88,
    roughness: 0.2,
    emissive: 0x3b1e06,
    emissiveIntensity: 0.25
  });
  const cornerOffsets: Array<[number, number, number]> = [
    [5.3, 5.88, 0],
    [-5.3, 5.88, Math.PI / 2],
    [-5.3, -5.88, Math.PI],
    [5.3, -5.88, -Math.PI / 2]
  ];
  cornerOffsets.forEach(([cx, cz, rot]) => {
    const bracket = new THREE.Group();
    const wingX = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.08, 0.16), cornerMaterial);
    wingX.position.set(-0.28, 0, 0);
    const wingZ = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.08, 0.72), cornerMaterial);
    wingZ.position.set(0, 0, -0.28);
    const rivet = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.1, 8), cornerMaterial);
    rivet.position.set(0, 0.02, 0);
    bracket.add(wingX, wingZ, rivet);
    bracket.position.set(cx, BOARD_TOP + 0.025, cz);
    bracket.rotation.y = rot;
    bracket.castShadow = true;
    group.add(bracket);
  });

  const sideStoneMaterial = new THREE.MeshStandardMaterial({ color: 0x3b2b1c, roughness: 0.9, metalness: 0.08 });
  for (let index = 0; index < 7; index += 1) {
    const x = -9.5 + index * 3.2;
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55 + (index % 3) * 0.18, 0),
      sideStoneMaterial
    );
    stone.position.set(x, -0.18, -7.8 - (index % 2) * 0.5);
    stone.scale.y = 0.42;
    stone.rotation.set(index * 0.4, index * 0.8, 0.2);
    stone.castShadow = true;
    group.add(stone);
  }
  for (let index = 0; index < 7; index += 1) {
    const x = -9.5 + index * 3.2;
    const stone = new THREE.Mesh(
      new THREE.DodecahedronGeometry(0.55 + (index % 3) * 0.18, 0),
      sideStoneMaterial
    );
    stone.position.set(x, -0.18, 7.8 + (index % 2) * 0.5);
    stone.scale.y = 0.42;
    stone.rotation.set(index * 0.4, index * 0.8, 0.2);
    stone.castShadow = true;
    group.add(stone);
  }

  const mountainMaterial = new THREE.MeshStandardMaterial({ color: 0x13100c, roughness: 1, metalness: 0 });
  for (let index = 0; index < 14; index += 1) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(2.3 + (index % 4) * 0.7, 4 + (index % 3), 5),
      mountainMaterial
    );
    mountain.position.set(-15 + index * 2.4, 1.2 + (index % 3) * 0.35, -15 - (index % 2) * 2.4);
    mountain.rotation.y = index * 0.4;
    group.add(mountain);
  }
  for (let index = 0; index < 14; index += 1) {
    const mountain = new THREE.Mesh(
      new THREE.ConeGeometry(2.3 + (index % 4) * 0.7, 4 + (index % 3), 5),
      mountainMaterial
    );
    mountain.position.set(-15 + index * 2.4, 1.2 + (index % 3) * 0.35, 15 + (index % 2) * 2.4);
    mountain.rotation.y = index * 0.4;
    group.add(mountain);
  }

  group.add(createBanner(copy.board.seal, -6.9, -4.9, 0.2));
  group.add(createBanner(copy.board.seal, 6.9, -4.9, -0.2));
  group.add(createBanner(copy.board.seal, -6.9, 4.9, 2.9));
  group.add(createBanner(copy.board.seal, 6.9, 4.9, -2.9));

  const flameList: THREE.Mesh[] = [];
  const torchLights: THREE.PointLight[] = [];
  const torchPositions: Array<[number, number]> = [
    [-7.2, -3.2],
    [7.2, -3.2],
    [-7.2, 3.5],
    [7.2, 3.5]
  ];
  torchPositions.forEach(([x, z]) => {
    const torch = createTorch(x, z);
    group.add(torch.group);
    flameList.push(torch.flame);
    torchLights.push(torch.light);
  });

  const dustCount = mobile ? 90 : 220;
  const dustPositions = new Float32Array(dustCount * 3);
  const dustVelocity = new Float32Array(dustCount);
  for (let index = 0; index < dustCount; index += 1) {
    dustPositions[index * 3] = (Math.random() - 0.5) * 24;
    dustPositions[index * 3 + 1] = Math.random() * 6 - 0.1;
    dustPositions[index * 3 + 2] = (Math.random() - 0.5) * 24;
    dustVelocity[index] = 0.06 + Math.random() * 0.13;
  }
  const dustGeometry = new THREE.BufferGeometry();
  dustGeometry.setAttribute('position', new THREE.BufferAttribute(dustPositions, 3));
  const dust = new THREE.Points(
    dustGeometry,
    new THREE.PointsMaterial({
      color: 0xe0ba7b,
      size: mobile ? 0.045 : 0.06,
      transparent: true,
      opacity: intensity === 'off' ? 0 : 0.32,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  group.add(dust);

  const emberCount = mobile ? 30 : 70;
  const emberPositions = new Float32Array(emberCount * 3);
  for (let index = 0; index < emberCount; index += 1) {
    const torch = torchPositions[index % torchPositions.length];
    emberPositions[index * 3] = torch[0] + (Math.random() - 0.5) * 0.5;
    emberPositions[index * 3 + 1] = 1 + Math.random() * 2.5;
    emberPositions[index * 3 + 2] = torch[1] + (Math.random() - 0.5) * 0.5;
  }
  const emberGeometry = new THREE.BufferGeometry();
  emberGeometry.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
  const embers = new THREE.Points(
    emberGeometry,
    new THREE.PointsMaterial({
      color: 0xff7a2f,
      size: mobile ? 0.045 : 0.065,
      transparent: true,
      opacity: intensity === 'off' ? 0 : 0.8,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
  );
  group.add(embers);

  const ambient = new THREE.HemisphereLight(0x9b815a, 0x130c08, 1.5);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffd59b, 4.4);
  keyLight.position.set(-7, 13, 8);
  keyLight.castShadow = !mobile && intensity !== 'off';
  keyLight.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  keyLight.shadow.camera.left = -9;
  keyLight.shadow.camera.right = 9;
  keyLight.shadow.camera.top = 9;
  keyLight.shadow.camera.bottom = -9;
  keyLight.shadow.camera.near = 1;
  keyLight.shadow.camera.far = 28;
  keyLight.shadow.bias = -0.0002;
  scene.add(keyLight);

  const redRim = new THREE.PointLight(0xa32d1a, 12, 15, 2);
  redRim.position.set(-7, 4.5, -2);
  scene.add(redRim);

  const tealRim = new THREE.PointLight(0x296f68, 9, 15, 2);
  tealRim.position.set(7, 4, 4);
  scene.add(tealRim);

  const update = (elapsed: number, delta: number, currentIntensity: EffectIntensity) => {
    flameList.forEach((flame, index) => {
      const flicker = currentIntensity === 'off' ? 1 : 0.82 + Math.sin(elapsed * 9.5 + index * 2.2) * 0.12 + Math.sin(elapsed * 17.2 + index) * 0.06;
      flame.scale.set(flicker, currentIntensity === 'off' ? 0.72 : flicker, flicker);
      torchLights[index].intensity = currentIntensity === 'off' ? 2.4 : 3.8 + Math.sin(elapsed * 8 + index) * 0.8;
    });

    if (currentIntensity !== 'off') {
      const positions = dustGeometry.attributes.position.array as Float32Array;
      for (let index = 0; index < dustCount; index += 1) {
        positions[index * 3 + 1] += dustVelocity[index] * delta;
        positions[index * 3] += Math.sin(elapsed * 0.3 + index) * delta * 0.02;
        if (positions[index * 3 + 1] > 6) positions[index * 3 + 1] = -0.1;
      }
      dustGeometry.attributes.position.needsUpdate = true;

      const embersPositions = emberGeometry.attributes.position.array as Float32Array;
      for (let index = 0; index < emberCount; index += 1) {
        embersPositions[index * 3 + 1] += delta * (0.25 + (index % 5) * 0.05);
        if (embersPositions[index * 3 + 1] > 3.7) {
          const torch = torchPositions[index % torchPositions.length];
          embersPositions[index * 3] = torch[0] + (Math.random() - 0.5) * 0.4;
          embersPositions[index * 3 + 1] = 0.9;
          embersPositions[index * 3 + 2] = torch[1] + (Math.random() - 0.5) * 0.4;
        }
      }
      emberGeometry.attributes.position.needsUpdate = true;
    }
  };

  return { group, dustGeometry, emberGeometry, flames: flameList, torchLights, update };
}
