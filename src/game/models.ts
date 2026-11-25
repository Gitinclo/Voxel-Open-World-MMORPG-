import * as THREE from 'three';
import { LINEAGES } from './rules';
import type { LineageId } from './types';

// Shared contact shadow texture & disc so every actor/vehicle/pickup sits grounded
let _contactShadowTex: THREE.CanvasTexture | null = null;
function getContactShadowTexture(): THREE.CanvasTexture {
  if (_contactShadowTex) return _contactShadowTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(32, 32, 4, 32, 32, 30);
  grad.addColorStop(0, 'rgba(0,0,0,0.62)');
  grad.addColorStop(0.65, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 64);
  _contactShadowTex = new THREE.CanvasTexture(c);
  return _contactShadowTex;
}

export function createContactShadow(radius: number): THREE.Mesh {
  const mat = new THREE.MeshBasicMaterial({
    map: getContactShadowTexture(),
    transparent: true,
    depthWrite: false,
    opacity: 0.72,
  });
  const disc = new THREE.Mesh(new THREE.CircleGeometry(radius, 18), mat);
  disc.rotation.x = -Math.PI / 2;
  disc.position.y = 0.04;
  return disc;
}

export function createStoneBumpTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, 128, 128);
  for (let row = 0; row < 4; row++) {
    const y = row * 32;
    const offset = (row % 2) * 32;
    for (let col = -1; col < 3; col++) {
      const x = col * 64 + offset;
      const shade = 148 + ((row * 17 + col * 31) % 36);
      ctx.fillStyle = `rgb(${shade},${shade},${shade})`;
      ctx.fillRect(x + 2, y + 2, 60, 28);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(3, 3);
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export function createAdDroneTexture(maxAnisotropy: number): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#facc15';
  ctx.fillRect(0, 0, 128, 128);
  ctx.strokeStyle = '#dc2626';
  ctx.lineWidth = 10;
  ctx.strokeRect(5, 5, 118, 118);
  ctx.fillStyle = '#111827';
  ctx.fillRect(14, 18, 100, 22);
  ctx.fillStyle = '#fde047';
  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('SPAM POPUP', 64, 34);
  ctx.fillStyle = '#b91c1c';
  ctx.font = '900 44px sans-serif';
  ctx.fillText('AD!', 64, 92);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  return tex;
}

export interface HumanoidRig {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArmPivot: THREE.Group;
  hitMeshes: THREE.Mesh[];
}

/**
 * Composite 10-part articulated voxel hero / knight / companion / boss.
 * Bottom-center pivoted at y = 0 so actors always rest flush on terrain.
 */
export function createHumanoidRig(
  bodyColor: number,
  accentColor: number,
  scale = 1,
  weaponType: 'blade' | 'staff' | 'hammer' | 'voidorb' = 'blade',
  hornedBoss = false,
  lineageId?: LineageId,
): HumanoidRig {
  const group = new THREE.Group();
  const hitMeshes: THREE.Mesh[] = [];
  const lineage = lineageId ? LINEAGES[lineageId] : null;

  const bodyMat = new THREE.MeshStandardMaterial({
    color: bodyColor,
    roughness: 0.78,
    metalness: 0.12,
  });
  const armorMat = new THREE.MeshStandardMaterial({
    color: accentColor,
    roughness: 0.28,
    metalness: 0.65,
    emissive: accentColor,
    emissiveIntensity: hornedBoss ? 0.45 : 0.2,
  });
  const skinMat = new THREE.MeshStandardMaterial({
    color: hornedBoss ? 0x2c163a : lineage ? lineage.skinColor : 0xf2cfa0,
    roughness: 0.82,
    metalness: 0.04,
  });

  // Contact shadow disc
  group.add(createContactShadow(0.95));

  // Boots & Legs
  const legGeo = new THREE.BoxGeometry(0.36, 0.96, 0.38);
  const leftLeg = new THREE.Mesh(legGeo, bodyMat);
  leftLeg.position.set(-0.23, 0.48, 0);
  leftLeg.castShadow = true;
  const rightLeg = new THREE.Mesh(legGeo, bodyMat);
  rightLeg.position.set(0.23, 0.48, 0);
  rightLeg.castShadow = true;

  // Torso + Breastplate + Pauldrons
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.96, 1.2, 0.54), bodyMat);
  torso.position.y = 1.56;
  torso.castShadow = true;
  const chestPlate = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.62, 0.62), armorMat);
  chestPlate.position.y = 1.72;
  const cloak = new THREE.Mesh(new THREE.BoxGeometry(0.84, 1.15, 0.12), bodyMat);
  cloak.position.set(0, 1.38, -0.34);
  cloak.rotation.x = 0.14;

  // Head + Visor/Helm
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 0.7), skinMat);
  head.position.y = 2.58;
  head.castShadow = true;
  const helm = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.32, 0.8), armorMat);
  helm.position.y = 2.86;
  const visor = new THREE.Mesh(
    new THREE.BoxGeometry(0.56, 0.16, 0.12),
    new THREE.MeshStandardMaterial({
      color: hornedBoss ? 0xf43f5e : 0x38bdf8,
      emissive: hornedBoss ? 0xe11d48 : 0x0284c7,
      emissiveIntensity: 1.2,
      roughness: 0.15,
    }),
  );
  visor.position.set(0, 2.6, 0.34);

  if (hornedBoss) {
    const hornGeo = new THREE.ConeGeometry(0.14, 0.72, 6);
    const hL = new THREE.Mesh(hornGeo, armorMat);
    hL.position.set(-0.42, 3.16, 0);
    hL.rotation.z = 0.45;
    const hR = new THREE.Mesh(hornGeo, armorMat);
    hR.position.set(0.42, 3.16, 0);
    hR.rotation.z = -0.45;
    group.add(hL, hR);
  }

  // Left arm + shoulder pauldron
  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.96, 0.34), bodyMat);
  leftArm.position.set(-0.68, 1.6, 0);
  const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.46), armorMat);
  pauldronL.position.set(-0.68, 2.04, 0);

  // Right arm pivot + weapon assembly
  const rightArmPivot = new THREE.Group();
  rightArmPivot.position.set(0.68, 2.02, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.96, 0.34), bodyMat);
  rightArm.position.set(0, -0.42, 0);
  const pauldronR = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.28, 0.46), armorMat);
  pauldronR.position.set(0, 0.04, 0);
  rightArmPivot.add(rightArm, pauldronR);

  if (weaponType === 'blade') {
    const hilt = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.12, 0.16),
      new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.85, roughness: 0.25 }),
    );
    hilt.position.set(0, -0.78, 0.36);
    const blade = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 1.85, 0.24),
      new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        emissive: accentColor,
        emissiveIntensity: 0.45,
        metalness: 0.85,
        roughness: 0.18,
      }),
    );
    blade.position.set(0, -0.78, 1.25);
    blade.rotation.x = Math.PI / 2;
    rightArmPivot.add(hilt, blade);
  } else if (weaponType === 'staff') {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.06, 0.07, 2.3, 8),
      new THREE.MeshStandardMaterial({ color: 0x6b3e1b, roughness: 0.82 }),
    );
    shaft.position.set(0, -0.58, 0.72);
    shaft.rotation.x = Math.PI / 2.4;
    const crown = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.28, 0),
      new THREE.MeshStandardMaterial({
        color: 0xfb923c,
        emissive: 0xf97316,
        emissiveIntensity: 1.35,
        roughness: 0.15,
      }),
    );
    crown.position.set(0, -0.15, 1.75);
    rightArmPivot.add(shaft, crown);
  } else if (weaponType === 'hammer') {
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.07, 2.0, 8),
      new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.6, roughness: 0.4 }),
    );
    handle.position.set(0, -0.68, 0.82);
    handle.rotation.x = Math.PI / 2.2;
    const headBlock = new THREE.Mesh(
      new THREE.BoxGeometry(0.68, 0.48, 0.46),
      new THREE.MeshStandardMaterial({
        color: 0x94a3b8,
        emissive: accentColor,
        emissiveIntensity: 0.35,
        metalness: 0.85,
        roughness: 0.22,
      }),
    );
    headBlock.position.set(0, -0.54, 1.72);
    rightArmPivot.add(handle, headBlock);
  } else {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.34, 0.06, 8, 18),
      new THREE.MeshStandardMaterial({
        color: 0xc084fc,
        emissive: 0x9333ea,
        emissiveIntensity: 1.1,
        metalness: 0.5,
        roughness: 0.2,
      }),
    );
    ring.position.set(0, -0.62, 1.15);
    const orb = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.2, 0),
      new THREE.MeshStandardMaterial({
        color: 0xe879f9,
        emissive: 0xd946ef,
        emissiveIntensity: 1.4,
        roughness: 0.12,
      }),
    );
    orb.position.set(0, -0.62, 1.15);
    rightArmPivot.add(ring, orb);
  }

  // Authentic Open-World-MMORPG- Fantasy Lineage 3D Mesh Traits
  if (lineage && !hornedBoss) {
    const traitMat = new THREE.MeshStandardMaterial({
      color: lineage.accentColor,
      emissive: lineage.accentColor,
      emissiveIntensity: 0.35,
      roughness: 0.3,
      metalness: 0.65,
    });
    if (lineage.trait === 'crest') {
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.18, 0), traitMat);
      crest.position.set(0, 3.16, 0.08);
      group.add(crest);
    } else if (lineage.trait === 'ears') {
      const earGeo = new THREE.ConeGeometry(0.08, 0.38, 5);
      const earL = new THREE.Mesh(earGeo, skinMat);
      earL.position.set(-0.48, 2.62, 0);
      earL.rotation.z = 1.1;
      const earR = new THREE.Mesh(earGeo, skinMat);
      earR.position.set(0.48, 2.62, 0);
      earR.rotation.z = -1.1;
      group.add(earL, earR);
    } else if (lineage.trait === 'beard') {
      const beard = new THREE.Mesh(
        new THREE.BoxGeometry(0.56, 0.44, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.88 }),
      );
      beard.position.set(0, 2.16, 0.32);
      group.add(beard);
    } else if (lineage.trait === 'horns') {
      const hornGeo = new THREE.ConeGeometry(0.09, 0.56, 6);
      const hL = new THREE.Mesh(hornGeo, traitMat);
      hL.position.set(-0.34, 3.12, -0.04);
      hL.rotation.z = 0.52;
      const hR = new THREE.Mesh(hornGeo, traitMat);
      hR.position.set(0.34, 3.12, -0.04);
      hR.rotation.z = -0.52;
      group.add(hL, hR);
    } else if (lineage.trait === 'tails') {
      const tailGeo = new THREE.ConeGeometry(0.14, 0.95, 6);
      [-0.38, 0, 0.38].forEach((rotZ, idx) => {
        const tail = new THREE.Mesh(tailGeo, idx === 1 ? traitMat : skinMat);
        tail.position.set(rotZ * 0.45, 1.15, -0.55);
        tail.rotation.x = -0.85;
        tail.rotation.z = rotZ;
        group.add(tail);
      });
    } else if (lineage.trait === 'crystals') {
      const shardGeo = new THREE.OctahedronGeometry(0.14, 0);
      [
        [-0.78, 2.75, -0.35],
        [0.78, 2.75, -0.35],
        [0, 3.28, -0.35],
      ].forEach(([sx, sy, sz]) => {
        const shard = new THREE.Mesh(shardGeo, traitMat);
        shard.position.set(sx, sy, sz);
        group.add(shard);
      });
    }
  }

  group.add(leftLeg, rightLeg, torso, chestPlate, cloak, head, helm, visor, leftArm, pauldronL, rightArmPivot);
  hitMeshes.push(torso, chestPlate, head);
  if (lineage && !hornedBoss) {
    group.scale.set(scale * lineage.scale[0], scale * lineage.scale[1], scale * lineage.scale[2]);
  } else {
    group.scale.setScalar(scale);
  }

  return { group, leftLeg, rightLeg, leftArm, rightArmPivot, hitMeshes };
}

