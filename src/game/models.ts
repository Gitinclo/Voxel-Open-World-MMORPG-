import * as THREE from 'three';
import { LINEAGES } from './rules';
import type { LineageId, PetEvolutionStage, PetSpeciesKey, TroopBranch } from './types';

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

export interface EmeraldWaterfallModel {
  group: THREE.Group;
  mistPuffs: Array<{ mesh: THREE.Mesh; baseX: number; baseZ: number; phase: number; speed: number }>;
  curtainMat: THREE.MeshStandardMaterial;
}

/**
 * Emerald Cliff Waterfall (GeminIsland world_landmarks_v16.ts):
 * Asymmetric granite cliff massif capped with emerald moss terraces,
 * twin glowing aqua waterfall curtains plunging into a turquoise lagoon pool,
 * and animated rising plunge mist.
 */
export function createEmeraldCliffWaterfall(): EmeraldWaterfallModel {
  const group = new THREE.Group();
  const graniteMat = new THREE.MeshStandardMaterial({ color: 0x5c6472, roughness: 0.9, metalness: 0.08 });
  const darkRockMat = new THREE.MeshStandardMaterial({ color: 0x3f4754, roughness: 0.94, metalness: 0.06 });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x268b52, roughness: 0.84, metalness: 0.04 });
  const lagoonMat = new THREE.MeshStandardMaterial({
    color: 0x16b8c4,
    emissive: 0x0b6978,
    emissiveIntensity: 0.5,
    roughness: 0.16,
    metalness: 0.15,
    transparent: true,
    opacity: 0.86,
  });
  const curtainMat = new THREE.MeshStandardMaterial({
    color: 0x6ef2ff,
    emissive: 0x22c8e8,
    emissiveIntensity: 0.75,
    roughness: 0.14,
    metalness: 0.05,
    transparent: true,
    opacity: 0.78,
  });
  const mistMat = new THREE.MeshBasicMaterial({
    color: 0xe6fcff,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
  });

  // Stepped granite cliff massif (asymmetrical 3-tier voxel blocks)
  const mainCliff = new THREE.Mesh(new THREE.BoxGeometry(16.5, 14.5, 9.5), graniteMat);
  mainCliff.position.set(0, 7.25, -4.5);
  mainCliff.castShadow = true;
  mainCliff.receiveShadow = true;

  const leftShoulder = new THREE.Mesh(new THREE.BoxGeometry(7.2, 10.2, 8.2), darkRockMat);
  leftShoulder.position.set(-9.4, 5.1, -3.2);
  leftShoulder.castShadow = true;

  const rightSpur = new THREE.Mesh(new THREE.BoxGeometry(6.8, 8.6, 7.6), darkRockMat);
  rightSpur.position.set(9.2, 4.3, -2.8);
  rightSpur.castShadow = true;

  const midLedge = new THREE.Mesh(new THREE.BoxGeometry(9.6, 5.4, 4.4), graniteMat);
  midLedge.position.set(-1.2, 2.7, -0.5);

  // Emerald moss terrace caps
  const topMoss = new THREE.Mesh(new THREE.BoxGeometry(17.1, 1.0, 10.1), mossMat);
  topMoss.position.set(0, 14.8, -4.5);
  const leftMoss = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.85, 8.6), mossMat);
  leftMoss.position.set(-9.4, 10.5, -3.2);
  const rightMoss = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.8, 8.0), mossMat);
  rightMoss.position.set(9.2, 8.9, -2.8);

  // Twin glowing aqua waterfall curtains plunging down the cliff face
  const curtainMain = new THREE.Mesh(new THREE.BoxGeometry(4.2, 13.8, 0.85), curtainMat);
  curtainMain.position.set(-1.6, 7.5, 0.5);
  const curtainSide = new THREE.Mesh(new THREE.BoxGeometry(2.3, 12.2, 0.72), curtainMat);
  curtainSide.position.set(3.4, 6.8, 0.4);

  // Top spillover water lip
  const upperStream = new THREE.Mesh(new THREE.BoxGeometry(7.8, 0.32, 4.2), lagoonMat);
  upperStream.position.set(0.6, 15.32, -2.0);

  // Turquoise plunge lagoon pool & stepped stone rim
  const poolRim = new THREE.Mesh(new THREE.CylinderGeometry(11.4, 12.2, 0.7, 18), darkRockMat);
  poolRim.position.set(0.4, 0.35, 4.8);
  poolRim.receiveShadow = true;

  const lagoonPool = new THREE.Mesh(new THREE.CylinderGeometry(10.2, 10.4, 0.55, 18), lagoonMat);
  lagoonPool.position.set(0.4, 0.52, 4.8);

  // Rising plunge mist spheres (animated in engine.step)
  const mistPuffs: EmeraldWaterfallModel['mistPuffs'] = [];
  const mistGeo = new THREE.SphereGeometry(0.95, 8, 8);
  for (let i = 0; i < 8; i++) {
    const mesh = new THREE.Mesh(mistGeo, mistMat);
    const baseX = -3.4 + (i % 4) * 2.4 + (i > 3 ? 0.6 : 0);
    const baseZ = 1.4 + (i % 2) * 1.3;
    mesh.position.set(baseX, 1.2 + (i % 3) * 0.6, baseZ);
    group.add(mesh);
    mistPuffs.push({ mesh, baseX, baseZ, phase: i * 0.85, speed: 1.4 + (i % 3) * 0.35 });
  }

  // Framing wooden footbridge / viewing deck edge
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
  const viewingDeck = new THREE.Mesh(new THREE.BoxGeometry(6.4, 0.36, 3.2), deckMat);
  viewingDeck.position.set(0.4, 0.82, 14.2);

  group.add(
    mainCliff,
    leftShoulder,
    rightSpur,
    midLedge,
    topMoss,
    leftMoss,
    rightMoss,
    curtainMain,
    curtainSide,
    upperStream,
    poolRim,
    lagoonPool,
    viewingDeck,
  );
  return { group, mistPuffs, curtainMat };
}

