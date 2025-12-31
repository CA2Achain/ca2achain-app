// Common utility functions used across services
// Contains only essential helper functions for current MVP needs

/**
 * Calculate exact age from birth date
 * Used for age verification and compliance checks
 */
export const calculateAge = (birthDate: Date): number => {
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
};

/**
 * Generate current ISO timestamp
 * Provides consistent timestamp format across services
 */
export const getCurrentTimestamp = (): string => {
  return new Date().toISOString();
};