/**
 * Composite 11-part GeminIsland Off-Road Island Buggy (drivable via [E]).
 */
export interface BuggyModel {
  group: THREE.Group;
  wheels: THREE.Mesh[];
  headlightGlows: THREE.Mesh[];
}

export function createIslandBuggy(): BuggyModel {
  const group = new THREE.Group();
  group.add(createContactShadow(2.4));

  const chassisMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.32,
    metalness: 0.55,
  });
  const frameMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.68,
    metalness: 0.45,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: 0x171717,
    roughness: 0.92,
    metalness: 0.05,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.22,
    metalness: 0.85,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    roughness: 0.12,
    metalness: 0.25,
    transparent: true,
    opacity: 0.65,
  });
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.2,
    roughness: 0.15,
  });

  // Lower body & hood
  const chassis = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.68, 3.8), chassisMat);
  chassis.position.y = 0.82;
  chassis.castShadow = true;

  const bumper = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.28, 0.38), frameMat);
  bumper.position.set(0, 0.64, 2.02);

  // Rollcage + windshield + seat + spoiler
  const windshield = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.72, 0.1), glassMat);
  windshield.position.set(0, 1.48, 0.78);
  windshield.rotation.x = -0.35;

  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.82, 0.12, 1.85), frameMat);
  roof.position.set(0, 1.94, -0.38);

  const pillarGeo = new THREE.CylinderGeometry(0.06, 0.06, 0.95, 6);
  [
    [-0.82, 1.5, 0.45],
    [0.82, 1.5, 0.45],
    [-0.82, 1.5, -1.2],
    [0.82, 1.5, -1.2],
  ].forEach(([px, py, pz]) => {
    const p = new THREE.Mesh(pillarGeo, frameMat);
    p.position.set(px, py, pz);
    group.add(p);
  });

  const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.96, 0.12, 0.42), chassisMat);
  spoiler.position.set(0, 1.52, -1.86);

  // Headlights
  const headlightGlows: THREE.Mesh[] = [];
  [-0.68, 0.68].forEach((lx) => {
    const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.12, 10), lampMat);
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(lx, 0.95, 1.92);
    group.add(lamp);
    headlightGlows.push(lamp);
  });

  // 4 Wheels with metallic hubs
  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.42, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(0.28, 0.28, 0.45, 8);
  rimGeo.rotateZ(Math.PI / 2);

  [
    [-1.18, 0.56, 1.25],
    [1.18, 0.56, 1.25],
    [-1.18, 0.56, -1.25],
    [1.18, 0.56, -1.25],
  ].forEach(([wx, wy, wz]) => {
    const w = new THREE.Mesh(wheelGeo, tireMat);
    w.position.set(wx, wy, wz);
    w.castShadow = true;
    const hub = new THREE.Mesh(rimGeo, rimMat);
    w.add(hub);
    group.add(w);
    wheels.push(w);
  });

  group.add(chassis, bumper, windshield, roof, spoiler);
  return { group, wheels, headlightGlows };
}