/**
 * GeminIsland Interactive Arcade Pavilion (interactive_games.js):
 * Open-air voxel arcade kiosk housing Tic-Tac-Toe, Simon Synth, and Lights Out cabinets.
 */
export function createArcadePavilion(): THREE.Group {
  const group = new THREE.Group();
  const baseMat = new THREE.MeshStandardMaterial({ color: 0x2a3347, roughness: 0.78, metalness: 0.2 });
  const canopyMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.55, metalness: 0.25 });
  const pillarMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.42, metalness: 0.45 });
  const cabBodyMat = new THREE.MeshStandardMaterial({ color: 0x1e1b4b, roughness: 0.5, metalness: 0.3 });
  const screenCyan = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.25,
    roughness: 0.15,
  });
  const screenAmber = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xd97706,
    emissiveIntensity: 1.25,
    roughness: 0.15,
  });
  const screenPink = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xdb2777,
    emissiveIntensity: 1.25,
    roughness: 0.15,
  });

  const deck = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.5, 7.2), baseMat);
  deck.position.y = 0.25;
  deck.receiveShadow = true;

  const roof = new THREE.Mesh(new THREE.BoxGeometry(10.2, 0.55, 7.8), canopyMat);
  roof.position.y = 4.65;
  roof.castShadow = true;

  const neonTrim = new THREE.Mesh(new THREE.BoxGeometry(10.35, 0.16, 7.95), screenCyan);
  neonTrim.position.y = 4.35;

  const pillarCoords: Array<[number, number]> = [
    [-4.3, -3.1],
    [4.3, -3.1],
    [-4.3, 3.1],
    [4.3, 3.1],
  ];
  for (const [px, pz] of pillarCoords) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.26, 4.1, 8), pillarMat);
    p.position.set(px, 2.45, pz);
    group.add(p);
  }

  // 3 glowing Voxel Arcade Cabinets (Tic-Tac-Toe, Simon Synth, Lights Out)
  const cabSpecs = [
    { x: -2.6, mat: screenCyan },
    { x: 0, mat: screenAmber },
    { x: 2.6, mat: screenPink },
  ];
  for (const cab of cabSpecs) {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.45, 2.35, 1.15), cabBodyMat);
    body.position.set(cab.x, 1.65, -1.6);
    body.castShadow = true;
    const screen = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.86, 0.14), cab.mat);
    screen.position.set(cab.x, 2.08, -0.99);
    const marquee = new THREE.Mesh(new THREE.BoxGeometry(1.24, 0.28, 0.18), cab.mat);
    marquee.position.set(cab.x, 2.74, -0.96);
    group.add(body, screen, marquee);
  }

  group.add(deck, roof, neonTrim);
  return group;
}

