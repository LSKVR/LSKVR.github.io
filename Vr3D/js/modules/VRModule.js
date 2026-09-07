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

    // 재사용 객체 (매 프레임 new 하지 않기 위함)
    this._zee = new THREE.Vector3(0, 0, 1);
    this._euler = new THREE.Euler();
    this._q0 = new THREE.Quaternion();
    this._q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5)); // -90도 X축 회전
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

  /** 현재 화면 회전각(도) - 가로/세로 전환을 보정하기 위해 사용 */
  _getScreenOrientationAngle() {
    if (screen.orientation && typeof screen.orientation.angle === 'number') {
      return screen.orientation.angle;
    }
    if (typeof window.orientation === 'number') {
      return window.orientation;
    }
    return 0;
  }

  _onDeviceOrientation(event) {
    const { alpha, beta, gamma } = event;
    if (alpha === null || beta === null || gamma === null) return;

    const orient = THREE.MathUtils.degToRad(this._getScreenOrientationAngle());

    this._euler.set(
      THREE.MathUtils.degToRad(beta),
      THREE.MathUtils.degToRad(alpha),
      -THREE.MathUtils.degToRad(gamma),
      'YXZ'
    );
    this._quaternion.setFromEuler(this._euler);                // 기기 방향
    this._quaternion.multiply(this._q1);                        // 카메라가 기기 뒷면을 보도록 보정
    this._quaternion.multiply(this._q0.setFromAxisAngle(this._zee, -orient)); // 화면 회전(가로/세로) 보정

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
