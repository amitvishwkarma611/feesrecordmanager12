/**
 * Generates a professional marksheet HTML template
 * @param {Object} data - Marksheet data containing student info, exam info, and branding
 * @returns {string} HTML template string
 */
exports.getMarksheetTemplate = (data) => {
  const {
    studentInfo,
    examInfo,
    branding,
    totals,
    percentage,
    result,
    date
  } = data;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Student Marksheet</title>
  <style>
    @page {
      size: A4;
      margin: 20mm;
    }
    
    body {
      font-family: 'Arial', sans-serif;
      margin: 0;
      padding: 0;
      color: #333;
      background: #fff;
    }
    
    .watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-45deg);
      font-size: 120px;
      color: rgba(200, 200, 200, 0.2);
      z-index: -1;
      pointer-events: none;
      font-weight: bold;
      white-space: nowrap;
    }
    
    .container {
      max-width: 100%;
      margin: 0 auto;
      position: relative;
      z-index: 1;
    }
    
    .header {
      text-align: center;
      margin-bottom: 20px;
      border-bottom: 3px solid #2c3e50;
      padding-bottom: 15px;
    }
    
    .logo-container {
      display: flex;
      align-items: center;
      justify-content: center;
      margin-bottom: 10px;
    }
    
    .logo {
      max-width: 80px;
      max-height: 80px;
      margin-right: 20px;
      border-radius: 8px;
    }
    
    .school-info {
      text-align: left;
    }
    
    .school-name {
      font-size: 24px;
      font-weight: bold;
      color: #2c3e50;
      margin: 0;
    }
    
    .school-address {
      font-size: 14px;
      color: #7f8c8d;
      margin: 5px 0;
    }
    
    .school-phone-email {
      font-size: 12px;
      color: #95a5a6;
      margin: 3px 0;
    }
    
    .title {
      font-size: 22px;
      font-weight: bold;
      color: #34495e;
      margin: 20px 0 10px 0;
      text-align: center;
      text-transform: uppercase;
    }
    
    .subtitle {
      font-size: 16px;
      color: #7f8c8d;
      text-align: center;
      margin-bottom: 20px;
    }
    
    .student-details {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #f8f9fa;
    }
    
    .details-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 15px;
    }
    
    .detail-item {
      margin-bottom: 8px;
    }
    
    .detail-label {
      font-weight: bold;
      color: #2c3e50;
      font-size: 14px;
      display: inline-block;
      min-width: 120px;
    }
    
    .detail-value {
      color: #34495e;
      font-size: 14px;
    }
    
    .marks-table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
      font-size: 14px;
    }
    
    .marks-table th {
      background-color: #34495e;
      color: white;
      padding: 12px;
      text-align: center;
      border: 1px solid #2c3e50;
    }
    
    .marks-table td {
      padding: 10px;
      text-align: center;
      border: 1px solid #ddd;
    }
    
    .marks-table tr:nth-child(even) {
      background-color: #f2f2f2;
    }
    
    .marks-table tr:hover {
      background-color: #f5f5f5;
    }
    
    .summary-section {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #e0e0e0;
      border-radius: 8px;
      background-color: #f8f9fa;
    }
    
    .summary-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
      gap: 15px;
    }
    
    .summary-item {
      text-align: center;
      padding: 10px;
    }
    
    .summary-label {
      font-weight: bold;
      color: #2c3e50;
      font-size: 14px;
    }
    
    .summary-value {
      color: #34495e;
      font-size: 16px;
      font-weight: bold;
    }
    
    .result-badge {
      display: inline-block;
      padding: 5px 15px;
      border-radius: 20px;
      font-weight: bold;
      font-size: 14px;
      margin-top: 5px;
    }
    
    .pass {
      background-color: #d4edda;
      color: #155724;
      border: 1px solid #c3e6cb;
    }
    
    .fail {
      background-color: #f8d7da;
      color: #721c24;
      border: 1px solid #f5c6cb;
    }
    
    .signatures {
      margin-top: 40px;
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 20px;
      text-align: center;
    }
    
    .signature-line {
      border-top: 1px solid #333;
      padding-top: 5px;
      width: 80%;
      margin: 0 auto;
    }
    
    .signature-label {
      font-size: 12px;
      color: #7f8c8d;
      margin-top: 5px;
    }
    
    .footer {
      margin-top: 40px;
      text-align: center;
      font-size: 12px;
      color: #7f8c8d;
      padding-top: 10px;
      border-top: 1px solid #e0e0e0;
    }
    
    .system-id {
      font-size: 10px;
      color: #95a5a6;
      margin-top: 5px;
    }
  </style>
