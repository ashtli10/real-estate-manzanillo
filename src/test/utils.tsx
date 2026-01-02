import { render, RenderOptions } from '@testing-library/react';
import { ReactElement } from 'react';
import type { Property } from '../types/property';
import type { AgentInfo } from '../components/AgentCard';

// Custom render function that can wrap with providers
export function renderWithProviders(
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) {
  return render(ui, { ...options });
}

// Mock property data
export const mockProperty: Property = {
  id: 'test-property-1',
  slug: 'beautiful-beach-house',
  title: 'Beautiful Beach House',
  description: 'A stunning beachfront property with amazing views',
  property_type: 'casa',
  price: 5000000,
  currency: 'MXN',
  is_for_sale: true,
  is_for_rent: false,
  rent_price: null,
  rent_currency: 'MXN',
  location_city: 'Ciudad de México',
  location_state: 'CDMX',
  location_neighborhood: 'Polanco',
  location_address: 'Calle del Mar 123',
  location_lat: 19.4326,
  location_lng: -99.1332,
  images: [
    'https://example.com/image1.jpg',
    'https://example.com/image2.jpg',
  ],
  videos: [],
  characteristics: [
    { id: '1', key: 'bedrooms', label: 'Recámaras', type: 'number', value: 3 },
    { id: '2', key: 'bathrooms', label: 'Baños', type: 'number', value: 2 },
    { id: '3', key: 'size_total', label: 'Terreno', type: 'number', value: 250 },
    { id: '4', key: 'parking_spaces', label: 'Estacionamientos', type: 'number', value: 2 },
    { id: '5', key: 'pool', label: 'Alberca', type: 'boolean', value: true },
    { id: '6', key: 'ocean_view', label: 'Vista al mar', type: 'boolean', value: true },
  ],
  custom_bonuses: [],
  is_featured: true,
  status: 'active',
  show_map: true,
  display_order: 1,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
};

export const mockPropertyForRent: Property = {
  ...mockProperty,
  id: 'test-property-2',
  slug: 'cozy-apartment-for-rent',
  title: 'Cozy Apartment for Rent',
  is_for_sale: false,
  is_for_rent: true,
  price: null,
  rent_price: 15000,
  rent_currency: 'MXN',
  property_type: 'departamento',
  characteristics: [
    { id: '1', key: 'bedrooms', label: 'Recámaras', type: 'number', value: 2 },
    { id: '2', key: 'bathrooms', label: 'Baños', type: 'number', value: 1 },
    { id: '3', key: 'size_total', label: 'Terreno', type: 'number', value: 80 },
    { id: '4', key: 'parking_spaces', label: 'Estacionamientos', type: 'number', value: 1 },
  ],
};

export const mockPropertyBoth: Property = {
  ...mockProperty,
  id: 'test-property-3',
  slug: 'versatile-condo',
  title: 'Versatile Condo',
  is_for_sale: true,
  is_for_rent: true,
  price: 2500000,
  rent_price: 12000,
  rent_currency: 'MXN',
  property_type: 'departamento',
};

export const mockProperties: Property[] = [
  mockProperty,
  mockPropertyForRent,
  mockPropertyBoth,
  {
    ...mockProperty,
    id: 'test-property-4',
    slug: 'luxury-villa',
    title: 'Luxury Villa',
    property_type: 'casa',
    price: 15000000,
    location_neighborhood: 'Las Brisas',
    is_featured: true,
    characteristics: [
      { id: '1', key: 'bedrooms', label: 'Recámaras', type: 'number', value: 5 },
      { id: '2', key: 'bathrooms', label: 'Baños', type: 'number', value: 4 },
      { id: '3', key: 'size_total', label: 'Terreno', type: 'number', value: 500 },
      { id: '4', key: 'parking_spaces', label: 'Estacionamientos', type: 'number', value: 4 },
      { id: '5', key: 'pool', label: 'Alberca', type: 'boolean', value: true },
      { id: '6', key: 'jacuzzi', label: 'Jacuzzi', type: 'boolean', value: true },
    ],
  },
  {
    ...mockProperty,
    id: 'test-property-5',
    slug: 'commercial-space',
    title: 'Commercial Space',
    property_type: 'local',
    price: 3000000,
    location_neighborhood: 'Centro',
    is_featured: false,
  },
];

// Mock agent data
export const mockAgent: AgentInfo = {
  id: 'agent-1',
  username: 'barbara',
  full_name: 'Barbara Martinez',
  company_name: 'Martinez Realty',
  avatar_url: 'https://example.com/avatar.jpg',
  cover_image: 'https://example.com/cover.jpg',
  bio: 'Experienced real estate agent with 10 years in Mexico market',
  phone: '+52 314 123 4567',
  whatsapp_number: '5213141234567',
  location: 'Ciudad de México, México',
  created_at: '2023-01-01T00:00:00Z',
  properties_count: 15,
  member_since: '2023-01-01T00:00:00Z',
};

export const mockAgents: AgentInfo[] = [
  mockAgent,
  {
    ...mockAgent,
    id: 'agent-2',
    username: 'carlos',
    full_name: 'Carlos Rodriguez',
    company_name: 'Rodriguez Properties',
    whatsapp_number: '5213149876543',
    properties_count: 8,
  },
  {
    ...mockAgent,
    id: 'agent-3',
    username: 'maria',
    full_name: 'Maria Garcia',
    bio: 'Specializing in beachfront properties',
    properties_count: 22,
  },
];

// Helper to create property with overrides
export function createMockProperty(overrides: Partial<Property> = {}): Property {
  return { ...mockProperty, ...overrides };
}

// Helper to create agent with overrides
export function createMockAgent(overrides: Partial<AgentInfo> = {}): AgentInfo {
  return { ...mockAgent, ...overrides };
}

// Wait utility
export const waitFor = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Format price for testing
export function formatTestPrice(price: number, currency: string = 'MXN'): string {
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(price);
}
