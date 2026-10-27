// Budget & Expense Tracker Page
import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import ExpenseChart from '../components/ExpenseChart';
import '../css/budget.css';

const BudgetTracker = () => {
  const location = useLocation();

  // Trips and Active Trip State
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [summaryData, setSummaryData] = useState(null);
  const [expenses, setExpenses] = useState([]);

  // Loading and Alert states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Add / Edit Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  // Quick Budget Editor State
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({ totalBudget: 0, dailyBudget: 0 });

  // Request headers with authentication token
  const getAuthHeaders = () => {
    const token = localStorage.getItem('tripmate_token');
    return {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    };
  };

  // Initial Load - Fetch user's trips
  useEffect(() => {
    const fetchTrips = async () => {
      try {
        const res = await fetch('/api/trips', { headers: getAuthHeaders() });
        const data = await res.json();
        if (data.success && data.data.length > 0) {
          setTrips(data.data);

          // Check if URL specifies tripId query param
          const queryParams = new URLSearchParams(location.search);
          const paramTripId = queryParams.get('tripId');

          if (paramTripId && data.data.some((t) => t._id === paramTripId)) {
            setSelectedTripId(paramTripId);
          } else {
            setSelectedTripId(data.data[0]._id);
          }
        }
      } catch (err) {
        setErrorMsg('Failed to load trips');
      }
    };

    fetchTrips();
  }, [location.search]);

  // When selectedTripId changes, fetch summary and expenses
  useEffect(() => {
    if (selectedTripId) {
      loadTripData(selectedTripId);
    }
  }, [selectedTripId]);

  const loadTripData = async (tripId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      // Fetch budget summary
      const sumRes = await fetch(`/api/expenses/summary/${tripId}`, { headers: getAuthHeaders() });
      const sumData = await sumRes.json();
      if (sumData.success) {
        setSummaryData(sumData.data);
        setBudgetForm({
          totalBudget: sumData.data.totalBudget,
          dailyBudget: sumData.data.dailyBudget
        });
      }

      // Fetch expenses list
      const expRes = await fetch(`/api/expenses?tripId=${tripId}`, { headers: getAuthHeaders() });
      const expData = await expRes.json();
      if (expData.success) {
        setExpenses(expData.data);
      }
    } catch (err) {
      setErrorMsg('Failed to fetch expense details');
    } finally {
      setLoading(false);
    }
  };

  // Handle Expense Form Input changes
  const handleExpenseChange = (e) => {
    const { name, value } = e.target;
    setExpenseForm((prev) => ({
      ...prev,
      [name]: value
    }));
  };

  // Submit Expense Form (Create or Update)
  const handleExpenseSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!expenseForm.title || !expenseForm.amount || !expenseForm.category) {
      setErrorMsg('Please specify title, amount, and category');
      return;
    }

    try {
      const url = editingExpenseId ? `/api/expenses/${editingExpenseId}` : '/api/expenses';
      const method = editingExpenseId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: getAuthHeaders(),
        body: JSON.stringify({
          ...expenseForm,
          tripId: selectedTripId
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Operation failed');

      setSuccessMsg(editingExpenseId ? 'Expense updated!' : 'Expense added successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);

      // Reset form
      setExpenseForm({
        title: '',
        amount: '',
        category: 'Food',
        date: new Date().toISOString().split('T')[0],
        note: ''
      });
      setEditingExpenseId(null);

      // Refresh data
      loadTripData(selectedTripId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Start Editing Expense
  const handleStartEditExpense = (item) => {
    setEditingExpenseId(item._id);
    setExpenseForm({
      title: item.title,
      amount: item.amount,
      category: item.category,
      date: item.date ? item.date.split('T')[0] : '',
      note: item.note || ''
    });
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Delete Expense
  const handleDeleteExpense = async (id) => {
    if (!window.confirm('Delete this expense?')) return;

    try {
      const res = await fetch(`/api/expenses/${id}`, {
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to delete');

      setSuccessMsg('Expense removed');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadTripData(selectedTripId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Update Trip Budget
  const handleSaveBudget = async () => {
    try {
      const res = await fetch(`/api/trips/${selectedTripId}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify({
          totalBudget: budgetForm.totalBudget,
          dailyBudget: budgetForm.dailyBudget
        })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update budget');

      setSuccessMsg('Budget updated!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setEditingBudget(false);
      loadTripData(selectedTripId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="container budget-page">
      {/* Header */}
      <div style={{ marginBottom: '2rem' }}>
        <h1>Budget & Expense Tracker</h1>
        <p>Control your trip finances, visualize categorized spending with interactive breakdown charts, and stay within your budget.</p>
      </div>

      {/* Messages */}
      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {errorMsg && <div className="alert alert-error">{errorMsg}</div>}

      {/* Trip Selector Dropdown */}
      <div className="budget-trip-selector">
        <div className="selector-label-group">
          <label className="form-label" style={{ marginBottom: 0, fontSize: '1rem' }}>
            Select Trip:
          </label>
          {trips.length > 0 ? (
            <select
              className="form-select selector-dropdown"
              value={selectedTripId}
              onChange={(e) => setSelectedTripId(e.target.value)}
            >
              {trips.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.title} ({t.destination})
                </option>
              ))}
            </select>
          ) : (
            <span style={{ color: 'var(--slate)' }}>No trips found. Create a trip first in the Dashboard!</span>
          )}
        </div>

        {selectedTripId && (
          <button
            className="btn btn-outline btn-sm"
            onClick={() => setEditingBudget(!editingBudget)}
          >
            {editingBudget ? 'Cancel Budget Edit' : '⚙️ Adjust Budget Target'}
          </button>
        )}
      </div>

      {/* Quick Budget Target Adjustment Modal/Drawer */}
      {editingBudget && (
        <div className="card-budget" style={{ background: '#ffffff', padding: '1.5rem', borderRadius: '12px', border: '1px solid var(--border)', marginBottom: '2rem' }}>
          <h4 style={{ marginBottom: '1rem' }}>Set Budget Targets for Selected Trip</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Total Budget (₹)</label>
              <input
                type="number"
                className="form-input"
                value={budgetForm.totalBudget}
                onChange={(e) => setBudgetForm({ ...budgetForm, totalBudget: Number(e.target.value) })}
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Daily Budget Target (₹)</label>
              <input
                type="number"
                className="form-input"
                value={budgetForm.dailyBudget}
                onChange={(e) => setBudgetForm({ ...budgetForm, dailyBudget: Number(e.target.value) })}
                min="0"
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
            <button className="btn btn-primary btn-sm" onClick={handleSaveBudget}>
              Save Budget Targets
            </button>
            <button className="btn btn-outline btn-sm" onClick={() => setEditingBudget(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      {selectedTripId ? (
        <>
          {/* Summary Cards */}
          <div className="summary-grid">
            <div className="summary-card card-budget">
              <span className="summary-card-label">Total Budget</span>
              <span className="summary-card-value">₹{(summaryData?.totalBudget || 0).toLocaleString('en-IN')}</span>
              <span className="summary-card-sub">Trip allocation</span>
            </div>

            <div className="summary-card card-spent">
              <span className="summary-card-label">Total Spent</span>
              <span className="summary-card-value">₹{(summaryData?.totalSpent || 0).toLocaleString('en-IN')}</span>
              <span className="summary-card-sub">{summaryData?.expenseCount || 0} recorded expenses</span>
            </div>

            <div className="summary-card card-remaining">
              <span className="summary-card-label">Remaining Balance</span>
              <span
                className="summary-card-value"
                style={{
                  color: (summaryData?.remainingBalance || 0) < 0 ? 'var(--danger)' : 'var(--success)'
                }}
              >
                ₹{(summaryData?.remainingBalance || 0).toLocaleString('en-IN')}
              </span>
              <span className="summary-card-sub">
                {(summaryData?.remainingBalance || 0) < 0 ? '⚠️ Budget Exceeded' : 'Under budget'}
              </span>
            </div>

            <div className="summary-card card-daily">
              <span className="summary-card-label">Daily Target</span>
              <span className="summary-card-value">₹{(summaryData?.dailyBudget || 0).toLocaleString('en-IN')}</span>
              <span className="summary-card-sub">Planned per day</span>
            </div>
          </div>

          {/* Main Content Split: Pure SVG Donut Chart + Add Expense Form */}
          <div className="budget-main-split">
            {/* Left: Pure SVG & CSS Donut Chart */}
            <div className="chart-card">
              <h3 style={{ marginBottom: '1.25rem' }}>Expense Breakdown</h3>
              <ExpenseChart
                categoryTotals={summaryData?.categoryTotals || {}}
                totalSpent={summaryData?.totalSpent || 0}
              />
            </div>

            {/* Right: Add / Edit Expense Form */}
            <div className="form-card">
              <h3 style={{ marginBottom: '1.25rem' }}>
                {editingExpenseId ? '✏️ Edit Expense' : '+ Add New Expense'}
              </h3>
              <form onSubmit={handleExpenseSubmit}>
                <div className="form-group">
                  <label className="form-label" htmlFor="expenseTitle">Expense Title</label>
                  <input
                    type="text"
                    id="expenseTitle"
                    name="title"
                    className="form-input"
                    placeholder="e.g. Traditional Ramen Lunch"
                    value={expenseForm.title}
                    onChange={handleExpenseChange}
                    required
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="expenseAmount">Amount (₹)</label>
                    <input
                      type="number"
                      id="expenseAmount"
                      name="amount"
                      className="form-input"
                      placeholder="0.00"
                      value={expenseForm.amount}
                      onChange={handleExpenseChange}
                      min="0.01"
                      step="any"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label" htmlFor="expenseCategory">Category</label>
                    <select
                      id="expenseCategory"
                      name="category"
                      className="form-select"
                      value={expenseForm.category}
                      onChange={handleExpenseChange}
                    >
                      <option value="Food">Food & Dining</option>
                      <option value="Travel">Travel & Transit</option>
                      <option value="Hotels">Hotels & Stay</option>
                      <option value="Other">Other / Shopping</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="expenseDate">Date</label>
                  <input
                    type="date"
                    id="expenseDate"
                    name="date"
                    className="form-input"
                    value={expenseForm.date}
                    onChange={handleExpenseChange}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label" htmlFor="expenseNote">Note (Optional)</label>
                  <input
                    type="text"
                    id="expenseNote"
                    name="note"
                    className="form-input"
                    placeholder="Bill receipt details or payment method..."
                    value={expenseForm.note}
                    onChange={handleExpenseChange}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                  <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                    {editingExpenseId ? 'Save Expense' : '+ Record Expense'}
                  </button>
                  {editingExpenseId && (
                    <button
                      type="button"
                      className="btn btn-outline"
                      onClick={() => {
                        setEditingExpenseId(null);
                        setExpenseForm({
                          title: '',
                          amount: '',
                          category: 'Food',
                          date: new Date().toISOString().split('T')[0],
                          note: ''
                        });
                      }}
                    >
                      Cancel
                    </button>
                  )}
                </div>
              </form>
            </div>
          </div>

          {/* Expenses History List Table */}
          <div className="expenses-card">
            <div className="expenses-header">
              <h3>Recent Expenses ({expenses.length})</h3>
              <span className="badge badge-primary">Trip: {summaryData?.tripTitle}</span>
            </div>

            {expenses.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--slate)' }}>
                No expenses logged yet for this trip. Record your first expense above!
              </div>
            ) : (
              <div className="expenses-table-responsive">
                <table className="expenses-table">
                  <thead>
                    <tr>
                      <th>Title</th>
                      <th>Category</th>
                      <th>Date</th>
                      <th>Note</th>
                      <th>Amount</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((item) => (
                      <tr key={item._id}>
                        <td style={{ fontWeight: 600 }}>{item.title}</td>
                        <td>
                          <span className={`badge badge-${item.category === 'Food' ? 'accent' : item.category === 'Travel' ? 'primary' : item.category === 'Hotels' ? 'success' : 'warning'}`}>
                            {item.category}
                          </span>
                        </td>
                        <td>{new Date(item.date).toLocaleDateString()}</td>
                        <td style={{ color: 'var(--slate-light)', fontSize: '0.85rem' }}>
                          {item.note || '—'}
                        </td>
                        <td className="expense-amount-cell">
                          ₹{item.amount.toLocaleString('en-IN')}
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <button
                            className="btn btn-outline btn-sm"
                            style={{ marginRight: '0.4rem' }}
                            onClick={() => handleStartEditExpense(item)}
                          >
                            ✏️
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDeleteExpense(item._id)}
                          >
                            🗑️
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      ) : null}
    </div>
  );
};

export default BudgetTracker;
