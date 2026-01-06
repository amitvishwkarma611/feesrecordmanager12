import React, { createContext, useContext, useState, useEffect } from 'react';
import { getAcademicYearSettings, updateAcademicYearSettings, getCurrentAcademicYear } from '../services/firebaseService';

const AcademicYearContext = createContext();

export const useAcademicYear = () => {
  const context = useContext(AcademicYearContext);
  if (!context) {
    throw new Error('useAcademicYear must be used within an AcademicYearProvider');
  }
  return context;
};

export const AcademicYearProvider = ({ children }) => {
  const [activeAcademicYear, setActiveAcademicYear] = useState(getCurrentAcademicYear());
  const [archivedYears, setArchivedYears] = useState([]);
  const [loading, setLoading] = useState(true);

  // Load academic year settings on component mount
  useEffect(() => {
    const loadAcademicYearSettings = async () => {
      try {
        const settings = await getAcademicYearSettings();
        setActiveAcademicYear(settings.activeAcademicYear);
        setArchivedYears(settings.archivedYears || []);
      } catch (error) {
        console.error('Error loading academic year settings:', error);
        // Use current year as fallback
        setActiveAcademicYear(getCurrentAcademicYear());
      } finally {
        setLoading(false);
      }
    };

    loadAcademicYearSettings();
  }, []);

  const changeAcademicYear = async (newYear) => {
    try {
      const newSettings = {
        activeAcademicYear: newYear
      };
      await updateAcademicYearSettings(newSettings);
      setActiveAcademicYear(newYear);
      return true;
    } catch (error) {
      console.error('Error changing academic year:', error);
      return false;
    }
  };

  const value = {
    activeAcademicYear,
    archivedYears,
    loading,
    changeAcademicYear,
    getCurrentAcademicYear: getCurrentAcademicYear
  };

  return (
    <AcademicYearContext.Provider value={value}>
      {children}
    </AcademicYearContext.Provider>
  );
};