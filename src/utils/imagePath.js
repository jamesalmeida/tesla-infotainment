export function getImagePath(imageName) {
    const baseUrl = process.env.PUBLIC_URL || '';
    return `${baseUrl}/img/${imageName}`;
  }