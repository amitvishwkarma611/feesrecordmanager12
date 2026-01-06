import React, { useState } from 'react';
import { useAcademicYear } from '../../contexts/AcademicYearContext';

const AcademicYearSelector = () => {
  const { activeAcademicYear, archivedYears, changeAcademicYear, loading, getCurrentAcademicYear } = useAcademicYear();
  const [isOpen, setIsOpen] = useState(false);
  
  if (loading) {
    return <div className="academic-year-selector loading">Loading...</div>;
  }

  const allYears = [activeAcademicYear, ...archivedYears].filter((year, index, self) => self.indexOf(year) === index);
  const currentYear = getCurrentAcademicYear();
  
  // Only show other years if they exist
  const availableYears = allYears.filter(year => year !== activeAcademicYear);
  if (currentYear !== activeAcademicYear && !availableYears.includes(currentYear)) {
    availableYears.unshift(currentYear);
  }

  const handleChange = async (year) => {
    if (year !== activeAcademicYear) {
      await changeAcademicYear(year);
      // Trigger a refresh event to update data across the app
      window.dispatchEvent(new Event('academicYearChanged'));
    }
    setIsOpen(false);
  };

  return (
    <div className="academic-year-selector">
      <div className="academic-year-dropdown">
        <button 
          className="academic-year-button" 
          onClick={() => setIsOpen(!isOpen)}
          disabled={loading}
        >
          {activeAcademicYear} <span className="dropdown-arrow">▼</span>
        </button>
        
        {isOpen && (
          <div className="academic-year-menu">
            {availableYears.length > 0 ? (
              availableYears.map((year) => (
                <div 
                  key={year} 
                  className="academic-year-option"
                  onClick={() => handleChange(year)}
                >
                  {year}
                </div>
              ))
            ) : (
              <div className="academic-year-option disabled">
                No other years available
              </div>
            )}
            
            {activeAcademicYear !== currentYear && (
              <div 
                className="academic-year-option current-year-option"
                onClick={() => handleChange(currentYear)}
              >
                Switch to {currentYear} (Current)
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default AcademicYearSelector;