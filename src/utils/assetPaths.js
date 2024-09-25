export function getImagePath(imageName) {
    const baseUrl = process.env.PUBLIC_URL || '';
    return `${baseUrl}/img/${imageName}`;
}

export function getCarModelPath(modelName) {
    const baseUrl = process.env.PUBLIC_URL || '';
    return `${baseUrl}/car-models/${modelName}`;
}