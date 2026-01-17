import { 
  collection, 
  getDocs, 
  doc, 
  setDoc, 
  serverTimestamp,
  query,
  where
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';

/**
 * Service to handle marks entry operations
 */

/**
 * Fetch all students for a given user
 * @param {string} userId - The user ID
 * @returns {Promise<Array>} Array of student objects
 */
export const getStudentsForMarksEntry = async (userId) => {
  try {
    const q = query(collection(db, `users/${userId}/students`));
    const querySnapshot = await getDocs(q);
    const students = [];
    querySnapshot.forEach((doc) => {
      students.push({ id: doc.id, ...doc.data() });
    });
    return students;
  } catch (error) {
    console.error('Error fetching students for marks entry:', error);
    throw error;
  }
};

/**
 * Save exam marks for a student
 * @param {string} userId - The user ID
 * @param {string} studentId - The student ID
 * @param {Object} examData - The exam data to save
 * @returns {Promise<string>} The exam ID
 */
export const saveStudentExam = async (userId, studentId, examData) => {
  try {
    const examId = `${examData.examName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
    const examRef = doc(db, `users/${userId}/students/${studentId}/exams`, examId);
    
    const marksData = {
      ...examData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };

    await setDoc(examRef, marksData);

    return examId;
  } catch (error) {
    console.error('Error saving student exam:', error);
    throw error;
  }
};

/**
 * Calculate totals and result for exam data
 * @param {Array} subjects - Array of subject objects with max and obtained marks
 * @returns {Object} Calculated totals, percentage, and result
 */
export const calculateExamResults = (subjects) => {
  const totalObtained = subjects.reduce((sum, subject) => 
    sum + parseInt(subject.obtained || subject.obtainedMarks || 0), 0);
  const totalMax = subjects.reduce((sum, subject) => 
    sum + parseInt(subject.max || subject.maxMarks || 0), 0);
  const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100) : 0;
  const result = percentage >= 35 ? 'Pass' : 'Fail'; // Assuming 35% is passing threshold
  
  return { 
    totalObtained, 
    totalMax, 
    percentage: parseFloat(percentage.toFixed(2)), 
    result 
  };
};

/**
 * Validate exam data
 * @param {Object} formData - Form data to validate
 * @returns {Object} Validation result with isValid boolean and errors array
 */
export const validateExamData = (formData) => {
  const errors = [];
  
  if (!formData.studentId || !formData.studentId.trim()) {
    errors.push('Student selection is required');
  }
  
  if (!formData.examName || !formData.examName.trim()) {
    errors.push('Exam name is required');
  }
  
  if (!formData.subjects || formData.subjects.length === 0) {
    errors.push('At least one subject is required');
  }
  
  if (formData.subjects && formData.subjects.length > 0) {
    formData.subjects.forEach((subject, index) => {
      if (!subject.name || !subject.name.trim()) {
        errors.push(`Subject ${index + 1}: Name is required`);
      }
      
      if (!subject.maxMarks || isNaN(subject.maxMarks) || parseInt(subject.maxMarks) <= 0) {
        errors.push(`Subject ${index + 1}: Valid max marks is required`);
      }
      
      if (!subject.obtainedMarks || isNaN(subject.obtainedMarks) || parseInt(subject.obtainedMarks) < 0) {
        errors.push(`Subject ${index + 1}: Valid obtained marks is required`);
      }
      
      if (parseInt(subject.obtainedMarks) > parseInt(subject.maxMarks)) {
        errors.push(`Subject ${index + 1}: Obtained marks cannot exceed max marks`);
      }
    });
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
};