// Transactional insert for the 13-step property wizard. One connection, one
// transaction, one small insertX(connection, propertyId, ...) helper per
// child table — mirrors the main project's db_queries.js pattern.

async function insertCoreProperty(connection, ownerId, property, coverImageUrl) {
  const [result] = await connection.query(
    `INSERT INTO properties (
       owner_id, name, type, location, price_per_night, cover_image_url, description,
       property_type, vacation_type, is_day_picnic, is_pure_veg,
       country, state, city, address, custom_location_name,
       cleaning_fee, service_fee, pricing_type, tax_included, tax_percentage,
       max_guests, bedroom_count, weekend_days, child_pricing_enabled, price_per_child,
       dietary_options, terms_and_conditions, whatsapp_share_note, custom_activities_note
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      ownerId,
      property.name,
      property.type,
      property.location,
      property.price_per_night,
      coverImageUrl,
      property.description || null,
      property.property_type || 'entire',
      property.vacation_type || null,
      property.is_day_picnic ? 1 : 0,
      property.is_pure_veg ? 1 : 0,
      property.country || 'India',
      property.state || null,
      property.city || null,
      property.address || null,
      property.custom_location_name || null,
      property.cleaning_fee ?? null,
      property.service_fee ?? null,
      property.pricing_type || null,
      property.tax_included === false ? 0 : 1,
      property.tax_percentage ?? null,
      property.max_guests ?? null,
      property.bedroom_count ?? null,
      property.weekend_days ? JSON.stringify(property.weekend_days) : null,
      property.child_pricing_enabled ? 1 : 0,
      property.price_per_child ?? null,
      property.dietary_options ? JSON.stringify(property.dietary_options) : null,
      property.terms_and_conditions || null,
      property.whatsapp_share_note || null,
      property.custom_activities_note || null,
    ]
  );
  return result.insertId;
}

async function insertRooms(connection, propertyId, rooms, roomImagesByIndex) {
  const roomIds = [];
  for (let i = 0; i < rooms.length; i += 1) {
    const room = rooms[i];
    const [result] = await connection.query(
      `INSERT INTO property_rooms (
         property_id, is_whole_property, room_type, room_view, room_name, description,
         price_type, weekday_price, weekend_price, tax_included, tax_percentage,
         weekday_extra_adult_rate, weekend_extra_adult_rate, max_adults, max_children,
         min_guests, check_in_time, check_out_time, availability_scope, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        propertyId,
        room.is_whole_property ? 1 : 0,
        room.room_type || null,
        room.room_view || null,
        room.room_name,
        room.description || null,
        room.price_type || 'per_room',
        room.weekday_price ?? null,
        room.weekend_price ?? null,
        room.tax_included === false ? 0 : 1,
        room.tax_percentage ?? null,
        room.weekday_extra_adult_rate ?? null,
        room.weekend_extra_adult_rate ?? null,
        room.max_adults ?? 2,
        room.max_children ?? 0,
        room.min_guests ?? null,
        room.check_in_time || '12:00:00',
        room.check_out_time || '10:00:00',
        room.availability_scope || 'always',
        i,
      ]
    );
    const roomId = result.insertId;
    roomIds.push(roomId);

    for (const bed of room.beds || []) {
      if (!bed.bed_type) continue;
      await connection.query(
        `INSERT INTO property_room_beds (room_id, bed_type, quantity) VALUES (?, ?, ?)`,
        [roomId, bed.bed_type, bed.quantity || 1]
      );
    }

    for (const amenityId of room.amenity_ids || []) {
      await connection.query(
        `INSERT IGNORE INTO property_room_amenities (room_id, amenity_id) VALUES (?, ?)`,
        [roomId, amenityId]
      );
    }

    for (const experienceType of room.experience_types || []) {
      await connection.query(
        `INSERT IGNORE INTO property_room_experience_types (room_id, experience_type) VALUES (?, ?)`,
        [roomId, experienceType]
      );
    }

    const images = roomImagesByIndex.get(i) || [];
    for (let j = 0; j < images.length; j += 1) {
      await connection.query(
        `INSERT INTO property_images (property_id, room_id, image_path, is_primary, sort_order) VALUES (?, ?, ?, 0, ?)`,
        [propertyId, roomId, images[j], j]
      );
    }
  }
  return roomIds;
}