export interface IslandVillagerRig {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  leftArm: THREE.Mesh;
  rightArm: THREE.Mesh;
}

/**
 * Articulated GeminIsland Micro-Voxel Villager (villagers.js):
 * Distinct skin tones, bright island shirts, sun hats with brims, optional explorer backpack,
 * and swinging arms & legs.
 */
export function createGeminIslandVillager(
  shirtHex: number,
  hatHex: number,
  skinHex: number,
  hasBackpack: boolean,
): IslandVillagerRig {
  const group = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: skinHex, roughness: 0.72 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: shirtHex, roughness: 0.75 });
  const pantMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.84 });
  const hatMat = new THREE.MeshStandardMaterial({ color: hatHex, roughness: 0.78 });
  const packMat = new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 });

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.24), pantMat);
  leftLeg.position.set(-0.15, 0.31, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.24), pantMat);
  rightLeg.position.set(0.15, 0.31, 0);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.74, 0.38), shirtMat);
  torso.position.y = 0.99;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.46, 0.46), skinMat);
  head.position.y = 1.62;
  head.castShadow = true;

  const hatBrim = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.08, 0.76), hatMat);
  hatBrim.position.y = 1.88;
  const hatCrown = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.22, 0.48), hatMat);
  hatCrown.position.y = 2.02;

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.18), shirtMat);
  leftArm.position.set(-0.41, 1.0, 0);
  const rightArm = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.58, 0.18), shirtMat);
  rightArm.position.set(0.41, 1.0, 0);

  group.add(leftLeg, rightLeg, torso, head, hatBrim, hatCrown, leftArm, rightArm);

  if (hasBackpack) {
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.54, 0.24), packMat);
    pack.position.set(0, 1.02, -0.3);
    group.add(pack);
  }

  return { group, leftLeg, rightLeg, leftArm, rightArm };
}

export interface TransitShuttleModel {
  group: THREE.Group;
  wheels: THREE.Mesh[];
}

/**
 * Autonomous GeminIsland Transit Shuttle / Calm Island Bus (vehicle_physics.js & interiors_and_transit.js):
 * Teal & cream voxel shuttle with panoramic tinted windows, roof luggage rack, LED headlights, and rotating wheels.
 */
export function createIslandTransitShuttle(): TransitShuttleModel {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0d9488, roughness: 0.42, metalness: 0.25 });
  const creamMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.48, metalness: 0.15 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.22,
    roughness: 0.16,
    metalness: 0.6,
  });
  const tireMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const lightMat = new THREE.MeshStandardMaterial({
    color: 0xfef08a,
    emissive: 0xfacc15,
    emissiveIntensity: 1.5,
  });

  const lowerChassis = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.05, 5.8), bodyMat);
  lowerChassis.position.y = 1.05;
  lowerChassis.castShadow = true;

  const upperCabin = new THREE.Mesh(new THREE.BoxGeometry(2.5, 1.15, 5.4), creamMat);
  upperCabin.position.y = 2.15;
  upperCabin.castShadow = true;

  const windowBand = new THREE.Mesh(new THREE.BoxGeometry(2.56, 0.72, 4.9), glassMat);
  windowBand.position.y = 2.16;

  const roofRack = new THREE.Mesh(new THREE.BoxGeometry(2.0, 0.18, 3.8), bodyMat);
  roofRack.position.y = 2.82;

  const hlL = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.28, 0.14), lightMat);
  hlL.position.set(-0.82, 1.05, 2.94);
  const hlR = hlL.clone();
  hlR.position.x = 0.82;

  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.56, 0.56, 0.44, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const wheelCoords: Array<[number, number]> = [
    [-1.36, 1.85],
    [1.36, 1.85],
    [-1.36, -1.85],
    [1.36, -1.85],
  ];
  for (const [wx, wz] of wheelCoords) {
    const wheel = new THREE.Mesh(wheelGeo, tireMat);
    wheel.position.set(wx, 0.56, wz);
    group.add(wheel);
    wheels.push(wheel);
  }

  group.add(lowerChassis, upperCabin, windowBand, roofRack, hlL, hlR);
  return { group, wheels };
}

export interface PetFollowerRig {
  group: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  tail: THREE.Mesh;
  legs: THREE.Mesh[];
  evolutionStage: PetEvolutionStage;
  halo?: THREE.Group;
  auraRing?: THREE.Mesh;
  wings?: [THREE.Group, THREE.Group];
  orbitCrystals?: THREE.Group;
}

