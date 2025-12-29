// Property types matching the database schema
export type PropertyType = 'casa' | 'departamento' | 'terreno' | 'local' | 'oficina';

// Property status matching the database schema
export type PropertyStatus = 'draft' | 'pending' | 'active' | 'sold' | 'rented' | 'paused' | 'archived';

// Labels for property status in Spanish
export const propertyStatusLabels: Record<PropertyStatus, string> = {
  draft: 'Borrador',
  pending: 'Pendiente',
  active: 'Activo',
  sold: 'Vendido',
  rented: 'Rentado',
  paused: 'Pausado',
  archived: 'Archivado',
};

// Characteristic types - some are boolean (yes/no), some are numeric (quantities)
export type CharacteristicType = 'boolean' | 'number';

// All available characteristic definitions with their types and icons
export interface CharacteristicDefinition {
  key: string;
  label: string;
  type: CharacteristicType;
  icon: string; // Lucide icon name
  color: string; // Tailwind color class
}

// Characteristic with value and optional description
export interface PropertyCharacteristic {
  id: string;
  key: string; // References CharacteristicDefinition key
  label: string;
  type: CharacteristicType;
  value: number | boolean; // number for quantities, boolean for yes/no
  description?: string; // Optional description like "Una terraza frente al mar"
}

// Predefined characteristics - EXTENSIVE LIST organized by category
// Categories for display grouping
export type CharacteristicCategory = 
  | 'core' // Datos principales
  | 'premium' // Características premium
  | 'spaces' // Espacios
  | 'outdoor' // Exterior y jardín
  | 'parking' // Estacionamiento
  | 'kitchen' // Cocina
  | 'climate' // Clima y confort
  | 'entertainment' // Entretenimiento
  | 'utilities' // Servicios e infraestructura
  | 'technology' // Tecnología
  | 'security' // Seguridad
  | 'accessibility' // Accesibilidad
  | 'building' // Edificio/Condominio (for apartments)
  | 'rental' // Para renta
  | 'commercial' // Comercial
  | 'family'; // Familia y mascotas

export interface CharacteristicDefinition {
  key: string;
  label: string;
  type: CharacteristicType;
  icon: string;
  color: string;
  category: CharacteristicCategory;
}

// Category labels in Spanish with display order
export const CHARACTERISTIC_CATEGORY_LABELS: Record<CharacteristicCategory, { label: string; icon: string; order: number }> = {
  core: { label: 'Datos principales', icon: 'LayoutGrid', order: 1 },
  premium: { label: 'Características premium', icon: 'Star', order: 2 },
  outdoor: { label: 'Exterior y jardín', icon: 'TreePine', order: 3 },
  spaces: { label: 'Espacios adicionales', icon: 'DoorOpen', order: 4 },
  parking: { label: 'Estacionamiento', icon: 'Car', order: 5 },
  kitchen: { label: 'Cocina y comedor', icon: 'ChefHat', order: 6 },
  climate: { label: 'Clima y confort', icon: 'Thermometer', order: 7 },
  entertainment: { label: 'Entretenimiento y recreación', icon: 'Gamepad2', order: 8 },
  utilities: { label: 'Servicios e infraestructura', icon: 'Plug', order: 9 },
  technology: { label: 'Tecnología', icon: 'Wifi', order: 10 },
  security: { label: 'Seguridad', icon: 'Shield', order: 11 },
  building: { label: 'Edificio y condominio', icon: 'Building2', order: 12 },
  rental: { label: 'Incluido en renta', icon: 'Key', order: 13 },
  commercial: { label: 'Comercial', icon: 'Store', order: 14 },
  accessibility: { label: 'Accesibilidad', icon: 'Accessibility', order: 15 },
  family: { label: 'Familia y mascotas', icon: 'Heart', order: 16 },
};

