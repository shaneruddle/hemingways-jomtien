import { DEFAULT_COMPANY_PROFILE, formatPhoneDisplay } from '../utils/companyDefaults';

export interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  hours: string[];
  rating: number;
  user_ratings_total: number;
  website: string;
  url: string; // Google Maps URL
  reviews?: {
    author_name: string;
    profile_photo_url: string;
    rating: number;
    relative_time_description: string;
    text: string;
  }[];
}

export async function fetchPlaceDetails(placeId: string): Promise<BusinessInfo | null> {
  try {
    const response = await fetch(`/api/place-details/${placeId}`);
    const data = await response.json();
    
    if (data.status !== 'OK') {
      const errorMessage = data.error_message || data.error || 'Failed to fetch place details';
      throw new Error(errorMessage);
    }

    const result = data.result;
    return {
      name: result.name,
      address: result.formatted_address,
      phone: result.formatted_phone_number,
      hours: result.opening_hours?.weekday_text || [],
      rating: result.rating,
      user_ratings_total: result.user_ratings_total,
      website: result.website,
      url: result.url,
      reviews: result.reviews
    };
  } catch (error) {
    // Silently return fallback if API is blocked or key is invalid. Reuses the
    // same address/phone as the rest of the site (see utils/companyDefaults)
    // instead of a separately-maintained copy.
    return {
      name: DEFAULT_COMPANY_PROFILE.name,
      address: DEFAULT_COMPANY_PROFILE.address,
      phone: formatPhoneDisplay(DEFAULT_COMPANY_PROFILE.phone),
      hours: [`Open Daily: ${DEFAULT_COMPANY_PROFILE.openingHours.monday}`],
      rating: 4.8,
      user_ratings_total: 250,
      website: "https://hemingwaysjomtien.com",
      url: `https://maps.google.com/?q=${encodeURIComponent(DEFAULT_COMPANY_PROFILE.address)}`
    };
  }
}
