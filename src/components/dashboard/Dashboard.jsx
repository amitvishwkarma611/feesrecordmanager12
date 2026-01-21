import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Timestamp } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { auth } from '../../firebase/firebaseConfig';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebase/firebaseConfig';
import { getCurrentUserUID, isAuthenticated } from '../../utils/auth';
import { getStudents, getPayments, getExpenditures } from '../../services/firebaseService';
import StatCard from '../common/StatCard';
import PieChart from '../common/PieChart';
import LineChart from '../common/LineChart';
import BarChart from '../common/BarChart';  // Added BarChart import
import ExpenditureCard from '../common/ExpenditureCard';
import ProfitLossCard from '../common/ProfitLossCard';
import HistoryModal from './HistoryModal';
import Sparkline from '../common/Sparkline';
import SkeletonLoader from '../common/SkeletonLoader';
import RootLayout from '../common/RootLayout';
import AcademicYearSelector from '../common/AcademicYearSelector';
import whatsappReminder from '../../utils/whatsappReminder';

import './Dashboard.css';
const Dashboard = () => {
  const navigate = useNavigate();
  // For demonstration, we'll simulate role-based access
  // In a real application, this would come from user authentication
  const [userRole, setUserRole] = useState('Administrator'); // Can be 'Administrator' or 'Staff'
  
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalFees: 0,
    collectedFees: 0,
    pendingFees: 0,
    todayCollections: 0,
    // New statistics
    overduePayments: 0,
    completedPayments: 0,
    avgPaymentAmount: 0
  });

  const [displayStats, setDisplayStats] = useState({
    totalStudents: 0,
    totalFees: 0,
    collectedFees: 0,
    pendingFees: 0,
    todayCollections: 0,
    overduePayments: 0,
    completedPayments: 0,
    avgPaymentAmount: 0,
    collectionRate: 0
  });

  const [loading, setLoading] = useState(true);

  // Sample trend data for sparklines (in a real app, this would come from actual data)
  const [trendData, setTrendData] = useState({
    totalStudents: [],
    totalFees: [],
    collectedFees: [],
    pendingFees: [],
    todayCollections: [],
    collectionRate: [],
    // Additional trend data for secondary cards
    overduePayments: [],
    completedPayments: [],
    avgPaymentAmount: []
  });

  const [monthlyData, setMonthlyData] = useState([]);
  const [feeDistribution, setFeeDistribution] = useState({ collected: 0, pending: 0 });
  const [collectionTrendData, setCollectionTrendData] = useState([]);
  const [monthlyFeePerformanceData, setMonthlyFeePerformanceData] = useState([]); // New state for bar chart
  const [searchTerm, setSearchTerm] = useState('');
  // New state for additional charts
  const [paymentStatusData, setPaymentStatusData] = useState([]);
  // State for history modal
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  // State for insights section
  const [showInsights, setShowInsights] = useState(true);
  // State for user menu dropdown
  const [showUserMenu, setShowUserMenu] = useState(false);
  // State for overdue students
  const [overdueStudents, setOverdueStudents] = useState([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [showClassDropdown, setShowClassDropdown] = useState(false);

  const insightsContentRef = useRef(null);

  useEffect(() => {
    fetchData();
      
    // Load branding data from Firestore
    loadBrandingDataFromFirestore();
      
    // Listen for payment events to refresh dashboard
    const handlePaymentUpdate = () => {
      fetchData();
    };
  
    window.addEventListener('paymentAdded', handlePaymentUpdate);
    window.addEventListener('paymentRecorded', handlePaymentUpdate);
    window.addEventListener('paymentUpdated', handlePaymentUpdate);
    window.addEventListener('paymentDeleted', handlePaymentUpdate);
    window.addEventListener('studentsUpdated', handlePaymentUpdate);
    window.addEventListener('dashboardRefresh', handlePaymentUpdate);
    window.addEventListener('paymentsRefresh', handlePaymentUpdate);
  
    return () => {
      window.removeEventListener('paymentAdded', handlePaymentUpdate);
      window.removeEventListener('paymentRecorded', handlePaymentUpdate);
      window.removeEventListener('paymentUpdated', handlePaymentUpdate);
      window.removeEventListener('paymentDeleted', handlePaymentUpdate);
      window.removeEventListener('studentsUpdated', handlePaymentUpdate);
      window.removeEventListener('dashboardRefresh', handlePaymentUpdate);
      window.removeEventListener('paymentsRefresh', handlePaymentUpdate);
    };
  }, []);
  
  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showUserMenu && event.target.closest('.avatar-dropdown') === null) {
        setShowUserMenu(false);
      }
        
      if (showClassDropdown && event.target.closest('.send-reminder-container') === null) {
        setShowClassDropdown(false);
      }
    };
  
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showUserMenu, showClassDropdown]);

  // Animate numbers when stats change
  useEffect(() => {
    let startTimestamp = null;
    const duration = 1000; // 1 second animation
    
    const animateNumbers = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      
      setDisplayStats(prev => ({
        totalStudents: Math.floor(progress * stats.totalStudents + (1 - progress) * prev.totalStudents),
        totalFees: Math.floor(progress * stats.totalFees + (1 - progress) * prev.totalFees),
        collectedFees: Math.floor(progress * stats.collectedFees + (1 - progress) * prev.collectedFees),
        pendingFees: Math.floor(progress * stats.pendingFees + (1 - progress) * prev.pendingFees),
        todayCollections: Math.floor(progress * stats.todayCollections + (1 - progress) * prev.todayCollections),
        overduePayments: Math.floor(progress * stats.overduePayments + (1 - progress) * prev.overduePayments),
        completedPayments: Math.floor(progress * stats.completedPayments + (1 - progress) * prev.completedPayments),
        avgPaymentAmount: Math.floor(progress * stats.avgPaymentAmount + (1 - progress) * prev.avgPaymentAmount),
        collectionRate: Math.floor(progress * (stats.totalFees > 0 ? Math.round((stats.collectedFees / stats.totalFees) * 100) : 0) + (1 - progress) * prev.collectionRate)
      }));
      
      if (progress < 1) {
        requestAnimationFrame(animateNumbers);
      }
    };
    
    requestAnimationFrame(animateNumbers);
  }, [stats]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const students = await getStudents();
      const payments = await getPayments();
      const expenditures = await getExpenditures();
      
      // Detect overdue students using universal WhatsApp reminder logic
      const detectedOverdueStudents = students.filter(student => whatsappReminder.isOverdue(student));
      setOverdueStudents(detectedOverdueStudents);
      
      // Calculate statistics
      const totalStudents = students.length;
      const totalFees = students.reduce((sum, student) => sum + (parseFloat(student.totalFees) || 0), 0);
      const collectedFees = students.reduce((sum, student) => sum + (parseFloat(student.feesPaid) || 0), 0);
      const pendingFees = totalFees - collectedFees;
      
      // Calculate total expenditures
      const totalExpenditures = expenditures.reduce((sum, exp) => sum + (parseFloat(exp.total) || 0), 0);
      
      // Calculate today's collections using Firebase Timestamps
      // Today's Collection = Sum of payments created TODAY (not necessarily paid today)
      const today = new Date();
      // Normalize today's date to compare only year, month, and day (ignore time)
      const todayNormalized = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
      let todayCollections = 0;
      
      // Count students with overdue payments
      let overduePayments = 0;
      // Count completed payments
      let completedPayments = 0;
      // Calculate average payment amount
      let totalPaymentAmount = 0;
      let paymentCount = 0;
      
      // Track unique students with overdue payments
      const studentsWithOverduePayments = new Set();
      
      // Create a mapping of student IDs to their fees collection frequency
      const studentFrequencyMap = {};
      students.forEach(student => {
        studentFrequencyMap[student.id] = student.feesCollectionDate || '';
      });
      
      payments.forEach(payment => {
        // Count payments for statistics
        if (payment.status === 'paid') {
          completedPayments++;
          totalPaymentAmount += parseFloat(payment.amount) || 0;
          paymentCount++;
        } else if (payment.status === 'overdue') {
          // Check if this payment's student has a frequency that affects overdue status
          const studentFrequency = studentFrequencyMap[payment.studentId];
          if (studentFrequency === '2 installments' || studentFrequency === '3 installments' || studentFrequency === '4 installments') {
            // For longer frequencies, reduce overdue count since late payments are expected
            // For this implementation, we'll still count as overdue but could adjust based on frequency
            studentsWithOverduePayments.add(payment.studentId);
          } else {
            // Standard overdue count
            studentsWithOverduePayments.add(payment.studentId);
          }
        } else if (payment.status === 'pending') {
          // Check if pending payment should be considered overdue based on frequency
          const studentFrequency = studentFrequencyMap[payment.studentId];
          if (studentFrequency === 'Every Month') {
            // For monthly frequency, check if current date is past the 1st of the current month
            if (payment.dueDate) {
              const dueDate = typeof payment.dueDate === 'string' ? new Date(payment.dueDate) : payment.dueDate;
              const currentDate = new Date();
              
              // Check if the current date is past the 1st of the current month
              const firstOfCurrentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
              if (currentDate >= firstOfCurrentMonth) {
                studentsWithOverduePayments.add(payment.studentId);
              }
            } else {
              // If no due date set, still count as pending, not overdue
            }
          } else {
            // For other frequencies, check if payment is overdue based on frequency
            if (payment.dueDate) {
              const dueDate = typeof payment.dueDate === 'string' ? new Date(payment.dueDate) : payment.dueDate;
              const currentDate = new Date();
                        
              // Adjust overdue calculation based on frequency
              if (dueDate < currentDate) {
                // Check frequency and adjust accordingly
                if (studentFrequency === '2 installments') {
                  // For every 2 month, check if current date is past the 1st of the expected month
                  const paymentMonth = dueDate.getMonth();
                  const currentMonth = currentDate.getMonth();
                  const monthDiff = (currentDate.getFullYear() - dueDate.getFullYear()) * 12 + (currentMonth - paymentMonth);
                            
                  // If the difference in months is divisible by 2, check if we're past the 1st of that month
                  if (monthDiff >= 2 && monthDiff % 2 === 0) {
                    const expectedDueDate = new Date(currentDate.getFullYear(), currentMonth, 1);
                    if (currentDate >= expectedDueDate) {
                      studentsWithOverduePayments.add(payment.studentId);
                    }
                  } else if (monthDiff > 2 && monthDiff % 2 !== 0) {
                    // If odd number of months passed, check the previous even month
                    const prevEvenMonth = currentMonth - (monthDiff % 2);
                    const expectedDueDate = new Date(currentDate.getFullYear(), prevEvenMonth, 1);
                    if (currentDate >= expectedDueDate) {
                      studentsWithOverduePayments.add(payment.studentId);
                    }
                  }
                } else if (studentFrequency === '3 installments') {
                  // For every 3 month, check if current date is past the 1st of the expected month
                  const paymentMonth = dueDate.getMonth();
                  const currentMonth = currentDate.getMonth();
                  const monthDiff = (currentDate.getFullYear() - dueDate.getFullYear()) * 12 + (currentMonth - paymentMonth);
                            
                  if (monthDiff >= 3 && monthDiff % 3 === 0) {
                    const expectedDueDate = new Date(currentDate.getFullYear(), currentMonth, 1);
                    if (currentDate >= expectedDueDate) {
                      studentsWithOverduePayments.add(payment.studentId);
                    }
                  }
                } else if (studentFrequency === '4 installments') {
                  // For every 4 month, check if current date is past the 1st of the expected month
                  const paymentMonth = dueDate.getMonth();
                  const currentMonth = currentDate.getMonth();
                  const monthDiff = (currentDate.getFullYear() - dueDate.getFullYear()) * 12 + (currentMonth - paymentMonth);
                            
                  if (monthDiff >= 4 && monthDiff % 4 === 0) {
                    const expectedDueDate = new Date(currentDate.getFullYear(), currentMonth, 1);
                    if (currentDate >= expectedDueDate) {
                      studentsWithOverduePayments.add(payment.studentId);
                    }
                  }
                } else {
                  // Standard overdue check
                  studentsWithOverduePayments.add(payment.studentId);
                }
              }
            }
          }
        }
        
        // NEW: Calculate today's collections based on when payments were CREATED (not paid)
        if (payment.createdAt) {
          let createdDate;
          
          // Handle Firebase Timestamps
          if (payment.createdAt instanceof Timestamp) {
            createdDate = payment.createdAt.toDate();
          }
          // Handle string dates
          else if (typeof payment.createdAt === 'string') {
            if (payment.createdAt.match(/^\d{4}-\d{2}-\d{2}$/)) {
              // YYYY-MM-DD format
              const [year, month, day] = payment.createdAt.split('-').map(Number);
              createdDate = new Date(year, month - 1, day);
            } else {
              // Other formats
              createdDate = new Date(payment.createdAt);
            }
          }
          // Handle Date objects
          else if (payment.createdAt instanceof Date) {
            createdDate = payment.createdAt;
          }
          // Handle numeric timestamps (Unix timestamp)
          else if (typeof payment.createdAt === 'number') {
            createdDate = new Date(payment.createdAt);
          }
          
          // Check if we have a valid date and if it matches today
          if (createdDate instanceof Date && !isNaN(createdDate.getTime())) {
            // Normalize dates to compare only year, month, and day (ignore time)
            const createdDateNormalized = new Date(Date.UTC(createdDate.getFullYear(), createdDate.getMonth(), createdDate.getDate()));
            
            if (createdDateNormalized.getTime() === todayNormalized.getTime()) {
              todayCollections += parseFloat(payment.amount) || 0;
            }
          } else {
            console.log('Invalid date for payment:', payment.id, payment.createdAt);
          }
        }
      });

      // Calculate average payment amount
      const avgPaymentAmount = paymentCount > 0 ? totalPaymentAmount / paymentCount : 0;
      
      // Set overdue payments to the number of unique students with overdue payments
      const uniqueStudentsWithOverduePayments = studentsWithOverduePayments.size;
      
      setStats({
        totalStudents,
        totalFees,
        collectedFees,
        pendingFees,
        todayCollections,
        overduePayments: uniqueStudentsWithOverduePayments,
        completedPayments,
        avgPaymentAmount: Math.round(avgPaymentAmount)
      });
      
      // Generate sample trend data for sparklines
      generateTrendData(totalStudents, totalFees, collectedFees, pendingFees, todayCollections, overduePayments, completedPayments, avgPaymentAmount);
      
      // Prepare monthly data for the last 4 months
      const monthlyCollections = getMonthlyCollections(payments);
      setMonthlyData(monthlyCollections);
      
      // Prepare data for pie chart
      setFeeDistribution({
        collected: collectedFees,
        pending: pendingFees
      });
      
      // Prepare payment status data for new chart
      // Count pending payments separately to match the new overdue calculation logic
      let pendingPaymentCount = 0;
      const studentsWithPendingPayments = new Set();
      
      payments.forEach(payment => {
        if (payment.status === 'pending') {
          const studentFrequency = studentFrequencyMap[payment.studentId];
          // Count as pending if not yet considered overdue based on frequency
          pendingPaymentCount++;  
          // Track unique students with pending payments
          studentsWithPendingPayments.add(payment.studentId);
        }
      });
      
      const uniqueStudentsWithPendingPayments = studentsWithPendingPayments.size;
      
      const statusData = [
        { name: 'Completed', value: completedPayments, color: 'var(--success-color)' },
        { name: 'Pending', value: uniqueStudentsWithPendingPayments, color: 'var(--warning-color)' },
        { name: 'Overdue', value: uniqueStudentsWithOverduePayments, color: 'var(--danger-color)' }
      ];
      setPaymentStatusData(statusData);
      
      // Prepare collection trend data for line chart
      // Generate sample data for the last 6 months
      const currentDate = new Date();
      const trendData = [];
      for (let i = 5; i >= 0; i--) {
        const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        const year = date.getFullYear().toString().slice(-2);
        
        // Generate realistic values based on collected fees
        const baseValue = collectedFees / 6;
        const variance = baseValue * 0.3;
        const value = Math.max(0, baseValue + (Math.random() - 0.5) * variance * 2);
        
        trendData.push({
          month: `${monthName} '${year}`,
          amount: Math.round(value)
        });
      }
      setCollectionTrendData(trendData);
      
      // Prepare monthly fee performance data for bar chart (using existing values)
      const monthlyFeePerformance = [];
      const lastFourMonths = monthlyCollections.slice(-4); // Get last 4 months
      
      lastFourMonths.forEach((monthData, index) => {
        // For demo purposes, we'll calculate pending based on a percentage
        // In a real app, this would come from actual data
        const collected = monthData.income;
        const pending = Math.round(collected * 0.25); // 25% pending for demo
        
        // Extract month and year from monthLabel
        const [month, year] = monthData.monthLabel.split(' ');
        const shortMonth = month.substring(0, 3); // Get short form like "Sep"
        
        monthlyFeePerformance.push({
          month: `${shortMonth} ${year}`,
          collected: collected,
          pending: pending
        });
      });
      
      setMonthlyFeePerformanceData(monthlyFeePerformance);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Generate sample trend data for sparklines
  const generateTrendData = (totalStudents, totalFees, collectedFees, pendingFees, todayCollections, overduePayments, completedPayments, avgPaymentAmount) => {
    // Generate trend data for the last 7 days
    const days = 7;
    const studentData = [];
    const feesData = [];
    const collectedData = [];
    const pendingData = [];
    const todayData = [];
    const rateData = [];
    const overdueData = [];
    const completedData = [];
    const avgAmountData = [];

    for (let i = days - 1; i >= 0; i--) {
      // Simulate realistic variations
      const variation = 1 + (Math.random() - 0.5) * 0.2; // ±10% variation
      
      studentData.push(Math.max(0, Math.round(totalStudents * variation * (0.8 + 0.2 * (i / days)))));
      feesData.push(Math.max(0, Math.round(totalFees * variation * (0.8 + 0.2 * (i / days)))));
      collectedData.push(Math.max(0, Math.round(collectedFees * variation * (0.7 + 0.3 * (i / days)))));
      pendingData.push(Math.max(0, Math.round(pendingFees * variation * (0.9 + 0.1 * (1 - i / days)))));
      todayData.push(Math.max(0, Math.round(todayCollections * variation * (0.5 + 0.5 * Math.random()))));
      rateData.push(Math.max(0, Math.min(100, Math.round((collectedData[collectedData.length - 1] / (feesData[feesData.length - 1] || 1)) * 100))));
      overdueData.push(Math.max(0, Math.round(overduePayments * variation * (0.95 + 0.05 * Math.random()))));
      completedData.push(Math.max(0, Math.round(completedPayments * variation * (0.9 + 0.1 * (i / days)))));
      avgAmountData.push(Math.max(0, Math.round(avgPaymentAmount * variation)));
    }

    setTrendData({
      totalStudents: studentData,
      totalFees: feesData,
      collectedFees: collectedData,
      pendingFees: pendingData,
      todayCollections: todayData,
      collectionRate: rateData,
      overduePayments: overdueData,
      completedPayments: completedData,
      avgPaymentAmount: avgAmountData
    });
  };

  // Function to get collections for the latest 4 months
  const getMonthlyCollections = (payments) => {
    const monthlyCards = [];
    const today = new Date();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    // Generate the last 4 months (current month and previous 3 months)
    for (let i = 3; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      
      const monthKey = d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0");
      
      const total = payments
        .filter(p => {
          if (!p.createdAt) return false;
          // Handle different date formats
          let createdDateStr = '';
          if (p.createdAt instanceof Timestamp) {
            createdDateStr = p.createdAt.toDate().toISOString().split('T')[0];
          } else if (p.createdAt instanceof Date) {
            createdDateStr = p.createdAt.toISOString().split('T')[0];
          } else if (typeof p.createdAt === 'string') {
            createdDateStr = p.createdAt;
          } else if (typeof p.createdAt === 'number') {
            // Handle numeric timestamps (Unix timestamp)
            createdDateStr = new Date(p.createdAt).toISOString().split('T')[0];
          }
          return createdDateStr.startsWith(monthKey);
        })
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

      const isCurrentMonth = d.getMonth() === currentMonth && d.getFullYear() === currentYear;

      monthlyCards.push({
        monthLabel: d.toLocaleString("en-US", { month: "long", year: "numeric" }),
        income: total,
        isCurrent: isCurrentMonth
      });
    }

    return monthlyCards;
  };

  // Function to get current month and year
  const getCurrentMonthYear = () => {
    const today = new Date();
    return today.toLocaleString("en-US", { month: "long", year: "numeric" });
  };

  // Function to handle logout
  const handleLogout = async () => {
    try {
      await signOut(auth);
      localStorage.removeItem('isLoggedIn');
      navigate('/login');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Handle success notifications
  useEffect(() => {
    const handleSuccess = (event) => {
      const { message } = event.detail;
      // In a real app, this would show a toast notification
      console.log('Success:', message);
    };
    
    window.addEventListener('showSuccess', handleSuccess);
    
    return () => {
      window.removeEventListener('showSuccess', handleSuccess);
    };
  }, []);
  
  // Refresh dashboard when data changes
  useEffect(() => {
    const handleDashboardRefresh = () => {
      fetchData();
    };
    
    window.addEventListener('dashboardRefresh', handleDashboardRefresh);
    
    return () => {
      window.removeEventListener('dashboardRefresh', handleDashboardRefresh);
    };
  }, []);



  // Toggle insights section with animation
  const toggleInsights = () => {
    if (showInsights) {
      // Closing - add closing class first
      if (insightsContentRef.current) {
        insightsContentRef.current.classList.remove('open');
        insightsContentRef.current.classList.add('closing');
      }
      setTimeout(() => {
        setShowInsights(false);
      }, 500);
    } else {
      // Opening
      setShowInsights(true);
    }
  };

  // Load branding data from Firestore with real-time listener
  const loadBrandingDataFromFirestore = () => {
    if (!isAuthenticated()) return;
    
    try {
      const uid = getCurrentUserUID();
      const settingsDoc = doc(db, `users/${uid}/settings/profile`);
      
      // Set up real-time listener
      const unsubscribe = onSnapshot(settingsDoc, (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.firmName && data.firmName.trim() !== '') {
            setFirmName(data.firmName);
          } else {
            setFirmName('Your Academy');
          }
          
          if (data.logoUrl) {
            setLogoUrl(data.logoUrl);
          }
          
          if (data.firmAddress) {
            setFirmAddress(data.firmAddress);
          }
        } else {
          setFirmName('Your Academy');
        }
      });
      
      // Clean up listener on unmount
      return () => unsubscribe();
    } catch (error) {
      console.error('Error loading branding data:', error);
    }
  };

  // Branding state
  const [firmName, setFirmName] = useState('Your Academy');
  const [logoUrl, setLogoUrl] = useState('');
  const [firmAddress, setFirmAddress] = useState('');

  // Function to generate smart suggestions based on current data - UPDATED WITH REAL MONTHLY DATA
  const generateSmartSuggestion = () => {
    // Calculate collection rate percentage
    const collectionRate = stats.totalFees > 0 ? (stats.collectedFees / stats.totalFees) * 100 : 0;
    
    // Calculate percentage of pending amount relative to total fees
    const pendingPercentage = stats.totalFees > 0 ? (stats.pendingFees / stats.totalFees) * 100 : 0;
    
    // Get real current and last month data from monthlyCollections
    let currentMonthCollected = 0;
    let lastMonthCollected = 0;
    
    if (monthlyData && monthlyData.length >= 2) {
      // Get the last two months of data
      currentMonthCollected = monthlyData[monthlyData.length - 1]?.income || 0;
      lastMonthCollected = monthlyData[monthlyData.length - 2]?.income || 0;
    }
    
    // Determine user role (using existing state)
    const effectiveUserRole = userRole === 'Administrator' ? 'admin' : 'staff';
    
    // Apply the logic rules as specified
    let level, icon, message;
    
    // Log for debugging
    console.log('Smart Suggestion Data:', {
      collectionRate,
      pendingPercentage,
      currentMonthCollected,
      lastMonthCollected,
      effectiveUserRole
    });
    
    // ALL FEES UP TO DATE (GREEN)
    if (pendingPercentage <= 0 && collectionRate >= 95) {
      level = "success";
      icon = "🎉";
      message = "Excellent! All fees are up to date. Great collection performance. Consider focusing on student engagement and academic planning.";
    }
    // HIGH RISK (RED / WARNING)
    else if (pendingPercentage > 25 || collectionRate < 70) {
      level = "danger";
      icon = "⚠️";
      message = "Collections at risk. Pending fees are high. Immediate follow-ups required to protect cash flow.";
    }
    // MEDIUM RISK (ORANGE)
    else if (pendingPercentage >= 15 && pendingPercentage <= 25 && collectionRate >= 70 && collectionRate <= 85) {
      level = "warning";
      icon = "⚠️";
      message = "Collections are stable, but pending dues are increasing. Prioritize follow-ups on high-value pending payments.";
    }
    // HEALTHY COLLECTION (GREEN)
    else if (pendingPercentage < 15 && collectionRate >= 85) {
      level = "success";
      icon = "✅";
      message = "Collection performance is healthy. Maintain current follow-up consistency.";
    }
    // Default case (fallback for edge cases)
    else {
      level = "success";
      icon = "✅";
      message = "Collection performance is healthy. Maintain current follow-up consistency.";
    }
    
    // GROWTH INSIGHT (BLUE / INFO – can be appended)
    if (currentMonthCollected > lastMonthCollected && collectionRate >= 80) {
      message += " Strong month-on-month growth observed.";
    }
    
    // ROLE-BASED DISPLAY
    if (effectiveUserRole === "staff") {
      // Show short actionable message only (no financial strategy wording)
      if (level === "danger") {
        message = "Urgent: High pending fees require immediate follow-ups.";
      } else if (level === "warning") {
        message = "Monitor pending dues and prioritize follow-ups.";
      } else {
        message = "Collections are healthy. Maintain follow-up consistency.";
      }
      
      // Append growth insight for staff as well if applicable
      if (currentMonthCollected > lastMonthCollected && collectionRate >= 80) {
        message += " Good month-over-month growth.";
      }
    }
    
    // Log the final suggestion for debugging
    console.log('Generated Smart Suggestion:', { level, icon, message });
    
    return {
      level,
      icon,
      message
    };
  };

  // Function to generate action suggestions based on current data
  const generateActionSuggestions = () => {
    const collectionRate = stats.totalFees > 0 ? (stats.collectedFees / stats.totalFees) * 100 : 0;
    const pendingFees = stats.pendingFees;
    const pendingThreshold = stats.totalFees * 0.1; // 10% of total fees as threshold
    
    const suggestions = [];
    
    // Check if all fees are up to date (no pending fees and good collection rate)
    const allFeesUpToDate = pendingFees <= 0 && collectionRate >= 90;
    
    if (allFeesUpToDate) {
      // Positive suggestions when everything is up to date
      if (userRole === 'Administrator') {
        suggestions.push({
          text: "Review and update student progress reports",
          priority: "Medium"
        });
        suggestions.push({
          text: "Plan upcoming academic events or programs",
          priority: "Medium"
        });
        suggestions.push({
          text: "Update student records and documents",
          priority: "Low"
        });
        suggestions.push({
          text: "Prepare curriculum or material updates",
          priority: "Low"
        });
      } else {
        // Staff view positive suggestions
        suggestions.push({
          text: "Update student attendance and progress records",
          priority: "Medium"
        });
        suggestions.push({
          text: "Prepare reports for administration",
          priority: "Medium"
        });
        suggestions.push({
          text: "Review and organize student documents",
          priority: "Low"
        });
      }
    } else {
      // Role-based suggestions for when there are pending fees
      if (userRole === 'Administrator') {
        // Admin view - strategic actions
        if (pendingFees > 0) {
          if (pendingFees > pendingThreshold) {
            suggestions.push({
              text: "Send WhatsApp fee reminders to students with pending dues",
              priority: "High"
            });
            suggestions.push({
              text: "Prioritize follow-ups for high-amount pending payments",
              priority: "High"
            });
          } else {
            suggestions.push({
              text: "Monitor pending payments to prevent accumulation",
              priority: "Medium"
            });
          }
        }
        
        if (collectionRate >= 75) {
          suggestions.push({
            text: "Maintain follow-up consistency to sustain collection performance",
            priority: "Medium"
          });
          suggestions.push({
            text: "Consider early reminders to reduce next month's pending fees",
            priority: "Medium"
          });
        } else {
          suggestions.push({
            text: "Review and optimize collection process for better results",
            priority: "High"
          });
        }
        
        // Generic strategic suggestion
        suggestions.push({
          text: "Analyze collection trends to identify improvement opportunities",
          priority: "Medium"
        });
      } else {
        // Staff view - task-based actions
        if (pendingFees > 0) {
          suggestions.push({
            text: "Call students with pending fees to discuss payment options",
            priority: "High"
          });
          suggestions.push({
            text: "Send WhatsApp reminder messages for upcoming payment deadlines",
            priority: "Medium"
          });
        }
        
        if (collectionRate >= 75) {
          suggestions.push({
            text: "Continue regular follow-ups with all assigned accounts",
            priority: "Medium"
          });
        } else {
          suggestions.push({
            text: "Increase frequency of follow-ups for better collections",
            priority: "High"
          });
        }
        
        // Generic task-based suggestion
        suggestions.push({
            text: "Update payment records after each successful collection",
            priority: "Medium"
        });
      }
    }
    
    return suggestions;
  };

  // Function to detect overdue students based on monthly fees system
  const detectOverdueStudents = (students, payments) => {
    const currentDate = new Date();
    const currentMonthDueDate = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1); // 1st of current month
    
    const overdueStudents = [];
    
    students.forEach(student => {
      // Calculate total pending amount for this student
      const studentPayments = payments.filter(p => p.studentId === student.id);
      const pendingAmount = studentPayments
        .filter(p => p.status === 'pending')
        .reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
      
      // Check if student has pending fees and today is past the due date
      if (pendingAmount > 0 && currentDate > currentMonthDueDate) {
        overdueStudents.push({
          ...student,
          pendingAmount: pendingAmount,
          overdueSince: currentMonthDueDate
        });
      }
    });
    
    return overdueStudents;
  };

  // Function to generate next steps for collection rate using universal WhatsApp logic
  const getCollectionRateNextSteps = (rate, overdueStudents = []) => {
    const overdueCount = overdueStudents.length;
    const pendingFees = stats.pendingFees || 0;
    
    if (overdueCount > 0) {
      // If there are overdue students, show actionable message
      return `Action Needed: Fees overdue for ${overdueCount} students. Contact parents immediately.`;
    } else if (pendingFees <= 0 && overdueCount <= 0) {
      // If no pending fees and no overdue students, show positive suggestions
      return 'Great job! All fees are up to date. Consider these next steps: Review student progress, plan upcoming events, or update student records.';
    } else if (rate >= 95) {
      return 'Maintain current strategy - excellent collection rate!';
    } else if (rate >= 85) {
      return 'Continue monitoring, reach out to remaining students.';
    } else if (rate >= 70) {
      return 'Send reminder messages to parents with pending fees.';
    } else {
      return 'Consider reaching out to parents with pending fees to maintain good collection rates.';
    }
  };

  // Function to determine collection health description
  const getCollectionHealth = () => {
    const collectionRate = stats.totalFees > 0 ? (stats.collectedFees / stats.totalFees) * 100 : 0;
    if (collectionRate >= 85) return "Excellent";
    if (collectionRate >= 75) return "Strong";
    if (collectionRate >= 65) return "Good";
    if (collectionRate >= 50) return "Fair";
    return "Needs Attention";
  };

  // Function to generate dynamic fee distribution insight
  const generateFeeDistributionInsight = () => {
    // Calculate collection rate percentage
    const collectionRate = stats.totalFees > 0 ? Math.round((stats.collectedFees / stats.totalFees) * 1000) / 10 : 0;
    
    // Format currency values
    const pendingFormatted = Math.round(stats.pendingFees).toLocaleString();
    
    return `Insight: Collection rate is strong at ${collectionRate}%, but ₹${pendingFormatted} is still pending — follow-ups can improve cash flow.`;
  };

  

  return (
    <RootLayout>
      <div className="dashboard">
        {/* Header */}
        <div className="dashboard-header">
          <div className="header-left">
            <div className="app-logo-container">
              {logoUrl ? (
                <img src={logoUrl} alt="Academy Logo" className="app-logo" />
              ) : (
                <img src="/Logo.png" alt="Victory Point Academy Fees Manager Logo" className="app-logo" />
              )}
              <div className="app-title-container">
                <h1 className="app-name">{firmName} Fees Manager</h1>
                <div className="app-subtitle">
                  <span className="subtitle-text">Managing Fees</span>
                  <span className="separator">•</span>
                  <span className="current-month">{getCurrentMonthYear()}</span>
                  <span className="separator">•</span>
                  <span className="status-container">
                    <span className="status-dot active"></span>
                    <span className="status-text">Active</span>
                  </span>
                </div>
              </div>
            </div>
          </div>
          <div className="header-right">
            <AcademicYearSelector />
            {/* Avatar dropdown */}
            <div className="avatar-dropdown">
              <div className="avatar" onClick={() => setShowUserMenu(!showUserMenu)}>
                <span className="avatar-initials">VP</span>
              </div>
              {showUserMenu && (
                <div className="dropdown-menu">
                  <button className="dropdown-item" onClick={() => navigate('/profile')}>
                    Profile
                  </button>
                  <button className="dropdown-item" onClick={handleLogout}>
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      
      {/* Main KPI Cards - 6 cards */}
      <div className="kpi-cards-grid">
        {loading ? (
          <SkeletonLoader type="card" count={6} />
        ) : (
          <>
            <div className="kpi-card">
              <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(78, 115, 223, 0.1)' }}>
                <span className="kpi-icon">👥</span>
              </div>
              <div className="kpi-content">
                <div className="kpi-title">Total Students</div>
                <div className="kpi-value-container">
                  <div className="kpi-value">{displayStats.totalStudents}</div>
                  <div className="kpi-sparkline">
                    <Sparkline data={trendData.totalStudents} color="var(--info-color)" />
                  </div>
                </div>
              </div>
              <div className="kpi-trend positive">
                <span>↑ 5.2%</span>
              </div>
            </div>
            
            <div className="kpi-card total-fees">
              <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(28, 200, 138, 0.1)' }}>
                <span className="kpi-icon">💰</span>
              </div>
              <div className="kpi-content">
                <div className="kpi-title">Total Fees Collected</div>
                <div className="kpi-value-container">
                  <div className="kpi-value">₹{displayStats.collectedFees.toLocaleString()}</div>
                  <div className="kpi-sparkline">
                    <Sparkline data={trendData.collectedFees} color="var(--success-color)" />
                  </div>
                </div>
                <div className="helper-text">Revenue generated this period</div>
              </div>
              <div className="kpi-trend positive">
                <span>↑ 12.4%</span>
              </div>
            </div>
            
            <div className="kpi-card pending-fees">
              <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(246, 194, 62, 0.1)' }}>
                <span className="kpi-icon">⏳</span>
              </div>
              <div className="kpi-content">
                <div className="kpi-title">Pending Fees</div>
                <div className="kpi-value-container">
                  <div className="kpi-value">₹{displayStats.pendingFees.toLocaleString()}</div>
                  <div className="kpi-sparkline">
                    <Sparkline data={trendData.pendingFees} color="var(--warning-color)" />
                  </div>
                </div>
                <div className="helper-text">Requires immediate attention</div>
              </div>
              <div className="kpi-trend negative">
                <span>↓ 3.1%</span>
              </div>
            </div>
            
            <div className="kpi-card">
              <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(231, 74, 59, 0.1)' }}>
                <span className="kpi-icon">📅</span>
              </div>
              <div className="kpi-content">
                <div className="kpi-title">Today's Collections</div>
                <div className="kpi-value-container">
                  <div className="kpi-value">₹{displayStats.todayCollections.toLocaleString()}</div>
                  <div className="kpi-sparkline">
                    <Sparkline data={trendData.todayCollections} color="var(--danger-color)" />
                  </div>
                </div>
              </div>
              <div className="kpi-trend positive">
                <span>↑ 8.7%</span>
              </div>
            </div>
            
            <div className="kpi-card collection-rate">
              <div className="kpi-icon-container" style={{ backgroundColor: 'rgba(78, 115, 223, 0.1)' }}>
                <span className="kpi-icon">📈</span>
              </div>
              <div className="kpi-content">
                <div className="kpi-title">Collection Rate</div>
                <div className="kpi-value-container">
                  <div className="kpi-value">{displayStats.collectionRate}%</div>
                  <div className="kpi-sparkline">
                    <Sparkline data={trendData.collectionRate} color="var(--info-color)" />
                  </div>
                </div>
                <div className="helper-text">Overall performance indicator</div>
              </div>
              <div className="kpi-trend positive">
                <span>↑ 2.3%</span>
              </div>
            </div>
            
            <div className="kpi-card next-steps double-width">
              <div className="kpi-content">
                <div className="kpi-title">What to do next</div>
                <div className="next-steps-content">
                  {getCollectionRateNextSteps(displayStats.collectionRate, overdueStudents)}
                </div>
                {overdueStudents.length > 0 && (
                  <div className="send-reminder-container">
                    <button 
                      className="send-reminder-btn"
                      onClick={() => {
                        // Navigate to students page with filter parameter
                        navigate('/students?filter=overdue');
                      }}
                    >
                      Send Reminder to All Classes
                    </button>
                    <div className="class-dropdown-trigger">
                      <button 
                        className="send-reminder-btn secondary"
                        onClick={() => setShowClassDropdown(!showClassDropdown)}
                      >
                        Send Reminder by Class ▼
                      </button>
                      
                      {showClassDropdown && (
                        <div className="class-dropdown">
                          <div className="class-options">
                            {[
                              ...new Set(overdueStudents.map(s => s.class))
                            ].sort().map(className => (
                              <button
                                key={className}
                                className="class-option"
                                onClick={() => {
                                  navigate(`/students?filter=overdue&class=${encodeURIComponent(className)}`);
                                  setShowClassDropdown(false);
                                }}
                              >
                                {className}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
      
      {/* Monthly Fee Collections Section */}
      <div className="monthly-collections-section">
        <div className="section-header">
          <h2>Monthly Fee Collections</h2>
          <button 
            onClick={() => setShowHistoryModal(true)}
            className="history-button"
          >
            History
          </button>
        </div>
        <div className="monthly-cards-container">
          {loading ? (
            <SkeletonLoader type="card" count={4} />
          ) : (
            monthlyData.map((monthData, index) => (
              <div 
                key={index} 
                className={`monthly-card ${monthData.isCurrent ? 'current-month' : ''}`}
              >
                <div className="monthly-card-header">
                  <h3>{monthData.monthLabel}</h3>
                </div>
                <div className="monthly-card-body">
                  <div className="amount">₹{monthData.income.toLocaleString()}</div>
                  <div className="description">Collected</div>
                  <div className="micro-text">
                    {monthData.isCurrent ? 'Current active month' : index === 0 ? 'Highest this quarter' : ''}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
      
      {/* Insights Toggle */}
      <div className="insights-section">
        <button 
          className="insights-toggle-btn"
          onClick={toggleInsights}
          disabled={loading}
        >
          {showInsights ? 'Hide Insights ▲' : 'View Insights ▼'}
        </button>
        
        <div 
          ref={insightsContentRef}
          className={`insights-content ${showInsights ? 'open' : 'initial'}`}
        >
          {showInsights && !loading && (
            <div className="insights-content-inner">
              {/* Secondary Metric Cards with enhanced styling */}
              <div className="secondary-stats-grid">
                <div className="secondary-stat-card">
                  <div className="stat-icon-container" style={{ backgroundColor: 'rgba(231, 74, 59, 0.1)' }}>
                    <span className="stat-icon">⚠️</span>
                  </div>
                  <div className="stat-content">
                    <div className="stat-title">Overdue Payments</div>
                    <div className="stat-value-container">
                      <div className="stat-value">{displayStats.overduePayments}</div>
                      <div className="stat-sparkline">
                        <Sparkline data={trendData.overduePayments} color="var(--danger-color)" />
                      </div>
                    </div>
                  </div>
                  <div className="stat-trend negative">
                    <span>↑ 2.1%</span>
                  </div>
                </div>
                
                <div className="secondary-stat-card">
                  <div className="stat-icon-container" style={{ backgroundColor: 'rgba(28, 200, 138, 0.1)' }}>
                    <span className="stat-icon">✅</span>
                  </div>
                  <div className="stat-content">
                    <div className="stat-title">Completed Payments</div>
                    <div className="stat-value-container">
                      <div className="stat-value">{displayStats.completedPayments}</div>
                      <div className="stat-sparkline">
                        <Sparkline data={trendData.completedPayments} color="var(--success-color)" />
                      </div>
                    </div>
                  </div>
                  <div className="stat-trend positive">
                    <span>↑ 7.3%</span>
                  </div>
                </div>
                
                <div className="secondary-stat-card">
                  <div className="stat-icon-container" style={{ backgroundColor: 'rgba(78, 115, 223, 0.1)' }}>
                    <span className="stat-icon">📊</span>
                  </div>
                  <div className="stat-content">
                    <div className="stat-title">Average Payment Amount</div>
                    <div className="stat-value-container">
                      <div className="stat-value">₹{displayStats.avgPaymentAmount.toLocaleString()}</div>
                      <div className="stat-sparkline">
                        <Sparkline data={trendData.avgPaymentAmount} color="var(--info-color)" />
                      </div>
                    </div>
                  </div>
                  <div className="stat-trend positive">
                    <span>↑ 1.8%</span>
                  </div>
                </div>
              </div>
              
              <div className="charts-section">
                {/* First Analytics Panel - Fees Distribution */}
                <div className="analytics-panel" style={{ flex: '1 1 45%' }}>
                  <div className="analytics-header">
                    <h2 className="panel-title">Fees Analytics</h2>
                    <p className="panel-subtext">Distribution overview</p>
                  </div>
                  <div className="analytics-content" style={{ flexDirection: 'column' }}>
                    <div className="analytics-section">
                      <div className="section-header">
                        <h3 className="section-title">Fee Distribution</h3>
                        <p className="section-subtitle">Collected vs pending fees</p>
                      </div>
                      <PieChart data={feeDistribution} />
                      <div className="combined-insight-bar">
                        <span className="insight-icon">💡</span>
                        <span className="insight-text">{generateFeeDistributionInsight()}</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Second Analytics Panel - Monthly Fee Performance (Bar Chart) with Quick Insights */}
                <div className="analytics-panel" style={{ flex: '1 1 45%', position: 'relative' }}>
                  <div className="analytics-header">
                    <h2 className="panel-title">Monthly Fee Performance</h2>
                    <p className="panel-subtext">Collected vs pending fees by month</p>
                  </div>
                  <div className="analytics-content" style={{ flexDirection: 'row', gap: '20px' }}>
                    {/* Main Chart Section */}
                    <div className="analytics-section" style={{ flex: '1' }}>
                      <BarChart data={monthlyFeePerformanceData} width="100%" height={300} />
                      <button 
                        className="view-trend-button"
                        onClick={() => navigate('/collection-trend')}
                        disabled
                        style={{ 
                          position: 'absolute',
                          top: '60px',
                          right: '20px',
                          margin: '0',
                          padding: '0',
                          fontSize: '0.85rem',
                          minWidth: 'auto',
                          borderRadius: '6px',
                          width: '81.81px',
                          height: '30px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          opacity: 0.6,
                          cursor: 'not-allowed'
                        }}
                      >
                        <span>Trend</span>
                        <span className="button-icon" style={{ marginLeft: '4px' }}>📈</span>
                      </button>
                      
                      {/* Smart Suggestion */}
                      {!loading && (() => {
                        const suggestion = generateSmartSuggestion();
                        return (
                          <div 
                            className="combined-insight-bar" 
                            style={{ 
                              marginTop: '15px',
                              ...(suggestion.level === 'danger' ? {
                                borderLeft: '4px solid #e74c3c',
                                backgroundColor: 'rgba(231, 76, 60, 0.05)'
                              } : suggestion.level === 'warning' ? {
                                borderLeft: '4px solid #f39c12',
                                backgroundColor: 'rgba(243, 156, 18, 0.05)'
                              } : suggestion.level === 'success' ? {
                                borderLeft: '4px solid #28a745',
                                backgroundColor: 'rgba(40, 167, 69, 0.05)'
                              } : {
                                borderLeft: '4px solid #3498db',
                                backgroundColor: 'rgba(52, 152, 219, 0.05)'
                              })
                            }}
                          >
                            <span className="insight-icon">
                              {suggestion.icon}
                            </span>
                            <div>
                              <div className="insight-title" style={{ fontWeight: '600', marginBottom: '5px', color: '#1A1A1A' }}>
                                Smart Suggestion
                              </div>
                              <div className="insight-text">
                                Suggestion: {suggestion.message}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                      {/* Action Suggestions */}
                      {!loading && generateActionSuggestions().length > 0 && (
                        <div 
                          className="combined-insight-bar" 
                          style={{ 
                            marginTop: '15px',
                            background: '#f8fafc',
                            borderRadius: '12px',
                            padding: '16px',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.06)',
                            border: '1px solid rgba(0, 0, 0, 0.03)'
                          }}
                        >
                          <div className="insight-title" style={{ 
                            fontWeight: '600', 
                            marginBottom: '12px', 
                            color: '#1A1A1A',
                            fontSize: '1.1rem'
                          }}>
                            Action Suggestions
                          </div>
                          <ul style={{ 
                            paddingLeft: '20px', 
                            margin: '0',
                            fontSize: '0.95rem'
                          }}>
                            {generateActionSuggestions().map((suggestion, index) => (
                              <li 
                                key={index} 
                                style={{ 
                                  marginBottom: '8px',
                                  fontWeight: suggestion.priority === 'High' ? '600' : 'normal',
                                  color: suggestion.priority === 'High' ? '#e74c3c' : '#2c3e50'
                                }}
                              >
                                <span style={{ marginRight: '8px' }}>
                                  {suggestion.priority === 'High' ? '⚠️' : 
                                   suggestion.priority === 'Medium' ? '' : '✅'}
                                </span>
                                {suggestion.text}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Financial Profit/Loss Status Card */}
              <div className="profit-loss-section">
                <ProfitLossCard 
                  totalFees={stats.totalFees} 
                  collectedFees={stats.collectedFees} 
                />
              </div>
            </div>
          )}
        </div>
      </div>
      
      {/* History Modal */}
      {showHistoryModal && (
        <HistoryModal onClose={() => setShowHistoryModal(false)} />
      )}
      
      {/* Sample Data Generator - for testing purposes */}

    </div>
    </RootLayout>
  );
};
export default Dashboard;