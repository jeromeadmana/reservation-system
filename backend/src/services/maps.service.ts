import axios from 'axios';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';

interface Coordinates {
  latitude: number;
  longitude: number;
}

interface RouteResult {
  distance: number; // in miles
  duration: number; // in minutes
  polyline?: string;
  steps?: Array<{
    instruction: string;
    distance: number;
    duration: number;
  }>;
}

interface GeocodeResult {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  addressComponents?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    country?: string;
  };
}

export class MapsService {
  private apiKey: string | undefined;
  private baseUrl = 'https://maps.googleapis.com/maps/api';

  constructor() {
    this.apiKey = env.GOOGLE_MAPS_API_KEY;
  }

  private checkApiKey() {
    if (!this.apiKey) {
      throw new BadRequestError(
        'Google Maps API key is not configured. Please add GOOGLE_MAPS_API_KEY to your environment variables.'
      );
    }
  }

  /**
   * Calculate route between two points
   */
  async calculateRoute(
    origin: { latitude: number; longitude: number } | string,
    destination: { latitude: number; longitude: number } | string,
    options?: {
      mode?: 'driving' | 'walking' | 'bicycling' | 'transit';
      alternatives?: boolean;
    }
  ): Promise<RouteResult> {
    this.checkApiKey();

    const originStr =
      typeof origin === 'string' ? origin : `${origin.latitude},${origin.longitude}`;
    const destinationStr =
      typeof destination === 'string'
        ? destination
        : `${destination.latitude},${destination.longitude}`;

    try {
      const response = await axios.get(`${this.baseUrl}/directions/json`, {
        params: {
          origin: originStr,
          destination: destinationStr,
          mode: options?.mode || 'driving',
          alternatives: options?.alternatives || false,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK') {
        throw new BadRequestError(`Maps API error: ${response.data.status}`);
      }

      const route = response.data.routes[0];
      const leg = route.legs[0];

      // Convert meters to miles and seconds to minutes
      const distanceInMiles = leg.distance.value * 0.000621371;
      const durationInMinutes = Math.ceil(leg.duration.value / 60);

      const steps = leg.steps.map((step: any) => ({
        instruction: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
        distance: step.distance.value * 0.000621371,
        duration: Math.ceil(step.duration.value / 60),
      }));

      return {
        distance: parseFloat(distanceInMiles.toFixed(2)),
        duration: durationInMinutes,
        polyline: route.overview_polyline.points,
        steps,
      };
    } catch (error: any) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError(`Failed to calculate route: ${error.message}`);
    }
  }

  /**
   * Geocode an address to coordinates
   */
  async geocodeAddress(address: string): Promise<GeocodeResult> {
    this.checkApiKey();

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          address,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        throw new BadRequestError(`Could not geocode address: ${response.data.status}`);
      }

      const result = response.data.results[0];
      const location = result.geometry.location;

      // Parse address components
      const components: any = {};
      result.address_components.forEach((component: any) => {
        if (component.types.includes('street_number') || component.types.includes('route')) {
          components.street = components.street
            ? `${components.street} ${component.long_name}`
            : component.long_name;
        }
        if (component.types.includes('locality')) {
          components.city = component.long_name;
        }
        if (component.types.includes('administrative_area_level_1')) {
          components.state = component.short_name;
        }
        if (component.types.includes('postal_code')) {
          components.zipCode = component.long_name;
        }
        if (component.types.includes('country')) {
          components.country = component.long_name;
        }
      });

      return {
        formattedAddress: result.formatted_address,
        latitude: location.lat,
        longitude: location.lng,
        addressComponents: components,
      };
    } catch (error: any) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError(`Failed to geocode address: ${error.message}`);
    }
  }

  /**
   * Reverse geocode coordinates to address
   */
  async reverseGeocode(latitude: number, longitude: number): Promise<GeocodeResult> {
    this.checkApiKey();

    try {
      const response = await axios.get(`${this.baseUrl}/geocode/json`, {
        params: {
          latlng: `${latitude},${longitude}`,
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK' || response.data.results.length === 0) {
        throw new BadRequestError(
          `Could not reverse geocode coordinates: ${response.data.status}`
        );
      }

      const result = response.data.results[0];

      return {
        formattedAddress: result.formatted_address,
        latitude,
        longitude,
      };
    } catch (error: any) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError(`Failed to reverse geocode: ${error.message}`);
    }
  }

  /**
   * Calculate distance between two points (using Haversine formula as fallback)
   */
  calculateDistanceHaversine(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 3959; // Earth's radius in miles
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return parseFloat((R * c).toFixed(2));
  }

  /**
   * Get estimated price based on distance
   */
  calculateEstimatedPrice(distance: number, duration: number): {
    basePrice: number;
    distancePrice: number;
    timePrice: number;
    totalPrice: number;
  } {
    const BASE_FARE = 50;
    const PRICE_PER_MILE = 2.5;
    const PRICE_PER_MINUTE = 0.5;

    const distancePrice = parseFloat((distance * PRICE_PER_MILE).toFixed(2));
    const timePrice = parseFloat((duration * PRICE_PER_MINUTE).toFixed(2));
    const totalPrice = parseFloat((BASE_FARE + distancePrice + timePrice).toFixed(2));

    return {
      basePrice: BASE_FARE,
      distancePrice,
      timePrice,
      totalPrice,
    };
  }

  /**
   * Get place details/autocomplete suggestions
   */
  async getPlaceAutocomplete(input: string, location?: Coordinates): Promise<
    Array<{
      placeId: string;
      description: string;
      mainText: string;
      secondaryText: string;
    }>
  > {
    this.checkApiKey();

    try {
      const params: any = {
        input,
        key: this.apiKey,
      };

      if (location) {
        params.location = `${location.latitude},${location.longitude}`;
        params.radius = 50000; // 50km radius
      }

      const response = await axios.get(`${this.baseUrl}/place/autocomplete/json`, {
        params,
      });

      if (response.data.status !== 'OK' && response.data.status !== 'ZERO_RESULTS') {
        throw new BadRequestError(`Places API error: ${response.data.status}`);
      }

      return response.data.predictions.map((prediction: any) => ({
        placeId: prediction.place_id,
        description: prediction.description,
        mainText: prediction.structured_formatting.main_text,
        secondaryText: prediction.structured_formatting.secondary_text,
      }));
    } catch (error: any) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError(`Failed to get place suggestions: ${error.message}`);
    }
  }

  /**
   * Get place details by place ID
   */
  async getPlaceDetails(placeId: string): Promise<{
    name: string;
    formattedAddress: string;
    latitude: number;
    longitude: number;
  }> {
    this.checkApiKey();

    try {
      const response = await axios.get(`${this.baseUrl}/place/details/json`, {
        params: {
          place_id: placeId,
          fields: 'name,formatted_address,geometry',
          key: this.apiKey,
        },
      });

      if (response.data.status !== 'OK') {
        throw new BadRequestError(`Place details error: ${response.data.status}`);
      }

      const result = response.data.result;

      return {
        name: result.name,
        formattedAddress: result.formatted_address,
        latitude: result.geometry.location.lat,
        longitude: result.geometry.location.lng,
      };
    } catch (error: any) {
      if (error instanceof BadRequestError) throw error;
      throw new BadRequestError(`Failed to get place details: ${error.message}`);
    }
  }

  private toRad(degrees: number): number {
    return degrees * (Math.PI / 180);
  }
}

export const mapsService = new MapsService();