</head>
<body>
  <div class="watermark">OFFICIAL</div>
  
  <div class="container">
    <div class="header">
      <div class="logo-container">
        ${branding.logoUrl ? `<img src="${branding.logoUrl}" alt="School Logo" class="logo">` : ''}
        <div class="school-info">
          <h1 class="school-name">${branding.instituteName || 'Victory Point Academy'}</h1>
          <p class="school-address">${branding.instituteAddress || '123 Education Street, City, State - 12345'}</p>
          <p class="school-phone-email">Phone: ${branding.phone || 'N/A'} | Email: ${branding.email || 'N/A'}</p>
        </div>
      </div>
    </div>
    
    <h2 class="title">Academic Marksheet</h2>
    <p class="subtitle">${examInfo.examName || 'Examination'} - ${examInfo.academicYear || 'Academic Year'}</p>
    
    <div class="student-details">
      <div class="details-grid">
        <div class="detail-item">
          <span class="detail-label">Student Name:</span>
          <span class="detail-value">${studentInfo.name || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Student ID:</span>
          <span class="detail-value">${studentInfo.studentId || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Roll Number:</span>
          <span class="detail-value">${studentInfo.rollNumber || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Class:</span>
          <span class="detail-value">${studentInfo.class || 'N/A'} ${studentInfo.section ? `- ${studentInfo.section}` : ''}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Date of Birth:</span>
          <span class="detail-value">${studentInfo.dob || 'N/A'}</span>
        </div>
        <div class="detail-item">
          <span class="detail-label">Gender:</span>
          <span class="detail-value">${studentInfo.gender || 'N/A'}</span>
        </div>
      </div>
    </div>
    
    <table class="marks-table">
      <thead>
        <tr>
          <th>Subject</th>
          <th>Max Marks</th>
          <th>Obtained</th>
          <th>Grade</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${examInfo.subjects.map(subject => `
          <tr>
            <td>${subject.subjectName || subject.name || 'N/A'}</td>
            <td>${subject.maxMarks || 100}</td>
            <td>${subject.obtainedMarks || 0}</td>
            <td>${calculateGrade(subject.obtainedMarks, subject.maxMarks)}</td>
            <td>${subject.obtainedMarks >= subject.passingMarks ? 'PASS' : 'FAIL'}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
    
    <div class="summary-section">
      <div class="summary-grid">
        <div class="summary-item">
          <div class="summary-label">Total Marks</div>
          <div class="summary-value">${totals.totalObtained}/${totals.totalMax}</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Percentage</div>
          <div class="summary-value">${percentage}%</div>
        </div>
        <div class="summary-item">
          <div class="summary-label">Result</div>
          <div class="summary-value">
            <span class="result-badge ${result.toLowerCase()}">${result}</span>
          </div>
        </div>
      </div>
    </div>
    
    <div class="signatures">
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Class Teacher</div>
      </div>
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Principal</div>
      </div>
      <div>
        <div class="signature-line"></div>
        <div class="signature-label">Date: ${date}</div>
      </div>
    </div>
    
    <div class="footer">
      <p>This marksheet is computer generated and does not require a signature.</p>
      <div class="system-id">Generated by: ${branding.systemId || 'ERP System'} | UID: ${Date.now()}</div>
    </div>
  </div>
  
  <script>
    function calculateGrade(obtained, max) {
      if (!obtained || !max) return 'F';
      
      const percentage = (obtained / max) * 100;
      
      if (percentage >= 90) return 'A+';
      else if (percentage >= 80) return 'A';
      else if (percentage >= 70) return 'B+';
      else if (percentage >= 60) return 'B';
      else if (percentage >= 50) return 'C+';
      else if (percentage >= 40) return 'C';
      else if (percentage >= 35) return 'D';
      else return 'F';
    }
  </script>
</body>
</html>`;
};

// Helper function to calculate grade
function calculateGrade(obtained, max) {
  if (!obtained || !max) return 'F';
  
  const percentage = (obtained / max) * 100;
  
  if (percentage >= 90) return 'A+';
  else if (percentage >= 80) return 'A';
  else if (percentage >= 70) return 'B+';
  else if (percentage >= 60) return 'B';
  else if (percentage >= 50) return 'C+';
  else if (percentage >= 40) return 'C';
  else if (percentage >= 35) return 'D';
  else return 'F';
}