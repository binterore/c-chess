import * as THREE from 'three';

export const palette = {
  ink: 0x0b0a08,
  parchment: 0xc8aa76,
  parchmentDark: 0x7d5d35,
  vermilion: 0x9f2d20,
  vermilionBright: 0xff5a37,
  gold: 0xd6ab62,
  goldBright: 0xffd790,
  blackLacquer: 0x171614,
  ivory: 0xd7cbb3,
  smoke: 0x4c4134,
  jade: 0x4d7f72
};

export function makeWoodTexture(color: 'red' | 'black'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;

  const baseGradient = context.createLinearGradient(0, 0, 512, 512);
  if (color === 'red') {
    baseGradient.addColorStop(0, '#5a150e');
    baseGradient.addColorStop(0.35, '#7f2115');
    baseGradient.addColorStop(0.7, '#671910');
    baseGradient.addColorStop(1, '#3b0b06');
  } else {
    baseGradient.addColorStop(0, '#151413');
    baseGradient.addColorStop(0.4, '#242220');
    baseGradient.addColorStop(0.75, '#191817');
    baseGradient.addColorStop(1, '#0e0d0c');
  }
  context.fillStyle = baseGradient;
  context.fillRect(0, 0, 512, 512);

  let seed = color === 'red' ? 92147 : 54321;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let ring = 0; ring < 24; ring += 1) {
    const radius = 20 + ring * 16 + (random() - 0.5) * 8;
    context.strokeStyle = color === 'red'
      ? `rgba(${160 + random() * 40}, ${30 + random() * 20}, ${15 + random() * 10}, ${0.05 + random() * 0.06})`
      : `rgba(${90 + random() * 30}, ${80 + random() * 25}, ${70 + random() * 20}, ${0.04 + random() * 0.05})`;
    context.lineWidth = 1 + random() * 3.5;
    context.beginPath();
    context.arc(256 + (random() - 0.5) * 12, 256 + (random() - 0.5) * 12, radius, 0, Math.PI * 2);
    context.stroke();
  }

  for (let line = 0; line < 120; line += 1) {
    const x = random() * 512;
    context.strokeStyle = color === 'red'
      ? `rgba(${120 + random() * 60}, ${20 + random() * 30}, ${10 + random() * 15}, ${0.03 + random() * 0.06})`
      : `rgba(${60 + random() * 30}, ${55 + random() * 25}, ${50 + random() * 20}, ${0.03 + random() * 0.05})`;
    context.lineWidth = 0.5 + random() * 2;
    context.beginPath();
    context.moveTo(x, 0);
    context.bezierCurveTo(x + (random() - 0.5) * 18, 170, x + (random() - 0.5) * 18, 340, x + (random() - 0.5) * 24, 512);
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 16;
  return texture;
}

export function makeGlyphTexture(
  glyph: string,
  color: string,
  glow: string,
  size = 512,
  plate = false
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const context = canvas.getContext('2d')!;
  context.clearRect(0, 0, size, size);

  if (plate) {
    const gradient = context.createRadialGradient(size * 0.44, size * 0.38, size * 0.05, size / 2, size / 2, size * 0.48);
    gradient.addColorStop(0, 'rgba(255, 235, 185, 0.28)');
    gradient.addColorStop(0.65, 'rgba(0, 0, 0, 0.04)');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0.32)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = 'rgba(0, 0, 0, 0.45)';
  context.lineWidth = size * 0.032;
  context.beginPath();
  context.arc(size / 2 + size * 0.005, size / 2 + size * 0.006, size * 0.44, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = color;
  context.lineWidth = size * 0.024;
  context.beginPath();
  context.arc(size / 2, size / 2, size * 0.44, 0, Math.PI * 2);
  context.stroke();

  context.strokeStyle = color;
  context.lineWidth = size * 0.008;
  context.beginPath();
  context.arc(size / 2, size / 2, size * 0.41, 0, Math.PI * 2);
  context.stroke();

  const markDist = size * 0.425;
  const markAngles = [0, Math.PI * 0.5, Math.PI, Math.PI * 1.5];
  context.fillStyle = color;
  markAngles.forEach((angle) => {
    const mx = size / 2 + Math.cos(angle) * markDist;
    const my = size / 2 + Math.sin(angle) * markDist;
    context.beginPath();
    context.arc(mx, my, size * 0.016, 0, Math.PI * 2);
    context.fill();
  });

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `900 ${size * 0.7}px "Kaiti SC", "STKaiti", "KaiTi", "Songti SC", "Noto Serif SC", serif`;

  context.fillStyle = 'rgba(0, 0, 0, 0.72)';
  context.fillText(glyph, size / 2 + size * 0.008, size * 0.51 + size * 0.01);

  context.shadowColor = glow;
  context.shadowBlur = size * 0.12;
  context.fillStyle = color;
  context.fillText(glyph, size / 2, size * 0.51);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}

export function makeStoneTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const context = canvas.getContext('2d')!;
  const gradient = context.createLinearGradient(0, 0, 512, 512);
  gradient.addColorStop(0, '#59462f');
  gradient.addColorStop(0.5, '#3b2e20');
  gradient.addColorStop(1, '#241b13');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 512, 512);

  let seed = 31979;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };

  for (let index = 0; index < 1800; index += 1) {
    const x = random() * 512;
    const y = random() * 512;
    const radius = random() * 1.8 + 0.2;
    context.fillStyle = `rgba(${175 + random() * 45}, ${135 + random() * 35}, ${85 + random() * 30}, ${random() * 0.08})`;
    context.beginPath();
    context.arc(x, y, radius, 0, Math.PI * 2);
    context.fill();
  }

  for (let index = 0; index < 10; index += 1) {
    context.strokeStyle = `rgba(20,14,9,${0.08 + random() * 0.1})`;
    context.lineWidth = random() * 2 + 0.4;
    context.beginPath();
    let x = random() * 512;
    let y = random() * 512;
    context.moveTo(x, y);
    for (let point = 0; point < 5; point += 1) {
      x += (random() - 0.5) * 80;
      y += random() * 35;
      context.lineTo(x, y);
    }
    context.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.anisotropy = 8;
  return texture;
}

