import * as THREE from 'three';

/**
 * ButterflyModule
 * 색색의 나비들이 각자의 궤도를 따라 날개짓하며 날아다닌다.
 * Core.onUpdate 를 통해 매 프레임 update(delta, elapsed) 가 호출된다.
 */
export class ButterflyModule {
  constructor({ scene, count = 20, minRadius = 3, maxRadius = 16 }) {
    this.scene = scene;
    this.butterflies = [];

    const colors = [
      0xff5252, 0xffca28, 0x42a5f5, 0xab47bc,
      0x66bb6a, 0xff7043, 0x26c6da, 0xec407a,
    ];
    const wingGeo = new THREE.PlaneGeometry(0.34, 0.5);

    for (let i = 0; i < count; i++) {
      const color = colors[Math.floor(Math.random() * colors.length)];
      const mat = new THREE.MeshStandardMaterial({
        color,
        side: THREE.DoubleSide,
        emissive: color,
        emissiveIntensity: 0.18,
        roughness: 0.6,
      });

      const leftWing = new THREE.Mesh(wingGeo, mat);
      leftWing.position.x = -0.02;
      const rightWing = new THREE.Mesh(wingGeo, mat);
      rightWing.position.x = 0.02;
      rightWing.scale.x = -1;

      const body = new THREE.Group();
      body.add(leftWing, rightWing);

      body.userData = {
        leftWing,
        rightWing,
        phase: Math.random() * Math.PI * 2,
        orbitSpeed: 0.25 + Math.random() * 0.4,
        radius: minRadius + Math.random() * (maxRadius - minRadius),
        baseHeight: 1 + Math.random() * 3,
        angleOffset: Math.random() * Math.PI * 2,
        vertSpeed: 0.5 + Math.random() * 1.0,
        flapSpeed: 10 + Math.random() * 8,
      };

      this.scene.add(body);
      this.butterflies.push(body);
    }
  }

  update(delta, elapsed) {
    for (const b of this.butterflies) {
      const d = b.userData;
      const angle = elapsed * d.orbitSpeed + d.angleOffset;

      const x = Math.cos(angle) * d.radius;
      const z = Math.sin(angle) * d.radius;
      const y = d.baseHeight + Math.sin(elapsed * d.vertSpeed + d.phase) * 0.6;

      b.position.set(x, y, z);

      const tangent = new THREE.Vector3(-Math.sin(angle), 0, Math.cos(angle));
      const lookTarget = b.position.clone().add(tangent);
      b.lookAt(lookTarget);

      const flap = Math.sin(elapsed * d.flapSpeed + d.phase) * 0.9;
      d.leftWing.rotation.y = flap;
      d.rightWing.rotation.y = -flap;
    }
  }
}
