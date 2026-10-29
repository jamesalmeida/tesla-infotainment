const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, '');

export function getImagePath(imageName) {
  return `${baseUrl}/img/${imageName}`;
}

export function getCarModelPath(modelName) {
  return `${baseUrl}/car-models/${modelName}`;
}
