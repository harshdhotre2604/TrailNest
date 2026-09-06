export const MAX_PROPERTY_IMAGES = 15;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_VIDEOS = 5;
export const MAX_VIDEO_BYTES = 200 * 1024 * 1024;

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

export function validatePropertyImages(images, { required = true } = {}) {
  const list = Array.isArray(images) ? images : [];
  if (required && list.length === 0) return 'At least one property photo is required.';
  if (list.length > MAX_PROPERTY_IMAGES) return `You can upload up to ${MAX_PROPERTY_IMAGES} photos.`;
  const badType = list.find((file) => !ALLOWED_IMAGE_TYPES.includes(file.type));
  if (badType) return 'Allowed photo formats: JPEG, PNG, WebP.';
  const tooLarge = list.find((file) => file.size > MAX_IMAGE_BYTES);
  if (tooLarge) return `${tooLarge.name} is over 5MB.`;
  return '';
}

export function validateVideos(videos) {
  const list = Array.isArray(videos) ? videos : [];
  if (list.length > MAX_VIDEOS) return `Maximum ${MAX_VIDEOS} videos allowed.`;
  const badType = list.find((file) => !ALLOWED_VIDEO_TYPES.includes(file.type));
  if (badType) return 'Allowed video formats: MP4, MOV, WebM.';
  const tooLarge = list.find((file) => file.size > MAX_VIDEO_BYTES);
  if (tooLarge) return `${tooLarge.name} is over 200MB.`;
  return '';
}

export function moveArrayItem(list, fromIndex, toIndex) {
  if (toIndex < 0 || toIndex >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(fromIndex, 1);
  next.splice(toIndex, 0, item);
  return next;
}

export function promoteArrayItem(list, index) {
  if (index <= 0 || index >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(index, 1);
  next.unshift(item);
  return next;
}