export const CHARACTERISTIC_DEFINITIONS: CharacteristicDefinition[] = [
  // ===== CORE: Datos principales =====
  { key: 'bedrooms', label: 'Recámaras', type: 'number', icon: 'Bed', color: 'blue', category: 'core' },
  { key: 'bathrooms', label: 'Baños completos', type: 'number', icon: 'Bath', color: 'cyan', category: 'core' },
  { key: 'half_bathrooms', label: 'Medios baños', type: 'number', icon: 'Bath', color: 'teal', category: 'core' },
  { key: 'size_total', label: 'Terreno (m²)', type: 'number', icon: 'Square', color: 'green', category: 'core' },
  { key: 'size_construction', label: 'Construcción (m²)', type: 'number', icon: 'Home', color: 'emerald', category: 'core' },
  { key: 'levels', label: 'Niveles/Pisos', type: 'number', icon: 'Layers', color: 'indigo', category: 'core' },
  { key: 'age_years', label: 'Antigüedad (años)', type: 'number', icon: 'Calendar', color: 'amber', category: 'core' },
  { key: 'floor_number', label: 'Piso/Nivel', type: 'number', icon: 'Building', color: 'slate', category: 'core' },
  
  // ===== PREMIUM: Características premium =====
  { key: 'ocean_view', label: 'Vista al mar', type: 'boolean', icon: 'Sunset', color: 'cyan', category: 'premium' },
  { key: 'beachfront', label: 'Frente al mar', type: 'boolean', icon: 'Anchor', color: 'blue', category: 'premium' },
  { key: 'beach_access', label: 'Acceso a playa', type: 'boolean', icon: 'Waves', color: 'cyan', category: 'premium' },
  { key: 'mountain_view', label: 'Vista a la montaña', type: 'boolean', icon: 'Mountain', color: 'emerald', category: 'premium' },
  { key: 'city_view', label: 'Vista a la ciudad', type: 'boolean', icon: 'Building2', color: 'slate', category: 'premium' },
  { key: 'lake_view', label: 'Vista al lago', type: 'boolean', icon: 'Waves', color: 'blue', category: 'premium' },
  { key: 'golf_view', label: 'Vista al campo de golf', type: 'boolean', icon: 'Flag', color: 'green', category: 'premium' },
  { key: 'panoramic_view', label: 'Vista panorámica', type: 'boolean', icon: 'Eye', color: 'purple', category: 'premium' },
  { key: 'pool', label: 'Alberca privada', type: 'boolean', icon: 'Waves', color: 'cyan', category: 'premium' },
  { key: 'heated_pool', label: 'Alberca climatizada', type: 'boolean', icon: 'Thermometer', color: 'orange', category: 'premium' },
  { key: 'infinity_pool', label: 'Alberca infinity', type: 'boolean', icon: 'Waves', color: 'blue', category: 'premium' },
  { key: 'jacuzzi', label: 'Jacuzzi', type: 'boolean', icon: 'Bath', color: 'pink', category: 'premium' },
  { key: 'sauna', label: 'Sauna', type: 'boolean', icon: 'Flame', color: 'orange', category: 'premium' },
  { key: 'steam_room', label: 'Vapor', type: 'boolean', icon: 'Cloud', color: 'gray', category: 'premium' },
  { key: 'private_dock', label: 'Muelle privado', type: 'boolean', icon: 'Anchor', color: 'blue', category: 'premium' },
  
  // ===== OUTDOOR: Exterior y jardín =====
  { key: 'garden', label: 'Jardín', type: 'boolean', icon: 'Flower2', color: 'lime', category: 'outdoor' },
  { key: 'large_garden', label: 'Jardín amplio', type: 'boolean', icon: 'TreePine', color: 'green', category: 'outdoor' },
  { key: 'front_yard', label: 'Jardín frontal', type: 'boolean', icon: 'Flower2', color: 'lime', category: 'outdoor' },
  { key: 'backyard', label: 'Jardín trasero', type: 'boolean', icon: 'TreePine', color: 'green', category: 'outdoor' },
  { key: 'terraces', label: 'Terrazas', type: 'number', icon: 'Fence', color: 'emerald', category: 'outdoor' },
  { key: 'balconies', label: 'Balcones', type: 'number', icon: 'DoorOpen', color: 'sky', category: 'outdoor' },
  { key: 'roof_garden', label: 'Jardín en azotea', type: 'boolean', icon: 'Palmtree', color: 'emerald', category: 'outdoor' },
  { key: 'patios', label: 'Patios', type: 'number', icon: 'TreePine', color: 'green', category: 'outdoor' },
  { key: 'pergola', label: 'Pérgola', type: 'boolean', icon: 'Home', color: 'amber', category: 'outdoor' },
  { key: 'palapa', label: 'Palapa', type: 'boolean', icon: 'Palmtree', color: 'amber', category: 'outdoor' },
  { key: 'outdoor_kitchen', label: 'Cocina exterior', type: 'boolean', icon: 'ChefHat', color: 'orange', category: 'outdoor' },
  { key: 'bbq_area', label: 'Área de asador', type: 'boolean', icon: 'Flame', color: 'rose', category: 'outdoor' },
  { key: 'fire_pit', label: 'Fogata', type: 'boolean', icon: 'Flame', color: 'orange', category: 'outdoor' },
  { key: 'fountain', label: 'Fuente', type: 'boolean', icon: 'Droplets', color: 'blue', category: 'outdoor' },
  { key: 'irrigation_system', label: 'Sistema de riego', type: 'boolean', icon: 'Droplets', color: 'cyan', category: 'outdoor' },
  
  // ===== SPACES: Espacios adicionales =====
  { key: 'living_room', label: 'Sala', type: 'boolean', icon: 'Sofa', color: 'blue', category: 'spaces' },
  { key: 'dining_room', label: 'Comedor', type: 'boolean', icon: 'UtensilsCrossed', color: 'amber', category: 'spaces' },
  { key: 'family_room', label: 'Sala familiar', type: 'boolean', icon: 'Sofa', color: 'violet', category: 'spaces' },
  { key: 'offices', label: 'Estudios/Oficinas', type: 'number', icon: 'Monitor', color: 'blue', category: 'spaces' },
  { key: 'library', label: 'Biblioteca', type: 'boolean', icon: 'BookOpen', color: 'amber', category: 'spaces' },
  { key: 'storage_rooms', label: 'Bodegas', type: 'number', icon: 'Warehouse', color: 'amber', category: 'spaces' },
  { key: 'service_rooms', label: 'Cuartos de servicio', type: 'number', icon: 'BedDouble', color: 'violet', category: 'spaces' },
  { key: 'laundry_room', label: 'Cuarto de lavado', type: 'boolean', icon: 'WashingMachine', color: 'cyan', category: 'spaces' },
  { key: 'walk_in_closet', label: 'Vestidor', type: 'boolean', icon: 'Shirt', color: 'pink', category: 'spaces' },
  { key: 'closets', label: 'Closets', type: 'number', icon: 'Shirt', color: 'gray', category: 'spaces' },
  { key: 'attic', label: 'Ático', type: 'boolean', icon: 'Home', color: 'amber', category: 'spaces' },
  { key: 'basement', label: 'Sótano', type: 'boolean', icon: 'ArrowDown', color: 'slate', category: 'spaces' },
  { key: 'loft', label: 'Loft', type: 'boolean', icon: 'Layers', color: 'indigo', category: 'spaces' },
  { key: 'double_height', label: 'Doble altura', type: 'boolean', icon: 'ArrowUpDown', color: 'violet', category: 'spaces' },
  
  // ===== PARKING: Estacionamiento =====
  { key: 'parking_spaces', label: 'Estacionamientos', type: 'number', icon: 'Car', color: 'purple', category: 'parking' },
  { key: 'covered_parking', label: 'Cocheras techadas', type: 'number', icon: 'Warehouse', color: 'gray', category: 'parking' },
  { key: 'uncovered_parking', label: 'Estacionamientos descubiertos', type: 'number', icon: 'ParkingCircle', color: 'slate', category: 'parking' },
  { key: 'garage', label: 'Garaje cerrado', type: 'boolean', icon: 'Warehouse', color: 'gray', category: 'parking' },
  { key: 'electric_gate', label: 'Portón eléctrico', type: 'boolean', icon: 'Zap', color: 'yellow', category: 'parking' },
  { key: 'visitor_parking', label: 'Estacionamiento visitantes', type: 'boolean', icon: 'Car', color: 'blue', category: 'parking' },
  { key: 'ev_charger', label: 'Cargador vehículo eléctrico', type: 'boolean', icon: 'Zap', color: 'green', category: 'parking' },
  
  // ===== KITCHEN: Cocina y comedor =====
  { key: 'equipped_kitchen', label: 'Cocina equipada', type: 'boolean', icon: 'ChefHat', color: 'amber', category: 'kitchen' },
  { key: 'integral_kitchen', label: 'Cocina integral', type: 'boolean', icon: 'ChefHat', color: 'orange', category: 'kitchen' },
  { key: 'kitchen_island', label: 'Isla de cocina', type: 'boolean', icon: 'UtensilsCrossed', color: 'orange', category: 'kitchen' },
  { key: 'breakfast_bar', label: 'Barra desayunadora', type: 'boolean', icon: 'Coffee', color: 'amber', category: 'kitchen' },
  { key: 'pantry', label: 'Despensa', type: 'boolean', icon: 'PackageOpen', color: 'yellow', category: 'kitchen' },
  { key: 'stove', label: 'Estufa', type: 'boolean', icon: 'Flame', color: 'red', category: 'kitchen' },
  { key: 'oven', label: 'Horno', type: 'boolean', icon: 'Square', color: 'orange', category: 'kitchen' },
  { key: 'microwave', label: 'Microondas', type: 'boolean', icon: 'Square', color: 'gray', category: 'kitchen' },
  { key: 'refrigerator', label: 'Refrigerador', type: 'boolean', icon: 'Refrigerator', color: 'slate', category: 'kitchen' },
  { key: 'dishwasher', label: 'Lavavajillas', type: 'boolean', icon: 'Droplets', color: 'blue', category: 'kitchen' },
  { key: 'hood', label: 'Campana extractora', type: 'boolean', icon: 'Wind', color: 'gray', category: 'kitchen' },
  
  // ===== CLIMATE: Clima y confort =====
  { key: 'air_conditioning', label: 'Aire acondicionado', type: 'boolean', icon: 'Wind', color: 'sky', category: 'climate' },
  { key: 'central_ac', label: 'A/C central', type: 'boolean', icon: 'AirVent', color: 'blue', category: 'climate' },
  { key: 'mini_splits', label: 'Mini splits', type: 'number', icon: 'AirVent', color: 'sky', category: 'climate' },
  { key: 'heating', label: 'Calefacción', type: 'boolean', icon: 'Heater', color: 'orange', category: 'climate' },
  { key: 'central_heating', label: 'Calefacción central', type: 'boolean', icon: 'Heater', color: 'red', category: 'climate' },
  { key: 'fireplace', label: 'Chimenea', type: 'boolean', icon: 'Flame', color: 'amber', category: 'climate' },
  { key: 'ceiling_fans', label: 'Ventiladores de techo', type: 'number', icon: 'Fan', color: 'gray', category: 'climate' },
  { key: 'natural_ventilation', label: 'Ventilación natural', type: 'boolean', icon: 'Wind', color: 'green', category: 'climate' },
  
  // ===== ENTERTAINMENT: Entretenimiento =====
  { key: 'gym', label: 'Gimnasio', type: 'boolean', icon: 'Dumbbell', color: 'red', category: 'entertainment' },
  { key: 'home_theater', label: 'Cine en casa', type: 'boolean', icon: 'Tv', color: 'purple', category: 'entertainment' },
  { key: 'game_room', label: 'Sala de juegos', type: 'boolean', icon: 'Gamepad2', color: 'violet', category: 'entertainment' },
  { key: 'bar', label: 'Bar', type: 'boolean', icon: 'Wine', color: 'purple', category: 'entertainment' },
  { key: 'wine_cellar', label: 'Cava de vinos', type: 'boolean', icon: 'Wine', color: 'rose', category: 'entertainment' },
  { key: 'spa', label: 'Spa', type: 'boolean', icon: 'Sparkles', color: 'pink', category: 'entertainment' },
  { key: 'tennis_court', label: 'Cancha de tenis', type: 'boolean', icon: 'Circle', color: 'green', category: 'entertainment' },
  { key: 'sports_court', label: 'Cancha deportiva', type: 'boolean', icon: 'Circle', color: 'orange', category: 'entertainment' },
  
  // ===== UTILITIES: Servicios e infraestructura =====
  { key: 'water_heater', label: 'Calentador de agua', type: 'boolean', icon: 'Flame', color: 'orange', category: 'utilities' },
  { key: 'solar_heater', label: 'Calentador solar', type: 'boolean', icon: 'Sun', color: 'yellow', category: 'utilities' },
  { key: 'boiler', label: 'Boiler', type: 'boolean', icon: 'Flame', color: 'orange', category: 'utilities' },
  { key: 'solar_panels', label: 'Paneles solares', type: 'boolean', icon: 'Sun', color: 'yellow', category: 'utilities' },
  { key: 'cistern', label: 'Cisterna', type: 'boolean', icon: 'Droplets', color: 'blue', category: 'utilities' },
  { key: 'water_tank', label: 'Tinaco', type: 'boolean', icon: 'Container', color: 'slate', category: 'utilities' },
  { key: 'water_softener', label: 'Suavizador de agua', type: 'boolean', icon: 'Droplets', color: 'cyan', category: 'utilities' },
  { key: 'water_purifier', label: 'Purificador de agua', type: 'boolean', icon: 'Droplets', color: 'blue', category: 'utilities' },
  { key: 'emergency_plant', label: 'Planta de emergencia', type: 'boolean', icon: 'Plug', color: 'green', category: 'utilities' },
  { key: 'natural_gas', label: 'Gas natural', type: 'boolean', icon: 'Flame', color: 'blue', category: 'utilities' },
  { key: 'lp_gas', label: 'Gas LP/Estacionario', type: 'boolean', icon: 'Flame', color: 'orange', category: 'utilities' },
  { key: 'septic_tank', label: 'Fosa séptica', type: 'boolean', icon: 'Container', color: 'gray', category: 'utilities' },
  { key: 'city_water', label: 'Agua de la ciudad', type: 'boolean', icon: 'Droplets', color: 'blue', category: 'utilities' },
  { key: 'well_water', label: 'Pozo de agua', type: 'boolean', icon: 'Droplets', color: 'teal', category: 'utilities' },
  
  // ===== TECHNOLOGY: Tecnología =====
  { key: 'smart_home', label: 'Casa inteligente/Domótica', type: 'boolean', icon: 'Wifi', color: 'violet', category: 'technology' },
  { key: 'fiber_optic', label: 'Fibra óptica', type: 'boolean', icon: 'Cable', color: 'indigo', category: 'technology' },
  { key: 'high_speed_internet', label: 'Internet de alta velocidad', type: 'boolean', icon: 'Wifi', color: 'blue', category: 'technology' },
  { key: 'wired_network', label: 'Red cableada', type: 'boolean', icon: 'Cable', color: 'gray', category: 'technology' },
  { key: 'sound_system', label: 'Sistema de sonido', type: 'boolean', icon: 'Speaker', color: 'purple', category: 'technology' },
  { key: 'led_lighting', label: 'Iluminación LED', type: 'boolean', icon: 'Lightbulb', color: 'yellow', category: 'technology' },
  
  // ===== SECURITY: Seguridad =====
  { key: 'gated_community', label: 'Comunidad cerrada', type: 'boolean', icon: 'Lock', color: 'purple', category: 'security' },
  { key: 'security_guard', label: 'Vigilancia 24/7', type: 'boolean', icon: 'Shield', color: 'indigo', category: 'security' },
  { key: 'guardhouse', label: 'Caseta de vigilancia', type: 'boolean', icon: 'Home', color: 'gray', category: 'security' },
  { key: 'alarm_system', label: 'Sistema de alarma', type: 'boolean', icon: 'ShieldAlert', color: 'red', category: 'security' },
  { key: 'security_cameras', label: 'Cámaras de seguridad', type: 'boolean', icon: 'Camera', color: 'slate', category: 'security' },
  { key: 'electric_fence', label: 'Cerca eléctrica', type: 'boolean', icon: 'Zap', color: 'yellow', category: 'security' },
  { key: 'perimeter_fence', label: 'Barda perimetral', type: 'boolean', icon: 'Fence', color: 'gray', category: 'security' },
  { key: 'intercom', label: 'Intercomunicador', type: 'boolean', icon: 'Phone', color: 'teal', category: 'security' },
  { key: 'video_doorbell', label: 'Timbre con cámara', type: 'boolean', icon: 'Video', color: 'blue', category: 'security' },
  { key: 'access_control', label: 'Control de acceso', type: 'boolean', icon: 'KeyRound', color: 'indigo', category: 'security' },
  { key: 'safe_room', label: 'Cuarto de pánico', type: 'boolean', icon: 'ShieldAlert', color: 'red', category: 'security' },
  { key: 'safe', label: 'Caja fuerte', type: 'boolean', icon: 'Lock', color: 'gray', category: 'security' },
  
  // ===== BUILDING: Edificio y condominio =====
  { key: 'common_pool', label: 'Alberca común', type: 'boolean', icon: 'Waves', color: 'cyan', category: 'building' },
  { key: 'common_gym', label: 'Gimnasio común', type: 'boolean', icon: 'Dumbbell', color: 'red', category: 'building' },
  { key: 'common_terrace', label: 'Terraza común', type: 'boolean', icon: 'Fence', color: 'emerald', category: 'building' },
  { key: 'lobby', label: 'Vestíbulo', type: 'boolean', icon: 'Building2', color: 'slate', category: 'building' },
  { key: 'doorman', label: 'Portero', type: 'boolean', icon: 'User', color: 'blue', category: 'building' },
  { key: 'concierge', label: 'Conserje', type: 'boolean', icon: 'User', color: 'purple', category: 'building' },
  { key: 'elevator', label: 'Elevador', type: 'boolean', icon: 'ArrowUpDown', color: 'slate', category: 'building' },
  { key: 'service_elevator', label: 'Elevador de servicio', type: 'boolean', icon: 'ArrowUpDown', color: 'gray', category: 'building' },
  { key: 'common_areas', label: 'Áreas comunes', type: 'boolean', icon: 'Users', color: 'blue', category: 'building' },
  { key: 'rooftop', label: 'Azotea', type: 'boolean', icon: 'Building2', color: 'indigo', category: 'building' },
  { key: 'party_room', label: 'Salón de fiestas', type: 'boolean', icon: 'PartyPopper', color: 'pink', category: 'building' },
  { key: 'business_center', label: 'Centro de negocios', type: 'boolean', icon: 'Briefcase', color: 'blue', category: 'building' },
  { key: 'maintenance_included', label: 'Mantenimiento incluido', type: 'boolean', icon: 'Wrench', color: 'gray', category: 'building' },
  
  // ===== RENTAL: Para renta =====
  { key: 'furnished', label: 'Amueblado', type: 'boolean', icon: 'Sofa', color: 'amber', category: 'rental' },
  { key: 'semi_furnished', label: 'Semi-amueblado', type: 'boolean', icon: 'Sofa', color: 'yellow', category: 'rental' },
  { key: 'utilities_included', label: 'Servicios incluidos', type: 'boolean', icon: 'Plug', color: 'green', category: 'rental' },
  { key: 'internet_included', label: 'Internet incluido', type: 'boolean', icon: 'Wifi', color: 'blue', category: 'rental' },
  { key: 'cable_included', label: 'Cable incluido', type: 'boolean', icon: 'Tv', color: 'purple', category: 'rental' },
  { key: 'washer_dryer', label: 'Lavadora/Secadora', type: 'boolean', icon: 'WashingMachine', color: 'cyan', category: 'rental' },
  { key: 'linens_included', label: 'Ropa de cama incluida', type: 'boolean', icon: 'Bed', color: 'pink', category: 'rental' },
  { key: 'cleaning_included', label: 'Limpieza incluida', type: 'boolean', icon: 'Sparkles', color: 'cyan', category: 'rental' },
  { key: 'long_term', label: 'Renta largo plazo', type: 'boolean', icon: 'Calendar', color: 'blue', category: 'rental' },
  { key: 'short_term', label: 'Renta corto plazo', type: 'boolean', icon: 'Calendar', color: 'orange', category: 'rental' },
  { key: 'vacation_rental', label: 'Renta vacacional', type: 'boolean', icon: 'Palmtree', color: 'emerald', category: 'rental' },
  
  // ===== COMMERCIAL: Comercial =====
  { key: 'commercial_use', label: 'Uso comercial permitido', type: 'boolean', icon: 'Store', color: 'blue', category: 'commercial' },
  { key: 'mixed_use', label: 'Uso mixto', type: 'boolean', icon: 'Building2', color: 'purple', category: 'commercial' },
  { key: 'street_front', label: 'Frente a calle', type: 'boolean', icon: 'MapPin', color: 'red', category: 'commercial' },
  { key: 'loading_dock', label: 'Andén de carga', type: 'boolean', icon: 'Truck', color: 'gray', category: 'commercial' },
  { key: 'warehouse_space', label: 'Espacio de almacén', type: 'boolean', icon: 'Warehouse', color: 'amber', category: 'commercial' },
  { key: 'office_space', label: 'Espacio de oficina', type: 'boolean', icon: 'Briefcase', color: 'blue', category: 'commercial' },
  { key: 'high_ceilings', label: 'Techos altos', type: 'boolean', icon: 'ArrowUpDown', color: 'indigo', category: 'commercial' },
  { key: 'three_phase_power', label: 'Corriente trifásica', type: 'boolean', icon: 'Zap', color: 'yellow', category: 'commercial' },
  
  // ===== ACCESSIBILITY: Accesibilidad =====
  { key: 'wheelchair_accessible', label: 'Accesible silla de ruedas', type: 'boolean', icon: 'Accessibility', color: 'blue', category: 'accessibility' },
  { key: 'ground_floor', label: 'Planta baja', type: 'boolean', icon: 'Home', color: 'green', category: 'accessibility' },
  { key: 'ramp_access', label: 'Rampa de acceso', type: 'boolean', icon: 'ArrowRight', color: 'blue', category: 'accessibility' },
  { key: 'wide_doorways', label: 'Puertas amplias', type: 'boolean', icon: 'DoorOpen', color: 'gray', category: 'accessibility' },
  { key: 'grab_bars', label: 'Barras de apoyo', type: 'boolean', icon: 'Minus', color: 'slate', category: 'accessibility' },
  
  // ===== FAMILY: Familia y mascotas =====
  { key: 'pet_friendly', label: 'Se permiten mascotas', type: 'boolean', icon: 'Dog', color: 'amber', category: 'family' },
  { key: 'playground', label: 'Área de juegos infantil', type: 'boolean', icon: 'Baby', color: 'pink', category: 'family' },
  { key: 'kids_pool', label: 'Chapoteadero', type: 'boolean', icon: 'Waves', color: 'cyan', category: 'family' },
  { key: 'near_schools', label: 'Cerca de escuelas', type: 'boolean', icon: 'GraduationCap', color: 'blue', category: 'family' },
  { key: 'near_parks', label: 'Cerca de parques', type: 'boolean', icon: 'TreePine', color: 'green', category: 'family' },
  { key: 'quiet_neighborhood', label: 'Zona tranquila', type: 'boolean', icon: 'Moon', color: 'indigo', category: 'family' },
];

