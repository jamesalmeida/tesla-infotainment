const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');

export function getImagePath(imageName: string) {
  return `${baseUrl}/img/${imageName}`;
}

export function getTouchscreenPath(path: string) {
  return `${baseUrl}/touchscreen/${path}`;
}

export function getAudioPath(audioName: string) {
  return `${baseUrl}/audio/${audioName}`;
}

export function getCarModelPath(modelName: string) {
  return `${baseUrl}/car-models/${modelName}`;
}
