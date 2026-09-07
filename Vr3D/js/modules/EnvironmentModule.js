import * as THREE from 'three';

/**
 * EnvironmentModule
 * 사방으로 펼쳐진 잔디 바닥 + 나무 + 풀을 생성한다.
 * InstancedMesh 를 사용하여 Draw Call 을 최소화한다 (모바일 VR 고려).
 */
export class EnvironmentModule {
  constructor({ scene, radius = 40, treeCount = 90, grassCount = 700 }) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'EnvironmentModule';

    this._createGround(radius);
    this._createTrees(treeCount, radius);
    this._createGrass(grassCount, radius);

    this.scene.add(this.group);
  }

  _createGround(radius) {
    const geo = new THREE.CircleGeometry(radius, 48);
    const mat = new THREE.MeshStandardMaterial({ color: 0x5da130, roughness: 1 });
    const ground = new THREE.Mesh(geo, mat);
    ground.rotation.x = -Math.PI / 2;
    this.group.add(ground);
  }

  _createTrees(count, radius) {
    const trunkGeo = new THREE.CylinderGeometry(0.15, 0.22, 1.6, 6);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 1 });
    const leafGeo = new THREE.ConeGeometry(1.15, 2.3, 7);
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x2e7d32, roughness: 0.9 });

    const trunkMesh = new THREE.InstancedMesh(trunkGeo, trunkMat, count);
    const leafMesh = new THREE.InstancedMesh(leafGeo, leafMat, count);

    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const { x, z } = this._randomPointInAnnulus(4, radius - 2);
      const scale = 0.7 + Math.random() * 0.8;

      dummy.position.set(x, 0.8 * scale, z);
      dummy.scale.setScalar(scale);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.updateMatrix();
      trunkMesh.setMatrixAt(i, dummy.matrix);

      dummy.position.set(x, (1.6 + 1.05) * scale, z);
      dummy.updateMatrix();
      leafMesh.setMatrixAt(i, dummy.matrix);
    }

    trunkMesh.instanceMatrix.needsUpdate = true;
    leafMesh.instanceMatrix.needsUpdate = true;

    this.group.add(trunkMesh, leafMesh);
  }

  _createGrass(count, radius) {
    const geo = new THREE.PlaneGeometry(0.4, 0.5);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x6fbf3f,
      side: THREE.DoubleSide,
      roughness: 1,
    });
    const mesh = new THREE.InstancedMesh(geo, mat, count);
    const dummy = new THREE.Object3D();

    for (let i = 0; i < count; i++) {
      const { x, z } = this._randomPointInAnnulus(1, radius - 1);
      const s = 0.6 + Math.random() * 0.9;

      dummy.position.set(x, 0.25 * s, z);
      dummy.rotation.y = Math.random() * Math.PI * 2;
      dummy.scale.setScalar(s);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }

    mesh.instanceMatrix.needsUpdate = true;
    this.group.add(mesh);
  }

  _randomPointInAnnulus(rMin, rMax) {
    const angle = Math.random() * Math.PI * 2;
    const r = rMin + Math.random() * (rMax - rMin);
    return { x: Math.cos(angle) * r, z: Math.sin(angle) * r };
  }
}