export interface Property {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  slug: string;
  description: string | null;
  price: number | null; // Sale price
  currency: string;
  is_for_sale: boolean;
  is_for_rent: boolean;
  rent_price: number | null;
  rent_currency: string;
  location_city: string;
  location_state: string;
  location_neighborhood: string | null;
  location_address: string | null;
  location_lat: number | null;
  location_lng: number | null;
  property_type: PropertyType;
  custom_bonuses: string[];
  images: string[];
  videos: string[];
  is_featured: boolean;
  status: PropertyStatus;
  display_order: number;
  show_map: boolean;
  characteristics: PropertyCharacteristic[];
}

export type PropertyInsert = Omit<Property, 'id' | 'created_at' | 'updated_at'>;
export type PropertyUpdate = Partial<PropertyInsert>;

// Labels for property types in Spanish
export const propertyTypeLabels: Record<PropertyType, string> = {
  casa: 'Casa',
  departamento: 'Departamento',
  terreno: 'Terreno',
  local: 'Local Comercial',
  oficina: 'Oficina',
};

// Labels for property conditions in Spanish
// Generate a slug from title
export function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with dashes
    .replace(/-+/g, '-') // Replace multiple dashes with single dash
    .trim();
}

// Format price in Mexican Pesos with currency
export function formatPrice(price: number | null | undefined, currency: string = 'MXN'): string {
  if (price === null || price === undefined || Number.isNaN(price)) {
    return 'Precio a consultar';
  }

  const formatted = new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);

  return `${formatted} ${currency}`;
}
