import * as THREE from 'three';

/**
 * Core
 * Scene / Camera / Renderer / Light / Animation Loop 를 관리하는 최상위 코어.
 * Module 들은 이 Core 가 제공하는 scene, camera 를 통해서만 상호작용한다.
 */
export class Core {
  constructor(container) {
    this.container = container;
    this.isForcedLandscape = false;

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

  /**
   * 실제 렌더링에 사용할 크기를 계산한다.
   * isForcedLandscape 가 true 면(= 기기가 물리적으로는 가로지만
   * OS 자동회전이 꺼져있어 브라우저 뷰포트가 여전히 세로인 경우)
   * width/height 를 서로 바꿔서 계산한다.
   */
  getEffectiveSize() {
    if (this.isForcedLandscape) {
      return { width: window.innerHeight, height: window.innerWidth };
    }
    return { width: window.innerWidth, height: window.innerHeight };
  }

  /** 강제 가로모드 on/off. CSS 회전 클래스를 body에 토글한다. */
  setForcedLandscape(active) {
    if (this.isForcedLandscape === active) return;
    this.isForcedLandscape = active;
    document.body.classList.toggle('force-landscape', active);
    this._onResize();
  }

  _onResize() {
    const { width, height } = this.getEffectiveSize();
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
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