/**
 * Composite 5-part GeminIsland Roaming Slime.
 */
export function createSlimeEnemy(): { group: THREE.Group; hitMeshes: THREE.Mesh[] } {
  const group = new THREE.Group();
  group.add(createContactShadow(0.95));

  const outerMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.18,
    metalness: 0.08,
    transparent: true,
    opacity: 0.82,
  });
  const coreMat = new THREE.MeshStandardMaterial({
    color: 0x15803d,
    emissive: 0x16a34a,
    emissiveIntensity: 0.55,
    roughness: 0.4,
  });
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x0f172a });

  const body = new THREE.Mesh(new THREE.SphereGeometry(0.88, 14, 12), outerMat);
  body.scale.set(1.12, 0.82, 1.12);
  body.position.y = 0.72;
  body.castShadow = true;

  const core = new THREE.Mesh(new THREE.OctahedronGeometry(0.4, 0), coreMat);
  core.position.y = 0.68;

  const eyeL = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.12), eyeMat);
  eyeL.position.set(-0.26, 0.82, 0.82);
  const eyeR = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.12), eyeMat);
  eyeR.position.set(0.26, 0.82, 0.82);

  group.add(body, core, eyeL, eyeR);
  return { group, hitMeshes: [body] };
}

/**
 * Composite 6-part Pop-Up Spam Drone (Kotlin Ad-Blocker repo enemy).
 */
