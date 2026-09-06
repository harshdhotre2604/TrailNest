const pool = require('../config/db');
const { PROPERTY_CATEGORIES, BOOKING_MODELS } = require('../constants/propertyOptions');
const { MAX_IMAGE_BYTES, MAX_VIDEOS } = require('../middleware/upload');
const { createPropertyWithTransactions } = require('../services/property.service');

async function attachImagesAndPrimary(properties) {
  if (properties.length === 0) return properties;

  const ids = properties.map((p) => p.id);
  const [imageRows] = await pool.query(
    `SELECT property_id, image_path, is_primary
     FROM property_images
     WHERE property_id IN (?) AND room_id IS NULL
     ORDER BY sort_order ASC, id ASC`,
    [ids]
  );

  const imagesByProperty = new Map();
  for (const row of imageRows) {
    if (!imagesByProperty.has(row.property_id)) imagesByProperty.set(row.property_id, []);
    imagesByProperty.get(row.property_id).push(row.image_path);
  }

  return properties.map((property) => {
    const images = imagesByProperty.get(property.id) || [];
    return {
      ...property,
      images,
      primary_image_url: images[0] || property.cover_image_url || null,
    };
  });
}

async function list(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, owner_id, name, type, location, price_per_night, cover_image_url, description, created_at
       FROM properties
       ORDER BY created_at DESC`
    );
    res.json({ properties: await attachImagesAndPrimary(rows) });
  } catch (err) {
    next(err);
  }
}

async function listMine(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, owner_id, name, type, location, price_per_night, cover_image_url, description, created_at
       FROM properties
       WHERE owner_id = ?
       ORDER BY created_at DESC`,
      [req.owner.id]
    );
    res.json({ properties: await attachImagesAndPrimary(rows) });
  } catch (err) {
    next(err);
  }
}

async function getById(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT id, owner_id, name, type, location, price_per_night, cover_image_url, description, created_at
       FROM properties
       WHERE id = ?`,
      [req.params.id]
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Property not found' });
    }
    const [withImages] = await attachImagesAndPrimary(rows);
    res.json({ property: withImages });
  } catch (err) {
    next(err);
  }
}

function groupUploadedFiles(files) {
  const images = [];
  const videos = [];
  const roomImagesByIndex = new Map();

  for (const file of files) {
    if (file.fieldname === 'images') {
      images.push(file);
    } else if (file.fieldname === 'videos') {
      videos.push(file);
    } else {
      const match = file.fieldname.match(/^room_images_(\d+)$/);
      if (match) {
        const idx = Number(match[1]);
        if (!roomImagesByIndex.has(idx)) roomImagesByIndex.set(idx, []);
        roomImagesByIndex.get(idx).push(file);
      }
    }
  }
  return { images, videos, roomImagesByIndex };
}

function validateFileSizes(images, videos, roomImagesByIndex) {
  const oversizedImage = images.find((f) => f.size > MAX_IMAGE_BYTES);
  if (oversizedImage) return `${oversizedImage.originalname} is over 5MB.`;

  for (const roomImages of roomImagesByIndex.values()) {
    const oversized = roomImages.find((f) => f.size > MAX_IMAGE_BYTES);
    if (oversized) return `${oversized.originalname} is over 5MB.`;
  }

  if (videos.length > MAX_VIDEOS) return `Maximum ${MAX_VIDEOS} videos allowed.`;
  const oversizedVideo = videos.find((f) => f.size > 200 * 1024 * 1024);
  if (oversizedVideo) return `${oversizedVideo.originalname} is over 200MB.`;

  return null;
}

function deriveLocation(property) {
  if (property.custom_location_name) {
    return property.state ? `${property.custom_location_name}, ${property.state}` : property.custom_location_name;
  }
  if (property.city && property.state) return `${property.city}, ${property.state}`;
  return property.city || property.state || property.address || null;
}

function derivePricePerNight(property, rooms) {
  if (property.price_per_night) return Number(property.price_per_night);
  const wholeProperty = rooms.find((r) => r.is_whole_property);
  if (wholeProperty?.weekday_price) return Number(wholeProperty.weekday_price);
  const priced = rooms.filter((r) => r.weekday_price).map((r) => Number(r.weekday_price));
  if (priced.length > 0) return Math.min(...priced);
  return null;
}

async function create(req, res, next) {
  const files = req.files || [];
  let connection;

  try {
    let payload;
    try {
      payload = JSON.parse(req.body.data || '{}');
    } catch {
      return res.status(400).json({ error: 'data must be valid JSON' });
    }

    const property = payload.property || {};

    if (!property.name || !property.type || !property.description) {
      return res.status(400).json({ error: 'name, type, and description are required' });
    }
    if (!PROPERTY_CATEGORIES.includes(property.type)) {
      return res.status(400).json({ error: `type must be one of: ${PROPERTY_CATEGORIES.join(', ')}` });
    }
    if (property.property_type && !BOOKING_MODELS.includes(property.property_type)) {
      return res.status(400).json({ error: `property_type must be one of: ${BOOKING_MODELS.join(', ')}` });
    }

    const location = deriveLocation(property);
    if (!location) {
      return res.status(400).json({ error: 'A city/state, or a custom location name, is required' });
    }

    const rooms = payload.rooms || [];
    const pricePerNight = derivePricePerNight(property, rooms);
    if (!pricePerNight || pricePerNight <= 0) {
      return res.status(400).json({ error: 'A price is required — set it on the property or on at least one room' });
    }
    for (const room of rooms) {
      if (!room.room_name) {
        return res.status(400).json({ error: 'Every room needs a name' });
      }
    }

    const { images, videos, roomImagesByIndex } = groupUploadedFiles(files);
    if (images.length === 0) {
      return res.status(400).json({ error: 'At least one property photo is required' });
    }
    const sizeError = validateFileSizes(images, videos, roomImagesByIndex);
    if (sizeError) {
      return res.status(400).json({ error: sizeError });
    }

    const primaryIndex = Number.isInteger(Number(req.body.primary_image_index)) ? Number(req.body.primary_image_index) : 0;

    const roomImagePathsByIndex = new Map();
    for (const [idx, roomFiles] of roomImagesByIndex.entries()) {
      roomImagePathsByIndex.set(
        idx,
        roomFiles.map((f) => `/uploads/properties/${f.filename}`)
      );
    }

    connection = await pool.getConnection();
    await connection.beginTransaction();

    const propertyId = await createPropertyWithTransactions(
      connection,
      req.owner.id,
      {
        property: { ...property, location, price_per_night: pricePerNight },
        amenities: payload.amenities,
        rooms,
        bedrooms: payload.bedrooms,
        experiences: payload.experiences,
        packages: payload.packages,
        mealPlans: payload.meal_plans,
        activities: payload.activities,
        eventFacilities: payload.event_facilities,
        eventCapacities: payload.event_capacities,
        eventTypes: payload.event_types,
        compliance: payload.compliance,
      },
      {
        imagePaths: images.map((f) => `/uploads/properties/${f.filename}`),
        videoPaths: videos.map((f) => `/uploads/properties/${f.filename}`),
        roomImagesByIndex: roomImagePathsByIndex,
        primaryIndex,
      }
    );

    await connection.commit();

    const [rows] = await pool.query('SELECT * FROM properties WHERE id = ?', [propertyId]);
    const [withImages] = await attachImagesAndPrimary(rows);
    res.status(201).json({ property: withImages });
  } catch (err) {
    if (connection) await connection.rollback();
    next(err);
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { list, listMine, getById, create, PROPERTY_TYPES: PROPERTY_CATEGORIES };
