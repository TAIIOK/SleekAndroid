type HomeSettingsOpener = () => void;

let opener: HomeSettingsOpener | null = null;

export function setHomeSettingsOpener(fn: HomeSettingsOpener | null) {
  opener = fn;
}

export function openHomeSettings() {
  opener?.();
}