export function createSpamDroneModel(adTex: THREE.CanvasTexture): {
  group: THREE.Group;
  hitMeshes: THREE.Mesh[];
} {
  const group = new THREE.Group();
  group.add(createContactShadow(0.9));

  const cubeMat = new THREE.MeshStandardMaterial({
    map: adTex,
    color: 0xffffff,
    roughness: 0.35,
    metalness: 0.2,
    emissive: 0x854d0e,
    emissiveIntensity: 0.28,
  });
  const ringMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 0.8,
    roughness: 0.25,
    metalness: 0.65,
  });
  const finMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.7,
    metalness: 0.4,
  });

  const cube = new THREE.Mesh(new THREE.BoxGeometry(1.35, 1.35, 1.35), cubeMat);
  cube.position.y = 2.15;
  cube.castShadow = true;

  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.09, 8, 20), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 2.15;

  const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.75, 6), finMat);
  antenna.position.y = 3.15;
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 8), ringMat);
  beacon.position.y = 3.55;

  const finL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.45), finMat);
  finL.position.set(-0.98, 2.15, 0);
  const finR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.45), finMat);
  finR.position.set(0.98, 2.15, 0);

  group.add(cube, ring, antenna, beacon, finL, finR);
  return { group, hitMeshes: [cube] };
}

