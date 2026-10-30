const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');

export function getImagePath(imageName: string) {
  return `${baseUrl}/img/${imageName}`;
}

export function getCarModelPath(modelName: string) {
  return `${baseUrl}/car-models/${modelName}`;
}