async function insertBedrooms(connection, propertyId, bedrooms) {
  for (let i = 0; i < bedrooms.length; i += 1) {
    const bedroom = bedrooms[i];
    if (!bedroom.name) continue;
    await connection.query(
      `INSERT INTO property_bedrooms (property_id, name, bed_config, description, sort_order) VALUES (?, ?, ?, ?, ?)`,
      [propertyId, bedroom.name, bedroom.bed_config || null, bedroom.description || null, i]
    );
  }
}

async function insertAmenities(connection, propertyId, amenities) {
  const allowed = amenities?.property_allowed || [];
  const notAllowed = amenities?.property_not_allowed || [];
  for (const amenityId of allowed) {
    await connection.query(
      `INSERT IGNORE INTO property_amenities (property_id, amenity_id, scope) VALUES (?, ?, 'allowed')`,
      [propertyId, amenityId]
    );
  }
  for (const amenityId of notAllowed) {
    await connection.query(
      `INSERT IGNORE INTO property_amenities (property_id, amenity_id, scope) VALUES (?, ?, 'not_allowed')`,
      [propertyId, amenityId]
    );
  }
}

async function insertActivities(connection, propertyId, activities) {
  for (const activity of activities || []) {
    if (!activity.activity_key) continue;
    await connection.query(
      `INSERT IGNORE INTO property_activities (property_id, activity_key, is_paid, pricing_type, price) VALUES (?, ?, ?, ?, ?)`,
      [propertyId, activity.activity_key, activity.is_paid ? 1 : 0, activity.is_paid ? activity.pricing_type || null : null, activity.is_paid ? activity.price ?? null : null]
    );
  }
}

async function insertMealPlans(connection, propertyId, mealPlans) {
  for (const plan of mealPlans || []) {
    if (!plan.plan_type) continue;
    await connection.query(
      `INSERT INTO property_meal_plans (property_id, plan_type, included, extra_cost) VALUES (?, ?, ?, ?)`,
      [propertyId, plan.plan_type, plan.included ? 1 : 0, plan.extra_cost ?? null]
    );
  }
}

async function insertExperiences(connection, propertyId, experiences) {
  for (let i = 0; i < (experiences || []).length; i += 1) {
    const experience = experiences[i];
    if (!experience.title) continue;
    await connection.query(
      `INSERT INTO property_experiences (
         property_id, experience_type, title, description, availability_note,
         pricing_model, price, inclusions, exclusions, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        propertyId,
        experience.experience_type || null,
        experience.title,
        experience.description || null,
        experience.availability_note || null,
        experience.pricing_model || 'per_person',
        experience.price ?? null,
        experience.inclusions || null,
        experience.exclusions || null,
        i,
      ]
    );
  }
}

async function insertPackages(connection, propertyId, packages) {
  for (let i = 0; i < (packages || []).length; i += 1) {
    const pkg = packages[i];
    if (!pkg.package_name) continue;
    await connection.query(
      `INSERT INTO property_packages (
         property_id, package_name, experience_type, duration, meal_plan_note,
         inclusions, exclusions, price, sort_order
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        propertyId,
        pkg.package_name,
        pkg.experience_type || null,
        pkg.duration || null,
        pkg.meal_plan_note || null,
        pkg.inclusions || null,
        pkg.exclusions || null,
        pkg.price ?? null,
        i,
      ]
    );
  }
}

