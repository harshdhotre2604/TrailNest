const fs = require('fs');
const path = require('path');
const multer = require('multer');

const UPLOAD_DIR = path.join(__dirname, '..', '..', 'uploads', 'properties');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm'];

const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const MAX_VIDEO_BYTES = 200 * 1024 * 1024;
const MAX_VIDEOS = 5;

function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9.\-_]/g, '_');
}

function isImageField(fieldname) {
  return fieldname === 'images' || /^room_images_\d+$/.test(fieldname);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${sanitizeFilename(file.originalname)}`),
});

function fileFilter(_req, file, cb) {
  if (isImageField(file.fieldname)) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only JPEG, PNG, and WebP images are allowed.'));
    }
    return cb(null, true);
  }
  if (file.fieldname === 'videos') {
    if (!ALLOWED_VIDEO_TYPES.includes(file.mimetype)) {
      return cb(new Error('Only MP4, MOV, and WebM videos are allowed.'));
    }
    return cb(null, true);
  }
  cb(new Error(`Unexpected file field: ${file.fieldname}`));
}

// Single upload.any() config covers `images`, `videos`, and the per-room
// `room_images_<idx>` fields all at once. Multer's `limits.fileSize` is one
// global number, so it's set to the larger (video) ceiling here — per-field
// size caps (5MB images / 200MB videos) and the max-5-videos count are
// enforced in properties.controller.js after upload, same as the main
// project does for the same reason.
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_VIDEO_BYTES, files: 40 },
});

module.exports = upload;
module.exports.MAX_IMAGE_BYTES = MAX_IMAGE_BYTES;
module.exports.MAX_VIDEO_BYTES = MAX_VIDEO_BYTES;
module.exports.MAX_VIDEOS = MAX_VIDEOS;
module.exports.isImageField = isImageField;
