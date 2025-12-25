import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { addDoc, collection, updateDoc, doc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase/firebaseConfig';
import { getCurrentUserUID } from '../utils/auth';
import RootLayout from './common/RootLayout';
import './FeedbackSupport.css';

const FeedbackSupport = () => {
  const navigate = useNavigate();
  
  // Feedback form state
  const [feedbackForm, setFeedbackForm] = useState({
    rating: 0,
    type: 'Overall Experience',
    message: ''
  });
  
  // Support form state
  const [supportForm, setSupportForm] = useState({
    category: 'Fees / Payments',
    priority: 'Medium',
    description: '',
    email: ''
  });
  
  // Screenshot state
  const [screenshot, setScreenshot] = useState(null);
  const [screenshotPreview, setScreenshotPreview] = useState(null);
  
  // Loading states
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [supportSubmitting, setSupportSubmitting] = useState(false);
  
  // Toast messages
  const [toastMessage, setToastMessage] = useState('');
  const [showToast, setShowToast] = useState(false);
  
  // Handle feedback form changes
  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedbackForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle star rating
  const handleStarClick = (rating) => {
    setFeedbackForm(prev => ({
      ...prev,
      rating
    }));
  };
  
  // Handle support form changes
  const handleSupportChange = (e) => {
    const { name, value } = e.target;
    setSupportForm(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  // Handle screenshot selection
  const handleScreenshotChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // Check if file is an image
      if (file.type.startsWith('image/')) {
        setScreenshot(file);
        
        // Create preview
        const reader = new FileReader();
        reader.onload = (e) => {
          setScreenshotPreview(e.target.result);
        };
        reader.readAsDataURL(file);
      } else {
        alert('Please select a valid image file (PNG, JPG, JPEG)');
      }
    }
  };
  
  // Remove screenshot
  const removeScreenshot = () => {
    setScreenshot(null);
    setScreenshotPreview(null);
    // Reset file input
    const fileInput = document.getElementById('screenshot-upload');
    if (fileInput) {
      fileInput.value = '';
    }
  };
  
  // Show toast message
  const showToastMessage = (message) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => {
      setShowToast(false);
      setToastMessage('');
    }, 3000);
  };
  
  // Submit feedback
  const submitFeedback = async (e) => {
    e.preventDefault();
    setFeedbackSubmitting(true);
    
    try {
      const feedbackData = {
        userId: getCurrentUserUID(),
        rating: feedbackForm.rating,
        type: feedbackForm.type,
        message: feedbackForm.message,
        createdAt: new Date()
      };
      
      await addDoc(collection(db, `users/${getCurrentUserUID()}/feedback`), feedbackData);
      showToastMessage('Thank you for your feedback!');
      
      // Reset form
      setFeedbackForm({
        rating: 0,
        type: 'Overall Experience',
        message: ''
      });
    } catch (error) {
      console.error('Error submitting feedback:', error);
      showToastMessage('Failed to submit feedback. Please try again.');
    } finally {
      setFeedbackSubmitting(false);
    }
  };
  
  // Submit support query
  const submitSupportQuery = async (e) => {
    e.preventDefault();
    setSupportSubmitting(true);
      
    try {
      const supportData = {
        userId: getCurrentUserUID(),
        category: supportForm.category,
        priority: supportForm.priority,
        description: supportForm.description,
        email: supportForm.email,
        status: 'Open',
        createdAt: new Date()
      };
        
      // Add the support query first
      const docRef = await addDoc(collection(db, `users/${getCurrentUserUID()}/supportQueries`), supportData);
        
      // If there's a screenshot, upload it and update the document
      if (screenshot) {
        try {
          const screenshotRef = ref(storage, `users/${getCurrentUserUID()}/supportScreenshots/${docRef.id}/${screenshot.name}`);
          await uploadBytes(screenshotRef, screenshot);
          const screenshotURL = await getDownloadURL(screenshotRef);
            
          // Update the document with the screenshot URL
          await updateDoc(doc(db, `users/${getCurrentUserUID()}/supportQueries`, docRef.id), {
            screenshotURL: screenshotURL
          });
        } catch (uploadError) {
          console.error('Error uploading screenshot:', uploadError);
          // Don't fail the entire submission if screenshot upload fails
          showToastMessage('Query submitted but screenshot failed to upload.');
        }
      }
        
      showToastMessage('Your query has been submitted. We\'ll get back to you soon.');
        
      // Reset form
      setSupportForm({
        category: 'Fees / Payments',
        priority: 'Medium',
        description: '',
        email: supportForm.email // Keep email for convenience
      });
        
      // Reset screenshot
      setScreenshot(null);
      setScreenshotPreview(null);
    } catch (error) {
      console.error('Error submitting support query:', error);
      showToastMessage('Failed to submit query. Please try again.');
    } finally {
      setSupportSubmitting(false);
    }
  };
  
  return (
    <RootLayout>
      <div className="feedback-support-container">
        {/* Toast Notification */}
        {showToast && (
          <div className="toast-notification">
            {toastMessage}
          </div>
        )}
        
        {/* Page Header */}
        <div className="page-header">
          <div className="header-navigation">
            <button className="back-button" onClick={() => navigate(-1)}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path></path>
                <path></path>
              </svg>
              Back
            </button>
            <div className="header-text">
              <h1 className="page-title">Feedback & Support</h1>
              <p className="page-subtitle">We value your feedback and are here to help.</p>
            </div>
          </div>
        </div>
        
        <div className="feedback-support-content">
          {/* Feedback Form Section */}
          <div className="form-section">
            <div className="form-card">
              <h2 className="form-title">Share Your Experience</h2>
              
              <form onSubmit={submitFeedback} className="feedback-form">
                {/* Experience Rating */}
                <div className="form-group">
                  <label className="form-label">Experience Rating</label>
                  <div className="star-rating">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <span
                        key={star}
                        className={`star ${feedbackForm.rating >= star ? 'filled' : ''}`}
                        onClick={() => handleStarClick(star)}
                      >
                        ★
                      </span>
                    ))}
                  </div>
                </div>
                
                {/* Feedback Type */}
                <div className="form-group">
                  <label className="form-label">Feedback Type</label>
                  <select
                    name="type"
                    value={feedbackForm.type}
                    onChange={handleFeedbackChange}
                    className="form-select"
                  >
                    <option value="Overall Experience">Overall Experience</option>
                    <option value="Feature Suggestion">Feature Suggestion</option>
                    <option value="UI / Design">UI / Design</option>
                    <option value="Performance">Performance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                {/* Feedback Message */}
                <div className="form-group">
                  <label className="form-label">Feedback Message</label>
                  <textarea
                    name="message"
                    value={feedbackForm.message}
                    onChange={handleFeedbackChange}
                    placeholder="Tell us what you liked or what we can improve…"
                    className="form-textarea"
                    rows="4"
                  />
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={feedbackSubmitting}
                  className="submit-btn primary-btn"
                >
                  {feedbackSubmitting ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          </div>
          
          {/* Support Form Section */}
          <div className="form-section">
            <div className="form-card">
              <h2 className="form-title">Raise a Query</h2>
              
              <form onSubmit={submitSupportQuery} className="support-form">
                {/* Query Category */}
                <div className="form-group">
                  <label className="form-label">Query Category</label>
                  <select
                    name="category"
                    value={supportForm.category}
                    onChange={handleSupportChange}
                    className="form-select"
                  >
                    <option value="Fees / Payments">Fees / Payments</option>
                    <option value="Attendance">Attendance</option>
                    <option value="Salary">Salary</option>
                    <option value="Reports">Reports</option>
                    <option value="Technical Issue">Technical Issue</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                {/* Priority */}
                <div className="form-group">
                  <label className="form-label">Priority (Optional)</label>
                  <select
                    name="priority"
                    value={supportForm.priority}
                    onChange={handleSupportChange}
                    className="form-select"
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>
                
                {/* Query Description */}
                <div className="form-group">
                  <label className="form-label">Query Description</label>
                  <textarea
                    name="description"
                    value={supportForm.description}
                    onChange={handleSupportChange}
                    placeholder="Describe your issue or question in detail…"
                    className="form-textarea"
                    rows="4"
                    required
                  />
                </div>
                
                {/* Contact Email */}
                <div className="form-group">
                  <label className="form-label">Contact Email</label>
                  <input
                    type="email"
                    name="email"
                    value={supportForm.email}
                    onChange={handleSupportChange}
                    placeholder="your.email@example.com"
                    className="form-input"
                  />
                </div>
                
                {/* Screenshot Upload */}
                <div className="form-group">
                  <label className="form-label">Screenshot (Optional)</label>
                  <div className="screenshot-upload">
                    <input
                      type="file"
                      id="screenshot-upload"
                      accept="image/*"
                      onChange={handleScreenshotChange}
                      className="screenshot-input"
                    />
                    <label htmlFor="screenshot-upload" className="screenshot-upload-label">
                      {screenshot ? 'Change Screenshot' : 'Upload Screenshot'}
                    </label>
                    
                    {screenshotPreview && (
                      <div className="screenshot-preview">
                        <img src={screenshotPreview} alt="Preview" className="preview-image" />
                        <button 
                          type="button"
                          className="remove-screenshot"
                          onClick={removeScreenshot}
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={supportSubmitting}
                  className="submit-btn primary-btn"
                >
                  {supportSubmitting ? 'Submitting...' : 'Submit Query'}
                </button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </RootLayout>
  );
};

export default FeedbackSupport;