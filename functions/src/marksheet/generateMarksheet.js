const functions = require('firebase-functions');
const admin = require('firebase-admin');
const { getMarksheetTemplate } = require('./template');
const { htmlToPdf } = require('./pdfService');

/**
 * Firebase Cloud Function to generate a student marksheet PDF
 * Callable HTTPS function that creates a professional marksheet PDF
 * and stores it in Firebase Storage with URL saved in Firestore
 */
exports.generateStudentMarksheetPDF = functions.https.onCall(async (data, context) => {
  // Authentication check
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'Function must be called by an authenticated user.'
    );
  }

  const { userId, studentId, examId } = data;

  // Input validation
  if (!userId || !studentId || !examId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Missing required parameters: userId, studentId, examId'
    );
  }

  // Security check: ensure the requesting user can only access their own data
  if (context.auth.uid !== userId) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'User can only generate marksheet for their own students.'
    );
  }

  try {
    // Fetch student details from Firestore
    const studentDoc = await admin.firestore()
      .collection(`users/${userId}/students`)
      .doc(studentId)
      .get();

    if (!studentDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Student not found'
      );
    }

    const studentInfo = studentDoc.data();

    // Fetch exam details from Firestore
    const examDoc = await admin.firestore()
      .collection(`users/${userId}/exams`)
      .doc(examId)
      .get();

    if (!examDoc.exists) {
      throw new functions.https.HttpsError(
        'not-found',
        'Exam not found'
      );
    }

    const examInfo = examDoc.data();

    // Fetch branding data
    const brandingDoc = await admin.firestore()
      .collection('users')
      .doc(userId)
      .collection('settings')
      .doc('branding')
      .get();

    const branding = brandingDoc.exists ? brandingDoc.data() : {
      instituteName: 'Victory Point Academy',
      instituteAddress: '123 Education Street, City, State - 12345',
      phone: 'N/A',
      email: 'N/A',
      logoUrl: null,
      systemId: 'ERP System'
    };

    // Calculate totals and percentage
    const subjects = examInfo.subjects || [];
    let totalObtained = 0;
    let totalMax = 0;
    let passed = true;

    subjects.forEach(subject => {
      const obtained = subject.obtainedMarks || 0;
      const max = subject.maxMarks || 100;
      const passing = subject.passingMarks || Math.ceil(max * 0.35); // Default to 35%
      
      totalObtained += obtained;
      totalMax += max;
      
      if (obtained < passing) {
        passed = false;
      }
    });

    const percentage = totalMax > 0 ? ((totalObtained / totalMax) * 100).toFixed(2) : 0;
    const result = passed ? 'PASS' : 'FAIL';

    const totals = {
      totalObtained,
      totalMax,
      subjectCount: subjects.length
    };

    // Prepare data for the template
    const templateData = {
      studentInfo,
      examInfo,
      branding,
      totals,
      percentage,
      result,
      date: new Date().toLocaleDateString('en-IN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      })
    };

    // Generate HTML template
    const html = getMarksheetTemplate(templateData);

    // Convert HTML to PDF
    const pdfBuffer = await htmlToPdf(html);

    // Define storage path
    const fileName = `marksheet_${studentId}_${examId}_${Date.now()}.pdf`;
    const storagePath = `users/${userId}/marksheets/${fileName}`;

    // Upload PDF to Firebase Storage
    const bucket = admin.storage().bucket();
    const file = bucket.file(storagePath);

    await file.save(pdfBuffer, {
      metadata: {
        contentType: 'application/pdf',
        cacheControl: 'public, max-age=3600'
      }
    });

    // Make the file publicly readable
    await file.makePublic();

    // Get the public URL
    const downloadUrl = `https://storage.googleapis.com/${bucket.name}/${file.name}`;

    // Save the download URL to Firestore
    await admin.firestore()
      .collection(`users/${userId}/students/${studentId}/marksheets`)
      .doc(examId)
      .set({
        downloadUrl,
        fileName,
        generatedAt: admin.firestore.FieldValue.serverTimestamp(),
        studentId,
        examId,
        userId,
        fileSize: pdfBuffer.length,
        status: 'generated'
      });

    // Return the download URL
    return {
      success: true,
      downloadUrl,
      fileName,
      message: 'Marksheet PDF generated and uploaded successfully'
    };

  } catch (error) {
    console.error('Error generating marksheet PDF:', error);
    
    // Log the error to Firebase
    functions.logger.error('Error generating marksheet PDF:', {
      userId,
      studentId,
      examId,
      error: error.message
    });

    if (error.code === 'permission-denied') {
      throw new functions.https.HttpsError('permission-denied', error.message);
    } else if (error.code === 'not-found') {
      throw new functions.https.HttpsError('not-found', error.message);
    } else if (error.code === 'invalid-argument') {
      throw new functions.https.HttpsError('invalid-argument', error.message);
    } else {
      throw new functions.https.HttpsError(
        'internal',
        `Failed to generate marksheet PDF: ${error.message}`
      );
    }
  }
});