/**
 * Floating 3D L.E.O. AI Companion Orb (LEO-assistant / LEO-assit / LEO-AI Trio).
 */
export function createLeoOrbModel(): { group: THREE.Group; ringA: THREE.Mesh; ringB: THREE.Mesh } {
  const group = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.IcosahedronGeometry(0.42, 1),
    new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 1.15,
      roughness: 0.15,
      metalness: 0.75,
    }),
  );
  const eye = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 10, 10),
    new THREE.MeshBasicMaterial({ color: 0xe0f2fe }),
  );
  eye.position.z = 0.36;
  const ringA = new THREE.Mesh(
    new THREE.TorusGeometry(0.68, 0.045, 8, 22),
    new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      emissive: 0xd97706,
      emissiveIntensity: 0.85,
      metalness: 0.8,
      roughness: 0.2,
    }),
  );
  const ringB = new THREE.Mesh(
    new THREE.TorusGeometry(0.84, 0.035, 8, 22),
    new THREE.MeshBasicMaterial({ color: 0x67e8f9 }),
  );
  ringB.rotation.x = Math.PI / 2;
  group.add(core, eye, ringA, ringB);
  return { group, ringA, ringB };
}

/**
 * LoRAFlow Spatial Bio-Lab with rotating 3D DNA Double-Helix Bio-Reactor.
 */
