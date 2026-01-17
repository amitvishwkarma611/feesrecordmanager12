import React, { useState, useEffect } from 'react';
import { getAuth } from 'firebase/auth';
import { 
  collection, 
  getDocs, 
  query,
  orderBy,
  where
} from 'firebase/firestore';
import { db } from '../firebase/firebaseConfig';
import { getBrandingSettings } from '../services/firebaseService';
import RootLayout from '../components/common/RootLayout';
import './MarksResults.css';

const MarksResults = () => {
  const auth = getAuth();
  const currentUser = auth.currentUser;
  
  const [students, setStudents] = useState([]);
  const [exams, setExams] = useState([]);
  const [selectedStudent, setSelectedStudent] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [brandingData, setBrandingData] = useState({});
  const [examFilter, setExamFilter] = useState('');
  const [classFilter, setClassFilter] = useState('');

  // Fetch students for current user
  useEffect(() => {
    const fetchStudents = async () => {
      if (!currentUser) return;
      
      try {
        setLoading(true);
        const q = query(collection(db, `users/${currentUser.uid}/students`));
        const querySnapshot = await getDocs(q);
        const studentsList = [];
        querySnapshot.forEach((doc) => {
          studentsList.push({ id: doc.id, ...doc.data() });
        });
        setStudents(studentsList);
      } catch (err) {
        console.error('Error fetching students:', err);
        setError('Failed to load students');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [currentUser]);
  
  // Get unique classes from students
  const getUniqueClasses = () => {
    const classes = [...new Set(students.map(student => student.class || 'Unclassified'))];
    return classes.filter(cls => cls !== undefined && cls !== null && cls !== '');
  };

  // Fetch exams when student is selected
  useEffect(() => {
    const fetchExams = async () => {
      if (!currentUser || !selectedStudent) return;
      
      try {
        setLoading(true);
        const q = query(
          collection(db, `users/${currentUser.uid}/students/${selectedStudent}/exams`),
          orderBy('createdAt', 'desc')
        );
        const querySnapshot = await getDocs(q);
        const examsList = [];
        querySnapshot.forEach((doc) => {
          examsList.push({ id: doc.id, ...doc.data() });
        });
        setExams(examsList);
      } catch (err) {
        console.error('Error fetching exams:', err);
        setError('Failed to load exams');
      } finally {
        setLoading(false);
      }
    };

    fetchExams();
  }, [currentUser, selectedStudent]);
  
  // Fetch branding data
  useEffect(() => {
    const fetchBranding = async () => {
      if (!currentUser) return;
      
      try {
        const branding = await getBrandingSettings();
        setBrandingData(branding || {});
      } catch (err) {
        console.error('Error fetching branding data:', err);
        // Use default branding if fetch fails
        setBrandingData({
          firmName: 'Victory Point Academy',
          instituteName: 'Victory Point Academy',
          instituteAddress: '123 Education Street, City, State - 12345',
          phone: 'N/A',
          email: 'N/A',
          logoUrl: null
        });
      }
    };

    fetchBranding();
  }, [currentUser]);

  const handleStudentChange = (e) => {
    setSelectedStudent(e.target.value);
  };

  const getStudentName = (studentId) => {
    const student = students.find(s => s.id === studentId);
    return student ? student.name : 'Unknown Student';
  };
  
  const generatePDFResult = async (exam, studentName, branding) => {
    try {
      // Create a print-friendly version of the marksheet
      const printWindow = window.open('', '_blank');
      
      // Calculate totals
      const totalMax = exam.subjects.reduce((sum, sub) => sum + sub.max, 0);
      
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>${exam.examName} - ${studentName}</title>
          <style>
            @media print {
              @page { margin: 0.5cm; size: A4; }
              body { margin: 0.5cm; }
              
              /* Ensure images are visible in print */
              img {
                -webkit-print-color-adjust: exact;
                color-adjust: exact;
                print-color-adjust: exact;
                max-height: 60px;
                width: auto;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
              
              .receipt-preview-logo {
                max-width: 60px;
                max-height: 60px;
                width: auto;
                margin-right: 15px;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
            }
            
            body { 
              font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
              max-width: 600px; 
              margin: 0 auto; 
              padding: 10px;
              color: var(--text-primary, #333);
              line-height: 1.3;
              font-size: 13px;
              position: relative;
            }
            
            .receipt-container {
              border: 1px solid var(--info-color, #3498db); /* Blue for neutral info */
              border-radius: 8px;
              padding: 15px;
              position: relative;
              background: white;
            }
            
            .receipt-header {
              text-align: center;
              margin-bottom: 15px;
              padding-bottom: 15px;
              border-bottom: 2px solid var(--info-color, #3498db);
            }
            
            .receipt-header-content {
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 10px;
            }
            
            .receipt-preview-logo {
              max-width: 60px;
              max-height: 60px;
              margin-right: 15px;
            }
            
            .receipt-placeholder-logo {
              font-size: 2em;
              margin-right: 15px;
            }
            
            .receipt-academy-info {
              text-align: left;
            }
            
            .receipt-academy-name {
              margin: 0 0 5px 0;
              font-size: 1.3em;
              font-weight: bold;
              color: var(--primary-color, #2c3e50);
            }
            
            .receipt-academy-address {
              margin: 0;
              font-size: 0.9em;
              color: var(--text-secondary, #7f8c8d);
            }
            
            .receipt-title-preview {
              text-align: center;
              font-size: 1.4em;
              font-weight: bold;
              margin: 15px 0 10px 0;
              color: var(--success-color, #27ae60);
            }
            
            .receipt-details {
              margin: 15px 0;
            }
            
            .receipt-row {
              display: flex;
              justify-content: space-between;
              margin: 8px 0;
            }
            
            .receipt-label {
              font-weight: 600;
              color: var(--text-secondary, #7f8c8d);
            }
            
            .receipt-value {
              font-weight: 500;
              color: var(--text-primary, #34495e);
              text-align: right;
            }
            
            .receipt-amount {
              color: var(--success-color, #27ae60);
              font-weight: bold;
            }
            
            .receipt-divider {
              height: 1px;
              background: var(--border-color, #e0e0e0);
              margin: 12px 0;
              border: none;
            }
            
            .receipt-signatures {
              display: flex;
              justify-content: space-between;
              margin: 25px 0 15px 0;
              padding: 15px 0;
              border-top: 1px solid var(--border-color, #e0e0e0);
              border-bottom: 1px solid var(--border-color, #e0e0e0);
            }
            
            .signature-section, .stamp-section, .authorized-signature-section {
              text-align: center;
              flex: 1;
            }
            
            .receipt-signature, .receipt-stamp {
              max-width: 120px;
              max-height: 60px;
              margin: 0 auto 5px;
            }
            
            .signature-line {
              width: 100px;
              height: 1px;
              background: #000;
              margin: 15px auto 5px;
            }
            
            .receipt-footer {
              text-align: center;
              margin-top: 15px;
              padding-top: 15px;
              border-top: 1px solid var(--border-color, #e0e0e0);
            }
            
            .receipt-note {
              font-style: italic;
              font-size: 0.85em;
              color: var(--text-secondary, #7f8c8d);
              margin-top: 5px;
            }
            
            /* Ensure logo is visible during printing */
            .receipt-preview-logo {
              display: block !important;
              visibility: visible !important;
              opacity: 1 !important;
              max-height: 60px !important;
              width: auto !important;
            }
            
            /* Table styling for subjects */
            .subjects-table {
              width: 100%;
              border-collapse: collapse;
              margin: 15px 0;
            }
            
            .subjects-table th {
              background-color: #34495e;
              color: white;
              padding: 8px;
              text-align: left;
              font-weight: 600;
              font-size: 0.9em;
            }
            
            .subjects-table td {
              padding: 8px;
              border-bottom: 1px solid #e0e0e0;
            }
            
            .subjects-table tr:nth-child(even) {
              background-color: #f8f9fa;
            }
            
            .result-badge {
              display: inline-block;
              padding: 3px 8px;
              border-radius: 4px;
              font-weight: bold;
              font-size: 0.85em;
            }
            
            .result-pass {
              background-color: #d4edda;
              color: #155724;
              border: 1px solid #c3e6cb;
            }
            
            .result-fail {
              background-color: #f8d7da;
              color: #721c24;
              border: 1px solid #f5c6cb;
            }
            
            .summary-row {
              display: flex;
              justify-content: space-between;
              margin: 5px 0;
              padding: 5px 0;
              border-bottom: 1px solid #eee;
            }
            
            .summary-label {
              font-weight: 600;
              color: #495057;
            }
            
            .summary-value {
              font-weight: 500;
              color: #2c3e50;
            }
          </style>
        </head>
        <body>
          <div class="receipt-container">
            <div class="receipt-header">
              <div class="receipt-header-content">
                ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="Academy Logo" class="receipt-preview-logo" />` : ''}
                <div class="receipt-academy-info">
                  <h4 class="receipt-academy-name">${branding.instituteName || branding.firmName || 'Victory Point Academy'}</h4>
                  <p class="receipt-academy-address">${branding.instituteAddress || branding.firmAddress || '123 Education Street, City, State - 12345'}</p>
                  <p class="receipt-academy-address">Phone: ${branding.phone || 'N/A'} | Email: ${branding.email || 'N/A'}</p>
                </div>
              </div>
              <div class="receipt-title-preview">Academic Marksheet</div>
            </div>
            
            <div class="receipt-details">
              <div class="receipt-row">
                <span class="receipt-label">Student Name:</span>
                <span class="receipt-value">${studentName}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Exam Name:</span>
                <span class="receipt-value">${exam.examName}</span>
              </div>
              <div class="receipt-row">
                <span class="receipt-label">Date:</span>
                <span class="receipt-value">${new Date().toLocaleDateString()}</span>
              </div>
              
              <div class="receipt-divider"></div>
              
              <h3 style="text-align: center; margin: 15px 0 10px 0; color: #2c3e50;">Subject Details</h3>
              <table class="subjects-table">
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>Max</th>
                    <th>Obtained</th>
                  </tr>
                </thead>
                <tbody>
                  ${exam.subjects.map(subject => `
                    <tr>
                      <td>${subject.name}</td>
                      <td>${subject.max}</td>
                      <td>${subject.obtained}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              
              <div class="receipt-divider"></div>
              
              <h3 style="text-align: center; margin: 15px 0 10px 0; color: #2c3e50;">Result Summary</h3>
              <div class="summary-row">
                <span class="summary-label">Total Marks:</span>
                <span class="summary-value">${exam.total}/${totalMax}</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Percentage:</span>
                <span class="summary-value">${exam.percentage}%</span>
              </div>
              <div class="summary-row">
                <span class="summary-label">Result:</span>
                <span class="summary-value result-badge result-${exam.result.toLowerCase()}">${exam.result}</span>
              </div>
              
              <div class="receipt-signatures">
                <div class="signature-section">
                  <div class="signature-line"></div>
                  <p>Class Teacher</p>
                </div>
                <div class="signature-section">
                  <div class="signature-line"></div>
                  <p>Principal</p>
                </div>
              </div>
              
              <div class="receipt-footer">
                <p>This marksheet is computer generated and does not require a signature.</p>
                <p class="receipt-note">Generated on ${new Date().toLocaleString()}</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `);
      
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
      // printWindow.close(); // Commented out to allow PDF saving
    } catch (error) {
      console.error('Error printing marksheet:', error);
      alert('Error printing marksheet. Please try again.');
    }
  };

  return (
    <RootLayout>
      <div className="marks-results-container">
        <div className="marks-results-header">
          <h1>Student Marks Results</h1>
          <p className="header-subtitle">View exam results for your students</p>
        </div>
        
        <div className="marks-results-card">
          <div className="form-group">
            <label htmlFor="studentSelect" className="form-label">Select Student</label>
            <select
              id="studentSelect"
              value={selectedStudent}
              onChange={handleStudentChange}
              className="form-select"
            >
              <option value="">Choose a student to view results</option>
              {students
                .filter(student => 
                  classFilter === '' || 
                  (student.class || 'Unclassified').toLowerCase().includes(classFilter.toLowerCase())
                )
                .map(student => (
                <option key={student.id} value={student.id}>
                  {student.name} - {student.class || 'Unclassified'} ({student.rollNumber || student.studentId})
                </option>
              ))}
            </select>
          </div>
          
          {students.length > 0 && (
            <div className="filters-container">
              <div className="filter-section">
                <label htmlFor="classFilter" className="form-label">Filter by Class</label>
                <select
                  id="classFilter"
                  value={classFilter}
                  onChange={(e) => setClassFilter(e.target.value)}
                  className="form-select"
                >
                  <option value="">All Classes</option>
                  {getUniqueClasses().map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>
                    
              {selectedStudent && (
                <div className="filter-section">
                  <label htmlFor="examFilter" className="form-label">Filter by Exam Name</label>
                  <input
                    type="text"
                    id="examFilter"
                    value={examFilter}
                    onChange={(e) => setExamFilter(e.target.value)}
                    className="form-input"
                    placeholder="Search exam name..."
                  />
                </div>
              )}
            </div>
          )}
          
          {loading && <div className="loading">Loading...</div>}
          
          {error && <div className="error-message">{error}</div>}
          
          {selectedStudent && exams.length > 0 && (
            <div className="exams-results-section">
              <h3>Results for {getStudentName(selectedStudent)}</h3>
              
              <div className="exams-list">
                {exams
                  .filter(exam => 
                    examFilter === '' || 
                    exam.examName.toLowerCase().includes(examFilter.toLowerCase())
                  )
                  .map(exam => (
                  <div key={exam.id} className="exam-card">
                    <div className="exam-header">
                      <h4>{exam.examName}</h4>
                      <div className="exam-summary">
                        <span className="summary-item">
                          <strong>Total:</strong> {exam.total}/{exam.subjects.reduce((sum, sub) => sum + sub.max, 0)}
                        </span>
                        <span className="summary-item">
                          <strong>Percentage:</strong> {exam.percentage}%
                        </span>
                        <span className={`summary-item result-${exam.result.toLowerCase()}`}>
                          <strong>Result:</strong> {exam.result}
                        </span>
                      </div>
                    </div>
                    
                    <div className="subjects-table">
                      <table className="subjects-table-content">
                        <thead>
                          <tr>
                            <th>Subject</th>
                            <th>Max Marks</th>
                            <th>Obtained Marks</th>
                          </tr>
                        </thead>
                        <tbody>
                          {exam.subjects.map((subject, index) => (
                            <tr key={index}>
                              <td>{subject.name}</td>
                              <td>{subject.max}</td>
                              <td>{subject.obtained}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    
                    <div className="exam-actions">
                      <button 
                        className="btn btn-print"
                        onClick={() => generatePDFResult(exam, getStudentName(selectedStudent), brandingData)}
                      >
                        Print Result
                      </button>
                    </div>
                  </div>
                ))}
                {exams.filter(exam => 
                  examFilter === '' || 
                  exam.examName.toLowerCase().includes(examFilter.toLowerCase())
                ).length === 0 && (
                  <div className="no-results">
                    No exam results match your filter criteria.
                  </div>
                )}
              </div>
            </div>
          )}
          
          {selectedStudent && exams.length === 0 && !loading && (
            <div className="no-results">
              No exam results found for this student.
            </div>
          )}
        </div>
      </div>
    </RootLayout>
  );
};

export default MarksResults;