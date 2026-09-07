import * as THREE from 'three';

/**
 * Core
 * Scene / Camera / Renderer / Light / Animation Loop 를 관리하는 최상위 코어.
 * Module 들은 이 Core 가 제공하는 scene, camera 를 통해서만 상호작용한다.
 */
export class Core {
  constructor(container) {
    this.container = container;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x8ecae6);
    this.scene.fog = new THREE.Fog(0x8ecae6, 15, 90);

    this.camera = new THREE.PerspectiveCamera(
      70,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.set(0, 1.6, 6);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = false; // 모바일 성능을 위해 기본 비활성화
    container.appendChild(this.renderer.domElement);

    this._setupLights();

    this._updateCallbacks = [];
    this._clock = new THREE.Clock();

    window.addEventListener('resize', () => this._onResize());
  }

  _setupLights() {
    const hemi = new THREE.HemisphereLight(0xffffff, 0x4d6a3f, 1.1);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xfff2d0, 1.1);
    sun.position.set(12, 20, 8);
    this.scene.add(sun);
  }

  /** 매 프레임 호출될 update 콜백 등록 (delta, elapsed) */
  onUpdate(fn) {
    this._updateCallbacks.push(fn);
  }

  _onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }

  /** renderFn 이 주어지면 렌더링을 위임(예: VR 스테레오 렌더) */
  start(renderFn) {
    this._renderFn = renderFn;
    this.renderer.setAnimationLoop(() => this._tick());
  }

  _tick() {
    const delta = Math.min(this._clock.getDelta(), 0.1);
    const elapsed = this._clock.elapsedTime;

    for (const cb of this._updateCallbacks) cb(delta, elapsed);

    if (this._renderFn) this._renderFn();
    else this.renderer.render(this.scene, this.camera);
  }
}
