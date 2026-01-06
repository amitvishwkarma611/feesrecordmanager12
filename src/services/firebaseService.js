import { db, storage, auth } from '../firebase/firebaseConfig';
import { collection, addDoc, getDocs, updateDoc, deleteDoc, doc, query, where, orderBy, setDoc, getDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { getCurrentUserUID, isAuthenticated } from '../utils/auth';

// Helper function to get user-specific collection references
const getUserCollection = (collectionName) => {
  // Check if user is authenticated before trying to get UID
  if (!isAuthenticated()) {
    throw new Error('User not authenticated. Please sign in first.');
  }
  const uid = getCurrentUserUID();
  return collection(db, `users/${uid}/${collectionName}`);
};

// User profile collection
const userProfileCollection = () => {
  if (!isAuthenticated()) {
    throw new Error('User not authenticated. Please sign in first.');
  }
  const uid = getCurrentUserUID();
  return collection(db, `userProfiles`);
};

// Updated collection references using UID-based paths
const studentsCollection = () => getUserCollection('students');
const paymentsCollection = () => getUserCollection('payments');
const expendituresCollection = () => getUserCollection('expenditures');
const attendanceCollection = () => getUserCollection('attendance');
const staffCollection = () => getUserCollection('staff');
const feedbackCollection = () => getUserCollection('feedback');
const supportQueriesCollection = () => getUserCollection('supportQueries');
const staffAttendanceCollection = () => getUserCollection('staffAttendance');

// User profile operations
export const createUserProfile = async (userData) => {
  try {
    console.log('=== FIREBASE CREATE USER PROFILE START ===');
    console.log('User Data:', userData);
    
    if (!isAuthenticated()) {
      throw new Error('User not authenticated. Please sign in first.');
    }
    
    const uid = getCurrentUserUID();
    const userDoc = doc(db, `userProfiles`, uid);
    const result = await setDoc(userDoc, userData);
    
    console.log('=== FIREBASE CREATE USER PROFILE END SUCCESS ===');
    return result;
  } catch (error) {
    console.error('Error creating user profile: ', error);
    throw error;
  }
};

export const getUserProfile = async () => {
  try {
    console.log('=== FIREBASE GET USER PROFILE START ===');
    
    if (!isAuthenticated()) {
      throw new Error('User not authenticated. Please sign in first.');
    }
    
    const uid = getCurrentUserUID();
    const userDoc = doc(db, `userProfiles`, uid);
    const docSnap = await getDoc(userDoc);
    
    if (docSnap.exists()) {
      console.log('User profile data:', docSnap.data());
      console.log('=== FIREBASE GET USER PROFILE END SUCCESS ===');
      return { id: docSnap.id, ...docSnap.data() };
    } else {
      console.log('No user profile found');
      console.log('=== FIREBASE GET USER PROFILE END SUCCESS ===');
      return null;
    }
  } catch (error) {
    console.error('Error getting user profile: ', error);
    throw error;
  }
};

// Student operations
export const addStudent = async (studentData) => {
  try {
    console.log('=== FIREBASE ADD STUDENT START ===');
    console.log('Student Data:', studentData);
    
    // Add academic year and archived fields if not present
    const enrichedStudentData = {
      ...studentData,
      academicYear: studentData.academicYear || (await getAcademicYearSettings()).activeAcademicYear,
      archived: studentData.archived !== undefined ? studentData.archived : false
    };
    
    const docRef = await addDoc(studentsCollection(), enrichedStudentData);
    const result = { id: docRef.id, ...enrichedStudentData };
    
    console.log('=== FIREBASE ADD STUDENT END SUCCESS ===');
    return result;
  } catch (error) {
    console.error('Error adding student: ', error);
    throw error;
  }
};

export const getStudents = async () => {
  try {
    // Get active academic year
    const academicYearSettings = await getAcademicYearSettings();
    const activeAcademicYear = academicYearSettings.activeAcademicYear;
    
    // Query for active (non-archived) students in the active academic year
    const q = query(
      studentsCollection(),
      where('archived', '==', false),
      where('academicYear', '==', activeAcademicYear)
    );
    
    const querySnapshot = await getDocs(q);
    const students = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    return students;
  } catch (error) {
    console.error('Error getting students: ', error);
    throw error;
  }
};

export const getFeedback = async () => {
  try {
    const querySnapshot = await getDocs(feedbackCollection());
    const feedback = [];
    querySnapshot.forEach((doc) => {
      feedback.push({ id: doc.id, ...doc.data() });
    });
    return feedback;
  } catch (error) {
    console.error('Error getting feedback: ', error);
    throw error;
  }
};

export const getSupportQueries = async () => {
  try {
    const querySnapshot = await getDocs(supportQueriesCollection());
    const supportQueries = [];
    querySnapshot.forEach((doc) => {
      supportQueries.push({ id: doc.id, ...doc.data() });
    });
    return supportQueries;
  } catch (error) {
    console.error('Error getting support queries: ', error);
    throw error;
  }
};

export const updateStudent = async (id, studentData) => {
  try {
    console.log('=== FIREBASE UPDATE STUDENT START ===');
    console.log('Student ID (before conversion):', id, 'Type:', typeof id);
    console.log('Student Data:', studentData);
    
    // Ensure the ID is a string
    const stringId = String(id);
    console.log('Student ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const studentDoc = doc(db, `users/${getCurrentUserUID()}/students`, stringId);
    console.log('Student document reference created:', studentDoc);
    
    const result = await updateDoc(studentDoc, studentData);
    console.log('Firebase updateDoc result:', result);
    
    console.log('=== FIREBASE UPDATE STUDENT END SUCCESS ===');
    return { id: stringId, ...studentData };
  } catch (error) {
    console.error('Error updating student in Firebase: ', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    throw error;
  }
};

export const deleteStudent = async (id) => {
  try {
    console.log('=== FIREBASE DELETE STUDENT START ===');
    console.log('Student ID (before conversion):', id, 'Type:', typeof id);
    
    // Ensure the ID is a string
    const stringId = String(id);
    console.log('Student ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const studentDoc = doc(db, `users/${getCurrentUserUID()}/students`, stringId);
    await deleteDoc(studentDoc);
    
    console.log('=== FIREBASE DELETE STUDENT END SUCCESS ===');
    return stringId;
  } catch (error) {
    console.error('Error deleting student: ', error);
    throw error;
  }
};

// Payment operations
export const addPayment = async (paymentData) => {
  try {
    console.log('=== FIREBASE ADD PAYMENT START ===');
    console.log('Payment Data:', paymentData);
    
    // Add academic year and archived fields if not present
    const enrichedPaymentData = {
      ...paymentData,
      academicYear: paymentData.academicYear || (await getAcademicYearSettings()).activeAcademicYear,
      archived: paymentData.archived !== undefined ? paymentData.archived : false
    };
    
    const docRef = await addDoc(paymentsCollection(), enrichedPaymentData);
    const result = { id: docRef.id, ...enrichedPaymentData };
    
    console.log('=== FIREBASE ADD PAYMENT END SUCCESS ===');
    return result;
  } catch (error) {
    console.error('Error adding payment: ', error);
    throw error;
  }
};

export const getPayments = async () => {
  try {
    console.log('=== FIREBASE GET PAYMENTS START ===');
    
    // Get active academic year
    const academicYearSettings = await getAcademicYearSettings();
    const activeAcademicYear = academicYearSettings.activeAcademicYear;
    
    // Query for active (non-archived) payments in the active academic year
    const q = query(
      paymentsCollection(),
      where('archived', '==', false),
      where('academicYear', '==', activeAcademicYear)
    );
    
    const querySnapshot = await getDocs(q);
    const payments = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('=== FIREBASE GET PAYMENTS END SUCCESS ===');
    return payments;
  } catch (error) {
    console.error('Error getting payments: ', error);
    throw error;
  }
};

export const updatePayment = async (id, paymentData) => {
  try {
    console.log('=== FIREBASE UPDATE PAYMENT START ===');
    console.log('Payment ID (before conversion):', id, 'Type:', typeof id);
    console.log('Payment Data:', paymentData);
    
    // Ensure the ID is a string
    const stringId = String(id);
    console.log('Payment ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const paymentDoc = doc(db, `users/${getCurrentUserUID()}/payments`, stringId);
    await updateDoc(paymentDoc, paymentData);
    
    console.log('=== FIREBASE UPDATE PAYMENT END SUCCESS ===');
    return { id: stringId, ...paymentData };
  } catch (error) {
    console.error('Error updating payment: ', error);
    throw error;
  }
};

export const deletePayment = async (id) => {
  try {
    console.log('=== FIREBASE DELETE PAYMENT START ===');
    console.log('Payment ID (before conversion):', id, 'Type:', typeof id);
    
    // Ensure the ID is a string
    const stringId = String(id);
    console.log('Payment ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const paymentDoc = doc(db, `users/${getCurrentUserUID()}/payments`, stringId);
    await deleteDoc(paymentDoc);
    
    console.log('=== FIREBASE DELETE PAYMENT END SUCCESS ===');
    return stringId;
  } catch (error) {
    console.error('Error deleting payment: ', error);
    throw error;
  }
};

// Get payments for a specific student
export const getPaymentsByStudentId = async (studentId) => {
  try {
    const q = query(paymentsCollection(), where('studentId', '==', studentId));
    const querySnapshot = await getDocs(q);
    const payments = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    return payments;
  } catch (error) {
    console.error('Error getting payments by student ID: ', error);
    throw error;
  }
};

// Get payments sorted by due date
export const getPaymentsSortedByDueDate = async () => {
  try {
    const q = query(paymentsCollection(), orderBy('dueDate'));
    const querySnapshot = await getDocs(q);
    const payments = [];
    querySnapshot.forEach((doc) => {
      payments.push({ id: doc.id, ...doc.data() });
    });
    return payments;
  } catch (error) {
    console.error('Error getting payments sorted by due date: ', error);
    throw error;
  }
};

// Expenditure operations
export const addExpenditure = async (expenditureData) => {
  try {
    console.log('=== FIREBASE ADD EXPENDITURE START ===');
    console.log('Expenditure Data:', expenditureData);
    
    // Add academic year and archived fields if not present
    const enrichedExpenditureData = {
      ...expenditureData,
      academicYear: expenditureData.academicYear || (await getAcademicYearSettings()).activeAcademicYear,
      archived: expenditureData.archived !== undefined ? expenditureData.archived : false
    };
    
    const docRef = await addDoc(expendituresCollection(), enrichedExpenditureData);
    const result = { id: docRef.id, ...enrichedExpenditureData };
    
    console.log('=== FIREBASE ADD EXPENDITURE END SUCCESS ===');
    return result;
  } catch (error) {
    console.error('Error adding expenditure: ', error);
    throw error;
  }
};

export const getExpenditures = async () => {
  try {
    console.log('=== FIREBASE GET EXPENDITURES START ===');
    
    // Get active academic year
    const academicYearSettings = await getAcademicYearSettings();
    const activeAcademicYear = academicYearSettings.activeAcademicYear;
    
    // Query for active (non-archived) expenditures in the active academic year
    const q = query(
      expendituresCollection(),
      where('archived', '==', false),
      where('academicYear', '==', activeAcademicYear)
    );
    
    const querySnapshot = await getDocs(q);
    const expenditures = [];
    querySnapshot.forEach((doc) => {
      expenditures.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('=== FIREBASE GET EXPENDITURES END SUCCESS ===');
    return expenditures;
  } catch (error) {
    console.error('Error getting expenditures: ', error);
    throw error;
  }
};

export const updateExpenditure = async (id, expenditureData) => {
  try {
    console.log('=== FIREBASE UPDATE EXPENDITURE START ===');
    console.log('Expenditure ID (before conversion):', id, 'Type:', typeof id);
    console.log('Expenditure Data:', expenditureData);
    
    // Ensure the ID is a string
    const stringId = String(id);
    console.log('Expenditure ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const expenditureDoc = doc(db, `users/${getCurrentUserUID()}/expenditures`, stringId);
    await updateDoc(expenditureDoc, expenditureData);
    
    console.log('=== FIREBASE UPDATE EXPENDITURE END SUCCESS ===');
    return { id: stringId, ...expenditureData };
  } catch (error) {
    console.error('Error updating expenditure: ', error);
    throw error;
  }
};

export const deleteExpenditure = async (id) => {
  try {
    console.log('=== FIREBASE DELETE EXPENDITURE START ===');
    console.log('Expenditure ID (before conversion):', id, 'Type:', typeof id);
    
    // Ensure the ID is a string
    const stringId = String(id);
    console.log('Expenditure ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const expenditureDoc = doc(db, `users/${getCurrentUserUID()}/expenditures`, stringId);
    await deleteDoc(expenditureDoc);
    
    console.log('=== FIREBASE DELETE EXPENDITURE END SUCCESS ===');
    return stringId;
  } catch (error) {
    console.error('Error deleting expenditure: ', error);
    throw error;
  }
};

// Attendance operations
export const addAttendance = async (attendanceData) => {
  try {
    console.log('=== FIREBASE ADD ATTENDANCE START ===');
    console.log('Attendance Data:', attendanceData);
    
    // Add academic year and archived fields if not present
    const enrichedAttendanceData = {
      ...attendanceData,
      academicYear: attendanceData.academicYear || (await getAcademicYearSettings()).activeAcademicYear,
      archived: attendanceData.archived !== undefined ? attendanceData.archived : false
    };
    
    const docRef = await addDoc(attendanceCollection(), enrichedAttendanceData);
    const result = { id: docRef.id, ...enrichedAttendanceData };
    
    console.log('=== FIREBASE ADD ATTENDANCE END SUCCESS ===');
    return result;
  } catch (error) {
    console.error('Error adding attendance: ', error);
    throw error;
  }
};

export const getAttendance = async () => {
  try {
    console.log('=== FIREBASE GET ATTENDANCE START ===');
    
    // Get active academic year
    const academicYearSettings = await getAcademicYearSettings();
    const activeAcademicYear = academicYearSettings.activeAcademicYear;
    
    // Query for active (non-archived) attendance in the active academic year
    const q = query(
      attendanceCollection(),
      where('archived', '==', false),
      where('academicYear', '==', activeAcademicYear)
    );
    
    const querySnapshot = await getDocs(q);
    const attendance = [];
    querySnapshot.forEach((doc) => {
      attendance.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('=== FIREBASE GET ATTENDANCE END SUCCESS ===');
    return attendance;
  } catch (error) {
    console.error('Error getting attendance: ', error);
    throw error;
  }
};

export const updateAttendance = async (id, attendanceData) => {
  try {
    console.log('=== FIREBASE UPDATE ATTENDANCE START ===');
    console.log('Attendance ID (before conversion):', id, 'Type:', typeof id);
    console.log('Attendance Data:', attendanceData);
    
    // Ensure the ID is a string
    const stringId = String(id);
    console.log('Attendance ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const attendanceDoc = doc(db, `users/${getCurrentUserUID()}/attendance`, stringId);
    await updateDoc(attendanceDoc, attendanceData);
    
    console.log('=== FIREBASE UPDATE ATTENDANCE END SUCCESS ===');
    return { id: stringId, ...attendanceData };
  } catch (error) {
    console.error('Error updating attendance: ', error);
    throw error;
  }
};

export const deleteAttendance = async (id) => {
  try {
    console.log('=== FIREBASE DELETE ATTENDANCE START ===');
    console.log('Attendance ID (before conversion):', id, 'Type:', typeof id);
    
    // Ensure the ID is a string
    const stringId = String(id);
    console.log('Attendance ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const attendanceDoc = doc(db, `users/${getCurrentUserUID()}/attendance`, stringId);
    await deleteDoc(attendanceDoc);
    
    console.log('=== FIREBASE DELETE ATTENDANCE END SUCCESS ===');
    return stringId;
  } catch (error) {
    console.error('Error deleting attendance: ', error);
    throw error;
  }
};

// Function to upload student photo to Firebase Storage
export const uploadStudentPhoto = async (studentId, file) => {
  try {
    console.log('=== FIREBASE UPLOAD STUDENT PHOTO START ===');
    console.log('Student ID:', studentId);
    console.log('File:', file);
    
    // Create a reference to the file location in Firebase Storage
    const storageRef = ref(storage, `users/${getCurrentUserUID()}/student-photos/${studentId}/${file.name}`);
    
    // Upload the file
    const snapshot = await uploadBytes(storageRef, file);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    
    console.log('=== FIREBASE UPLOAD STUDENT PHOTO END SUCCESS ===');
    return downloadURL;
  } catch (error) {
    console.error('Error uploading student photo: ', error);
    throw error;
  }
};

// Function to get student photo URL from Firebase Storage
export const getStudentPhoto = async (studentId, fileName) => {
  try {
    console.log('=== FIREBASE GET STUDENT PHOTO START ===');
    console.log('Student ID:', studentId);
    console.log('File Name:', fileName);
    
    // Create a reference to the file location in Firebase Storage
    const storageRef = ref(storage, `users/${getCurrentUserUID()}/student-photos/${studentId}/${fileName}`);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(storageRef);
    
    console.log('=== FIREBASE GET STUDENT PHOTO END SUCCESS ===');
    return downloadURL;
  } catch (error) {
    console.error('Error getting student photo: ', error);
    throw error;
  }
};

// Test function to check Firebase Storage connectivity
export const testStorageConnection = async () => {
  try {
    console.log('Testing Firebase Storage connection...');
    
    // Try to list root references (this will test connectivity)
    const storageRef = ref(storage, `users/${getCurrentUserUID()}`);
    const listResult = await listAll(storageRef);
    
    console.log('Storage connection test successful:', {
      prefixes: listResult.prefixes.length,
      items: listResult.items.length
    });
    
    return true;
  } catch (error) {
    console.error('Storage connection test failed:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    return false;
  }
};

// Staff operations
export const addStaff = async (staffData) => {
  try {
    console.log('=== FIREBASE ADD STAFF START ===');
    console.log('Staff Data:', staffData);
    
    const docRef = await addDoc(staffCollection(), staffData);
    const result = { id: docRef.id, ...staffData };
    
    console.log('=== FIREBASE ADD STAFF END SUCCESS ===');
    return result;
  } catch (error) {
    console.error('Error adding staff: ', error);
    throw error;
  }
};

export const getStaff = async () => {
  try {
    console.log('=== FIREBASE GET STAFF START ===');
    
    const querySnapshot = await getDocs(staffCollection());
    const staff = [];
    querySnapshot.forEach((doc) => {
      staff.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('=== FIREBASE GET STAFF END SUCCESS ===');
    return staff;
  } catch (error) {
    console.error('Error getting staff: ', error);
    throw error;
  }
};

export const updateStaff = async (firebaseDocId, staffData) => {
  try {
    console.log('=== FIREBASE UPDATE STAFF START ===');
    console.log('Firebase Document ID (before conversion):', firebaseDocId, 'Type:', typeof firebaseDocId);
    console.log('Staff Data:', staffData);
    
    // Ensure the ID is a string
    const stringId = String(firebaseDocId);
    console.log('Firebase Document ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const staffDoc = doc(db, `users/${getCurrentUserUID()}/staff`, stringId);
    await updateDoc(staffDoc, staffData);
    
    console.log('=== FIREBASE UPDATE STAFF END SUCCESS ===');
    return { id: stringId, ...staffData };
  } catch (error) {
    console.error('Error updating staff: ', error);
    throw error;
  }
};

export const deleteStaff = async (firebaseDocId) => {
  try {
    console.log('=== FIREBASE DELETE STAFF START ===');
    console.log('Firebase Document ID (before conversion):', firebaseDocId, 'Type:', typeof firebaseDocId);
    
    // Ensure the ID is a string
    const stringId = String(firebaseDocId);
    console.log('Firebase Document ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const staffDoc = doc(db, `users/${getCurrentUserUID()}/staff`, stringId);
    await deleteDoc(staffDoc);
    
    console.log('=== FIREBASE DELETE STAFF END SUCCESS ===');
    return stringId;
  } catch (error) {
    console.error('Error deleting staff: ', error);
    throw error;
  }
};

// Staff Attendance operations
export const addStaffAttendance = async (attendanceData) => {
  try {
    console.log('=== FIREBASE ADD STAFF ATTENDANCE START ===');
    console.log('Attendance Data:', attendanceData);
    
    // Add academic year and archived fields if not present
    const enrichedAttendanceData = {
      ...attendanceData,
      academicYear: attendanceData.academicYear || (await getAcademicYearSettings()).activeAcademicYear,
      archived: attendanceData.archived !== undefined ? attendanceData.archived : false
    };
    
    // Remove any undefined fields from attendanceData
    const cleanedAttendanceData = {};
    for (const key in enrichedAttendanceData) {
      if (enrichedAttendanceData[key] !== undefined) {
        cleanedAttendanceData[key] = enrichedAttendanceData[key];
      } else {
        console.warn('Skipping undefined field in attendanceData:', key);
      }
    }
    console.log('Cleaned Attendance Data:', cleanedAttendanceData);
    
    const docRef = await addDoc(staffAttendanceCollection(), cleanedAttendanceData);
    const result = { id: docRef.id, ...cleanedAttendanceData };
    
    console.log('=== FIREBASE ADD STAFF ATTENDANCE END SUCCESS ===');
    return result;
  } catch (error) {
    console.error('Error adding staff attendance: ', error);
    throw error;
  }
};

export const getStaffAttendance = async () => {
  try {
    console.log('=== FIREBASE GET STAFF ATTENDANCE START ===');
    
    // Get active academic year
    const academicYearSettings = await getAcademicYearSettings();
    const activeAcademicYear = academicYearSettings.activeAcademicYear;
    
    // Query for active (non-archived) staff attendance in the active academic year
    const q = query(
      staffAttendanceCollection(),
      where('archived', '==', false),
      where('academicYear', '==', activeAcademicYear)
    );
    
    const querySnapshot = await getDocs(q);
    const attendance = [];
    querySnapshot.forEach((doc) => {
      attendance.push({ id: doc.id, ...doc.data() });
    });
    
    console.log('=== FIREBASE GET STAFF ATTENDANCE END SUCCESS ===');
    return attendance;
  } catch (error) {
    console.error('Error getting staff attendance: ', error);
    throw error;
  }
};

export const updateStaffAttendance = async (firebaseDocId, attendanceData) => {
  try {
    console.log('=== FIREBASE UPDATE STAFF ATTENDANCE START ===');
    console.log('Firebase Document ID (before conversion):', firebaseDocId, 'Type:', typeof firebaseDocId);
    console.log('Attendance Data:', attendanceData);
    
    // Validate that firebaseDocId is provided and not undefined/null
    if (!firebaseDocId) {
      throw new Error('Firebase document ID is required for update operation');
    }
    
    // Ensure the ID is a string
    const stringId = String(firebaseDocId);
    console.log('Firebase Document ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    // Remove any undefined fields from attendanceData
    const cleanedAttendanceData = {};
    for (const key in attendanceData) {
      if (attendanceData[key] !== undefined) {
        cleanedAttendanceData[key] = attendanceData[key];
      } else {
        console.warn('Skipping undefined field in attendanceData:', key);
      }
    }
    console.log('Cleaned Attendance Data:', cleanedAttendanceData);
    
    const attendanceDoc = doc(db, `users/${getCurrentUserUID()}/staffAttendance`, stringId);
    await updateDoc(attendanceDoc, cleanedAttendanceData);
    
    console.log('=== FIREBASE UPDATE STAFF ATTENDANCE END SUCCESS ===');
    return { id: stringId, ...cleanedAttendanceData };
  } catch (error) {
    console.error('Error updating staff attendance: ', error);
    throw error;
  }
};

export const deleteStaffAttendance = async (firebaseDocId) => {
  try {
    console.log('=== FIREBASE DELETE STAFF ATTENDANCE START ===');
    console.log('Firebase Document ID (before conversion):', firebaseDocId, 'Type:', typeof firebaseDocId);
    
    // Validate that firebaseDocId is provided and not undefined/null
    if (!firebaseDocId) {
      throw new Error('Firebase document ID is required for delete operation');
    }
    
    // Ensure the ID is a string
    const stringId = String(firebaseDocId);
    console.log('Firebase Document ID (after conversion):', stringId, 'Type:', typeof stringId);
    
    const attendanceDoc = doc(db, `users/${getCurrentUserUID()}/staffAttendance`, stringId);
    await deleteDoc(attendanceDoc);
    
    console.log('=== FIREBASE DELETE STAFF ATTENDANCE END SUCCESS ===');
    return stringId;
  } catch (error) {
    console.error('Error deleting staff attendance: ', error);
    throw error;
  }
};

// Get branding settings for receipts
export const getBrandingSettings = async () => {
  try {
    console.log('=== FIREBASE GET BRANDING SETTINGS START ===');
    
    if (!isAuthenticated()) {
      throw new Error('User not authenticated. Please sign in first.');
    }
    
    const uid = getCurrentUserUID();
    const settingsDoc = doc(db, `users/${uid}/settings/profile`);
    const docSnap = await getDoc(settingsDoc);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Branding settings data:', data);
      console.log('=== FIREBASE GET BRANDING SETTINGS END SUCCESS ===');
      return data;
    } else {
      console.log('No branding settings found');
      console.log('=== FIREBASE GET BRANDING SETTINGS END SUCCESS ===');
      return {};
    }
  } catch (error) {
    console.error('Error getting branding settings: ', error);
    throw error;
  }
};

// Get academic year settings
export const getAcademicYearSettings = async () => {
  try {
    console.log('=== FIREBASE GET ACADEMIC YEAR SETTINGS START ===');
    
    if (!isAuthenticated()) {
      throw new Error('User not authenticated. Please sign in first.');
    }
    
    const uid = getCurrentUserUID();
    const settingsDoc = doc(db, `users/${uid}/settings/profile`);
    const docSnap = await getDoc(settingsDoc);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Academic year settings data:', data);
      console.log('=== FIREBASE GET ACADEMIC YEAR SETTINGS END SUCCESS ===');
      return {
        activeAcademicYear: data.activeAcademicYear || getCurrentAcademicYear(),
        archivedYears: data.archivedYears || []
      };
    } else {
      console.log('No academic year settings found, using current year');
      const currentYear = getCurrentAcademicYear();
      console.log('=== FIREBASE GET ACADEMIC YEAR SETTINGS END SUCCESS ===');
      return {
        activeAcademicYear: currentYear,
        archivedYears: []
      };
    }
  } catch (error) {
    console.error('Error getting academic year settings: ', error);
    throw error;
  }
};

// Update academic year settings
export const updateAcademicYearSettings = async (academicYearSettings) => {
  try {
    console.log('=== FIREBASE UPDATE ACADEMIC YEAR SETTINGS START ===');
    
    if (!isAuthenticated()) {
      throw new Error('User not authenticated. Please sign in first.');
    }
    
    const uid = getCurrentUserUID();
    const settingsDoc = doc(db, `users/${uid}/settings/profile`);
    
    await setDoc(settingsDoc, academicYearSettings, { merge: true });
    
    console.log('Academic year settings updated successfully');
    console.log('=== FIREBASE UPDATE ACADEMIC YEAR SETTINGS END SUCCESS ===');
    return true;
  } catch (error) {
    console.error('Error updating academic year settings: ', error);
    throw error;
  }
};

// Helper function to get current academic year (e.g., "2024-25")
export const getCurrentAcademicYear = () => {
  const now = new Date();
  const currentYear = now.getFullYear();
  const nextYear = currentYear + 1;
  
  // Academic year typically starts in April (month 3) or June (month 5) in most institutions
  // If current month is April or later, use current year to next year
  // If current month is before April, use previous year to current year
  if (now.getMonth() >= 3) { // April = 3 (0-indexed)
    return `${currentYear}-${(nextYear).toString().slice(-2)}`;
  } else {
    const prevYear = currentYear - 1;
    return `${prevYear}-${currentYear.toString().slice(-2)}`;
  }
};

// Archive an academic year
export const archiveAcademicYear = async (yearToArchive) => {
  try {
    console.log('=== FIREBASE ARCHIVE ACADEMIC YEAR START ===');
    
    if (!isAuthenticated()) {
      throw new Error('User not authenticated. Please sign in first.');
    }
    
    const uid = getCurrentUserUID();
    
    // Archive students
    const studentsQuery = query(
      collection(db, `users/${uid}/students`),
      where('academicYear', '==', yearToArchive)
    );
    const studentSnapshot = await getDocs(studentsQuery);
    
    for (const doc of studentSnapshot.docs) {
      await updateDoc(doc.ref, { archived: true });
    }
    
    // Archive payments
    const paymentsQuery = query(
      collection(db, `users/${uid}/payments`),
      where('academicYear', '==', yearToArchive)
    );
    const paymentSnapshot = await getDocs(paymentsQuery);
    
    for (const doc of paymentSnapshot.docs) {
      await updateDoc(doc.ref, { archived: true });
    }
    
    // Archive expenditures
    const expendituresQuery = query(
      collection(db, `users/${uid}/expenditures`),
      where('academicYear', '==', yearToArchive)
    );
    const expenditureSnapshot = await getDocs(expendituresQuery);
    
    for (const doc of expenditureSnapshot.docs) {
      await updateDoc(doc.ref, { archived: true });
    }
    
    // Archive attendance
    const attendanceQuery = query(
      collection(db, `users/${uid}/attendance`),
      where('academicYear', '==', yearToArchive)
    );
    const attendanceSnapshot = await getDocs(attendanceQuery);
    
    for (const doc of attendanceSnapshot.docs) {
      await updateDoc(doc.ref, { archived: true });
    }
    
    // Archive staff attendance
    const staffAttendanceQuery = query(
      collection(db, `users/${uid}/staffAttendance`),
      where('academicYear', '==', yearToArchive)
    );
    const staffAttendanceSnapshot = await getDocs(staffAttendanceQuery);
    
    for (const doc of staffAttendanceSnapshot.docs) {
      await updateDoc(doc.ref, { archived: true });
    }
    
    // Update settings to mark year as archived
    const settingsDoc = doc(db, `users/${uid}/settings/profile`);
    const settingsSnapshot = await getDoc(settingsDoc);
    let archivedYears = [];
    if (settingsSnapshot.exists()) {
      archivedYears = settingsSnapshot.data().archivedYears || [];
    }
    if (!archivedYears.includes(yearToArchive)) {
      archivedYears.push(yearToArchive);
    }
    
    await setDoc(settingsDoc, { archivedYears }, { merge: true });
    
    console.log(`Academic year ${yearToArchive} archived successfully`);
    console.log('=== FIREBASE ARCHIVE ACADEMIC YEAR END SUCCESS ===');
    return true;
  } catch (error) {
    console.error('Error archiving academic year: ', error);
    throw error;
  }
};
