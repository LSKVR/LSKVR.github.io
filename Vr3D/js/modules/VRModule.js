import * as THREE from 'three';

/**
 * VRModule
 * 구글 카드보드 체험을 위한 좌/우 스테레오 분할 렌더링과
 * 모바일 자이로(deviceorientation) 기반 시점 회전을 담당한다.
 *
 * PC 입력(PCControls)에 직접 의존하지 않으며, Core 가 제공하는
 * scene/camera/renderer 만을 사용해 독립적으로 동작한다.
 */
export class VRModule {
  constructor({ core, eyeSeparation = 0.064 }) {
    this.core = core;
    this.enabled = false;
    this.eyeSeparation = eyeSeparation;

    this._quaternion = new THREE.Quaternion();
    this._onDeviceOrientation = this._onDeviceOrientation.bind(this);
    this._hasOrientation = false;
  }

  async toggle() {
    this.enabled = !this.enabled;
    document.body.classList.toggle('vr-mode', this.enabled);

    if (this.enabled) {
      await this._requestOrientationPermission();
      this._requestFullscreen();
      this._lockLandscape();
    } else {
      this._exitFullscreen();
    }

    this.core._onResize();
  }

  async _requestOrientationPermission() {
    const DOE = window.DeviceOrientationEvent;
    if (DOE && typeof DOE.requestPermission === 'function') {
      try {
        const result = await DOE.requestPermission();
        if (result === 'granted') this._enableOrientation();
      } catch (err) {
        console.warn('DeviceOrientation 권한 요청 실패:', err);
      }
    } else {
      this._enableOrientation();
    }
  }

  _enableOrientation() {
    if (this._hasOrientation) return;
    window.addEventListener('deviceorientation', this._onDeviceOrientation);
    this._hasOrientation = true;
  }

  _onDeviceOrientation(event) {
    const { alpha, beta, gamma } = event;
    if (alpha === null || beta === null || gamma === null) return;

    const euler = new THREE.Euler(
      THREE.MathUtils.degToRad(beta),
      THREE.MathUtils.degToRad(alpha),
      -THREE.MathUtils.degToRad(gamma),
      'YXZ'
    );
    const screenAdjust = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));

    this._quaternion.setFromEuler(euler);
    this._quaternion.multiply(screenAdjust);

    this.core.camera.quaternion.copy(this._quaternion);
  }

  _requestFullscreen() {
    const el = document.documentElement;
    const req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (req) req.call(el).catch(() => {});
  }

  _exitFullscreen() {
    const exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (document.fullscreenElement && exit) exit.call(document).catch(() => {});
  }

  _lockLandscape() {
    if (screen.orientation && screen.orientation.lock) {
      screen.orientation.lock('landscape').catch(() => {});
    }
  }

  /** Core.start(renderFn) 에 전달되는 렌더 함수 */
  render() {
    const { renderer, scene, camera } = this.core;

    if (!this.enabled) {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      return;
    }

    const width = window.innerWidth / 2;
    const height = window.innerHeight;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();

    renderer.setScissorTest(true);

    const eyeOffset = this.eyeSeparation / 2;
    this._renderEye(-eyeOffset, 0, 0, width, height);
    this._renderEye(eyeOffset, width, 0, width, height);
  }

  _renderEye(offset, x, y, width, height) {
    const { renderer, scene, camera } = this.core;

    const sideDir = new THREE.Vector3(offset, 0, 0).applyQuaternion(camera.quaternion);
    const originalPosition = camera.position.clone();
    camera.position.add(sideDir);

    renderer.setViewport(x, y, width, height);
    renderer.setScissor(x, y, width, height);
    renderer.render(scene, camera);

    camera.position.copy(originalPosition);
  }
}
