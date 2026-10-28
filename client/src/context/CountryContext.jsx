// Context for User Home Country, Preferred Currency & Multi-Currency Views
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getCurrencyForCountry, classifyDestination, POPULAR_COUNTRIES } from '../utils/currency';
import { apiFetch } from '../utils/api';

const CountryContext = createContext(null);

const DEFAULT_HOME_COUNTRY = 'India';

export const CountryProvider = ({ user, onUpdateUser, children }) => {
  // Initialize home country from user profile, then localStorage, then default
  const [homeCountry, setHomeCountryState] = useState(() => {
    if (user?.homeCountry) return user.homeCountry;
    const stored = localStorage.getItem('tripmate_home_country');
    return stored || DEFAULT_HOME_COUNTRY;
  });

  // Calculate preferred currency derived from home country or user preference
  const [preferredCurrency, setPreferredCurrency] = useState(() => {
    if (user?.preferredCurrency) return user.preferredCurrency;
    return getCurrencyForCountry(homeCountry);
  });

  // Display currency used across dashboard, budget and expense tables
  const [displayCurrency, setDisplayCurrencyState] = useState(() => {
    const storedDisp = localStorage.getItem('tripmate_display_currency');
    if (storedDisp) return storedDisp;
    return user?.preferredCurrency || getCurrencyForCountry(homeCountry);
  });

  // Sync state if user changes (e.g. login / logout)
  useEffect(() => {
    if (user?.homeCountry) {
      setHomeCountryState(user.homeCountry);
      const derived = user.preferredCurrency || getCurrencyForCountry(user.homeCountry);
      setPreferredCurrency(derived);
      setDisplayCurrencyState(derived);
      localStorage.setItem('tripmate_home_country', user.homeCountry);
      localStorage.setItem('tripmate_display_currency', derived);
    }
  }, [user]);

  // Update home country selection
  const setHomeCountry = async (countryName) => {
    if (!countryName) return;
    const cleanCountry = countryName.trim();
    setHomeCountryState(cleanCountry);
    localStorage.setItem('tripmate_home_country', cleanCountry);

    const newCurrency = getCurrencyForCountry(cleanCountry);
    setPreferredCurrency(newCurrency);
    setDisplayCurrencyState(newCurrency);
    localStorage.setItem('tripmate_display_currency', newCurrency);

    // If authenticated, persist to user profile in MongoDB
    if (user) {
      try {
        const res = await apiFetch('/api/auth/preferences', {
          method: 'PUT',
          body: JSON.stringify({
            homeCountry: cleanCountry,
            preferredCurrency: newCurrency
          })
        });
        if (res?.success && res.user && onUpdateUser) {
          onUpdateUser(res.user);
        }
      } catch (err) {
        console.error('Failed to persist country preference to server:', err.message);
      }
    }
  };

  // Change display currency for viewing without altering stored home country
  const setDisplayCurrency = (currencyCode) => {
    if (!currencyCode) return;
    const code = currencyCode.trim().toUpperCase();
    setDisplayCurrencyState(code);
    localStorage.setItem('tripmate_display_currency', code);
  };

  // Helper to check if a destination country is domestic
  const isDomestic = (destCountry) => {
    return classifyDestination(destCountry, homeCountry) === 'domestic';
  };

  const classify = (destCountry) => {
    return classifyDestination(destCountry, homeCountry);
  };

  return (
    <CountryContext.Provider
      value={{
        homeCountry,
        preferredCurrency,
        displayCurrency,
        countriesList: POPULAR_COUNTRIES,
        setHomeCountry,
        setDisplayCurrency,
        isDomestic,
        classify
      }}
    >
      {children}
    </CountryContext.Provider>
  );
};

export const useCountry = () => {
  const context = useContext(CountryContext);
  if (!context) {
    throw new Error('useCountry must be used within a CountryProvider');
  }
  return context;
};

export default CountryContext;
