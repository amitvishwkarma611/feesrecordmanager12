import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  doc, 
  serverTimestamp,
  query
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { useNavigate } from 'react-router-dom';
import RootLayout from '../components/common/RootLayout';
import { getStudentsForMarksEntry, saveStudentExam, calculateExamResults, validateExamData } from '../services/marksService';
import './MarksEntry.css';

const MarksEntry = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  const navigate = useNavigate();
  
  const [students, setStudents] = useState([]);
  const [formData, setFormData] = useState({
    studentId: '',
    examName: '',
    subjects: [{ id: Date.now(), name: '', maxMarks: 100, obtainedMarks: 0 }]
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  // Fetch students for current user
  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentUser) return;
      
      try {
        const studentsList = await getStudentsForMarksEntry(currentUser.uid);
        setStudents(studentsList);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load students');
      }
    };

    fetchStudents();
  }, [currentUser]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubjectChange = (index, field, value) => {
    const updatedSubjects = [...formData.subjects];
    updatedSubjects[index][field] = value;
    setFormData(prev => ({
      ...prev,
      subjects: updatedSubjects
    }));
  };

  const addSubject = () => {
    setFormData(prev => ({
      ...prev,
      subjects: [
        ...prev.subjects,
        { id: Date.now(), name: '', maxMarks: 100, obtainedMarks: 0 }
      ]
    }));
  };

  const removeSubject = (index) => {
    if (formData.subjects.length <= 1) return;
    const updatedSubjects = formData.subjects.filter((_, i) => i !== index);
    setFormData(prev => ({
      ...prev,
      subjects: updatedSubjects
    }));
  };

  const calculateTotals = () => {
    return calculateExamResults(formData.subjects);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');

    // Validate form data
    const validation = validateExamData(formData);
    if (!validation.isValid) {
      setError(validation.errors.join('; '));
      setLoading(false);
      return;
    }

    try {
      const { totalObtained, totalMax, percentage, result } = calculateTotals();
      
      const examData = {
        examName: formData.examName,
        subjects: formData.subjects.map(subject => ({
          name: subject.name,
          max: parseInt(subject.maxMarks),
          obtained: parseInt(subject.obtainedMarks)
        })),
        total: totalObtained,
        percentage: parseFloat(percentage.toFixed(2)),
        result
      };

      await saveStudentExam(currentUser.uid, formData.studentId, examData);

      setSuccess('Marks saved successfully!');
      setFormData({
        studentId: '',
        examName: '',
        subjects: [{ id: Date.now(), name: '', maxMarks: 100, obtainedMarks: 0 }]
      });

      // Dispatch event to notify other parts of the app
      window.dispatchEvent(new CustomEvent('marksSaved', { detail: { examData } }));
    } catch (err) {
      console.error('Error saving marks:', err);
      setError('Failed to save marks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const { totalObtained, totalMax, percentage, result } = calculateTotals();

  return (
    <RootLayout>
      <div className="marks-entry-container">
        <div className="marks-entry-header">
          <h1>Enter Student Marks</h1>
          <p className="header-subtitle">Record exam scores for your students</p>
        </div>
        
        <div className="marks-entry-form-card">
          <form onSubmit={handleSubmit} className="marks-entry-form">
            <div className="form-group">
              <label htmlFor="studentId" className="form-label">Select Student *</label>
              <select
                id="studentId"
                name="studentId"
                value={formData.studentId}
                onChange={handleInputChange}
                className="form-select"
                required
              >
                <option value="">Choose a student</option>
                {students.map(student => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.rollNumber || student.studentId})
                  </option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label htmlFor="examName" className="form-label">Exam Name *</label>
              <input
                type="text"
                id="examName"
                name="examName"
                value={formData.examName}
                onChange={handleInputChange}
                className="form-input"
                placeholder="e.g. Unit Test 1, Mid Term, Final Exam"
                required
              />
            </div>
            
            <div className="subjects-section">
              <div className="section-header">
                <h3>Subjects</h3>
                <button type="button" onClick={addSubject} className="btn btn-add-subject">
                  + Add Subject
                </button>
              </div>
              
              <div className="subjects-table">
                <table className="subjects-table-content">
                  <thead>
                    <tr>
                      <th>Subject Name</th>
                      <th>Max Marks</th>
                      <th>Obtained Marks</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {formData.subjects.map((subject, index) => (
                      <tr key={subject.id}>
                        <td>
                          <input
                            type="text"
                            value={subject.name}
                            onChange={(e) => handleSubjectChange(index, 'name', e.target.value)}
                            className="form-input subject-input"
                            placeholder="e.g. Mathematics"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="1"
                            value={subject.maxMarks}
                            onChange={(e) => handleSubjectChange(index, 'maxMarks', e.target.value)}
                            className="form-input marks-input"
                            required
                          />
                        </td>
                        <td>
                          <input
                            type="number"
                            min="0"
                            max={subject.maxMarks}
                            value={subject.obtainedMarks}
                            onChange={(e) => handleSubjectChange(index, 'obtainedMarks', e.target.value)}
                            className="form-input marks-input"
                            required
                          />
                        </td>
                        <td>
                          <button
                            type="button"
                            onClick={() => removeSubject(index)}
                            disabled={formData.subjects.length <= 1}
                            className="btn btn-remove"
                          >
                            Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div className="marks-summary">
              <div className="summary-item">
                <span className="summary-label">Total:</span>
                <span className="summary-value">{totalObtained}/{totalMax}</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Percentage:</span>
                <span className="summary-value">{percentage.toFixed(2)}%</span>
              </div>
              <div className="summary-item">
                <span className="summary-label">Result:</span>
                <span className={`summary-value result-${result.toLowerCase()}`}>{result}</span>
              </div>
            </div>
            
            {error && <div className="error-message">{error}</div>}
            {success && <div className="success-message">{success}</div>}
            
            <div className="form-actions">
              <button 
                type="submit" 
                className="btn btn-submit"
                disabled={loading}
              >
                {loading ? 'Saving...' : 'Save Marks'}
              </button>
              
              <button 
                type="button" 
                className="btn btn-view-results"
                onClick={() => navigate('/marks-results')}
              >
                View Results
              </button>
            </div>
          </form>
        </div>
      </div>
    </RootLayout>
  );
};

export default MarksEntry;