import { generateSmartSuggestion } from './Dashboard';

// Mock data for testing
const mockStats = {
  totalFees: 10000,
  collectedFees: 8500,
  pendingFees: 1500
};

const mockMonthlyData = [
  { income: 2000 },
  { income: 2200 }
];

// Test scenarios
describe('Smart Suggestion System', () => {
  test('should generate HIGH RISK suggestion when pending percentage > 25%', () => {
    const stats = { ...mockStats, pendingFees: 2600 }; // 26% pending
    const suggestion = generateSmartSuggestion(stats, mockMonthlyData, 'admin');
    
    expect(suggestion.level).toBe('danger');
    expect(suggestion.icon).toBe('⚠️');
    expect(suggestion.message).toContain('Collections at risk');
  });

  test('should generate HIGH RISK suggestion when collection rate < 70', () => {
    const stats = { ...mockStats, collectedFees: 6500, pendingFees: 3500 }; // 65% collection rate
    const suggestion = generateSmartSuggestion(stats, mockMonthlyData, 'admin');
    
    expect(suggestion.level).toBe('danger');
    expect(suggestion.icon).toBe('⚠️');
    expect(suggestion.message).toContain('Collections at risk');
  });

  test('should generate MEDIUM RISK suggestion with correct parameters', () => {
    const stats = { ...mockStats, pendingFees: 2000, collectedFees: 8000 }; // 20% pending, 80% collection
    const suggestion = generateSmartSuggestion(stats, mockMonthlyData, 'admin');
    
    expect(suggestion.level).toBe('warning');
    expect(suggestion.icon).toBe('⚠️');
    expect(suggestion.message).toContain('Collections are stable');
  });

  test('should generate HEALTHY COLLECTION suggestion', () => {
    const stats = { ...mockStats, pendingFees: 1000, collectedFees: 9000 }; // 10% pending, 90% collection
    const suggestion = generateSmartSuggestion(stats, mockMonthlyData, 'admin');
    
    expect(suggestion.level).toBe('success');
    expect(suggestion.icon).toBe('✅');
    expect(suggestion.message).toContain('Collection performance is healthy');
  });

  test('should append growth insight when current > last month', () => {
    const stats = { ...mockStats, pendingFees: 1000, collectedFees: 9000 };
    const monthlyData = [{ income: 2000 }, { income: 2500 }]; // Growth from 2000 to 2500
    const suggestion = generateSmartSuggestion(stats, monthlyData, 'admin');
    
    expect(suggestion.message).toContain('Strong month-on-month growth observed');
  });

  test('should show staff-appropriate message for danger level', () => {
    const stats = { ...mockStats, pendingFees: 3000 }; // 30% pending
    const suggestion = generateSmartSuggestion(stats, mockMonthlyData, 'staff');
    
    expect(suggestion.message).toContain('Urgent: High pending fees');
  });

  test('should show staff-appropriate message for warning level', () => {
    const stats = { ...mockStats, pendingFees: 2000, collectedFees: 8000 }; // 20% pending, 80% collection
    const suggestion = generateSmartSuggestion(stats, mockMonthlyData, 'staff');
    
    expect(suggestion.message).toContain('Monitor pending dues');
  });

  test('should show staff-appropriate message for success level', () => {
    const stats = { ...mockStats, pendingFees: 1000, collectedFees: 9000 }; // 10% pending, 90% collection
    const suggestion = generateSmartSuggestion(stats, mockMonthlyData, 'staff');
    
    expect(suggestion.message).toContain('Collections are healthy');
  });
});