export function createLoraBioLab(): { group: THREE.Group; dnaHelix: THREE.Group } {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.68, metalness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: 0x10b981,
    emissive: 0x059669,
    emissiveIntensity: 0.7,
    roughness: 0.22,
    metalness: 0.6,
  });

  const deck = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 10.6, 0.9, 6), baseMat);
  deck.position.y = 0.45;
  deck.receiveShadow = true;

  const rim = new THREE.Mesh(new THREE.TorusGeometry(9.2, 0.22, 8, 6), accentMat);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.92;

  // 3 Structural Lab Arches
  for (let i = 0; i < 3; i++) {
    const ang = (i / 3) * Math.PI * 2;
    const pillar = new THREE.Mesh(new THREE.BoxGeometry(0.9, 8.2, 0.9), baseMat);
    pillar.position.set(Math.cos(ang) * 7.2, 4.5, Math.sin(ang) * 7.2);
    pillar.castShadow = true;
    group.add(pillar);
  }

  const cap = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.2, 0.7, 6), baseMat);
  cap.position.y = 8.9;

  // Glass Containment Chamber
  const glass = new THREE.Mesh(
    new THREE.CylinderGeometry(2.6, 2.6, 7.2, 18, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x34d399,
      roughness: 0.12,
      metalness: 0.2,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );
  glass.position.y = 4.6;
  glass.renderOrder = 3;

  // Rotating 3D DNA Double Helix
  const dnaHelix = new THREE.Group();
  dnaHelix.position.y = 1.4;
  const nodeGeo = new THREE.SphereGeometry(0.24, 8, 8);
  const rungGeo = new THREE.CylinderGeometry(0.06, 0.06, 2.5, 6);
  rungGeo.rotateZ(Math.PI / 2);
  const strandAMat = new THREE.MeshStandardMaterial({
    color: 0x34d399,
    emissive: 0x10b981,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const strandBMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const rungMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.6, roughness: 0.3 });

  for (let i = 0; i < 12; i++) {
    const y = i * 0.56;
    const a = i * 0.58;
    const x = Math.cos(a) * 1.25;
    const z = Math.sin(a) * 1.25;

    const n1 = new THREE.Mesh(nodeGeo, strandAMat);
    n1.position.set(x, y, z);
    const n2 = new THREE.Mesh(nodeGeo, strandBMat);
    n2.position.set(-x, y, -z);
    const rung = new THREE.Mesh(rungGeo, rungMat);
    rung.position.set(0, y, 0);
    rung.rotation.y = -a;
    dnaHelix.add(n1, n2, rung);
  }

  group.add(deck, rim, cap, dnaHelix, glass);
  return { group, dnaHelix };
}

/**
 * Rainy Bookstore Cabin (MemeForge v2.3.0 / LEO Lore: Lin_Jie & Ji_Zhixiu).
 */
export function createRainyBookstoreCabin(): THREE.Group {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.86, metalness: 0.05 });
  const plasterMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc2, roughness: 0.9, metalness: 0.02 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2b3445, roughness: 0.62, metalness: 0.2 });
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.4,
    roughness: 0.15,
  });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.5, 7.6), woodMat);
  floor.position.y = 0.25;
  floor.receiveShadow = true;

  const walls = new THREE.Mesh(new THREE.BoxGeometry(7.6, 4.2, 6.4), plasterMat);
  walls.position.y = 2.6;
  walls.castShadow = true;

  // Timber frame beams & pitched roof
  const roof = new THREE.Mesh(new THREE.ConeGeometry(6.6, 3.2, 4), roofMat);
  roof.position.y = 6.2;
  roof.rotation.y = Math.PI / 4;
  roof.castShadow = true;

  // Front doorway jambs + warm glowing window
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.7, 2.8, 0.24), woodMat);
  door.position.set(0, 1.9, 3.24);
  const windowGlow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.4, 0.2), lanternMat);
  windowGlow.position.set(-2.3, 2.5, 3.22);
  const lantern = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.62, 0.42), lanternMat);
  lantern.position.set(1.6, 3.1, 3.6);

  group.add(floor, walls, roof, door, windowGlow, lantern);
  return group;
}

/**
 * Campfire prop (GeminIsland + ShadowRealm Rest Mechanic).
 */
export function createCampfireProp(): THREE.Group {
  const g = new THREE.Group();
  const logMat = new THREE.MeshStandardMaterial({ color: 0x5c361a, roughness: 0.92 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85 });
  const flameMat = new THREE.MeshStandardMaterial({
    color: 0xfb923c,
    emissive: 0xf97316,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });

  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 0), stoneMat);
    rock.position.set(Math.cos(a) * 0.9, 0.18, Math.sin(a) * 0.9);
    g.add(rock);
  }
  const log1 = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 6), logMat);
  log1.rotation.z = Math.PI / 2;
  log1.position.y = 0.22;
  const log2 = log1.clone();
  log2.rotation.y = Math.PI / 2;
  const flame = new THREE.Mesh(new THREE.ConeGeometry(0.45, 1.1, 6), flameMat);
  flame.position.y = 0.72;
  g.add(log1, log2, flame);
  return g;
}
