import React, { useState, useRef, useEffect } from "react";
import { ChevronDown } from "lucide-react";
import { SOUTH_AFRICAN_BANKS } from "../lib/BankData";

const BankDetailsStep = ({ 
  bankName, 
  accountNumber, 
  onBankChange, 
  onAccountNumberChange, 
  onContinue,
  onBack,
  isSubmitting 
}) => {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [accountNumberError, setAccountNumberError] = useState("");
  const dropdownRef = useRef(null);

  const selectedBank = SOUTH_AFRICAN_BANKS.find((b) => b.id === bankName);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const validateAccountNumber = (value) => {
    // South African bank account numbers are typically 10-11 digits
    const accountRegex = /^\d{10,11}$/;
    if (!accountRegex.test(value)) {
      setAccountNumberError("Account number must be 10-11 digits");
      return false;
    }
    setAccountNumberError("");
    return true;
  };

  const handleAccountNumberChange = (e) => {
    const value = e.target.value.replace(/\D/g, ""); // Remove non-digits
    onAccountNumberChange(value);
    if (value) {
      validateAccountNumber(value);
    }
  };

  const handleContinue = () => {
    if (!bankName) {
      alert("Please select a bank");
      return;
    }
    if (!accountNumber) {
      alert("Please enter your account number");
      return;
    }
    if (!validateAccountNumber(accountNumber)) {
      return;
    }
    onContinue();
  };

  return (
    <div className="w-full max-w-xl mx-auto">
      <div className="text-center mb-8 animate-fade-in delay-1">
        <p className="text-xs uppercase tracking-[0.2em] mb-2" style={{ color: "hsl(270 15% 60%)" }}>
          Step 6 of 6
        </p>
        <h2 className="text-2xl font-light tracking-tight mb-2" style={{ color: "hsl(270 30% 25%)" }}>
          Bank Details
        </h2>
        <p className="text-sm" style={{ color: "hsl(270 20% 50%)" }}>
          Where should we send your funds?
        </p>
      </div>

      <div className="space-y-6 animate-fade-in delay-2">
        {/* Bank Selection Dropdown */}
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: "hsl(270 30% 25%)" }}>
            Select Your Bank
          </label>
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className="w-full px-4 py-3 rounded-lg border border-slate-200 bg-white text-left flex items-center justify-between transition-all hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500"
            >
              {selectedBank ? (
                <div className="flex items-center gap-3">
                  <img
                    src={selectedBank.logo}
                    alt={selectedBank.name}
                    className="h-6 w-6 object-contain"
                    onError={(e) => {
                      e.target.src = "https://via.placeholder.com/24?text=" + selectedBank.name[0];
                    }}
                  />
                  <span className="text-slate-900">{selectedBank.name}</span>
                </div>
              ) : (
                <span style={{ color: "hsl(270 15% 60%)" }}>Choose a bank...</span>
              )}
              <ChevronDown
                className={`h-5 w-5 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`}
                style={{ color: "hsl(270 15% 60%)" }}
              />
            </button>

            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-slate-200 rounded-lg shadow-lg z-10 max-h-80 overflow-y-auto">
                {SOUTH_AFRICAN_BANKS.map((bank) => (
                  <button
                    key={bank.id}
                    type="button"
                    onClick={() => {
                      onBankChange(bank.id);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-slate-50 transition-colors border-b border-slate-100 last:border-b-0"
                  >
                    <img
                      src={bank.logo}
                      alt={bank.name}
                      className="h-6 w-6 object-contain"
                      onError={(e) => {
                        e.target.src = "https://via.placeholder.com/24?text=" + bank.name[0];
                      }}
                    />
                    <div>
                      <div className="font-medium text-slate-900">{bank.name}</div>
                      <div className="text-xs" style={{ color: "hsl(270 15% 60%)" }}>
                        Code: {bank.code}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Account Number Input */}
        <div>
          <label className="block text-sm font-medium mb-3" style={{ color: "hsl(270 30% 25%)" }}>
            Account Number
          </label>
          <input
            type="text"
            inputMode="numeric"
            placeholder="Enter your account number (10-11 digits)"
            value={accountNumber}
            onChange={handleAccountNumberChange}
            maxLength="11"
            className={`w-full px-4 py-3 rounded-lg border transition-all focus:outline-none focus:ring-2 ${
              accountNumberError
                ? "border-red-300 focus:ring-red-500 bg-red-50"
                : "border-slate-200 focus:ring-violet-500 bg-white"
            }`}
            style={{ color: "hsl(270 30% 25%)" }}
          />
          {accountNumberError && (
            <p className="mt-2 text-sm text-red-600">{accountNumberError}</p>
          )}
          <p className="mt-2 text-xs" style={{ color: "hsl(270 15% 60%)" }}>
            Enter your 10-11 digit account number without spaces or dashes
          </p>
        </div>

        {/* Info Box */}
        <div className="p-4 rounded-lg" style={{ backgroundColor: "hsl(270 20% 95%)" }}>
          <p className="text-xs" style={{ color: "hsl(270 30% 40%)" }}>
            💡 Your bank details are encrypted and securely stored. We'll use this to transfer your investment returns and withdrawals.
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3 mt-8 animate-fade-in delay-3">
        <button
          type="button"
          onClick={onBack}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 rounded-lg border border-slate-200 text-slate-700 font-medium transition-all hover:bg-slate-50 disabled:opacity-50"
        >
          Back
        </button>
        <button
          type="button"
          onClick={handleContinue}
          disabled={isSubmitting}
          className="flex-1 px-4 py-3 rounded-lg bg-gradient-to-r from-violet-600 to-violet-700 text-white font-medium transition-all hover:shadow-lg disabled:opacity-50"
        >
          {isSubmitting ? "Saving..." : "Continue"}
        </button>
      </div>
    </div>
  );
};

export default BankDetailsStep;