/**
 * Articulated 3D Pet Follower (Voxel Fox, Emerald Slime, or Void Pup):
 * Bottom-center pivoted at y = 0 with soft ground contact shadow, animated legs,
 * wagging tail, expressive eyes, and Stage 1 (Radiant) & Stage 2 (Ascendant) 3D evolutions.
 */
export function createPetFollowerModel(
  species: PetSpeciesKey,
  evolutionStage: PetEvolutionStage = 0,
): PetFollowerRig {
  const group = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const legs: THREE.Mesh[] = [];

  // Ground contact shadow disc
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(evolutionStage === 2 ? 0.88 : evolutionStage === 1 ? 0.78 : 0.68, 18),
    new THREE.MeshBasicMaterial({ color: 0x050811, transparent: true, opacity: 0.34, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.03;
  group.add(shadow);

  const eyeMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.2, metalness: 0.3 });
  const radiantColor =
    species === 'emerald_slime' ? 0x34d399 : species === 'void_pup' ? 0x38bdf8 : 0xfbbf24;
  const ascendantColor =
    species === 'emerald_slime' ? 0xa7f3d0 : species === 'void_pup' ? 0xe879f9 : 0xfef08a;

  const radiantMat = new THREE.MeshStandardMaterial({
    color: ascendantColor,
    emissive: radiantColor,
    emissiveIntensity: evolutionStage >= 2 ? 1.55 : 1.05,
    roughness: 0.16,
    metalness: 0.35,
  });

  let tail: THREE.Mesh;
  let halo: THREE.Group | undefined;
  let auraRing: THREE.Mesh | undefined;
  let wings: [THREE.Group, THREE.Group] | undefined;
  let orbitCrystals: THREE.Group | undefined;

  if (species === 'emerald_slime') {
    const outerMat = new THREE.MeshStandardMaterial({
      color: evolutionStage >= 2 ? 0x2dd4bf : evolutionStage === 1 ? 0x10b981 : 0x10b981,
      emissive: evolutionStage >= 2 ? 0x0d9488 : evolutionStage === 1 ? 0x059669 : 0x047857,
      emissiveIntensity: evolutionStage >= 2 ? 0.65 : evolutionStage === 1 ? 0.48 : 0.35,
      roughness: 0.16,
      metalness: evolutionStage >= 1 ? 0.22 : 0.1,
      transparent: true,
      opacity: 0.88,
    });
    const coreMat = new THREE.MeshStandardMaterial({
      color: evolutionStage >= 2 ? 0xfef08a : 0xa7f3d0,
      emissive: evolutionStage >= 2 ? 0x2dd4bf : 0x34d399,
      emissiveIntensity: evolutionStage >= 2 ? 1.6 : 1.15,
      roughness: 0.14,
    });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x4ade80, roughness: 0.6 });

    const blob = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.78, 0.96), outerMat);
    blob.position.y = 0.42;
    blob.castShadow = true;
    const core = new THREE.Mesh(
      new THREE.OctahedronGeometry(evolutionStage >= 1 ? 0.3 : 0.24, 0),
      coreMat,
    );
    core.position.y = 0.44;
    const eyeL = new THREE.Mesh(
      new THREE.BoxGeometry(0.14, 0.16, 0.08),
      evolutionStage >= 2 ? radiantMat : eyeMat,
    );
    eyeL.position.set(-0.22, 0.5, 0.48);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.22;

    const sproutStem = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.08), leafMat);
    sproutStem.position.set(0, 0.9, 0);
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.08, 0.18), leafMat);
    leaf.position.set(0.14, 1.0, 0);
    leaf.rotation.z = 0.28;
    head.add(sproutStem, leaf);

    if (evolutionStage >= 1) {
      // Crystal Sovereign crown shard + twin emerald side prism buds
      const crown = new THREE.Mesh(new THREE.OctahedronGeometry(0.2, 0), radiantMat);
      crown.position.set(0, 1.16, 0);
      const budL = new THREE.Mesh(new THREE.OctahedronGeometry(0.16, 0), coreMat);
      budL.position.set(-0.56, 0.46, 0);
      const budR = budL.clone();
      budR.position.x = 0.56;
      head.add(crown);
      body.add(budL, budR);
    }

    tail = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.24), coreMat);
    tail.position.set(0, 0.28, -0.56);

    body.add(blob, core, eyeL, eyeR, head, tail);
  } else {
    const isVoid = species === 'void_pup';
    const furColor = isVoid
      ? evolutionStage >= 2
        ? 0x4c1d95
        : evolutionStage === 1
          ? 0x3730a3
          : 0x312e81
      : evolutionStage >= 2
        ? 0xf59e0b
        : evolutionStage === 1
          ? 0xfb923c
          : 0xf97316;

    const furMat = new THREE.MeshStandardMaterial({
      color: furColor,
      emissive: evolutionStage >= 2 ? (isVoid ? 0x6d28d9 : 0xd97706) : 0x000000,
      emissiveIntensity: evolutionStage >= 2 ? 0.28 : 0,
      roughness: evolutionStage >= 1 ? 0.55 : 0.76,
      metalness: isVoid ? 0.26 : evolutionStage >= 2 ? 0.2 : 0.04,
    });
    const creamMat = new THREE.MeshStandardMaterial({
      color: isVoid
        ? evolutionStage >= 2
          ? 0xf0abfc
          : 0x818cf8
        : evolutionStage >= 2
          ? 0xfef9c3
          : 0xfef3c7,
      emissive: evolutionStage >= 1 ? (isVoid ? 0x6366f1 : 0xf59e0b) : 0x000000,
      emissiveIntensity: evolutionStage >= 2 ? 0.45 : evolutionStage === 1 ? 0.2 : 0,
      roughness: 0.55,
    });
    const collarMat = new THREE.MeshStandardMaterial({
      color: isVoid ? 0x38bdf8 : 0xfbbf24,
      emissive: isVoid ? 0x0284c7 : 0xd97706,
      emissiveIntensity: evolutionStage >= 1 ? 1.25 : 0.85,
      roughness: 0.22,
    });
    const darkPawMat = new THREE.MeshStandardMaterial({
      color: isVoid ? 0x1e1b4b : 0x7c2d12,
      roughness: 0.82,
    });

    // 4 articulated voxel legs
    const legGeo = new THREE.BoxGeometry(0.18, 0.42, 0.18);
    const legCoords: Array<[number, number]> = [
      [-0.22, 0.34],
      [0.22, 0.34],
      [-0.22, -0.32],
      [0.22, -0.32],
    ];
    for (const [lx, lz] of legCoords) {
      const leg = new THREE.Mesh(legGeo, darkPawMat);
      leg.position.set(lx, 0.21, lz);
      leg.castShadow = true;
      body.add(leg);
      legs.push(leg);
    }

    // Torso, cream chest tuft & glowing collar
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.64, 0.48, 0.98), furMat);
    torso.position.set(0, 0.56, 0);
    torso.castShadow = true;
    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.36, 0.2), creamMat);
    chest.position.set(0, 0.54, 0.48);
    const collar = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.14, 0.24), collarMat);
    collar.position.set(0, 0.78, 0.38);

    // Head, snout, eyes & perky ears
    head.position.set(0, 0.94, 0.46);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.48, 0.54), furMat);
    skull.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.2, 0.24), creamMat);
    snout.position.set(0, -0.08, 0.34);
    const nose = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.09, 0.08), eyeMat);
    nose.position.set(0, -0.02, 0.46);
    const eyeL = new THREE.Mesh(
      new THREE.BoxGeometry(0.11, 0.12, 0.06),
      isVoid || evolutionStage >= 2 ? radiantMat : eyeMat,
    );
    eyeL.position.set(-0.16, 0.06, 0.27);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.16;

    const earGeo = new THREE.BoxGeometry(0.16, evolutionStage >= 1 ? 0.32 : 0.26, 0.12);
    const earL = new THREE.Mesh(earGeo, isVoid ? darkPawMat : furMat);
    earL.position.set(-0.2, 0.34, -0.04);
    earL.rotation.z = isVoid ? 0.35 : 0.12;
    const earR = new THREE.Mesh(earGeo, isVoid ? darkPawMat : furMat);
    earR.position.set(0.2, 0.34, -0.04);
    earR.rotation.z = isVoid ? -0.35 : -0.12;
    head.add(skull, snout, nose, eyeL, eyeR, earL, earR);

    // Stage 1+ Radiant Head Crest & Shoulder Armor/Rune Flair
    if (evolutionStage >= 1) {
      const crest = new THREE.Mesh(new THREE.OctahedronGeometry(0.13, 0), radiantMat);
      crest.position.set(0, 0.26, 0.24);
      head.add(crest);

      const pauldronL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.2, 0.32), radiantMat);
      pauldronL.position.set(-0.36, 0.72, 0.24);
      const pauldronR = pauldronL.clone();
      pauldronR.position.x = 0.36;
      body.add(pauldronL, pauldronR);
    }

    // Fluffy / starlight wagging tail (multiplies into fanned spirit tails on evolution!)
    tail = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.26, 0.72), furMat);
    tail.position.set(0, 0.72, -0.72);
    tail.rotation.x = 0.42;
    const tailTip = new THREE.Mesh(
      new THREE.BoxGeometry(0.28, 0.28, 0.24),
      evolutionStage >= 1 ? radiantMat : creamMat,
    );
    tailTip.position.set(0, 0, -0.32);
    tail.add(tailTip);

    if (evolutionStage >= 1) {
      // Fan twin extra radiant spirit tails beside main tail (3 tails at Stage 1, 5 tails at Stage 2!)
      const extraAngles = evolutionStage >= 2 ? [-0.52, -0.26, 0.26, 0.52] : [-0.34, 0.34];
      for (const ang of extraAngles) {
        const subTail = new THREE.Mesh(new THREE.BoxGeometry(0.19, 0.19, 0.66), furMat);
        subTail.position.set(Math.sin(ang) * 0.26, 0.05, -0.08);
        subTail.rotation.y = ang;
        const subTip = new THREE.Mesh(new THREE.BoxGeometry(0.21, 0.21, 0.22), radiantMat);
        subTip.position.set(0, 0, -0.3);
        subTail.add(subTip);
        tail.add(subTail);
      }
    }

    body.add(torso, chest, collar, head, tail);
  }

  // Stage 1+: Ground Radiant Aura Ring + Floating Crown Halo
  if (evolutionStage >= 1) {
    auraRing = new THREE.Mesh(
      new THREE.RingGeometry(0.64, evolutionStage >= 2 ? 0.88 : 0.78, 28),
      new THREE.MeshBasicMaterial({
        color: radiantColor,
        transparent: true,
        opacity: evolutionStage >= 2 ? 0.58 : 0.42,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
      }),
    );
    auraRing.rotation.x = -Math.PI / 2;
    auraRing.position.y = 0.18;
    group.add(auraRing);

    halo = new THREE.Group();
    halo.position.set(0, species === 'emerald_slime' ? 1.48 : 1.62, species === 'emerald_slime' ? 0 : 0.42);
    const innerHalo = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.036, 8, 20), radiantMat);
    innerHalo.rotation.x = Math.PI / 2;
    halo.add(innerHalo);

    if (evolutionStage >= 2) {
      const outerHalo = new THREE.Mesh(new THREE.TorusGeometry(0.46, 0.028, 8, 24), radiantMat);
      outerHalo.rotation.x = Math.PI / 2.6;
      outerHalo.rotation.y = 0.4;
      halo.add(outerHalo);
    }
    body.add(halo);
  }

  // Stage 2 (Ascendant): Twin Articulated Radiant Energy Wings + 3 Orbiting Runestone Crystals
  if (evolutionStage >= 2) {
    const wingMat = new THREE.MeshStandardMaterial({
      color: ascendantColor,
      emissive: radiantColor,
      emissiveIntensity: 1.25,
      roughness: 0.2,
      transparent: true,
      opacity: 0.88,
    });
    const makeWing = (side: -1 | 1): THREE.Group => {
      const wg = new THREE.Group();
      wg.position.set(side * 0.34, species === 'emerald_slime' ? 0.58 : 0.78, -0.04);
      const blade1 = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.14, 0.32), wingMat);
      blade1.position.set(side * 0.34, 0.1, -0.06);
      blade1.rotation.z = side * 0.28;
      const blade2 = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.11, 0.22), radiantMat);
      blade2.position.set(side * 0.54, 0.28, -0.14);
      blade2.rotation.z = side * 0.48;
      const blade3 = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.18), wingMat);
      blade3.position.set(side * 0.24, -0.04, -0.18);
      blade3.rotation.z = side * 0.12;
      wg.add(blade1, blade2, blade3);
      return wg;
    };
    const leftWing = makeWing(-1);
    const rightWing = makeWing(1);
    body.add(leftWing, rightWing);
    wings = [leftWing, rightWing];

    orbitCrystals = new THREE.Group();
    orbitCrystals.position.y = 0.88;
    for (let i = 0; i < 3; i++) {
      const ang = (i / 3) * Math.PI * 2;
      const shard = new THREE.Mesh(new THREE.OctahedronGeometry(0.11, 0), radiantMat);
      shard.position.set(Math.cos(ang) * 0.92, Math.sin(i * 1.4) * 0.16, Math.sin(ang) * 0.92);
      orbitCrystals.add(shard);
    }
    body.add(orbitCrystals);
  }

  group.add(body);
  return { group, body, head, tail, legs, evolutionStage, halo, auraRing, wings, orbitCrystals };
}

