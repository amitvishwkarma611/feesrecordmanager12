// Global data store for students and payments
let studentsList = [];
let paymentsList = [];

// Setters
export const setStudentsList = (students) => {
  studentsList = students;
};

export const setPaymentsList = (payments) => {
  paymentsList = payments;
};

// Getters
export const getStudentsList = () => {
  return studentsList;
};

export const getPaymentsList = () => {
  return paymentsList;
};

// Clear data
export const clearDataStore = () => {
  studentsList = [];
  paymentsList = [];
};