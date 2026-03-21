import React from "react";
import { Clock, ShieldCheck, TrendingUp, Bell } from "lucide-react";

const PaymentPendingPage = ({ strategy, amount, onDone }) => (
  <div className="min-h-screen flex flex-col bg-slate-50">
    <div
      className="relative flex flex-col items-center justify-center px-6 pt-16 pb-12 text-center"
      style={{
        background: "linear-gradient(135deg, #1a0533 0%, #2d1b69 50%, #1a0533 100%)",
        minHeight: "48vh",
      }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 h-64 w-64 rounded-full bg-violet-600/20 blur-[100px]" />
        <div className="absolute bottom-0 left-0 h-48 w-48 rounded-full bg-indigo-600/20 blur-[80px]" />
      </div>

      <div className="relative mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-violet-400/20 bg-white/10 backdrop-blur-sm">
        <div className="absolute h-20 w-20 rounded-full bg-violet-400/10 animate-ping" style={{ animationDuration: "3s" }} />
        <Clock className="h-9 w-9 text-violet-300" strokeWidth={1.5} />
      </div>

      <h1 className="text-2xl font-bold text-white tracking-tight mb-3">Payment Received</h1>
      <p className="text-sm text-slate-300 leading-relaxed max-w-xs mx-auto">
        We've noted your EFT transfer. Once your payment clears, your investment will be activated — typically within{" "}
        <span className="text-white font-semibold">1–2 business days</span>.
      </p>

      <div className="mt-6 inline-flex items-center gap-2 rounded-full bg-amber-500/10 border border-amber-500/20 px-4 py-1.5 backdrop-blur-md">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        <span className="text-[10px] font-bold text-amber-300 tracking-wider uppercase">Pending Verification</span>
      </div>
    </div>

    <div className="flex-1 px-5 -mt-6 relative z-10 space-y-4">
      <div className="rounded-3xl bg-white p-6 shadow-xl shadow-slate-200/50 border border-slate-100 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="h-1 w-8 rounded-full bg-violet-600" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Investment Summary</p>
        </div>
        
        <div className="space-y-3">
          {strategy && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Strategy</span>
              <span className="font-bold text-slate-900">{strategy}</span>
            </div>
          )}
          {amount != null && (
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-500">Total Amount</span>
              <span className="font-bold text-slate-900">
                R{Number(amount).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          )}
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-500">Method</span>
            <span className="font-bold text-slate-900">Direct EFT</span>
          </div>
          <div className="flex justify-between items-center pt-3 border-t border-slate-100">
            <span className="text-slate-500">Status</span>
            <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-amber-600 bg-amber-50 px-3 py-1 rounded-full uppercase tracking-wide">
              <Clock className="h-3 w-3" /> Pending
            </span>
          </div>
        </div>
      </div>

      <div className="py-4 space-y-4">
        {[
          { icon: ShieldCheck, label: "Payment Verified", sub: "We confirm your transfer has cleared", done: false },
          { icon: TrendingUp,  label: "Investment Activated", sub: "Your holdings are live in your portfolio", done: false },
          { icon: Bell,        label: "You'll be notified", sub: "Email confirmation sent on activation", done: false },
        ].map(({ icon: Icon, label, sub }, idx) => (
          <div key={label} className="relative flex items-start gap-4 pl-2">
            {idx < 2 && <div className="absolute left-[21px] top-10 w-[2px] h-8 bg-slate-200" />}
            <div className={`mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 ${idx === 0 ? 'bg-white border-violet-200' : 'bg-slate-50 border-slate-100'}`}>
              <Icon className={`h-3.5 w-3.5 ${idx === 0 ? 'text-violet-600' : 'text-slate-400'}`} strokeWidth={idx === 0 ? 2.5 : 2} />
            </div>
            <div className="pt-0.5">
              <p className={`text-sm font-bold ${idx === 0 ? 'text-slate-800' : 'text-slate-400'}`}>{label}</p>
              <p className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">{sub}</p>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="px-5 pb-10 pt-4">
      <button
        type="button"
        onClick={() => onDone?.()}
        className="w-full rounded-2xl py-4 text-sm font-bold text-white shadow-xl shadow-violet-200/50 transition-transform active:scale-[0.98]"
        style={{ background: "linear-gradient(90deg, #000000 0%, #5b21b6 100%)" }}
      >
        Back to Home
      </button>
    </div>
  </div>
);

export default PaymentPendingPage;
