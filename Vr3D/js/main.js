import { Core } from './core/Core.js';
import { EnvironmentModule } from './modules/EnvironmentModule.js';
import { ButterflyModule } from './modules/ButterflyModule.js';
import { PCControls } from './modules/PCControls.js';
import { VRModule } from './modules/VRModule.js';

// ---- Core 초기화 ----
const container = document.getElementById('app');
const core = new Core(container);

// ---- Module 조합 (Scene Composer 역할) ----
const environment = new EnvironmentModule({ scene: core.scene });
const butterflies = new ButterflyModule({ scene: core.scene });
const pcControls = new PCControls({ camera: core.camera, domElement: core.renderer.domElement });
const vr = new VRModule({ core });

core.onUpdate((delta, elapsed) => {
  butterflies.update(delta, elapsed);
  if (!vr.enabled) pcControls.update(delta);
});

core.start(() => vr.render());

// ---- Platform UI: PC / Mobile VR 전환 ----
// 기기 판별(UA)에 의존하지 않고 버튼은 항상 노출한다.
// PC에서 눌러도 좌우 분할 화면만 보일 뿐 동작에는 문제가 없고,
// 스마트폰에서는 자이로 권한 요청까지 함께 이뤄진다.
const vrButton = document.getElementById('vr-button');
const exitVrButton = document.getElementById('exit-vr');

async function enterOrExitVR() {
  try {
    await vr.toggle();
    pcControls.enabled = !vr.enabled;
  } catch (err) {
    console.error(err);
  }
}

// click 은 모바일 탭에서도 정상 발생하며, 사용자 제스처 컨텍스트 안에서
// 바로 실행되어야 iOS 자이로 권한 요청(requestPermission)이 허용된다.
vrButton.addEventListener('click', enterOrExitVR);
exitVrButton.addEventListener('click', (e) => {
  e.stopPropagation();
  enterOrExitVR();
});