async function insertEventFacilities(connection, propertyId, eventFacilities, eventCapacities, eventTypes) {
  const facilities = eventFacilities || {};
  const hasAnyFacility =
    facilities.conference_hall || facilities.meeting_room || facilities.lawn_capacity || facilities.banquet_capacity || facilities.parking_capacity;
  if (hasAnyFacility) {
    await connection.query(
      `INSERT INTO property_event_facilities (property_id, conference_hall, meeting_room, lawn_capacity, banquet_capacity, parking_capacity)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        propertyId,
        facilities.conference_hall ? 1 : 0,
        facilities.meeting_room ? 1 : 0,
        facilities.lawn_capacity ?? null,
        facilities.banquet_capacity ?? null,
        facilities.parking_capacity ?? null,
      ]
    );
  }
  for (const capacity of eventCapacities || []) {
    if (!capacity.capacity_name) continue;
    await connection.query(
      `INSERT INTO property_event_capacities (property_id, capacity_name, capacity_value) VALUES (?, ?, ?)`,
      [propertyId, capacity.capacity_name, capacity.capacity_value || null]
    );
  }
  for (const eventTypeName of eventTypes || []) {
    if (!eventTypeName) continue;
    await connection.query(`INSERT INTO property_event_types (property_id, event_type_name) VALUES (?, ?)`, [
      propertyId,
      eventTypeName,
    ]);
  }
}

async function insertCompliance(connection, propertyId, compliance) {
  if (!compliance) return;
  const hasAnyValue = Object.values(compliance).some((value) => value !== undefined && value !== null && value !== '');
  if (!hasAnyValue) return;
  await connection.query(
    `INSERT INTO property_compliance (
       property_id, owner_name, owner_phone, owner_email, id_type, id_number,
       account_name, account_number, ifsc_code, commission_type, commission_value
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      propertyId,
      compliance.owner_name || null,
      compliance.owner_phone || null,
      compliance.owner_email || null,
      compliance.id_type || null,
      compliance.id_number || null,
      compliance.account_name || null,
      compliance.account_number || null,
      compliance.ifsc_code || null,
      compliance.commission_type || null,
      compliance.commission_value ?? null,
    ]
  );
}

async function insertVideos(connection, propertyId, videoPaths) {
  for (let i = 0; i < videoPaths.length; i += 1) {
    await connection.query(`INSERT INTO property_videos (property_id, video_path, sort_order) VALUES (?, ?, ?)`, [
      propertyId,
      videoPaths[i],
      i,
    ]);
  }
}

async function insertPropertyImages(connection, propertyId, imagePaths, primaryIndex) {
  for (let i = 0; i < imagePaths.length; i += 1) {
    await connection.query(
      `INSERT INTO property_images (property_id, room_id, image_path, is_primary, sort_order) VALUES (?, NULL, ?, ?, ?)`,
      [propertyId, imagePaths[i], i === primaryIndex ? 1 : 0, i]
    );
  }
}

/**
 * Runs the whole wizard payload through one transaction. `connection` must
 * already have beginTransaction() called; caller commits/rolls back.
 */
async function createPropertyWithTransactions(connection, ownerId, payload, files) {
  const { property, amenities, rooms = [], bedrooms = [], experiences = [], packages = [], mealPlans = [], activities = [], eventFacilities, eventCapacities = [], eventTypes = [], compliance } = payload;

  const propertyId = await insertCoreProperty(connection, ownerId, property, null);

  await insertRooms(connection, propertyId, rooms, files.roomImagesByIndex);
  await insertBedrooms(connection, propertyId, bedrooms);
  await insertAmenities(connection, propertyId, amenities);
  await insertActivities(connection, propertyId, activities);
  await insertMealPlans(connection, propertyId, mealPlans);
  await insertExperiences(connection, propertyId, experiences);
  await insertPackages(connection, propertyId, packages);
  await insertEventFacilities(connection, propertyId, eventFacilities, eventCapacities, eventTypes);
  await insertCompliance(connection, propertyId, compliance);
  await insertVideos(connection, propertyId, files.videoPaths);
  await insertPropertyImages(connection, propertyId, files.imagePaths, files.primaryIndex);

  return propertyId;
}

module.exports = { createPropertyWithTransactions };