export function makeBoardTexture(riverLabels: [string, string]): THREE.CanvasTexture {
  const width = 2048;
  const height = 2304;
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d')!;
  const scale = width / 9.6;
  const marginX = 0.72 * scale;
  const marginY = 0.81 * scale;
  const gridWidth = 8.16 * scale;
  const gridHeight = 9.18 * scale;
  const cellX = gridWidth / 8;
  const cellY = gridHeight / 9;

  const background = context.createLinearGradient(0, 0, width, height);
  background.addColorStop(0, '#c4a56f');
  background.addColorStop(0.45, '#b18f57');
  background.addColorStop(1, '#8a6d40');
  context.fillStyle = background;
  context.fillRect(0, 0, width, height);

  let seed = 8147;
  const random = () => {
    seed = (seed * 48271) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  for (let index = 0; index < 9000; index += 1) {
    const x = random() * width;
    const y = random() * height;
    context.fillStyle = random() > 0.5 ? `rgba(45,27,13,${random() * 0.06})` : `rgba(255,225,166,${random() * 0.05})`;
    context.fillRect(x, y, 1 + random() * 2, 1 + random() * 2);
  }

  context.strokeStyle = 'rgba(48, 28, 14, 0.88)';
  context.lineCap = 'square';
  context.lineWidth = 5;
  context.strokeRect(marginX, marginY, gridWidth, gridHeight);

  for (let row = 0; row <= 9; row += 1) {
    const y = marginY + row * cellY;
    context.beginPath();
    context.moveTo(marginX, y);
    context.lineTo(marginX + gridWidth, y);
    context.stroke();
  }

  for (let column = 0; column <= 8; column += 1) {
    const x = marginX + column * cellX;
    if (column === 0 || column === 8) {
      context.beginPath();
      context.moveTo(x, marginY);
      context.lineTo(x, marginY + gridHeight);
      context.stroke();
    } else {
      context.beginPath();
      context.moveTo(x, marginY);
      context.lineTo(x, marginY + cellY * 4);
      context.stroke();
      context.beginPath();
      context.moveTo(x, marginY + cellY * 5);
      context.lineTo(x, marginY + gridHeight);
      context.stroke();
    }
  }

  const drawDiagonal = (x1: number, y1: number, x2: number, y2: number) => {
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();
  };
  drawDiagonal(marginX + cellX * 3, marginY, marginX + cellX * 5, marginY + cellY * 2);
  drawDiagonal(marginX + cellX * 5, marginY, marginX + cellX * 3, marginY + cellY * 2);
  drawDiagonal(marginX + cellX * 3, marginY + cellY * 7, marginX + cellX * 5, marginY + cellY * 9);
  drawDiagonal(marginX + cellX * 5, marginY + cellY * 7, marginX + cellX * 3, marginY + cellY * 9);

  context.save();
  context.fillStyle = 'rgba(43, 26, 14, 0.62)';
  context.font = '700 58px "Noto Serif SC", "Songti SC", serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(riverLabels[0], marginX + cellX * 2.5, marginY + cellY * 4.5);
  context.fillText(riverLabels[1], marginX + cellX * 5.5, marginY + cellY * 4.5);
  context.restore();

  context.strokeStyle = 'rgba(78, 42, 18, 0.55)';
  context.lineWidth = 3;
  for (let row = 0; row <= 9; row += 1) {
    for (let column = 0; column <= 8; column += 1) {
      if (row !== 0 && row !== 9 && column !== 0 && column !== 8) continue;
      const x = marginX + column * cellX;
      const y = marginY + row * cellY;
      const length = 16;
      const offset = 9;
      const signX = column === 0 ? 1 : column === 8 ? -1 : 0;
      const signY = row === 0 ? 1 : row === 9 ? -1 : 0;
      context.beginPath();
      if (signX) {
        context.moveTo(x + signX * offset, y - length);
        context.lineTo(x + signX * offset, y - offset);
        context.lineTo(x + signX * (offset + 9), y - offset);
        context.moveTo(x + signX * offset, y + offset);
        context.lineTo(x + signX * (offset + 9), y + offset);
        context.moveTo(x + signX * offset, y + offset);
        context.lineTo(x + signX * offset, y + length);
      }
      if (signY) {
        context.moveTo(x - length, y + signY * offset);
        context.lineTo(x - offset, y + signY * offset);
        context.lineTo(x - offset, y + signY * (offset + 9));
        context.moveTo(x + offset, y + signY * offset);
        context.lineTo(x + offset, y + signY * (offset + 9));
      }
      context.stroke();
    }
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 16;
  return texture;
}

export function disposeObject(object: THREE.Object3D): void {
  object.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.geometry.dispose();
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        if (material instanceof THREE.MeshStandardMaterial) {
          material.map?.dispose();
          material.emissiveMap?.dispose();
        }
        material.dispose();
      });
    }
    if (child instanceof THREE.Sprite) child.material.map?.dispose();
  });
}
