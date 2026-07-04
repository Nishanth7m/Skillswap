import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { Coins, ArrowUpRight, ArrowDownLeft, Gift, ShieldAlert, Sparkles, RefreshCw, Calendar } from 'lucide-react';

export const Ledger = () => {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchTransactions = async (isSilent = false) => {
    if (!isSilent) setLoading(true);
    else setRefreshing(true);
    try {
      const res = await axios.get('/api/sessions/transactions');
      if (res.data?.success) {
        setTransactions(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load transaction history:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const getTransactionBadge = (tx, currentUserId) => {
    const isSender = tx.fromUser && tx.fromUser._id.toString() === currentUserId.toString();
    const isReceiver = tx.toUser && tx.toUser._id.toString() === currentUserId.toString();

    if (tx.type === 'SIGNUP_BONUS') {
      return {
        icon: <Gift className="w-4 h-4 text-pink-400" />,
        title: 'Signup Bonus',
        desc: 'Complimentary starting credits',
        amountText: `+${tx.amount}`,
        amountColor: 'text-pink-400',
        bg: 'bg-pink-500/10 border-pink-500/20'
      };
    }

    if (tx.type === 'SESSION_RESERVATION') {
      return {
        icon: <ArrowDownLeft className="w-4 h-4 text-orange-400" />,
        title: 'Credit Reserved',
        desc: `Locked in escrow for upcoming session`,
        amountText: `-${tx.amount}`,
        amountColor: 'text-orange-400',
        bg: 'bg-orange-500/10 border-orange-500/20'
      };
    }

    if (tx.type === 'SESSION_PAYMENT') {
      return {
        icon: <ArrowUpRight className="w-4 h-4 text-emerald-400" />,
        title: 'Credits Earned',
        desc: `Taught a session`,
        amountText: `+${tx.amount}`,
        amountColor: 'text-emerald-400',
        bg: 'bg-emerald-500/10 border-emerald-500/20'
      };
    }

    if (tx.type === 'SESSION_REFUND') {
      return {
        icon: <ArrowUpRight className="w-4 h-4 text-blue-400" />,
        title: 'Credits Refunded',
        desc: `Cancelled session refund`,
        amountText: `+${tx.amount}`,
        amountColor: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20'
      };
    }

    // Default adjustment
    return {
      icon: <Coins className="w-4 h-4 text-yellow-400" />,
      title: 'Manual Adjustment',
      desc: 'System credit adjustment',
      amountText: tx.fromUser ? `-${tx.amount}` : `+${tx.amount}`,
      amountColor: 'text-yellow-400',
      bg: 'bg-yellow-500/10 border-yellow-500/20'
    };
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Balance Panel */}
      <div className="p-6 sm:p-8 rounded-2xl border glass shadow-2xl relative overflow-hidden mb-8">
        <div className="absolute top-0 right-0 w-64 h-64 bg-yellow-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6">
          <div>
            <span className="text-xs font-bold text-yellow-500 uppercase tracking-widest flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 fill-current" /> Time Credit Balance
            </span>
            <h2 className="text-4xl sm:text-5xl font-black text-white mt-2 flex items-baseline gap-2">
              {user?.creditBalance}
              <span className="text-sm font-semibold text-gray-400 uppercase tracking-wider">
                {user?.creditBalance === 1 ? 'Hour Token' : 'Hour Tokens'}
              </span>
            </h2>
            <p className="text-xs text-gray-450 mt-2 max-w-md">
              Earn credits by teaching skills to others. Spend credits booking sessions to learn from peer mentors. 1 Credit = 1 Hour of teaching/learning.
            </p>
          </div>

          <button
            onClick={() => fetchTransactions(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/5 bg-white/5 hover:bg-white/10 text-xs text-gray-300 font-semibold transition-all disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
      </div>

      {/* Transaction History list */}
      <div className="p-6 sm:p-8 rounded-2xl border glass shadow-xl">
        <h3 className="text-lg font-bold text-white mb-6">Double-Entry Transaction Ledger</h3>

        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-white/5 opacity-55" />
            ))}
          </div>
        ) : transactions.length === 0 ? (
          <div className="text-center py-12 border border-dashed border-white/5 rounded-xl">
            <Coins className="w-10 h-10 text-gray-500 mx-auto mb-3" />
            <h4 className="text-sm font-semibold text-white">No transactions recorded</h4>
            <p className="text-xs text-gray-450 mt-1">Book or teach your first session to write records to the ledger.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {transactions.map((tx) => {
              const badge = getTransactionBadge(tx, user._id);
              const txDate = new Date(tx.createdAt).toLocaleDateString([], {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              });

              return (
                <div
                  key={tx._id}
                  className="p-4 rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-between gap-4"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`p-2 rounded-lg border shrink-0 ${badge.bg}`}>
                      {badge.icon}
                    </div>
                    <div className="min-w-0">
                      <h4 className="text-xs font-bold text-white">{badge.title}</h4>
                      <p className="text-[10px] text-gray-400 mt-0.5 truncate">{badge.desc}</p>
                      
                      {tx.session && tx.session.skill && (
                        <span className="inline-flex items-center gap-1 text-[8px] bg-white/5 border border-white/5 text-gray-400 px-1.5 py-0.5 rounded mt-1.5">
                          <Calendar className="w-2.5 h-2.5" />
                          Session: {tx.session.skill.name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className={`text-sm font-extrabold tracking-wide ${badge.amountColor}`}>
                      {badge.amountText}
                    </span>
                    <span className="text-[9px] text-gray-500 block mt-0.5">{txDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
export default Ledger;
