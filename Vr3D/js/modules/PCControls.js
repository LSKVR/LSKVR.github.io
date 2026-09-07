import * as THREE from 'three';

/**
 * PCControls
 * PC 환경 전용 입력 모듈. 마우스 드래그로 시점 회전, WASD/방향키로 이동.
 * VR 모드 진입 시 enabled = false 로 비활성화된다.
 */
export class PCControls {
  constructor({ camera, domElement }) {
    this.camera = camera;
    this.domElement = domElement;
    this.enabled = true;

    this.moveSpeed = 4;
    this.lookSpeed = 0.0025;

    this.euler = new THREE.Euler(0, 0, 0, 'YXZ');
    this.keys = {};
    this.isDragging = false;
    this._lastX = 0;
    this._lastY = 0;

    this._bindEvents();
  }

  _bindEvents() {
    this.domElement.addEventListener('mousedown', (e) => {
      this.isDragging = true;
      this._lastX = e.clientX;
      this._lastY = e.clientY;
    });

    window.addEventListener('mouseup', () => {
      this.isDragging = false;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.enabled || !this.isDragging) return;
      const dx = e.clientX - this._lastX;
      const dy = e.clientY - this._lastY;
      this._lastX = e.clientX;
      this._lastY = e.clientY;

      this.euler.setFromQuaternion(this.camera.quaternion);
      this.euler.y -= dx * this.lookSpeed;
      this.euler.x -= dy * this.lookSpeed;
      this.euler.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.euler.x));
      this.camera.quaternion.setFromEuler(this.euler);
    });

    window.addEventListener('keydown', (e) => (this.keys[e.code] = true));
    window.addEventListener('keyup', (e) => (this.keys[e.code] = false));
  }

  update(delta) {
    if (!this.enabled) return;
    const speed = this.moveSpeed * delta;

    const forward = new THREE.Vector3();
    this.camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();

    const right = new THREE.Vector3().crossVectors(forward, this.camera.up).negate();

    if (this.keys['KeyW'] || this.keys['ArrowUp']) this.camera.position.addScaledVector(forward, speed);
    if (this.keys['KeyS'] || this.keys['ArrowDown']) this.camera.position.addScaledVector(forward, -speed);
    if (this.keys['KeyA'] || this.keys['ArrowLeft']) this.camera.position.addScaledVector(right, -speed);
    if (this.keys['KeyD'] || this.keys['ArrowRight']) this.camera.position.addScaledVector(right, speed);
  }
}
