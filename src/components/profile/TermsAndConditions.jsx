import React from 'react';
import RootLayout from '../common/RootLayout';
import './TermsAndConditions.css';

const TermsAndConditions = () => {
  return (
    <RootLayout>
      <div className="terms-conditions-container">
        <div className="terms-conditions-header">
          <h1>Terms and Conditions</h1>
          <p className="header-subtitle">Please read these terms carefully before using our services</p>
        </div>
        
        <div className="terms-content">
          <div className="terms-section">
            <h2>1. Introduction</h2>
            <p>
              These terms and conditions govern your use of our fee management system and outline the 
              agreement between us and you regarding your use of our services. By accessing or using 
              our application, you agree to be bound by these terms.
            </p>
          </div>
          
          <div className="terms-section">
            <h2>2. Service Description</h2>
            <p>
              Our fee management system is designed to help educational institutions manage student 
              fees, payments, and related administrative tasks. The service is provided "as is" and 
              we reserve the right to modify or discontinue any aspect of the service at any time.
            </p>
          </div>
          
          <div className="terms-section">
            <h2>3. User Responsibilities</h2>
            <p>
              As a user of our service, you agree to:
            </p>
            <ul>
              <li>Provide accurate and current information</li>
              <li>Maintain the security of your account credentials</li>
              <li>Use the service in compliance with applicable laws</li>
              <li>Not misuse the service or help anyone else do so</li>
              <li>Respect the privacy of other users' data</li>
            </ul>
          </div>
          
          <div className="terms-section">
            <h2>4. Data and Privacy</h2>
            <p>
              We are committed to protecting your privacy and handling your data responsibly. All 
              personal and institutional data is stored securely and used only for the intended 
              purposes of fee management. We implement appropriate security measures to protect 
              against unauthorized access, alteration, disclosure, or destruction of your data.
            </p>
          </div>
          
          <div className="terms-section">
            <h2>5. Limitation of Liability</h2>
            <p>
              Our service is provided on an "as-is" and "as-available" basis. We make no warranties, 
              express or implied, regarding the operation or availability of the service. We shall 
              not be liable for any damages resulting from the use of our service.
            </p>
          </div>
          
          <div className="terms-section">
            <h2>6. Changes to Terms</h2>
            <p>
              We reserve the right to modify these terms at any time. Changes will be effective 
              immediately upon posting to our application. Your continued use of the service after 
              changes have been posted constitutes acceptance of the modified terms.
            </p>
          </div>
          
          <div className="terms-section">
            <h2>7. Termination</h2>
            <p>
              We may terminate or suspend your access to our service immediately, without prior 
              notice or liability, for any reason whatsoever, including without limitation if you 
              breach these terms.
            </p>
          </div>
          
          <div className="terms-section">
            <h2>8. Contact Information</h2>
            <p>
              If you have any questions about these terms, please contact us through our 
              support system or email us at support@vpa-fees.com.
            </p>
          </div>
        </div>
      </div>
    </RootLayout>
  );
};

export default TermsAndConditions;