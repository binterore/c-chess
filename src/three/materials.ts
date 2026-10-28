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
    const gradient = context.createRadialGradient(size * 0.42, size * 0.36, 10, size / 2, size / 2, size * 0.48);
    gradient.addColorStop(0, 'rgba(255,245,212,0.32)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.18)');
    context.fillStyle = gradient;
    context.beginPath();
    context.arc(size / 2, size / 2, size * 0.47, 0, Math.PI * 2);
    context.fill();
  }

  context.strokeStyle = color;
  context.lineWidth = size * 0.022;
  context.globalAlpha = 0.55;
  context.beginPath();
  context.arc(size / 2, size / 2, size * 0.435, 0, Math.PI * 2);
  context.stroke();
  context.globalAlpha = 1.0;

  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.font = `900 ${size * 0.72}px "Kaiti SC", "STKaiti", "KaiTi", "Songti SC", "Noto Serif SC", serif`;
  context.shadowColor = glow;
  context.shadowBlur = size * 0.1;
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
