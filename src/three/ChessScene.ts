import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { copy } from '../i18n';
import type {
  BoardSkin,
  BoardState,
  EffectIntensity,
  Position,
  VisualMove
} from '../types/chess';
import { BOARD_CELL, BOARD_TOP, createBattlefield, type Battlefield } from './battlefield';
import { makeGlyphTexture, palette } from './materials';
import {
  createPieceObject,
  setPieceSelected,
  setPieceSkin,
  setPieceThreatened,
  type PieceObject
} from './pieceFactory';

interface SceneCallbacks {
  onSquareClick: (position: Position) => void;
  onHoverSquare: (position: Position | null) => void;
  onAnimationComplete: (id: number) => void;
}

interface ActiveMove {
  visual: VisualMove;
  object: PieceObject | null;
  victim: PieceObject | null;
  start: THREE.Vector3;
  end: THREE.Vector3;
  began: number;
  duration: number;
  impacted: boolean;
  projectile?: THREE.Mesh;
}

interface Burst {
  points: THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial>;
  positions: Float32Array;
  velocities: Float32Array;
  life: number;
  maxLife: number;
}

interface FadingMesh {
  mesh: THREE.Mesh<THREE.BufferGeometry, THREE.MeshBasicMaterial>;
  born: number;
  duration: number;
  startOpacity: number;
  grow: number;
}

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const CAMERA_RED = new THREE.Vector3(0, 8.8, 14.5);
const CAMERA_BLACK = new THREE.Vector3(0, 8.8, -14.5);
const CAMERA_OVERHEAD = new THREE.Vector3(0.01, 16.8, 0.5);
const TARGET = new THREE.Vector3(0, 0.15, 0);

function smoothStep(value: number): number {
  return value * value * (3 - 2 * value);
}

function easeOutCubic(value: number): number {
  return 1 - Math.pow(1 - value, 3);
}

function easeInOutCubic(value: number): number {
  return value < 0.5 ? 4 * value * value * value : 1 - Math.pow(-2 * value + 2, 3) / 2;
}

export class ChessScene {
  private container: HTMLElement;
  private callbacks: SceneCallbacks;
  private scene = new THREE.Scene();
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private controls: OrbitControls;
  private composer: EffectComposer | null = null;
  private battlefield: Battlefield;
  private piecesRoot = new THREE.Group();
  private markersRoot = new THREE.Group();
  private effectsRoot = new THREE.Group();
  private pieces = new Map<string, PieceObject>();
  private legalSet = new Set<string>();
  private selectedId: string | null = null;
  private checkedId: string | null = null;
  private checkedSprite: THREE.Sprite | null = null;
  private hoverRing: THREE.Mesh;
  private skin: BoardSkin;
  private intensity: EffectIntensity;
  private mobile: boolean;
  private flipped = false;
  private idle = false;
  private raycaster = new THREE.Raycaster();
  private pointer = new THREE.Vector2();
  private pointerStart = new THREE.Vector2();
  private pointerMoved = false;
  private clock = new THREE.Clock();
  private animationFrame = 0;
  private resizeObserver: ResizeObserver;
  private moveQueue: ActiveMove[] = [];
  private activeMove: ActiveMove | null = null;
  private bursts: Burst[] = [];
  private fadingMeshes: FadingMesh[] = [];
  private spawnTimes = new Map<string, number>();
  private cameraTween: {
    from: THREE.Vector3;
    to: THREE.Vector3;
    targetFrom: THREE.Vector3;
    targetTo: THREE.Vector3;
    started: number;
    duration: number;
  } | null = null;
  private checkPulseStart = 0;
  private shakeTime = 0;
  private shakeIntensity = 0;
  private destroyed = false;
  private hovered: Position | null = null;
  private autoReduced = false;
  private performanceFrames = 0;
  private performanceStarted = 0;

