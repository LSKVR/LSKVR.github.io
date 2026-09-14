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

      // OS 자동회전이 꺼져 있어 뷰포트가 계속 세로로 남아있는 경우를 대비해
      // 강제로 가로처럼 보이도록 CSS 회전을 적용하고, 실제 회전 여부를 계속 감시한다.
      this._updateForcedLandscape();
      window.addEventListener('resize', this._updateForcedLandscape);
      window.addEventListener('orientationchange', this._updateForcedLandscape);
    } else {
      this._exitFullscreen();
      this.core.setForcedLandscape(false);
      window.removeEventListener('resize', this._updateForcedLandscape);
      window.removeEventListener('orientationchange', this._updateForcedLandscape);
    }

    this.core._onResize();
  }

  /**
   * 뷰포트가 세로(innerWidth < innerHeight)인데 VR 모드가 켜져 있다면
   * = 기기를 가로로 들었어도 브라우저가 실제로는 회전하지 못한 상태이므로
   * CSS 로 강제 회전시킨다. 실제로 가로로 인식되면 자동 해제된다.
   */
  _updateForcedLandscape() {
    const isPortraitViewport = window.innerWidth < window.innerHeight;
    this.core.setForcedLandscape(this.enabled && isPortraitViewport);
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
    const { width: fullWidth, height: fullHeight } = this.core.getEffectiveSize();

    if (!this.enabled) {
      renderer.setScissorTest(false);
      renderer.setViewport(0, 0, fullWidth, fullHeight);
      camera.aspect = fullWidth / fullHeight;
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      return;
    }

    const width = fullWidth / 2;
    const height = fullHeight;

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
