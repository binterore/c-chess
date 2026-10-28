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
    new THREE.CylinderGeometry(0.14, 0.24, 1.05, 12),
    new THREE.MeshStandardMaterial({ color: 0x33251a, roughness: 0.8, metalness: 0.22 })
  );
  stone.position.y = 0.42;
  stone.castShadow = true;
  group.add(stone);

  const bowl = new THREE.Mesh(
    new THREE.CylinderGeometry(0.22, 0.1, 0.16, 16),
    new THREE.MeshStandardMaterial({ color: palette.gold, metalness: 0.7, roughness: 0.32 })
  );
  bowl.position.y = 1.02;
  bowl.castShadow = true;
  group.add(bowl);

  const flame = new THREE.Mesh(
    new THREE.ConeGeometry(0.12, 0.38, 12),
    new THREE.MeshBasicMaterial({
      color: 0xff8c36,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    })
  );
  flame.position.y = 1.25;
  group.add(flame);

  const light = new THREE.PointLight(0xff8c40, 1.8, 6.5, 1.6);
  light.position.y = 1.35;
  group.add(light);

  group.position.set(x, -0.14, z);
  return { group, flame, light };
}

export function createBattlefield(scene: THREE.Scene, intensity: EffectIntensity, mobile: boolean): Battlefield {
  const group = new THREE.Group();
  group.name = 'battlefield';
  scene.add(group);

  scene.fog = new THREE.FogExp2(0x131118, 0.016);

  const groundTexture = makeStoneTexture();
  groundTexture.repeat.set(12, 12);
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(80, 80, 1, 1),
    new THREE.MeshStandardMaterial({ color: 0x221c17, map: groundTexture, roughness: 0.94, metalness: 0.04 })
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

  const riverbankMaterial = new THREE.MeshStandardMaterial({
    color: 0x4a3424,
    roughness: 0.62,
    metalness: 0.22,
    emissive: 0x1f1208,
    emissiveIntensity: 0.2
  });
  const bankSouth = new THREE.Mesh(new THREE.BoxGeometry(9.62, 0.035, 0.05), riverbankMaterial);
  bankSouth.position.set(0, BOARD_TOP + 0.015, 0.52);
  bankSouth.castShadow = true;
  group.add(bankSouth);

  const bankNorth = new THREE.Mesh(new THREE.BoxGeometry(9.62, 0.035, 0.05), riverbankMaterial);
  bankNorth.position.set(0, BOARD_TOP + 0.015, -0.52);
  bankNorth.castShadow = true;
  group.add(bankNorth);

  const bridgeMaterial = new THREE.MeshStandardMaterial({
    color: 0x5a4230,
    roughness: 0.58,
    metalness: 0.25
  });
  for (let col = 0; col <= 8; col += 1) {
    const x = (col - 4) * BOARD_CELL;
    const bridge = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.024, 1.04), bridgeMaterial);
    bridge.position.set(x, BOARD_TOP + 0.01, 0);
    bridge.castShadow = true;
    bridge.receiveShadow = true;
    group.add(bridge);
  }

  const moonGroup = new THREE.Group();
  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(3.6, 32),
    new THREE.MeshBasicMaterial({ color: 0xfffae8 })
  );
  const moonHalo = new THREE.Mesh(
    new THREE.CircleGeometry(6.4, 32),
    new THREE.MeshBasicMaterial({
      color: 0x789ac2,
      transparent: true,
      opacity: 0.22,
      blending: THREE.AdditiveBlending
    })
  );
  moonGroup.add(moon, moonHalo);
  moonGroup.position.set(0, 19, -34);
  group.add(moonGroup);

  const balustradeMaterial = new THREE.MeshStandardMaterial({
    color: 0x2e2722,
    roughness: 0.72,
    metalness: 0.15
  });
  const goldTrimMaterial = new THREE.MeshStandardMaterial({
    color: palette.gold,
    roughness: 0.32,
    metalness: 0.75
  });

  const createBalustrade = (zPos: number, rotY: number) => {
    const balustrade = new THREE.Group();
    const bottomPlinth = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.16, 0.32), balustradeMaterial);
    bottomPlinth.position.y = 0.08;
    bottomPlinth.castShadow = true;
    balustrade.add(bottomPlinth);

    const topRail = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.1, 0.22), balustradeMaterial);
    topRail.position.y = 0.62;
    topRail.castShadow = true;
    balustrade.add(topRail);

    const goldStrip = new THREE.Mesh(new THREE.BoxGeometry(16.5, 0.03, 0.24), goldTrimMaterial);
    goldStrip.position.y = 0.65;
    balustrade.add(goldStrip);

    for (let i = 0; i <= 8; i += 1) {
      const x = -7.5 + i * (15 / 8);
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.78, 0.28), balustradeMaterial);
      post.position.set(x, 0.39, 0);
      post.castShadow = true;

      const finial = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), goldTrimMaterial);
      finial.position.set(x, 0.85, 0);
      finial.scale.set(0.9, 1.2, 0.9);
      balustrade.add(post, finial);
    }
    balustrade.position.set(0, -0.15, zPos);
    balustrade.rotation.y = rotY;
    return balustrade;
  };

  group.add(createBalustrade(-7.6, 0));
  group.add(createBalustrade(7.6, Math.PI));

  const farMountainMaterial = new THREE.MeshStandardMaterial({
    color: 0x1b1822,
    roughness: 1,
    metalness: 0
  });
  for (let index = 0; index < 10; index += 1) {
    const peak = new THREE.Mesh(
      new THREE.ConeGeometry(5 + (index % 3) * 2, 9 + (index % 2) * 3, 16),
      farMountainMaterial
    );
    peak.position.set(-25 + index * 5.5, 3.5, -36 - (index % 2) * 4);
    group.add(peak);
  }

  group.add(createBanner(copy.board.seal, -7.2, -2.4, 0.1));
  group.add(createBanner(copy.board.seal, 7.2, -2.4, -0.1));
  group.add(createBanner(copy.board.seal, -7.2, 2.4, 3.0));
  group.add(createBanner(copy.board.seal, 7.2, 2.4, -3.0));

  const flameList: THREE.Mesh[] = [];
  const torchLights: THREE.PointLight[] = [];
  const torchPositions: Array<[number, number]> = [
    [-7.4, -4.8],
    [7.4, -4.8],
    [-7.6, 0],
    [7.6, 0],
    [-7.4, 4.8],
    [7.4, 4.8]
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

  const ambient = new THREE.HemisphereLight(0x7c7285, 0x241f28, 1.25);
  scene.add(ambient);

  const keyLight = new THREE.DirectionalLight(0xffecd4, 2.6);
  keyLight.position.set(-8, 15, 9);
  keyLight.castShadow = !mobile && intensity !== 'off';
  keyLight.shadow.mapSize.set(mobile ? 1024 : 2048, mobile ? 1024 : 2048);
  keyLight.shadow.camera.left = -11;
  keyLight.shadow.camera.right = 11;
  keyLight.shadow.camera.top = 11;
  keyLight.shadow.camera.bottom = -11;
  keyLight.shadow.camera.near = 2;
  keyLight.shadow.camera.far = 40;
  keyLight.shadow.bias = -0.0003;
  scene.add(keyLight);

  const fillLight = new THREE.DirectionalLight(0x6582a4, 1.0);
  fillLight.position.set(7, 12, -8);
  scene.add(fillLight);

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
