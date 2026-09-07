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
const vrButton = document.getElementById('vr-button');
const exitVrButton = document.getElementById('exit-vr');

const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
if (isMobile) vrButton.style.display = 'block';

vrButton.addEventListener('click', async () => {
  await vr.toggle();
  pcControls.enabled = !vr.enabled;
});

exitVrButton.addEventListener('click', async (e) => {
  e.stopPropagation();
  await vr.toggle();
  pcControls.enabled = !vr.enabled;
});