export interface SiegeTrebuchetModel {
  group: THREE.Group;
  armPivot: THREE.Group;
  boulderMesh: THREE.Mesh;
}

/**
 * 3D Imperial Siege Trebuchet (Voxel Realms RPG Castle Warfare):
 * Timber A-frame trestle, iron-rimmed wheels, weighted ballast box,
 * pivoting throwing arm, and glowing flaming obsidian siege boulder.
 */
export function createSiegeTrebuchetModel(): SiegeTrebuchetModel {
  const group = new THREE.Group();
  const timberMat = new THREE.MeshStandardMaterial({ color: 0x6b4226, roughness: 0.88, metalness: 0.06 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.72 });
  const goldTrimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xb45309,
    emissiveIntensity: 0.55,
    roughness: 0.3,
    metalness: 0.65,
  });
  const flameBoulderMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 1.4,
    roughness: 0.4,
  });

  // Ground contact shadow
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(3.4, 18),
    new THREE.MeshBasicMaterial({ color: 0x050811, transparent: true, opacity: 0.32, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.05;
  group.add(shadow);

  // Base timber skids & crossbeams
  const skidL = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.45, 5.2), timberMat);
  skidL.position.set(-1.35, 0.48, 0);
  skidL.castShadow = true;
  const skidR = skidL.clone();
  skidR.position.x = 1.35;
  const crossF = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.42, 0.45), timberMat);
  crossF.position.set(0, 0.52, 2.0);
  const crossB = crossF.clone();
  crossB.position.z = -2.0;
  group.add(skidL, skidR, crossF, crossB);

  // 4 iron-bound timber wheels
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.28, 12);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [wx, wz] of [
    [-1.68, 1.85],
    [1.68, 1.85],
    [-1.68, -1.85],
    [1.68, -1.85],
  ]) {
    const wheel = new THREE.Mesh(wheelGeo, ironMat);
    wheel.position.set(wx, 0.55, wz);
    wheel.castShadow = true;
    group.add(wheel);
  }

  // Twin A-frame support uprights + crossbar axle
  for (const side of [-1, 1]) {
    const strutF = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 0.32), timberMat);
    strutF.position.set(side * 1.15, 2.2, 0.72);
    strutF.rotation.x = -0.28;
    strutF.castShadow = true;
    const strutB = new THREE.Mesh(new THREE.BoxGeometry(0.32, 3.6, 0.32), timberMat);
    strutB.position.set(side * 1.15, 2.2, -0.72);
    strutB.rotation.x = 0.28;
    strutB.castShadow = true;
    group.add(strutF, strutB);
  }

  const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.8, 10), ironMat);
  axle.rotation.z = Math.PI / 2;
  axle.position.set(0, 3.65, 0);
  group.add(axle);

  // Imperial banner pole on side
  const bannerPole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 4.4, 6), ironMat);
  bannerPole.position.set(-1.55, 2.4, -2.05);
  const bannerCloth = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 1.45, 0.95),
    new THREE.MeshStandardMaterial({ color: 0x0ea5e9, emissive: 0x0284c7, emissiveIntensity: 0.4, roughness: 0.6 }),
  );
  bannerCloth.position.set(-1.55, 3.8, -1.55);
  group.add(bannerPole, bannerCloth);

  // Pivoting throwing arm + counterweight + flaming boulder cup
  const armPivot = new THREE.Group();
  armPivot.position.set(0, 3.65, 0);
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.32, 5.6), timberMat);
  beam.position.set(0, 0, -1.0);
  beam.castShadow = true;
  const band = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.38, 0.45), goldTrimMat);
  band.position.set(0, 0, 0);
  const counterweight = new THREE.Mesh(new THREE.BoxGeometry(1.15, 1.05, 1.05), ironMat);
  counterweight.position.set(0, -0.78, 1.55);
  counterweight.castShadow = true;
  const cup = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.22, 0.82), ironMat);
  cup.position.set(0, 0.16, -3.55);
  const boulderMesh = new THREE.Mesh(new THREE.DodecahedronGeometry(0.46, 0), flameBoulderMat);
  boulderMesh.position.set(0, 0.56, -3.55);
  armPivot.add(beam, band, counterweight, cup, boulderMesh);
  armPivot.rotation.x = 0.52; // Cocked ready to fire!
  group.add(armPivot);

  return { group, armPivot, boulderMesh };
}

