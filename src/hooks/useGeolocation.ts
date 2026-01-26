import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  latitude: number | null;
  longitude: number | null;
  accuracy: number | null;
  loading: boolean;
  error: string | null;
  locationName: string | null;
  marketName: string | null;
}

// Simulated nearby markets based on rough regions
// In production, this would be a real API call
const getMarketInfo = (lat: number, lng: number): { location: string; market: string } => {
  // Delhi NCR region
  if (lat >= 28.4 && lat <= 28.9 && lng >= 76.8 && lng <= 77.5) {
    const markets = [
      { location: "Delhi NCR", market: "Azadpur Mandi" },
      { location: "New Delhi", market: "Okhla Mandi" },
      { location: "Gurgaon", market: "Khandsa Mandi" },
      { location: "Noida", market: "Sector 82 Market" },
    ];
    return markets[Math.floor(Math.random() * markets.length)];
  }
  
  // Mumbai region
  if (lat >= 18.8 && lat <= 19.4 && lng >= 72.7 && lng <= 73.1) {
    const markets = [
      { location: "Mumbai", market: "Crawford Market" },
      { location: "Navi Mumbai", market: "APMC Market" },
      { location: "Thane", market: "Thane Sabzi Mandi" },
    ];
    return markets[Math.floor(Math.random() * markets.length)];
  }
  
  // Bangalore region
  if (lat >= 12.8 && lat <= 13.2 && lng >= 77.4 && lng <= 77.8) {
    const markets = [
      { location: "Bangalore", market: "KR Market" },
      { location: "Bangalore", market: "Yeshwanthpur APMC" },
      { location: "Whitefield", market: "Hoodi Market" },
    ];
    return markets[Math.floor(Math.random() * markets.length)];
  }
  
  // Chennai region
  if (lat >= 12.9 && lat <= 13.3 && lng >= 80.1 && lng <= 80.4) {
    const markets = [
      { location: "Chennai", market: "Koyambedu Market" },
      { location: "Chennai", market: "Kothawal Chavadi" },
    ];
    return markets[Math.floor(Math.random() * markets.length)];
  }
  
  // Kolkata region
  if (lat >= 22.4 && lat <= 22.7 && lng >= 88.2 && lng <= 88.5) {
    const markets = [
      { location: "Kolkata", market: "Koley Market" },
      { location: "Kolkata", market: "Sealdah Market" },
    ];
    return markets[Math.floor(Math.random() * markets.length)];
  }
  
  // Hyderabad region
  if (lat >= 17.2 && lat <= 17.6 && lng >= 78.2 && lng <= 78.7) {
    const markets = [
      { location: "Hyderabad", market: "Monda Market" },
      { location: "Hyderabad", market: "Begum Bazaar" },
    ];
    return markets[Math.floor(Math.random() * markets.length)];
  }
  
  // Default fallback - general location
  return { 
    location: "Your Area", 
    market: "Local Market" 
  };
};

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    latitude: null,
    longitude: null,
    accuracy: null,
    loading: false,
    error: null,
    locationName: null,
    marketName: null,
  });

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState(prev => ({
        ...prev,
        error: "Geolocation is not supported by your browser",
        loading: false,
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        const marketInfo = getMarketInfo(latitude, longitude);
        
        setState({
          latitude,
          longitude,
          accuracy,
          loading: false,
          error: null,
          locationName: marketInfo.location,
          marketName: marketInfo.market,
        });
      },
      (error) => {
        let errorMessage = "Unable to retrieve your location";
        
        switch (error.code) {
          case error.PERMISSION_DENIED:
            errorMessage = "Location permission denied";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage = "Location information unavailable";
            break;
          case error.TIMEOUT:
            errorMessage = "Location request timed out";
            break;
        }
        
        setState(prev => ({
          ...prev,
          loading: false,
          error: errorMessage,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000, // Cache for 5 minutes
      }
    );
  }, []);

  // Auto-request location on mount
  useEffect(() => {
    requestLocation();
  }, [requestLocation]);

  return {
    ...state,
    requestLocation,
    hasLocation: state.latitude !== null && state.longitude !== null,
  };
}
