import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { doc, setDoc, getDoc, onSnapshot, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../../firebase/firebaseConfig';
import { getCurrentUserUID, isAuthenticated } from '../../utils/auth';

import './Settings.css';

const Settings = () => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({
    notifications: true,
    darkMode: false,
    emailReports: true,
    autoSync: true
  });

  // Branding state
  const [firmName, setFirmName] = useState('');
  const [tempFirmName, setTempFirmName] = useState('');
  const [firmAddress, setFirmAddress] = useState('');
  const [tempFirmAddress, setTempFirmAddress] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState(null);
  
  // Signature and stamp state
  const [signatureUrl, setSignatureUrl] = useState('');
  const [signatureFile, setSignatureFile] = useState(null);
  const [stampUrl, setStampUrl] = useState('');
  const [stampFile, setStampFile] = useState(null);
  
  // Theme customization state
  const [primaryColor, setPrimaryColor] = useState('#3B82F6');
  const [accentColor, setAccentColor] = useState('#10B981');
  const [backgroundColor, setBackgroundColor] = useState('#FFFFFF');
  const [sidebarGradient, setSidebarGradient] = useState('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
  
  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: '' });
  
  // Toggle state for hiding/showing branding section
  const [showBrandingSection, setShowBrandingSection] = useState(true);
  
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dataLoaded, setDataLoaded] = useState(false); // Track if Firestore data has been loaded
  
  // PIN lock state
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [pin, setPin] = useState('');
  const [storedPin, setStoredPin] = useState('');

  useEffect(() => {
    // Load settings from localStorage if available
    const savedSettings = localStorage.getItem('appSettings');
    if (savedSettings) {
      setSettings(JSON.parse(savedSettings));
    }
    
    // Load branding data from Firestore
    loadBrandingDataFromFirestore();
    
      // Load PIN from Firestore
    loadPinFromFirestore();
  }, []);
  
  // Save PIN to Firestore when it changes
  useEffect(() => {
    if (storedPin && isAuthenticated()) {
      savePinToFirestore(storedPin);
    }
  }, [storedPin]);
  
  // Save PIN to Firestore
  const savePinToFirestore = async (pin) => {
    try {
      const uid = getCurrentUserUID();
      const settingsDoc = doc(db, `users/${uid}/settings/profile`);
      
      await setDoc(settingsDoc, { brandingPin: pin }, { merge: true });
    } catch (error) {
      console.error('Error saving PIN to Firestore:', error);
    }
  };
  
  // Load PIN from Firestore
  const loadPinFromFirestore = async () => {
    if (!isAuthenticated()) {
      return;
    }
    
    try {
      const uid = getCurrentUserUID();
      const settingsDocRef = doc(db, `users/${uid}/settings/profile`);
      const docSnap = await getDoc(settingsDocRef);
      
      if (docSnap.exists() && docSnap.data().brandingPin) {
        setStoredPin(docSnap.data().brandingPin);
      }
    } catch (error) {
      console.error('Error loading PIN from Firestore:', error);
    }
  };
  
  // Apply theme settings to document whenever they change
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--bg-color', backgroundColor);
    document.documentElement.style.setProperty('--sidebar-gradient', sidebarGradient);
  }, [primaryColor, accentColor, backgroundColor, sidebarGradient]);

  const loadBrandingDataFromFirestore = async () => {
    if (!isAuthenticated()) {
      setDataLoaded(true);
      return;
    }
    
    try {
      setLoading(true);
      const uid = getCurrentUserUID();
      const settingsDoc = doc(db, `users/${uid}/settings/profile`);
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(settingsDoc, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.firmName !== undefined) {
            setFirmName(data.firmName || '');
            setTempFirmName(data.firmName || '');
          }
          if (data.firmAddress !== undefined) {
            setFirmAddress(data.firmAddress || '');
            setTempFirmAddress(data.firmAddress || '');
          }
          if (data.logoUrl !== undefined) {
            setLogoUrl(data.logoUrl || '');
          }
          if (data.signatureUrl !== undefined) {
            setSignatureUrl(data.signatureUrl || '');
          }
          if (data.stampUrl !== undefined) {
            setStampUrl(data.stampUrl || '');
          }
          // Load theme settings if they exist
          if (data.primaryColor) setPrimaryColor(data.primaryColor);
          if (data.accentColor) setAccentColor(data.accentColor);
          if (data.backgroundColor) setBackgroundColor(data.backgroundColor);
          if (data.sidebarGradient) setSidebarGradient(data.sidebarGradient);
        }
        setDataLoaded(true); // Mark data as loaded
        setLoading(false);
      }, (error) => {
        console.error('Error loading branding data:', error);
        setDataLoaded(true); // Mark data as loaded even if there's an error
        setLoading(false);
      });
      
      // Clean up listener on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Error setting up branding data listener:', error);
      setDataLoaded(true); // Mark data as loaded even if there's an error
      setLoading(false);
    }
  };

  // Show toast notification
  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast({ show: false, message: '', type: '' });
    }, 3000);
  };

  // Save all settings
  const handleSaveAllSettings = async () => {
    if (!isAuthenticated()) {
      alert('Please log in to save settings');
      showToast('Please log in to save settings', 'error');
      return;
    }
    
    try {
      const uid = getCurrentUserUID();
      const settingsDoc = doc(db, `users/${uid}/settings/profile`);
      
      // Prepare data to save
      const dataToSave = {
        firmName: tempFirmName,
        firmAddress: tempFirmAddress,
        primaryColor,
        accentColor,
        backgroundColor,
        sidebarGradient
      };
      
      // Save all settings
      await setDoc(settingsDoc, dataToSave, { merge: true });
      
      // Update local state
      setFirmName(tempFirmName);
      setFirmAddress(tempFirmAddress);
      
      showToast('All settings saved successfully!', 'success');
      
      // Apply theme changes immediately
      document.documentElement.style.setProperty('--primary-color', primaryColor);
      document.documentElement.style.setProperty('--accent-color', accentColor);
      document.documentElement.style.setProperty('--bg-color', backgroundColor);
      document.documentElement.style.setProperty('--sidebar-gradient', sidebarGradient);
    } catch (error) {
      console.error('Error saving settings:', error);
      alert('Error saving settings. Please try again.');
      showToast('Error saving settings', 'error');
    }
  };

  const handleSettingChange = (settingName) => {
    const updatedSettings = {
      ...settings,
      [settingName]: !settings[settingName]
    };
    setSettings(updatedSettings);
    localStorage.setItem('appSettings', JSON.stringify(updatedSettings));
    
    // Add a subtle animation effect when toggling settings
    const element = document.querySelector(`input[name="${settingName}"]`).closest('.setting-item');
    if (element) {
      element.style.transition = 'all 0.3s ease';
      element.style.transform = 'scale(0.98)';
      element.style.opacity = '0.8';
      setTimeout(() => {
        element.style.transform = 'scale(1)';
        element.style.opacity = '1';
      }, 150);
    }
    
    // Add ripple effect to the switch
    const switchElement = document.querySelector(`input[name="${settingName}"]`).nextSibling;
    if (switchElement) {
      switchElement.classList.add('ripple');
      setTimeout(() => {
        switchElement.classList.remove('ripple');
      }, 300);
    }
    
    // Apply dark mode immediately
    if (settingName === 'darkMode') {
      if (updatedSettings.darkMode) {
        document.documentElement.setAttribute('data-theme', 'dark');
        showToast('Dark mode enabled', 'info');
      } else {
        document.documentElement.removeAttribute('data-theme');
        showToast('Light mode enabled', 'info');
      }
    }
  };

  // Handle firm name change
  const handleFirmNameChange = (e) => {
    setTempFirmName(e.target.value);
    
    // Add typing effect
    const inputElement = e.target;
    inputElement.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.4)';
    setTimeout(() => {
      inputElement.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.2)';
    }, 300);
  };

  // Handle firm address change
  const handleFirmAddressChange = (e) => {
    setTempFirmAddress(e.target.value);
    
    // Add typing effect
    const textareaElement = e.target;
    textareaElement.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.4)';
    setTimeout(() => {
      textareaElement.style.boxShadow = '0 0 0 3px rgba(52, 152, 219, 0.2)';
    }, 300);
  };

  // Handle logo file selection
  const handleLogoChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is an image
      if (file.type.startsWith('image/')) {
        setLogoFile(file);
        
        // Add visual feedback
        const label = document.querySelector('label[for="logo-upload"]');
        if (label) {
          label.classList.add('file-selected');
          setTimeout(() => {
            label.classList.remove('file-selected');
          }, 1000);
        }
        
        showToast('Logo selected for upload', 'info');
      } else {
        alert('Please select a valid image file (PNG or JPG)');
        showToast('Invalid file type. Please select PNG or JPG', 'error');
      }
    }
  };

  // Handle signature file selection
  const handleSignatureChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is an image
      if (file.type.startsWith('image/')) {
        setSignatureFile(file);
        
        // Add visual feedback
        const label = document.querySelector('label[for="signature-upload"]');
        if (label) {
          label.classList.add('file-selected');
          setTimeout(() => {
            label.classList.remove('file-selected');
          }, 1000);
        }
        
        showToast('Signature selected for upload', 'info');
      } else {
        alert('Please select a valid image file (PNG or JPG)');
        showToast('Invalid file type. Please select PNG or JPG', 'error');
      }
    }
  };

  // Handle stamp file selection
  const handleStampChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is an image
      if (file.type.startsWith('image/')) {
        setStampFile(file);
        
        // Add visual feedback
        const label = document.querySelector('label[for="stamp-upload"]');
        if (label) {
          label.classList.add('file-selected');
          setTimeout(() => {
            label.classList.remove('file-selected');
          }, 1000);
        }
        
        showToast('Stamp selected for upload', 'info');
      } else {
        alert('Please select a valid image file (PNG or JPG)');
        showToast('Invalid file type. Please select PNG or JPG', 'error');
      }
    }
  };

  // Upload logo to Firebase Storage
  const uploadLogo = async () => {
    if (!logoFile || !isAuthenticated()) return null;
    
    try {
      const uid = getCurrentUserUID();
      const logoRef = ref(storage, `users/${uid}/branding/logo.png`);
      
      // Upload file
      const snapshot = await uploadBytes(logoRef, logoFile);
      
      // Get download URL
      const url = await getDownloadURL(snapshot.ref);
      // Note: We don't set the logoUrl here anymore, we'll set it after saving to Firestore
      return url;
    } catch (error) {
      console.error('Error uploading logo:', error);
      alert('Error uploading logo. Please try again.');
      showToast('Error uploading logo', 'error');
      return null;
    }
  };

  // Upload signature to Firebase Storage
  const uploadSignature = async () => {
    if (!signatureFile || !isAuthenticated()) return null;
    
    try {
      const uid = getCurrentUserUID();
      const signatureRef = ref(storage, `users/${uid}/branding/signature.png`);
      
      // Upload file
      const snapshot = await uploadBytes(signatureRef, signatureFile);
      
      // Get download URL
      const url = await getDownloadURL(snapshot.ref);
      // Note: We don't set the signatureUrl here anymore, we'll set it after saving to Firestore
      return url;
    } catch (error) {
      console.error('Error uploading signature:', error);
      alert('Error uploading signature. Please try again.');
      showToast('Error uploading signature', 'error');
      return null;
    }
  };

  // Upload stamp to Firebase Storage
  const uploadStamp = async () => {
    if (!stampFile || !isAuthenticated()) return null;
    
    try {
      const uid = getCurrentUserUID();
      const stampRef = ref(storage, `users/${uid}/branding/stamp.png`);
      
      // Upload file
      const snapshot = await uploadBytes(stampRef, stampFile);
      
      // Get download URL
      const url = await getDownloadURL(snapshot.ref);
      // Note: We don't set the stampUrl here anymore, we'll set it after saving to Firestore
      return url;
    } catch (error) {
      console.error('Error uploading stamp:', error);
      alert('Error uploading stamp. Please try again.');
      showToast('Error uploading stamp', 'error');
      return null;
    }
  };

  // Save branding data to Firestore
  const handleSaveBranding = async () => {
    if (!isAuthenticated()) {
      alert('Please log in to save settings');
      showToast('Please log in to save settings', 'error');
      return;
    }
    
    
    
    // Check if PIN is set, if not, show PIN setup
    if (!storedPin) {
      setShowPinDialog(true);
      return;
    }
    
    // If PIN is set, proceed with PIN verification
    const enteredPin = prompt('Enter PIN to save branding:');
    if (enteredPin !== storedPin) {
      alert('Incorrect PIN. Save operation cancelled.');
      showToast('Incorrect PIN. Save operation cancelled.', 'error');
      return;
    }
    
    // Proceed with saving branding
    await performSaveBranding();
  };
  
  // Actual save branding implementation
  const performSaveBranding = async () => {
    
    try {
      setLoading(true);
      setUploading(true); // Set uploading state at the beginning of the process
      const uid = getCurrentUserUID();
      const settingsDoc = doc(db, `users/${uid}/settings/profile`);
      
      // Upload logo if a new file is selected
      let logoUrlToSave = logoUrl;
      if (logoFile) {
        logoUrlToSave = await uploadLogo();
        if (!logoUrlToSave) {
          throw new Error('Failed to upload logo');
        }
        showToast('Logo uploaded successfully', 'success');
      }
      
      // Upload signature if a new file is selected
      let signatureUrlToSave = signatureUrl;
      if (signatureFile) {
        signatureUrlToSave = await uploadSignature();
        if (!signatureUrlToSave) {
          throw new Error('Failed to upload signature');
        }
        showToast('Signature uploaded successfully', 'success');
      }
      
      // Upload stamp if a new file is selected
      let stampUrlToSave = stampUrl;
      if (stampFile) {
        stampUrlToSave = await uploadStamp();
        if (!stampUrlToSave) {
          throw new Error('Failed to upload stamp');
        }
        showToast('Stamp uploaded successfully', 'success');
      }
      
      // Prepare branding data
      const brandingData = {
        firmName: tempFirmName || '',
        firmAddress: tempFirmAddress || '',
        logoUrl: logoUrlToSave || '',
        signatureUrl: signatureUrlToSave || '',
        stampUrl: stampUrlToSave || '',
        lastUpdated: new Date()
      };
      
      // Save branding data to Firestore
      await setDoc(settingsDoc, brandingData, { merge: true });
      
      // Save PIN separately to ensure it's not overwritten
      if (storedPin) {
        await savePinToFirestore(storedPin);
      }
      
      showToast('Branding saved successfully!', 'success');
      
      // Create confetti effect for successful save
      createConfettiEffect();
      
      // Update local state
      setFirmName(tempFirmName);
      setFirmAddress(tempFirmAddress);
      setLogoUrl(logoUrlToSave || '');
      setSignatureUrl(signatureUrlToSave || '');
      setStampUrl(stampUrlToSave || '');
      
      // Clear file inputs
      setLogoFile(null);
      setSignatureFile(null);
      setStampFile(null);
      
    } catch (error) {
      console.error('Error saving branding:', error);
      showToast('Error saving branding: ' + error.message, 'error');
    } finally {
      setLoading(false);
      setUploading(false);
    }
  };
  


      

  // Create confetti effect for successful save
  const createConfettiEffect = () => {
    const button = document.querySelector('.branding-save');
    if (!button) return;
    
    const rect = button.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    
    for (let i = 0; i < 50; i++) {
      const confetti = document.createElement('div');
      confetti.className = 'confetti';
      confetti.style.left = `${x}px`;
      confetti.style.top = `${y}px`;
      confetti.style.backgroundColor = getRandomColor();
      confetti.style.transform = `rotate(${Math.random() * 360}deg)`;
      confetti.style.width = `${Math.random() * 10 + 5}px`;
      confetti.style.height = confetti.style.width;
      document.body.appendChild(confetti);
      
      // Animate confetti
      const angle = Math.random() * Math.PI * 2;
      const velocity = 3 + Math.random() * 4;
      let vx = Math.cos(angle) * velocity;
      let vy = Math.sin(angle) * velocity;
      
      let posX = x;
      let posY = y;
      let opacity = 1;
      let rotation = 0;
      
      const animate = () => {
        posX += vx;
        posY += vy;
        vy += 0.2; // gravity
        opacity -= 0.015;
        rotation += 5;
        
        confetti.style.left = `${posX}px`;
        confetti.style.top = `${posY}px`;
        confetti.style.opacity = opacity;
        confetti.style.transform = `rotate(${rotation}deg)`;
        
        if (opacity > 0) {
          requestAnimationFrame(animate);
        } else {
          confetti.remove();
        }
      };
      
      requestAnimationFrame(animate);
    }
  };

  // Get random color for confetti
  const getRandomColor = () => {
    const colors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b', '#6f42c1'];
    return colors[Math.floor(Math.random() * colors.length)];
  };

  // Handle color change
  const handleColorChange = (colorType, value) => {
    switch (colorType) {
      case 'primary':
        setPrimaryColor(value);
        showToast('Primary color updated', 'info');
        break;
      case 'accent':
        setAccentColor(value);
        showToast('Accent color updated', 'info');
        break;
      case 'background':
        setBackgroundColor(value);
        showToast('Background color updated', 'info');
        break;
      case 'sidebar':
        setSidebarGradient(value);
        showToast('Sidebar gradient updated', 'info');
        break;
      default:
        break;
    }
  };

  // Reset theme to default values
  const handleResetDefaults = () => {
    setPrimaryColor('#3B82F6');
    setAccentColor('#10B981');
    setBackgroundColor('#FFFFFF');
    setSidebarGradient('linear-gradient(135deg, #667eea 0%, #764ba2 100%)');
    showToast('Theme reset to defaults', 'success');
  };

  // Apply theme to the document
  useEffect(() => {
    document.documentElement.style.setProperty('--primary-color', primaryColor);
    document.documentElement.style.setProperty('--accent-color', accentColor);
    document.documentElement.style.setProperty('--bg-color', backgroundColor);
    
    // Update sidebar gradient
    const sidebar = document.querySelector('.sidebar');
    if (sidebar) {
      sidebar.style.background = sidebarGradient;
    }
  }, [primaryColor, accentColor, backgroundColor, sidebarGradient]);

  // Render nothing until data is loaded to prevent flickering
  if (!dataLoaded) {
    return (
      <div className="settings-container">
        <div className="loading-indicator">
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div className="settings-container">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          {toast.message}
        </div>
      )}
      
      <div className="settings-header">
        <h1>Settings</h1>
        <p>Manage your application preferences</p>
      </div>

      {/* Academy Branding Section */}
      <div className={`settings-section ${!showBrandingSection ? 'collapsed' : ''}`}>
        <div className="section-header">
          <h2>🏫 Academy Profile & Branding</h2>
          <button 
            className="toggle-button"
            onClick={() => setShowBrandingSection(!showBrandingSection)}
          >
            {showBrandingSection ? 'Hide' : 'Show'}
          </button>
        </div>
        
        <div className={`section-content ${showBrandingSection ? 'open' : ''}`}>
          <div className="branding-content">
            {/* Logo Upload */}
            <div className="setting-item">
              <div className="setting-info">
                <h3>🏢 Academy Logo</h3>
                <p>Upload your academy logo (PNG or JPG)</p>
                <p style={{fontSize: '12px', color: '#7f8c8d', marginTop: '5px'}}>PNG recommended. Transparent background preferred.</p>
              </div>
              <div className="logo-upload-controls">
                <div className="logo-preview">
                  {logoUrl ? (
                    <img src={logoUrl} alt="Academy Logo" className="logo-image" />
                  ) : (
                    <div className="logo-placeholder">Click to Upload</div>
                  )}
                </div>
                <div className="logo-upload-area">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleLogoChange}
                    className="logo-input"
                    id="logo-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="logo-upload" className="upload-button">
                    📤 {uploading ? 'Uploading...' : 'Choose File'}
                  </label>
                  {logoFile && <span className="file-name">{logoFile.name}</span>}
                </div>
              </div>
            </div>
            
            {/* Signature Upload */}
            <div className="setting-item">
              <div className="setting-info">
                <h3>✍️ Authorized Signature</h3>
                <p>Upload your authorized signature (PNG/JPG with transparent background preferred)</p>
                <p style={{fontSize: '12px', color: '#7f8c8d', marginTop: '5px'}}>Used in receipts and payment slips</p>
              </div>
              <div className="signature-upload-controls">
                <div className="signature-preview">
                  {signatureUrl ? (
                    <img src={signatureUrl} alt="Authorized Signature" className="signature-image" />
                  ) : (
                    <div className="signature-placeholder">Click to Upload</div>
                  )}
                </div>
                <div className="signature-upload-area">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleSignatureChange}
                    className="signature-input"
                    id="signature-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="signature-upload" className="upload-button">
                    📝 {uploading ? 'Uploading...' : 'Choose File'}
                  </label>
                  {signatureFile && <span className="file-name">{signatureFile.name}</span>}
                </div>
              </div>
            </div>
            
            {/* Stamp Upload */}
            <div className="setting-item">
              <div className="setting-info">
                <h3>🏷️ Official Stamp / Seal</h3>
                <p>Upload your official stamp or seal (PNG/JPG, circular preferred)</p>
                <p style={{fontSize: '12px', color: '#7f8c8d', marginTop: '5px'}}>Used on receipts & paid invoices</p>
              </div>
              <div className="stamp-upload-controls">
                <div className="stamp-preview">
                  {stampUrl ? (
                    <img src={stampUrl} alt="Official Stamp" className="stamp-image" />
                  ) : (
                    <div className="stamp-placeholder">Click to Upload</div>
                  )}
                </div>
                <div className="stamp-upload-area">
                  <input
                    type="file"
                    accept="image/png, image/jpeg"
                    onChange={handleStampChange}
                    className="stamp-input"
                    id="stamp-upload"
                    disabled={uploading}
                  />
                  <label htmlFor="stamp-upload" className="upload-button">
                    🏷️ {uploading ? 'Uploading...' : 'Choose File'}
                  </label>
                  {stampFile && <span className="file-name">{stampFile.name}</span>}
                </div>
              </div>
            </div>
            
            {/* Academy Name & Address - Two Column Layout */}
            <div className="setting-item form-group-row">
              <div className="form-group-col">
                <div className="setting-info">
                  <h3>🏫 Academy Name</h3>
                  <p>Enter your academy or institution name</p>
                </div>
                <div className="firm-name-controls">
                  <input
                    type="text"
                    value={tempFirmName}
                    onChange={handleFirmNameChange}
                    placeholder="Enter Academy Name"
                    className="firm-name-input"
                    disabled={loading}
                  />
                </div>
              </div>
              
              <div className="form-group-col">
                <div className="setting-info">
                  <h3>📍 Academy Address</h3>
                  <p>Enter your academy's full address</p>
                </div>
                <div className="firm-address-controls">
                  <textarea
                    value={tempFirmAddress}
                    onChange={handleFirmAddressChange}
                    placeholder="Enter Academy Address"
                    className="firm-address-input"
                    disabled={loading}
                    rows="3"
                  />
                </div>
              </div>
            </div>
            
            {/* Real-time Preview Section */}
            <div className="setting-item preview-section">
              <div className="setting-info">
                <h3>👁️ Live Preview</h3>
                <p>See how your branding will appear in receipts</p>
              </div>
              <div className="live-preview-wrapper">
                <div className="preview-card receipt-preview-mini">
                <div className="receipt-header-preview">
                  <div className="receipt-header-content">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Preview Logo" className="receipt-preview-logo" />
                    ) : (
                      <div className="receipt-placeholder-logo">🏫</div>
                    )}
                    <div className="receipt-academy-info">
                      <h4 className="receipt-academy-name">{tempFirmName || 'Academy Name'}</h4>
                      <p className="receipt-academy-address">{tempFirmAddress || 'Academy Address'}</p>
                    </div>
                  </div>
                  <div className="receipt-title-preview">Fee Receipt</div>
                </div>
                <div className="receipt-body-preview">
                  <div className="receipt-details-preview">
                    <div className="receipt-detail-row">
                      <span className="receipt-label">Receipt No:</span>
                      <span className="receipt-value">RCT-001</span>
                    </div>
                    <div className="receipt-detail-row">
                      <span className="receipt-label">Date:</span>
                      <span className="receipt-value">{new Date().toLocaleDateString()}</span>
                    </div>
                    <div className="receipt-detail-row">
                      <span className="receipt-label">Student:</span>
                      <span className="receipt-value">John Doe</span>
                    </div>
                  </div>
                  <div className="receipt-amount-preview">
                    <div className="amount-row-preview">
                      <span>Amount Paid:</span>
                      <span>₹5,000.00</span>
                    </div>
                    <div className="amount-row-preview total-preview">
                      <span>Total:</span>
                      <span>₹5,000.00</span>
                    </div>
                  </div>
                </div>
                <div className="receipt-signatures-preview">
                  <div className="signature-section-preview">
                    {signatureUrl ? (
                      <div className="signature-item">
                        <div className="signature-label">Authorized Signature:</div>
                        <img src={signatureUrl} alt="Signature" className="signature-preview-img" />
                      </div>
                    ) : (
                      <div className="signature-item">
                        <div className="signature-label">Authorized Signature:</div>
                        <div className="signature-placeholder">[Signature]</div>
                      </div>
                    )}
                    
                    {stampUrl ? (
                      <div className="signature-item">
                        <div className="signature-label">Official Stamp:</div>
                        <img src={stampUrl} alt="Stamp" className="stamp-preview-img" />
                      </div>
                    ) : (
                      <div className="signature-item">
                        <div className="signature-label">Official Stamp:</div>
                        <div className="stamp-placeholder">[Stamp]</div>
                      </div>
                    )}
                  </div>
                </div>
                <div className="receipt-footer-preview">
                  Thank you for your payment!
                </div>
              </div>
            </div>
          </div>
            
            <div className="branding-save-controls">
              <button 
                className="save-button branding-save"
                onClick={handleSaveBranding}
                disabled={loading || uploading}
              >
                💾 {loading || uploading ? 'Saving...' : 'Save Branding'}
              </button>
            </div>
            

          </div>
        </div>
      </div>

      <div className="settings-section">
        <h2>🎨 Theme Customization <span className="disabled-label">(Disabled)</span></h2>
        <div className="setting-item">
          <div className="setting-info">
            <h3>🎨 Primary Color</h3>
            <p>Choose your primary brand color</p>
          </div>
          <div className="color-picker">
            <input 
              type="color" 
              value={primaryColor} 
              onChange={(e) => handleColorChange('primary', e.target.value)} 
              disabled
            />
          </div>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <h3>✨ Accent Color</h3>
            <p>Choose your accent color</p>
          </div>
          <div className="color-picker">
            <input 
              type="color" 
              value={accentColor} 
              onChange={(e) => handleColorChange('accent', e.target.value)} 
              disabled
            />
          </div>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <h3>⬜ Background Color</h3>
            <p>Choose your background color</p>
          </div>
          <div className="color-picker">
            <input 
              type="color" 
              value={backgroundColor} 
              onChange={(e) => handleColorChange('background', e.target.value)} 
              disabled
            />
          </div>
        </div>
        
        <div className="setting-item">
          <div className="setting-info">
            <h3>🌈 Sidebar Gradient</h3>
            <p>Choose your sidebar gradient</p>
          </div>
          <div className="gradient-picker">
            <select 
              value={sidebarGradient} 
              onChange={(e) => handleColorChange('sidebar', e.target.value)}
              disabled
            >
              <option value="linear-gradient(135deg, #667eea 0%, #764ba2 100%)">Purple Gradient</option>
              <option value="linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">Pink Gradient</option>
              <option value="linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)">Green Gradient</option>
              <option value="linear-gradient(135deg, #fa709a 0%, #fee140 100%)">Yellow Gradient</option>
              <option value="linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)">Blue Gradient</option>
            </select>
          </div>
        </div>
        
        {/* Theme Preview Box */}
        <div className="setting-item preview-section">
          <div className="setting-info">
            <h3>👁️ Live Theme Preview</h3>
            <p>See how your theme will look</p>
          </div>
          <div className="theme-preview-box" style={{background: backgroundColor}}>
            <div className="theme-sidebar-preview" style={{background: sidebarGradient}}></div>
            <div className="theme-content-preview">
              <div className="theme-header-preview" style={{color: primaryColor}}>Header Text</div>
              <div className="theme-body-preview">
                <div className="theme-card-preview" style={{borderColor: accentColor}}>
                  <div className="theme-card-header" style={{backgroundColor: primaryColor}}>Card Header</div>
                  <div className="theme-card-body">Card Content</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Reset Defaults Button */}
        <div className="setting-item">
          <div className="setting-info">
            <h3>🔄 Reset Theme Defaults</h3>
            <p>Reset all theme settings to default values</p>
            <p style={{fontSize: '12px', color: '#7f8c8d', marginTop: '5px'}}>
              Primary Color: Controls navbar & header gradients<br/>
              Accent Color: Controls button colors<br/>
              Background Color: Controls dashboard background
            </p>
          </div>
          <button 
            className="reset-button"
            onClick={handleResetDefaults}
            disabled
          >
            Reset to Defaults
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2>🌙 Dark Mode & Sync <span className="disabled-label">(Disabled)</span></h2>
        <div className="setting-item dark-mode-toggle-large">
          <div className="setting-info">
            <h3>🌙 Dark Mode</h3>
            <p>Enable dark theme for the application</p>
            <p style={{fontSize: '12px', color: '#7f8c8d', marginTop: '5px'}}>Automatically adapts dashboard, sidebar & charts</p>
          </div>
          <div className="large-toggle-container">
            <label className="switch-large">
              <input
                type="checkbox"
                checked={settings.darkMode}
                onChange={() => handleSettingChange('darkMode')}
                name="darkMode"
                disabled
              />
              <span className="slider-large"></span>
            </label>
          </div>
        </div>
        
        {/* Dark Mode Preview Box */}
        <div className="setting-item preview-section">
          <div className="setting-info">
            <h3>👁️ Dark Mode Preview</h3>
            <p>See how the dark theme will look</p>
          </div>
          <div className="dark-mode-preview-box">
            <div className="preview-header-dark">
              <div className="preview-title-dark">
                <h4>Dark Mode Preview</h4>
                <p>This is how your app will look in dark mode</p>
              </div>
            </div>
            <div className="preview-content-dark">
              <div className="preview-card-dark">
                <div className="preview-card-header-dark">Sample Card</div>
                <div className="preview-card-body-dark">Card content with dark theme styling</div>
              </div>
            </div>
          </div>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>🔄 Auto Sync</h3>
            <p>Automatically sync data with cloud</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.autoSync}
              onChange={() => handleSettingChange('autoSync')}
              name="autoSync"
              disabled
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>

      <div className="settings-section">
        <h2>📬 Notifications</h2>
        <div className="setting-item">
          <div className="setting-info">
            <h3>📧 Email Reports</h3>
            <p>Receive monthly reports via email</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.emailReports}
              onChange={() => handleSettingChange('emailReports')}
              name="emailReports"
            />
            <span className="slider"></span>
          </label>
        </div>

        <div className="setting-item">
          <div className="setting-info">
            <h3>🔔 Push Notifications</h3>
            <p>Receive notifications for important updates</p>
          </div>
          <label className="switch">
            <input
              type="checkbox"
              checked={settings.notifications}
              onChange={() => handleSettingChange('notifications')}
              name="notifications"
            />
            <span className="slider"></span>
          </label>
        </div>
      </div>



      {/* PIN Setup Dialog */}
      {showPinDialog && (
        <div className="pin-dialog-overlay">
          <div className="pin-dialog">
            <h3>Set PIN for Branding Protection</h3>
            <p>Enter a 4-digit PIN to protect your branding settings:</p>
            <input
              type="password"
              maxLength="4"
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="Enter 4-digit PIN"
              className="pin-input"
            />
            <div className="pin-dialog-buttons">
              <button 
                className="cancel-button"
                onClick={() => {
                  setShowPinDialog(false);
                  setPin('');
                }}
              >
                Cancel
              </button>
              <button 
                className="save-button"
                onClick={async () => {
                  if (pin.length === 4) {
                    setStoredPin(pin);
                    // Save PIN to Firestore
                    await savePinToFirestore(pin);
                    setShowPinDialog(false);
                    // Now proceed with saving branding
                    await performSaveBranding();
                  } else {
                    alert('PIN must be 4 digits');
                  }
                }}
              >
                Set PIN & Save
              </button>
            </div>
          </div>
        </div>
      )}



      <div className="settings-footer">
        <button 
          className="save-button"
          onClick={handleSaveAllSettings}
        >
          💾 Save All Settings
        </button>
      </div>
    </div>
  );
};

export default Settings;