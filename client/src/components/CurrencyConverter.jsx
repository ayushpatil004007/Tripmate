// Dedicated Static Currency Converter Component
import React, { useState } from 'react';
import {
  EXCHANGE_RATES,
  BASE_CURRENCY,
  RATES_DISCLAIMER,
  CURRENCY_INFO,
  SUPPORTED_CURRENCY_CODES,
  convertCurrency,
  formatCurrency
} from '../utils/currency';
import { useCountry } from '../context/CountryContext';

const CurrencyConverter = ({ initialAmount = 100, onClose }) => {
  const { preferredCurrency } = useCountry();

  const [amount, setAmount] = useState(initialAmount);
  const [sourceCurrency, setSourceCurrency] = useState('USD');
  const [targetCurrency, setTargetCurrency] = useState(preferredCurrency || 'INR');

  // Handle amount input changes with safe validation
  const handleAmountChange = (e) => {
    const val = e.target.value;
    if (val === '') {
      setAmount('');
      return;
    }
    const num = parseFloat(val);
    if (!isNaN(num) && num >= 0) {
      setAmount(num);
    }
  };

  // Swap currencies
  const handleSwap = () => {
    setSourceCurrency(targetCurrency);
    setTargetCurrency(sourceCurrency);
  };

  // Quick preset pairs
  const handleSetPair = (src, tgt) => {
    setSourceCurrency(src);
    setTargetCurrency(tgt);
  };

  const convertedValue = convertCurrency(Number(amount) || 0, sourceCurrency, targetCurrency);
  const oneUnitRate = convertCurrency(1, sourceCurrency, targetCurrency);
  const reverseUnitRate = convertCurrency(1, targetCurrency, sourceCurrency);

  const srcInfo = CURRENCY_INFO[sourceCurrency] || { symbol: sourceCurrency, flag: '🌐', name: sourceCurrency };
  const tgtInfo = CURRENCY_INFO[targetCurrency] || { symbol: targetCurrency, flag: '🌐', name: targetCurrency };

  return (
    <div className="currency-converter-card">
      <div className="converter-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '1.4rem' }}>💱</span>
          <h3 style={{ margin: 0, fontSize: '1.2rem' }}>Travel Currency Converter</h3>
        </div>
        {onClose && (
          <button className="modal-close-btn" onClick={onClose} aria-label="Close converter">
            ✕
          </button>
        )}
      </div>

      <p className="converter-subtext">
        Convert between local trip currencies and home currency with fixed illustrative rates.
      </p>

      {/* Preset Quick-Buttons */}
      <div className="converter-presets">
        <button
          type="button"
          className={`preset-btn ${sourceCurrency === 'USD' && targetCurrency === 'INR' ? 'active' : ''}`}
          onClick={() => handleSetPair('USD', 'INR')}
        >
          USD → INR
        </button>
        <button
          type="button"
          className={`preset-btn ${sourceCurrency === 'INR' && targetCurrency === 'USD' ? 'active' : ''}`}
          onClick={() => handleSetPair('INR', 'USD')}
        >
          INR → USD
        </button>
        <button
          type="button"
          className={`preset-btn ${sourceCurrency === 'USD' && targetCurrency === 'EUR' ? 'active' : ''}`}
          onClick={() => handleSetPair('USD', 'EUR')}
        >
          USD → EUR
        </button>
        <button
          type="button"
          className={`preset-btn ${sourceCurrency === 'EUR' && targetCurrency === 'USD' ? 'active' : ''}`}
          onClick={() => handleSetPair('EUR', 'USD')}
        >
          EUR → USD
        </button>
        <button
          type="button"
          className={`preset-btn ${sourceCurrency === 'USD' && targetCurrency === 'AED' ? 'active' : ''}`}
          onClick={() => handleSetPair('USD', 'AED')}
        >
          USD → AED
        </button>
      </div>

      {/* Input Group */}
      <div className="converter-grid">
        {/* Source Amount & Currency */}
        <div className="converter-col">
          <label className="form-label" htmlFor="converter-amount">Amount</label>
          <div className="currency-input-wrapper">
            <span className="currency-input-symbol">{srcInfo.symbol}</span>
            <input
              id="converter-amount"
              type="number"
              className="form-input"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              min="0"
              step="any"
            />
          </div>
          <select
            className="form-select converter-select"
            value={sourceCurrency}
            onChange={(e) => setSourceCurrency(e.target.value)}
          >
            {SUPPORTED_CURRENCY_CODES.map((code) => {
              const info = CURRENCY_INFO[code] || { name: code, flag: '' };
              return (
                <option key={code} value={code}>
                  {info.flag} {code} - {info.name}
                </option>
              );
            })}
          </select>
        </div>

        {/* Swap Button */}
        <div className="converter-swap-col">
          <button
            type="button"
            className="btn btn-outline converter-swap-btn"
            onClick={handleSwap}
            title="Swap Source and Target Currencies"
            aria-label="Swap currencies"
          >
            ⇄
          </button>
        </div>

        {/* Target Result & Currency */}
        <div className="converter-col">
          <label className="form-label">Converted Result</label>
          <div className="converter-result-box">
            <span className="converter-result-value">
              {formatCurrency(convertedValue, targetCurrency)}
            </span>
          </div>
          <select
            className="form-select converter-select"
            value={targetCurrency}
            onChange={(e) => setTargetCurrency(e.target.value)}
          >
            {SUPPORTED_CURRENCY_CODES.map((code) => {
              const info = CURRENCY_INFO[code] || { name: code, flag: '' };
              return (
                <option key={code} value={code}>
                  {info.flag} {code} - {info.name}
                </option>
              );
            })}
          </select>
        </div>
      </div>

      {/* Exchange Rate Explanation */}
      <div className="converter-rate-badge">
        <span>
          1 {sourceCurrency} = <strong>{formatCurrency(oneUnitRate, targetCurrency)}</strong>
        </span>
        <span style={{ color: 'var(--slate)', margin: '0 0.5rem' }}>•</span>
        <span>
          1 {targetCurrency} = <strong>{formatCurrency(reverseUnitRate, sourceCurrency)}</strong>
        </span>
      </div>

      {/* Formula & Static Rates Disclaimer */}
      <div className="converter-disclaimer">
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
          <span>ℹ️</span>
          <div>
            <div>
              Formula: <code>amount × targetRate ÷ sourceRate</code> (Base: {BASE_CURRENCY})
            </div>
            <div style={{ marginTop: '0.2rem', fontStyle: 'italic', fontSize: '0.75rem' }}>
              {RATES_DISCLAIMER}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CurrencyConverter;