  constructor(
    container: HTMLElement,
    options: {
      skin: BoardSkin;
      intensity: EffectIntensity;
      flipped: boolean;
      callbacks: SceneCallbacks;
    }
  ) {
    this.container = container;
    this.callbacks = options.callbacks;
    this.skin = options.skin;
    this.intensity = options.intensity;
    this.flipped = options.flipped;
    this.mobile = window.matchMedia('(max-width: 760px)').matches;
    this.scene.background = new THREE.Color(0x110f17);

    this.camera = new THREE.PerspectiveCamera(42, container.clientWidth / container.clientHeight, 0.1, 75);
    this.camera.position.copy(this.flipped ? CAMERA_BLACK : CAMERA_RED);

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.mobile,
      powerPreference: 'high-performance',
      alpha: false
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.mobile ? 1.5 : 1.8));
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.02;
    this.renderer.shadowMap.enabled = !this.mobile && this.intensity !== 'off';
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.className = 'battle-canvas';
    this.renderer.domElement.setAttribute('aria-label', '3D Chinese chess battlefield');
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.copy(TARGET);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.07;
    this.controls.minDistance = 8;
    this.controls.maxDistance = 20;
    this.controls.minPolarAngle = 0.28;
    this.controls.maxPolarAngle = 1.34;
    this.controls.autoRotateSpeed = 0.22;
    this.controls.enablePan = false;
    this.controls.update();

    this.battlefield = createBattlefield(this.scene, this.intensity, this.mobile);
    this.scene.add(this.piecesRoot, this.markersRoot, this.effectsRoot);

    this.hoverRing = new THREE.Mesh(
      new THREE.RingGeometry(0.39, 0.46, 40),
      new THREE.MeshBasicMaterial({
        color: 0xe8c47d,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    this.hoverRing.rotation.x = -Math.PI / 2;
    this.hoverRing.position.y = BOARD_TOP + 0.012;
    this.markersRoot.add(this.hoverRing);

    this.rebuildComposer();
    this.resizeObserver = new ResizeObserver(() => this.resize());
    this.resizeObserver.observe(container);
    this.bindEvents();
    this.animate();
  }

  private rebuildComposer(): void {
    this.composer?.dispose();
    this.composer = null;
    if (this.mobile || this.intensity !== 'full') return;

    const composer = new EffectComposer(this.renderer);
    composer.addPass(new RenderPass(this.scene, this.camera));
    const bloom = new UnrealBloomPass(
      new THREE.Vector2(this.container.clientWidth, this.container.clientHeight),
      0.42,
      0.62,
      0.86
    );
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    composer.setSize(this.container.clientWidth, this.container.clientHeight);
    this.composer = composer;
  }

  private bindEvents(): void {
    const canvas = this.renderer.domElement;
    canvas.addEventListener('pointerdown', this.handlePointerDown);
    canvas.addEventListener('pointerup', this.handlePointerUp);
    canvas.addEventListener('pointermove', this.handlePointerMove);
    canvas.addEventListener('pointerleave', this.handlePointerLeave);
    canvas.addEventListener('contextmenu', this.preventContextMenu);
  }

  private preventContextMenu = (event: Event): void => {
    event.preventDefault();
  };

  private handlePointerDown = (event: PointerEvent): void => {
    this.pointerStart.set(event.clientX, event.clientY);
    this.pointerMoved = false;
  };

  private handlePointerUp = (event: PointerEvent): void => {
    const distance = Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y);
    if (distance > 7 || this.pointerMoved) return;
    const square = this.squareFromPointer(event);
    if (square) this.callbacks.onSquareClick(square);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (Math.hypot(event.clientX - this.pointerStart.x, event.clientY - this.pointerStart.y) > 7) {
      this.pointerMoved = true;
    }
    if (event.pointerType !== 'mouse') return;
    const square = this.squareFromPointer(event);
    const key = square ? `${square[0]},${square[1]}` : null;
    if ((this.hovered && `${this.hovered[0]},${this.hovered[1]}`) === key) return;
    this.hovered = square;
    if (square) {
      const point = this.toWorld(square);
      this.hoverRing.position.set(point.x, BOARD_TOP + 0.012, point.z);
      const material = this.hoverRing.material as THREE.MeshBasicMaterial;
      material.opacity = this.legalSet.has(key!) || this.piecesRoot.children.some((piece) => piece.position.distanceTo(point) < 0.15) ? 0.55 : 0;
      this.renderer.domElement.style.cursor = material.opacity > 0 ? 'pointer' : 'grab';
    } else {
      (this.hoverRing.material as THREE.MeshBasicMaterial).opacity = 0;
      this.renderer.domElement.style.cursor = 'grab';
    }
    this.callbacks.onHoverSquare(square);
  };

  private handlePointerLeave = (): void => {
    this.hovered = null;
    (this.hoverRing.material as THREE.MeshBasicMaterial).opacity = 0;
    this.callbacks.onHoverSquare(null);
  };

  private toWorld(position: Position): THREE.Vector3 {
    return new THREE.Vector3(
      (position[0] - 4) * BOARD_CELL,
      BOARD_TOP,
      (position[1] - 4.5) * BOARD_CELL
    );
  }

  private squareFromPointer(event: PointerEvent): Position | null {
    const rect = this.renderer.domElement.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -BOARD_TOP);
    const intersection = new THREE.Vector3();
    if (!this.raycaster.ray.intersectPlane(plane, intersection)) return null;
    const worldX = intersection.x / BOARD_CELL + 4;
    const worldZ = intersection.z / BOARD_CELL + 4.5;
    const x = Math.round(worldX);
    const y = Math.round(worldZ);
    if (x < 0 || x > 8 || y < 0 || y > 9) return null;
    if (Math.abs(worldX - x) > 0.53 || Math.abs(worldZ - y) > 0.53) return null;
    return [x, y];
  }

  setBoard(board: BoardState): void {
    const currentIds = new Set<string>();
    const now = this.clock.getElapsedTime();
    board.forEach((row, y) => {
      row.forEach((piece, x) => {
        if (!piece) return;
        currentIds.add(piece.id);
        let object = this.pieces.get(piece.id);
        const point = this.toWorld([x, y]);
        const inAnimation = (this.activeMove?.object === object) || this.moveQueue.some((m) => m.object === object);
        if (!object) {
          object = createPieceObject(piece, this.skin, this.intensity === 'off' ? 0.2 : 0.7);
          object.position.copy(point);
          object.userData.baseMaterial.opacity = 1;
          object.scale.setScalar(0.001);
          this.spawnTimes.set(piece.id, now + Math.min(0.5, this.pieces.size * 0.018));
          this.pieces.set(piece.id, object);
          this.piecesRoot.add(object);
        } else if (!inAnimation) {
          object.position.x = point.x;
          object.position.z = point.z;
        }
      });
    });

    const movingVictims = new Set<string>();
    if (this.activeMove?.victim?.userData.piece.id) movingVictims.add(this.activeMove.victim.userData.piece.id);
    this.moveQueue.forEach((m) => {
      if (m.victim?.userData.piece.id) movingVictims.add(m.victim.userData.piece.id);
    });

    for (const [id, object] of this.pieces) {
      if (!currentIds.has(id) && !movingVictims.has(id)) {
        this.pieces.delete(id);
        this.spawnTimes.delete(id);
        this.piecesRoot.remove(object);
        this.disposeObject(object);
      }
    }
  }

  private disposeObject(object: THREE.Object3D): void {
    object.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Points || child instanceof THREE.Line) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((material) => {
          if (material instanceof THREE.MeshStandardMaterial) material.map?.dispose();
          if (material instanceof THREE.MeshBasicMaterial) material.map?.dispose();
          material.dispose();
        });
      } else if (child instanceof THREE.Sprite) {
        child.material.map?.dispose();
        child.material.dispose();
      }
    });
  }

  setSelection(pieceId: string | null, moves: Position[]): void {
    this.selectedId = pieceId;
    this.legalSet = new Set(moves.map(([x, y]) => `${x},${y}`));
    for (const object of this.pieces.values()) {
      setPieceSelected(object, object.userData.piece.id === pieceId);
      setPieceThreatened(
        object,
        Boolean(this.checkedId && this.checkedId === object.userData.piece.id)
      );
    }
    this.markersRoot.children
      .filter((child) => child.userData.kind === 'legal')
      .forEach((child) => {
        this.markersRoot.remove(child);
        this.disposeObject(child);
      });

    moves.forEach(([x, y]) => {
      const occupied = this.piecesRoot.children.some((child) => {
        const p = child.position;
        return Math.abs(p.x - this.toWorld([x, y]).x) < 0.2 && Math.abs(p.z - this.toWorld([x, y]).z) < 0.2;
      });
      const geometry = occupied ? new THREE.RingGeometry(0.38, 0.46, 32) : new THREE.RingGeometry(0.06, 0.15, 24);
      const material = new THREE.MeshBasicMaterial({
        color: occupied ? 0xff4a30 : 0x64e6b8,
        transparent: true,
        opacity: occupied ? 0.88 : 0.82,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      });
      const marker = new THREE.Mesh(geometry, material);
      marker.rotation.x = -Math.PI / 2;
      marker.position.copy(this.toWorld([x, y]));
      marker.position.y = BOARD_TOP + 0.014;
      marker.userData.kind = 'legal';
      marker.userData.pulseOffset = Math.random() * Math.PI * 2;
      marker.userData.baseScale = 1;
      this.markersRoot.add(marker);
    });
  }

  setCheckedPiece(pieceId: string | null): void {
    this.checkedId = pieceId;
    if (this.checkedSprite) {
      this.markersRoot.remove(this.checkedSprite);
      this.checkedSprite.material.map?.dispose();
      this.checkedSprite.material.dispose();
      this.checkedSprite = null;
    }

    for (const object of this.pieces.values()) {
      setPieceThreatened(object, object.userData.piece.id === pieceId);
    }
    if (!pieceId) return;

    const material = new THREE.SpriteMaterial({
      map: makeGlyphTexture(copy.board.danger, '#ffb089', 'rgba(255,40,20,0.9)', 512, true),
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    });
    this.checkedSprite = new THREE.Sprite(material);
    this.checkedSprite.scale.set(0.9, 0.9, 0.9);
    this.markersRoot.add(this.checkedSprite);
    this.checkPulseStart = this.clock.getElapsedTime();
  }

  setLastMove(from: Position | null, to: Position | null): void {
    this.markersRoot.children
      .filter((child) => child.userData.kind === 'last-move')
      .forEach((child) => {
        this.markersRoot.remove(child);
        this.disposeObject(child);
      });
    if (!from || !to) return;
    const fromWorld = this.toWorld(from);
    const toWorld = this.toWorld(to);
    const direction = new THREE.Vector3().subVectors(toWorld, fromWorld);
    const length = direction.length();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.022, length, 6),
      new THREE.MeshBasicMaterial({
        color: palette.gold,
        transparent: true,
        opacity: 0.28,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    beam.position.copy(fromWorld).add(toWorld).multiplyScalar(0.5);
    beam.position.y = BOARD_TOP + 0.015;
    beam.quaternion.setFromUnitVectors(Y_AXIS, direction.clone().normalize());
    beam.userData.kind = 'last-move';
    this.markersRoot.add(beam);

    [fromWorld, toWorld].forEach((point) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(0.27, 0.33, 28),
        new THREE.MeshBasicMaterial({
          color: 0xf4c97e,
          transparent: true,
          opacity: 0.5,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(point);
      ring.position.y = BOARD_TOP + 0.016;
      ring.userData.kind = 'last-move';
      this.markersRoot.add(ring);
    });
  }

  showHint(from: Position, to: Position): void {
    this.markersRoot.children
      .filter((child) => child.userData.kind === 'hint')
      .forEach((child) => {
        this.markersRoot.remove(child);
        this.disposeObject(child);
      });
    const fromWorld = this.toWorld(from);
    const toWorld = this.toWorld(to);
    [fromWorld, toWorld].forEach((point, index) => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(index === 0 ? 0.39 : 0.3, index === 0 ? 0.48 : 0.4, 36),
        new THREE.MeshBasicMaterial({
          color: 0x82ffe0,
          transparent: true,
          opacity: 0.9,
          side: THREE.DoubleSide,
          depthWrite: false,
          blending: THREE.AdditiveBlending
        })
      );
      ring.rotation.x = -Math.PI / 2;
      ring.position.copy(point);
      ring.position.y = BOARD_TOP + 0.018;
      ring.userData.kind = 'hint';
      this.markersRoot.add(ring);
    });
    const direction = new THREE.Vector3().subVectors(toWorld, fromWorld);
    const length = direction.length();
    const guide = new THREE.Mesh(
      new THREE.CylinderGeometry(0.014, 0.014, length, 6),
      new THREE.MeshBasicMaterial({
        color: 0x82ffe0,
        transparent: true,
        opacity: 0.52,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    guide.position.copy(fromWorld).add(toWorld).multiplyScalar(0.5);
    guide.position.y = BOARD_TOP + 0.018;
    guide.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
    guide.userData.kind = 'hint';
    this.markersRoot.add(guide);
  }

  clearHint(): void {
    this.markersRoot.children
      .filter((child) => child.userData.kind === 'hint')
      .forEach((child) => {
        this.markersRoot.remove(child);
        this.disposeObject(child);
      });
  }

  setSkin(skin: BoardSkin): void {
    if (skin === this.skin) return;
    this.skin = skin;
    for (const piece of this.pieces.values()) setPieceSkin(piece, skin);
  }

  setIntensity(intensity: EffectIntensity): void {
    if (intensity === this.intensity) return;
    this.intensity = intensity;
    this.autoReduced = false;
    this.renderer.shadowMap.enabled = !this.mobile && intensity !== 'off';
    this.scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      materials.forEach((material) => {
        material.needsUpdate = true;
      });
    });
    this.rebuildComposer();
  }

  setIdle(idle: boolean): void {
    this.idle = idle;
    this.controls.autoRotate = idle;
  }

  setFlipped(flipped: boolean, animate = true): void {
    if (flipped === this.flipped && animate) return;
    this.flipped = flipped;
    this.moveCamera(flipped ? CAMERA_BLACK : CAMERA_RED, TARGET, animate ? 800 : 0);
  }

  resetCamera(overhead = false): void {
    this.moveCamera(overhead ? CAMERA_OVERHEAD : this.flipped ? CAMERA_BLACK : CAMERA_RED, TARGET, 700);
  }

  private moveCamera(to: THREE.Vector3, target: THREE.Vector3, duration: number): void {
    if (duration <= 0) {
      this.camera.position.copy(to);
      this.controls.target.copy(target);
      this.controls.update();
      return;
    }
    this.cameraTween = {
      from: this.camera.position.clone(),
      to: to.clone(),
      targetFrom: this.controls.target.clone(),
      targetTo: target.clone(),
      started: performance.now(),
      duration
    };
  }

  playMove(visual: VisualMove): void {
    const object = this.pieces.get(visual.move.piece.id) ?? null;
    let victim: PieceObject | null = null;
    if (visual.move.captured) {
      const existing = this.pieces.get(visual.move.captured.id);
      if (existing) {
        victim = existing;
        this.pieces.delete(visual.move.captured.id);
      } else {
        victim = createPieceObject(visual.move.captured, this.skin, 0.45);
        victim.position.copy(this.toWorld(visual.move.to));
        this.effectsRoot.add(victim);
      }
    }
    const start = this.toWorld(visual.move.from);
    start.y = object ? object.position.y : BOARD_TOP;
    const end = this.toWorld(visual.move.to);
    end.y = BOARD_TOP;
    if (object) {
      object.position.x = start.x;
      object.position.z = start.z;
    }
    const move: ActiveMove = {
      visual,
      object,
      victim,
      start,
      end,
      began: performance.now(),
      duration: visual.duration,
      impacted: false
    };
    if (!this.activeMove) {
      this.activeMove = move;
    } else {
      this.moveQueue.push(move);
    }
    this.clearHint();
  }

  private startNextMove(now: number): void {
    if (this.activeMove || this.moveQueue.length === 0) return;
    const move = this.moveQueue.shift()!;
    move.began = now;
    this.activeMove = move;
  }

  private impact(move: ActiveMove, elapsed: number): void {
    if (move.impacted) return;
    move.impacted = true;
    this.shakeTime = 0.12;
    this.shakeIntensity = move.visual.move.captured ? 0.06 : 0.028;

    const ringRadius = move.visual.move.captured ? 1.5 : 1.05;
    this.addRing(move.end, palette.goldBright, ringRadius, 260);

    if (this.intensity !== 'off') {
      this.spawnBurst(move.end, 0xecd7a6, move.visual.move.captured ? 10 : 5, 0.65);
    }
    if (move.victim) {
      move.victim.userData.baseMaterial.transparent = true;
      move.victim.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            material.transparent = true;
          });
        }
      });
    }
    if (move.object && this.intensity !== 'off' && elapsed > 0) {
      this.addTrail(move.object.position, move.start, move.visual.move.piece.color === 'red' ? 0xff8a4f : 0x84ddce);
    }
  }

  private updateMove(now: number): void {
    this.startNextMove(now);
    const move = this.activeMove;
    if (!move) return;
    const raw = Math.min(1, (now - move.began) / move.duration);
    const object = move.object;
    const piece = move.visual.move.piece;
    const start = move.start;
    const end = move.end;
    const delta = new THREE.Vector3().subVectors(end, start);
    const progress = easeOutCubic(raw);

    if (object) {
      object.position.x = start.x + delta.x * progress;
      object.position.z = start.z + delta.z * progress;
      const baseY = start.y + (BOARD_TOP - start.y) * progress;
      const arcHeight = piece.type === 'horse' ? 0.65 : piece.type === 'cannon' ? 0.48 : 0.22;
      object.position.y = baseY + Math.sin(Math.PI * raw) * arcHeight;
      if (piece.type === 'horse') object.rotation.z = Math.sin(raw * Math.PI) * 0.04;
    }

    if (raw >= 0.92) this.impact(move, raw);

    if (move.victim && raw >= 0.82) {
      const victimProgress = Math.min(1, (raw - 0.82) / 0.18);
      move.victim.position.copy(end);
      move.victim.position.y = BOARD_TOP - victimProgress * 0.15;
      move.victim.scale.setScalar(Math.max(0.001, 1 - victimProgress * 0.45));
      move.victim.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          const materials = Array.isArray(child.material) ? child.material : [child.material];
          materials.forEach((material) => {
            (material as THREE.MeshBasicMaterial).opacity = 1 - victimProgress;
          });
        }
      });
    }

    if (raw >= 1) {
      if (object) {
        object.position.copy(end);
        object.position.y = BOARD_TOP;
        object.rotation.set(0, 0, 0);
      }
      if (move.victim) {
        this.effectsRoot.remove(move.victim);
        this.disposeObject(move.victim);
      }
      this.activeMove = null;
      this.callbacks.onAnimationComplete(move.visual.id);
    }
  }

  private createBurstPoints(): THREE.Points<THREE.BufferGeometry, THREE.PointsMaterial> {
    const positions = new Float32Array(64 * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 0.09,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });
    const points = new THREE.Points(geometry, material);
    points.visible = false;
    this.effectsRoot.add(points);
    const burst: Burst = {
      points,
      positions,
      velocities: new Float32Array(64 * 3),
      life: 0,
      maxLife: 800
    };
    this.bursts.push(burst);
    return points;
  }

  private spawnBurst(position: THREE.Vector3, color: number, count: number, power: number): void {
    if (this.intensity === 'off') return;
    const limited = this.intensity === 'reduced' ? Math.ceil(count * 0.42) : this.autoReduced ? Math.ceil(count * 0.55) : count;
    let burst = this.bursts.find((candidate) => !candidate.points.visible);
    if (!burst) {
      this.createBurstPoints();
      burst = this.bursts[this.bursts.length - 1];
    }
    if (!burst) return;
    for (let index = 0; index < 64; index += 1) {
      burst.positions[index * 3] = position.x;
      burst.positions[index * 3 + 1] = position.y + 0.25;
      burst.positions[index * 3 + 2] = position.z;
      const angle = Math.random() * Math.PI * 2;
      const speed = (0.35 + Math.random() * 1.2) * power;
      burst.velocities[index * 3] = Math.cos(angle) * speed;
      burst.velocities[index * 3 + 1] = (0.5 + Math.random() * 1.4) * power;
      burst.velocities[index * 3 + 2] = Math.sin(angle) * speed;
    }
    burst.points.geometry.setDrawRange(0, limited);
    burst.points.geometry.attributes.position.needsUpdate = true;
    burst.points.material.color.setHex(color);
    burst.points.material.opacity = 1;
    burst.points.material.size = this.mobile ? 0.08 : 0.095;
    burst.points.visible = true;
    burst.life = 0;
    burst.maxLife = 620 + Math.random() * 230;
  }

  private addRing(position: THREE.Vector3, color: number, grow: number, duration: number): void {
    if (this.intensity === 'off') return;
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.18, 0.24, 40),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(position);
    ring.position.y = BOARD_TOP + 0.02;
    this.effectsRoot.add(ring);
    this.fadingMeshes.push({ mesh: ring, born: performance.now(), duration, startOpacity: 0.8, grow });
  }

  private addTrail(position: THREE.Vector3, target: THREE.Vector3, color: number): void {
    if (this.intensity !== 'full' || this.autoReduced) return;
    const current = position.clone();
    current.y = Math.max(BOARD_TOP + 0.08, position.y);
    const end = target.clone();
    end.y = Math.max(BOARD_TOP + 0.08, target.y);
    const direction = new THREE.Vector3().subVectors(current, end);
    const length = direction.length();
    if (length < 0.08) return;
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.028, 0.012, Math.min(length, 1.2), 6),
      new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.48,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    beam.position.copy(end).add(current).multiplyScalar(0.5);
    beam.quaternion.setFromUnitVectors(Y_AXIS, direction.normalize());
    this.effectsRoot.add(beam);
    this.fadingMeshes.push({ mesh: beam, born: performance.now(), duration: 420, startOpacity: 0.48, grow: 1 });
  }

  playVictory(color: 'red' | 'black' | 'draw'): void {
    const position = new THREE.Vector3(0, BOARD_TOP + 0.4, 0);
    const colorHex = color === 'red' ? 0xff6b3f : color === 'black' ? 0x8ee5d5 : 0xe7c279;
    this.spawnBurst(position, colorHex, 64, 2.8);
    this.addRing(position, colorHex, 5.5, 1000);
    this.moveCamera(new THREE.Vector3(5.2, 7.8, 8.2), new THREE.Vector3(0, 0.1, 0), 850);
  }

  private resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.composer?.setSize(width, height);
  }

  private updateAmbient(now: number, delta: number, elapsed: number): void {
    this.battlefield.update(elapsed, delta, this.intensity);

    const nowSeconds = now / 1000;
    this.pieces.forEach((piece) => {
      const spawnAt = this.spawnTimes.get(piece.userData.piece.id);
      if (spawnAt !== undefined) {
        const progress = Math.min(1, (elapsed - spawnAt) / 0.38);
        if (progress >= 0) {
          piece.visible = true;
          const bounce = 1 + Math.sin(progress * Math.PI) * 0.08;
          piece.scale.setScalar(Math.max(0.001, easeOutCubic(progress) * bounce));
          if (progress >= 1) {
            piece.scale.setScalar(1);
            this.spawnTimes.delete(piece.userData.piece.id);
          }
        }
      }
      const selected = piece.userData.piece.id === this.selectedId;
      const ring = piece.userData.selectionRing;
      if (selected) {
        ring.rotation.z += delta * 0.8;
        ring.scale.setScalar(1 + Math.sin(nowSeconds * 3.2) * 0.06);
      }
      if (!this.activeMove || this.activeMove.object !== piece) {
        const targetY = BOARD_TOP + (selected ? 0.36 + Math.sin(nowSeconds * 3.6) * 0.025 : 0);
        piece.position.y += (targetY - piece.position.y) * Math.min(1, delta * 15);
        ring.position.y = 0.012 - (piece.position.y - BOARD_TOP);
        if (selected) {
          piece.rotation.x = Math.sin(nowSeconds * 2.8) * 0.02;
          piece.rotation.z = Math.cos(nowSeconds * 2.8) * 0.02;
        } else {
          piece.rotation.x += (0 - piece.rotation.x) * Math.min(1, delta * 12);
          piece.rotation.z += (0 - piece.rotation.z) * Math.min(1, delta * 12);
        }
      }
    });

    this.markersRoot.children.forEach((marker) => {
      if (marker.userData.kind === 'legal') {
        const pulse = 0.88 + Math.sin(nowSeconds * 3.4 + marker.userData.pulseOffset) * 0.12;
        marker.scale.setScalar(pulse);
      }
    });

    if (this.checkedSprite && this.checkedId) {
      const piece = this.pieces.get(this.checkedId);
      if (piece) {
        this.checkedSprite.position.copy(piece.position);
        this.checkedSprite.position.y += 1.35;
        const pulse = 1 + Math.sin((elapsed - this.checkPulseStart) * 4) * 0.08;
        this.checkedSprite.scale.setScalar(pulse);
      }
    }

    this.bursts.forEach((burst) => {
      if (!burst.points.visible) return;
      burst.life += delta * 1000;
      const progress = burst.life / burst.maxLife;
      if (progress >= 1) {
        burst.points.visible = false;
        return;
      }
      for (let index = 0; index < 64; index += 1) {
        burst.velocities[index * 3 + 1] -= delta * 3.2;
        burst.positions[index * 3] += burst.velocities[index * 3] * delta;
        burst.positions[index * 3 + 1] += burst.velocities[index * 3 + 1] * delta;
        burst.positions[index * 3 + 2] += burst.velocities[index * 3 + 2] * delta;
      }
      burst.points.geometry.attributes.position.needsUpdate = true;
      burst.points.material.opacity = 1 - progress;
    });

    this.fadingMeshes = this.fadingMeshes.filter((effect) => {
      const progress = (now - effect.born) / effect.duration;
      if (progress >= 1) {
        this.effectsRoot.remove(effect.mesh);
        effect.mesh.geometry.dispose();
        effect.mesh.material.dispose();
        return false;
      }
      effect.mesh.material.opacity = effect.startOpacity * (1 - progress);
      effect.mesh.scale.setScalar(1 + progress * effect.grow);
      return true;
    });

    if (this.cameraTween) {
      const progress = Math.min(1, (now - this.cameraTween.started) / this.cameraTween.duration);
      const eased = easeInOutCubic(progress);
      this.camera.position.lerpVectors(this.cameraTween.from, this.cameraTween.to, eased);
      this.controls.target.lerpVectors(this.cameraTween.targetFrom, this.cameraTween.targetTo, eased);
      if (progress >= 1) this.cameraTween = null;
    }
  }

  private animate = (): void => {
    if (this.destroyed) return;
    this.animationFrame = requestAnimationFrame(this.animate);
    const delta = Math.min(this.clock.getDelta(), 0.05);
    const elapsed = this.clock.getElapsedTime();
    const now = performance.now();
    if (this.intensity === 'full' && !this.autoReduced) {
      if (this.performanceStarted === 0) this.performanceStarted = elapsed;
      this.performanceFrames += 1;
      const sampleDuration = elapsed - this.performanceStarted;
      if (sampleDuration >= 3) {
        const fps = this.performanceFrames / sampleDuration;
        if (fps < 45) {
          this.autoReduced = true;
          this.renderer.setPixelRatio(1);
          this.renderer.shadowMap.enabled = false;
          if (this.composer) this.composer.setPixelRatio(1);
        }
        this.performanceFrames = 0;
        this.performanceStarted = elapsed;
      }
    }
    this.updateAmbient(now, delta, elapsed);
    this.updateMove(now);
    this.controls.autoRotate = this.idle && !this.activeMove;
    this.controls.update();

    if (this.shakeTime > 0) {
      this.shakeTime -= delta;
      const factor = Math.max(0, this.shakeTime / 0.12);
      this.camera.position.x += (Math.random() - 0.5) * this.shakeIntensity * factor;
      this.camera.position.y += (Math.random() - 0.5) * this.shakeIntensity * factor;
    }

    if (this.composer) this.composer.render();
    else this.renderer.render(this.scene, this.camera);
  };

  dispose(): void {
    this.destroyed = true;
    cancelAnimationFrame(this.animationFrame);
    this.resizeObserver.disconnect();
    const canvas = this.renderer.domElement;
    canvas.removeEventListener('pointerdown', this.handlePointerDown);
    canvas.removeEventListener('pointerup', this.handlePointerUp);
    canvas.removeEventListener('pointermove', this.handlePointerMove);
    canvas.removeEventListener('pointerleave', this.handlePointerLeave);
    canvas.removeEventListener('contextmenu', this.preventContextMenu);
    this.controls.dispose();
    this.composer?.dispose();
    this.pieces.forEach((piece) => this.disposeObject(piece));
    this.markersRoot.children.forEach((child) => this.disposeObject(child));
    this.effectsRoot.children.forEach((child) => this.disposeObject(child));
    this.renderer.dispose();
    canvas.remove();
  }
}
