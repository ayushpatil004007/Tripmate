// Budget & Expense Tracker Page with Full Multi-Currency Integration
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation } from 'react-router-dom';
import ExpenseChart from '../components/ExpenseChart';
import CurrencyConverter from '../components/CurrencyConverter';
import { apiFetch } from '../utils/api';
import { useCountry } from '../context/CountryContext';
import {
  convertCurrency,
  formatCurrency,
  formatDualCurrency,
  SUPPORTED_CURRENCY_CODES,
  CURRENCY_INFO,
  RATES_DISCLAIMER
} from '../utils/currency';
import '../css/budget.css';

const BudgetTracker = () => {
  const location = useLocation();
  const { homeCountry, preferredCurrency, displayCurrency, setDisplayCurrency } = useCountry();

  // Trips and Active Trip State
  const [trips, setTrips] = useState([]);
  const [selectedTripId, setSelectedTripId] = useState('');
  const [expenses, setExpenses] = useState([]);
  const [destinations, setDestinations] = useState([]);

  // Loading and Alert states
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Quick Calculator Toggle
  const [showConverterWidget, setShowConverterWidget] = useState(false);

  // Add / Edit Expense Form State
  const [expenseForm, setExpenseForm] = useState({
    title: '',
    amount: '',
    currency: preferredCurrency || 'INR',
    category: 'Food',
    date: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [editingExpenseId, setEditingExpenseId] = useState(null);

  // Quick Budget Editor State
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetForm, setBudgetForm] = useState({
    totalBudget: 0,
    dailyBudget: 0,
    currency: preferredCurrency || 'INR'
  });

  // Keep form currency updated when preferred currency changes initially
  useEffect(() => {
    if (!editingExpenseId && preferredCurrency) {
      setExpenseForm((prev) => ({
        ...prev,
        currency: prev.currency || preferredCurrency
      }));
    }
  }, [preferredCurrency, editingExpenseId]);

  // Initial Load - Fetch user's trips and destinations catalog
  useEffect(() => {
    const fetchData = async () => {
      try {
        const [tripsRes, destsRes] = await Promise.all([
          apiFetch('/api/trips'),
          apiFetch('/api/destinations')
        ]);

        if (destsRes?.success) {
          setDestinations(destsRes.data || []);
        }

        if (tripsRes?.success && tripsRes.data.length > 0) {
          setTrips(tripsRes.data);

          // Check if URL specifies tripId query param
          const queryParams = new URLSearchParams(location.search);
          const paramTripId = queryParams.get('tripId');

          if (paramTripId && tripsRes.data.some((t) => t._id === paramTripId)) {
            setSelectedTripId(paramTripId);
          } else {
            setSelectedTripId(tripsRes.data[0]._id);
          }
        }
      } catch (err) {
        setErrorMsg(err.message || 'Failed to load trips');
      }
    };

    fetchData();
  }, [location.search]);

  // When selectedTripId changes, fetch expenses
  useEffect(() => {
    if (selectedTripId) {
      loadTripData(selectedTripId);
    }
  }, [selectedTripId]);

  const loadTripData = async (tripId) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const expData = await apiFetch(`/api/expenses?tripId=${tripId}`);
      if (expData?.success) {
        setExpenses(expData.data);
      }

      // Pre-fill budgetForm from trip
      const currentTrip = trips.find((t) => t._id === tripId);
      if (currentTrip) {
        setBudgetForm({
          totalBudget: currentTrip.totalBudget || 0,
          dailyBudget: currentTrip.dailyBudget || 0,
          currency: currentTrip.currency || 'INR'
        });
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to fetch expense details');
    } finally {
      setLoading(false);
    }
  };

  const activeTrip = useMemo(() => {
    return trips.find((t) => t._id === selectedTripId) || null;
  }, [trips, selectedTripId]);

  // Find matching destination in catalog for budget comparison
  const matchedDestination = useMemo(() => {
    if (!activeTrip || !destinations.length) return null;
    const destName = activeTrip.destination?.toLowerCase().trim();
    return destinations.find(
      (d) =>
        d.name?.toLowerCase().trim() === destName ||
        d.slug === destName ||
        (d.country && destName.includes(d.country.toLowerCase()))
    );
  }, [activeTrip, destinations]);

  // Multi-Currency Aggregations in Display Currency
  // Converts every expense to the active displayCurrency before summing!
  const { totalSpent, categoryTotals, totalBudget, dailyBudget, remainingBalance } = useMemo(() => {
    const activeCurrency = displayCurrency || 'INR';

    // 1. Convert trip target budgets from trip currency to displayCurrency
    const tripCurr = (activeTrip?.currency || 'INR').toUpperCase();
    const convertedTotalBudget = convertCurrency(activeTrip?.totalBudget || 0, tripCurr, activeCurrency);
    const convertedDailyBudget = convertCurrency(activeTrip?.dailyBudget || 0, tripCurr, activeCurrency);

    // 2. Sum converted expenses
    let spentSum = 0;
    const cats = {
      Food: 0,
      Transport: 0,
      Accommodation: 0,
      Activities: 0,
      Shopping: 0,
      Other: 0
    };

    expenses.forEach((item) => {
      const itemCurr = (item.currency || 'INR').toUpperCase();
      const convertedItemAmount = convertCurrency(item.amount, itemCurr, activeCurrency);
      spentSum += convertedItemAmount;

      let cat = item.category;
      if (cat === 'Travel') cat = 'Transport';
      else if (cat === 'Hotels') cat = 'Accommodation';

      if (cats[cat] !== undefined) {
        cats[cat] += convertedItemAmount;
      } else {
        cats['Other'] += convertedItemAmount;
      }
    });

    const remBalance = convertedTotalBudget - spentSum;

    return {
      totalSpent: spentSum,
      categoryTotals: cats,
      totalBudget: convertedTotalBudget,
      dailyBudget: convertedDailyBudget,
      remainingBalance: remBalance
    };
  }, [expenses, activeTrip, displayCurrency]);

  // Destination Estimated Budget Converted to Display Currency
  const destComparison = useMemo(() => {
    if (!matchedDestination) return null;
    const destEst = matchedDestination.estimatedBudget || matchedDestination.averageCostPerDay || 0;
    const destCurr = matchedDestination.currency || 'INR';
    const convertedDestBudget = convertCurrency(destEst, destCurr, displayCurrency);

    return {
      name: matchedDestination.name,
      country: matchedDestination.country,
      originalAmount: destEst,
      originalCurrency: destCurr,
      convertedAmount: convertedDestBudget,
      diffDaily: dailyBudget - convertedDestBudget
    };
  }, [matchedDestination, displayCurrency, dailyBudget]);

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

      await apiFetch(url, {
        method,
        body: JSON.stringify({
          ...expenseForm,
          tripId: selectedTripId,
          currency: expenseForm.currency.toUpperCase()
        })
      });

      setSuccessMsg(editingExpenseId ? 'Expense updated!' : 'Expense recorded successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);

      // Reset form
      setExpenseForm({
        title: '',
        amount: '',
        currency: activeTrip?.currency || preferredCurrency || 'INR',
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
      currency: item.currency || 'INR',
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
      await apiFetch(`/api/expenses/${id}`, {
        method: 'DELETE'
      });

      setSuccessMsg('Expense removed');
      setTimeout(() => setSuccessMsg(''), 3000);
      loadTripData(selectedTripId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  // Update Trip Budget Target
  const handleSaveBudget = async () => {
    try {
      await apiFetch(`/api/trips/${selectedTripId}`, {
        method: 'PUT',
        body: JSON.stringify({
          totalBudget: Number(budgetForm.totalBudget),
          dailyBudget: Number(budgetForm.dailyBudget),
          currency: budgetForm.currency.toUpperCase()
        })
      });

      setSuccessMsg('Budget updated!');
      setTimeout(() => setSuccessMsg(''), 3000);
      setEditingBudget(false);

      // Update local trips state
      setTrips((prev) =>
        prev.map((t) =>
          t._id === selectedTripId
            ? {
                ...t,
                totalBudget: Number(budgetForm.totalBudget),
                dailyBudget: Number(budgetForm.dailyBudget),
                currency: budgetForm.currency.toUpperCase()
              }
            : t
        )
      );

      loadTripData(selectedTripId);
    } catch (err) {
      setErrorMsg(err.message);
    }
  };

  return (
    <div className="container budget-page">
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1>Budget & Expense Tracker</h1>
        <p>
          Multi-currency expense analytics. Log transactions in any currency, visualize converted spending, and compare against destination estimates.
        </p>
      </div>

      {/* Currency Switcher & Conversion Toolbar */}
      <div className="budget-currency-bar">
        <div className="currency-bar-left">
          <label className="currency-bar-label" htmlFor="display-currency-select">
            👁️ Viewing All Figures In:
          </label>
          <select
            id="display-currency-select"
            className="form-select currency-bar-select"
            value={displayCurrency}
            onChange={(e) => setDisplayCurrency(e.target.value)}
          >
            {SUPPORTED_CURRENCY_CODES.map((code) => {
              const info = CURRENCY_INFO[code] || { name: code, flag: '' };
              return (
                <option key={code} value={code}>
                  {info.flag} {code} ({info.symbol}) - {info.name}
                </option>
              );
            })}
          </select>
          <span className="currency-disclaimer-pill" title={RATES_DISCLAIMER}>
            ℹ️ Static Travel Rates
          </span>
        </div>

        <div className="currency-bar-right">
          <button
            type="button"
            className="btn btn-outline btn-sm"
            onClick={() => setShowConverterWidget(!showConverterWidget)}
            title="Toggle Quick Currency Calculator"
          >
            💱 {showConverterWidget ? 'Hide Converter' : 'Quick Converter'}
          </button>
        </div>
      </div>

      {/* Embedded Converter Widget if expanded */}
      {showConverterWidget && (
        <div style={{ marginBottom: '2rem' }}>
          <CurrencyConverter onClose={() => setShowConverterWidget(false)} />
        </div>
      )}

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
                  {t.title} ({t.destination}) — Budget: {t.currency || 'INR'} {t.totalBudget?.toLocaleString()}
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
            onClick={() => {
              if (activeTrip) {
                setBudgetForm({
                  totalBudget: activeTrip.totalBudget || 0,
                  dailyBudget: activeTrip.dailyBudget || 0,
                  currency: activeTrip.currency || 'INR'
                });
              }
              setEditingBudget(!editingBudget);
            }}
          >
            {editingBudget ? 'Cancel Budget Edit' : '⚙️ Adjust Budget Target'}
          </button>
        )}
      </div>

      {/* Quick Budget Target Adjustment Modal/Drawer */}
      {editingBudget && (
        <div
          className="card-budget"
          style={{
            background: '#ffffff',
            padding: '1.5rem',
            borderRadius: '12px',
            border: '1px solid var(--border)',
            marginBottom: '2rem'
          }}
        >
          <h4 style={{ marginBottom: '1rem' }}>Set Budget Targets for Selected Trip</h4>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '1rem'
            }}
          >
            <div className="form-group">
              <label className="form-label">Total Budget</label>
              <input
                type="number"
                className="form-input"
                value={budgetForm.totalBudget}
                onChange={(e) => setBudgetForm({ ...budgetForm, totalBudget: e.target.value })}
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Daily Budget Target</label>
              <input
                type="number"
                className="form-input"
                value={budgetForm.dailyBudget}
                onChange={(e) => setBudgetForm({ ...budgetForm, dailyBudget: e.target.value })}
                min="0"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Budget Currency</label>
              <select
                className="form-select"
                value={budgetForm.currency}
                onChange={(e) => setBudgetForm({ ...budgetForm, currency: e.target.value })}
              >
                {SUPPORTED_CURRENCY_CODES.map((code) => (
                  <option key={code} value={code}>
                    {code}
                  </option>
                ))}
              </select>
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

      {/* Destination Budget Comparison Banner */}
      {destComparison && (
        <div className="dest-budget-banner">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span style={{ fontSize: '1.5rem' }}>📍</span>
            <div>
              <strong>Destination Estimate for {destComparison.name}:</strong> Average travel budget is{' '}
              <span className="dest-budget-highlight">
                {formatDualCurrency(
                  destComparison.originalAmount,
                  destComparison.originalCurrency,
                  displayCurrency
                )} / day
              </span>
              . Your planned daily target is{' '}
              <strong>{formatCurrency(dailyBudget, displayCurrency)} / day</strong>.
            </div>
          </div>
          <span
            className={`badge ${destComparison.diffDaily >= 0 ? 'badge-success' : 'badge-warning'}`}
            style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}
          >
            {destComparison.diffDaily >= 0
              ? `Comfortable (+${formatCurrency(destComparison.diffDaily, displayCurrency)})`
              : `Tight Budget (${formatCurrency(destComparison.diffDaily, displayCurrency)})`}
          </span>
        </div>
      )}

      {selectedTripId ? (
        <>
          {/* Summary Cards with Converted Figures */}
          <div className="summary-grid">
            <div className="summary-card card-budget">
              <span className="summary-card-label">Total Budget</span>
              <span className="summary-card-value">
                {formatCurrency(totalBudget, displayCurrency)}
              </span>
              <span className="summary-card-sub">
                Original: {activeTrip?.currency || 'INR'} {(activeTrip?.totalBudget || 0).toLocaleString()}
              </span>
            </div>

            <div className="summary-card card-spent">
              <span className="summary-card-label">Total Spent</span>
              <span className="summary-card-value">
                {formatCurrency(totalSpent, displayCurrency)}
              </span>
              <span className="summary-card-sub">{expenses.length} recorded expenses</span>
            </div>

            <div className="summary-card card-remaining">
              <span className="summary-card-label">Remaining Balance</span>
              <span
                className="summary-card-value"
                style={{
                  color: remainingBalance < 0 ? 'var(--danger)' : 'var(--success)'
                }}
              >
                {formatCurrency(remainingBalance, displayCurrency)}
              </span>
              <span className="summary-card-sub">
                {remainingBalance < 0 ? '⚠️ Budget Exceeded' : 'Under budget'}
              </span>
            </div>

            <div className="summary-card card-daily">
              <span className="summary-card-label">Daily Target</span>
              <span className="summary-card-value">
                {formatCurrency(dailyBudget, displayCurrency)}
              </span>
              <span className="summary-card-sub">Planned per day</span>
            </div>
          </div>

          {/* Main Content Split: Pure SVG Donut Chart + Add Expense Form */}
          <div className="budget-main-split">
            {/* Left: Pure SVG & CSS Donut Chart */}
            <div className="chart-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                <h3 style={{ margin: 0 }}>Expense Breakdown</h3>
                <span className="badge badge-primary">in {displayCurrency}</span>
              </div>
              <ExpenseChart
                categoryTotals={categoryTotals}
                totalSpent={totalSpent}
                currency={displayCurrency}
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

                <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: '0.75rem' }}>
                  <div className="form-group">
                    <label className="form-label" htmlFor="expenseAmount">Amount</label>
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
                    <label className="form-label" htmlFor="expenseCurrency">Currency</label>
                    <select
                      id="expenseCurrency"
                      name="currency"
                      className="form-select"
                      value={expenseForm.currency}
                      onChange={handleExpenseChange}
                    >
                      {SUPPORTED_CURRENCY_CODES.map((code) => {
                        const info = CURRENCY_INFO[code] || { name: code, flag: '' };
                        return (
                          <option key={code} value={code}>
                            {info.flag} {code} ({info.symbol})
                          </option>
                        );
                      })}
                    </select>
                  </div>
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
                    <option value="Transport">Transport & Transit</option>
                    <option value="Accommodation">Accommodation & Stay</option>
                    <option value="Activities">Activities & Sightseeing</option>
                    <option value="Shopping">Shopping & Souvenirs</option>
                    <option value="Other">Other / Miscellaneous</option>
                  </select>
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
                          currency: activeTrip?.currency || preferredCurrency || 'INR',
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
              <div>
                <h3>Recent Expenses ({expenses.length})</h3>
                <span style={{ fontSize: '0.85rem', color: 'var(--slate)' }}>
                  Stored in original currency • Displayed in {displayCurrency}
                </span>
              </div>
              <span className="badge badge-primary">Trip: {activeTrip?.title}</span>
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
                      <th>Original Amount</th>
                      <th>In {displayCurrency}</th>
                      <th style={{ textAlign: 'right' }}>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {expenses.map((item) => {
                      const itemCurr = item.currency || 'INR';
                      const isSameAsDisplay = itemCurr === displayCurrency;

                      return (
                        <tr key={item._id}>
                          <td style={{ fontWeight: 600 }}>{item.title}</td>
                          <td>
                            <span
                              className={`badge badge-${
                                item.category === 'Food'
                                  ? 'accent'
                                  : item.category === 'Transport' || item.category === 'Travel'
                                  ? 'primary'
                                  : item.category === 'Accommodation' || item.category === 'Hotels'
                                  ? 'success'
                                  : item.category === 'Activities'
                                  ? 'primary'
                                  : item.category === 'Shopping'
                                  ? 'warning'
                                  : 'warning'
                              }`}
                            >
                              {item.category}
                            </span>
                          </td>
                          <td>{new Date(item.date).toLocaleDateString()}</td>
                          <td style={{ color: 'var(--slate-light)', fontSize: '0.85rem' }}>
                            {item.note || '—'}
                          </td>
                          <td>
                            <span className="expense-original-badge">
                              {formatCurrency(item.amount, itemCurr)}
                            </span>
                          </td>
                          <td className="expense-amount-cell">
                            {formatDualCurrency(item.amount, itemCurr, displayCurrency)}
                          </td>
                          <td style={{ textAlign: 'right' }}>
                            <button
                              className="btn btn-outline btn-sm"
                              style={{ marginRight: '0.4rem' }}
                              onClick={() => handleStartEditExpense(item)}
                              title="Edit Expense"
                            >
                              ✏️
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => handleDeleteExpense(item._id)}
                              title="Delete Expense"
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      );
                    })}
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