export interface SiegeTroopRig {
  group: THREE.Group;
  leftLeg: THREE.Mesh;
  rightLeg: THREE.Mesh;
  rightArm: THREE.Group;
  branch: TroopBranch;
}

/**
 * 3D Allied Siege Cohort Soldier (Shieldbearer, Shooter, or Bomber from Voxel Realms):
 * Bottom-center grounded at y = 0 with distinct branch silhouettes & glowing Dawn faction trim.
 */
export function createSiegeTroopModel(branch: TroopBranch): SiegeTroopRig {
  const group = new THREE.Group();
  const shadow = new THREE.Mesh(
    new THREE.CircleGeometry(0.55, 14),
    new THREE.MeshBasicMaterial({ color: 0x050811, transparent: true, opacity: 0.3, depthWrite: false }),
  );
  shadow.rotation.x = -Math.PI / 2;
  shadow.position.y = 0.04;
  group.add(shadow);

  const primaryHex = branch === 'shieldbearer' ? 0x1d4ed8 : branch === 'shooter' ? 0x047857 : 0xb45309;
  const accentHex = branch === 'shieldbearer' ? 0x38bdf8 : branch === 'shooter' ? 0x34d399 : 0xfb923c;

  const armorMat = new THREE.MeshStandardMaterial({ color: primaryHex, roughness: 0.52, metalness: 0.35 });
  const trimMat = new THREE.MeshStandardMaterial({
    color: accentHex,
    emissive: accentHex,
    emissiveIntensity: 0.65,
    roughness: 0.28,
  });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xf1c27d, roughness: 0.78 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.8 });

  const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.24), bootMat);
  leftLeg.position.set(-0.16, 0.31, 0);
  const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.62, 0.24), bootMat);
  rightLeg.position.set(0.16, 0.31, 0);

  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.72, 0.36), armorMat);
  torso.position.y = 0.96;
  torso.castShadow = true;

  const head = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.44, 0.44), skinMat);
  head.position.y = 1.54;
  const helm = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.22, 0.5), armorMat);
  helm.position.y = 1.72;
  const crest = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.2, 0.42), trimMat);
  crest.position.y = 1.88;

  const leftArm = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.56, 0.2), armorMat);
  leftArm.position.set(-0.42, 0.96, 0);

  const rightArm = new THREE.Group();
  rightArm.position.set(0.42, 1.18, 0);
  const rArmMesh = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.56, 0.2), armorMat);
  rArmMesh.position.y = -0.22;
  rightArm.add(rArmMesh);

  if (branch === 'shieldbearer') {
    // Large glowing Dawn kite shield on left arm + broadsword on right
    const shield = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.88, 0.62), trimMat);
    shield.position.set(-0.56, 0.92, 0.18);
    const sword = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.85, 0.12), trimMat);
    sword.position.set(0, -0.45, 0.38);
    sword.rotation.x = Math.PI / 2.2;
    rightArm.add(sword);
    group.add(shield);
  } else if (branch === 'shooter') {
    // Glowing emerald recurve bow held forward
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.045, 6, 12, Math.PI), trimMat);
    bow.position.set(0, -0.22, 0.34);
    bow.rotation.y = Math.PI / 2;
    bow.rotation.z = -Math.PI / 2;
    rightArm.add(bow);
  } else {
    // Bomber ember keg backpack + glowing fire orb in hand
    const keg = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.56, 8), trimMat);
    keg.position.set(0, 1.0, -0.32);
    const bomb = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 0), trimMat);
    bomb.position.set(0, -0.42, 0.28);
    rightArm.add(bomb);
    group.add(keg);
  }

  group.add(leftLeg, rightLeg, torso, head, helm, crest, leftArm, rightArm);
  return { group, leftLeg, rightLeg, rightArm, branch };
}


