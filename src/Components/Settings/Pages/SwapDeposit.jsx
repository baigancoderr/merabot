import { useState, useEffect } from "react";
import { ArrowLeft, User, ArrowDownUp, Loader, Wallet, TrendingUp, Users } from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "../../../api/axios";
import toast from "react-hot-toast";

const walletOptions = [
  { value: "roi",      label: "ROI Wallet",     icon: <TrendingUp size={16} /> },
  { value: "referral", label: "Referral Wallet", icon: <Users size={16} /> },
];

const SwapDeposit = () => {
  const navigate = useNavigate();

  const [selectedWallet, setSelectedWallet] = useState("roi");
  const [amount, setAmount] = useState("");
  const [swapLoading, setSwapLoading] = useState(false);

  const [swaps, setSwaps] = useState([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });
  const [currentPage, setCurrentPage] = useState(1);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");

  const getTelegramId = () => {
    const tg = window.Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user?.id) return tg.initDataUnsafe.user.id;
    const savedUserId = localStorage.getItem("userId");
    if (savedUserId) return savedUserId;
    try {
      const userStr = localStorage.getItem("user");
      if (userStr) {
        const user = JSON.parse(userStr);
        return user.userId || user._id || user.id;
      }
    } catch (e) {}
    return null;
  };

  const fetchHistory = async (page = 1) => {
    setHistoryLoading(true);
    setHistoryError("");
    try {
      const res = await api.get("/user/swap-history", {
        params: { page, limit: 10 },
      });
      if (res.data.status === "success") {
        setSwaps(res.data.data.swaps);
        setPagination(res.data.data.pagination);
      } else {
        setHistoryError(res.data.message || "Failed to load history.");
      }
    } catch (err) {
      setHistoryError(err.response?.data?.message || "Network error.");
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    fetchHistory(currentPage);
  }, [currentPage]);

  const handleSwap = async () => {
    const telegramId = getTelegramId();
    if (!telegramId) {
      toast.error("Session expired. Please login again.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error("Please enter a valid amount.");
      return;
    }

    setSwapLoading(true);
    try {
      const res = await api.post("/user/swap-to-deposit", {
        walletType: selectedWallet,
        amount: Number(amount),
      });

      if (res.data.success || res.data.status === "success") {
        toast.success(res.data.message || "Swap successful ✅");
        setAmount("");
        fetchHistory(1);
        setCurrentPage(1);
      } else {
        toast.error(res.data.message || "Swap failed.");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Something went wrong.");
    } finally {
      setSwapLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return "";
    return new Date(dateStr).toLocaleTimeString("en-IN", {
      hour: "2-digit", minute: "2-digit", hour12: true,
    });
  };

  return (
    <div className="min-h-screen px-3 py-3 pb-24 text-white">
      <div className=" w-full max-w-md mx-auto space-y-5">

        {/* HEADER */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-lg bg-[#00000033] border border-[#444385]"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold">Swap to Deposit</h2>
          </div>
          <div
            onClick={() => navigate("/settings/profile")}
            className="w-10 h-10 flex items-center justify-center rounded-xl 
              bg-gradient-to-r from-[#587FFF] to-[#09239F] 
              shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 transition"
          >
            <User size={18} />
          </div>
        </div>

        {/* SWAP CARD */}
        <div className="rounded-2xl border-2 border-[#444385] overflow-hidden">
          <div className="bg-[#00000033] p-4 backdrop-blur-[20px] space-y-4">

            {/* WALLET SELECT */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Select Wallet</p>
              <div className="flex gap-2">
                {walletOptions.map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setSelectedWallet(opt.value)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm transition-all active:scale-95 ${
                      selectedWallet === opt.value
                        ? "bg-gradient-to-r from-[#587FFF] to-[#09239F] border-transparent text-white"
                        : "border-[#444385] text-gray-400 bg-black hover:border-blue-500/50"
                    }`}
                  >
                    {opt.icon}
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

             {/* TO WALLET INDICATOR */}
            <div className="flex items-center gap-3 bg-black/40 border border-[#444385] rounded-xl px-4 py-3">
              <ArrowDownUp size={16} className="text-blue-400 shrink-0" />
              <div>
                <p className="text-xs text-gray-400">To Wallet</p>
                <p className="text-sm text-white font-medium">Deposit Wallet</p>
              </div>
            </div>

            {/* AMOUNT INPUT */}
            <div>
              <p className="text-xs text-gray-400 mb-2">Amount</p>
              <div className="flex items-center bg-black border border-[#444385] rounded-xl px-4 py-3 gap-3">
                <Wallet size={16} className="text-blue-400 shrink-0" />
                <input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="bg-transparent outline-none text-white flex-1 min-w-0"
                />
                <span className="text-xs text-gray-500 shrink-0">
                  {selectedWallet === "referral" ? "USDC" : "CIP"}
                </span>
              </div>
            </div>

           

            {/* SWAP BUTTON */}
            <button
              onClick={handleSwap}
              disabled={swapLoading}
              className="w-full py-3 rounded-full font-semibold bg-gradient-to-r from-[#587FFF] to-[#09239F] 
                hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-60 disabled:cursor-not-allowed
                flex items-center justify-center gap-2"
            >
              {swapLoading ? (
                <><Loader size={16} className="animate-spin" /> Processing...</>
              ) : (
                <><ArrowDownUp size={16} /> Swap to Deposit</>
              )}
            </button>

          </div>
        </div>

        {/* HISTORY */}
        <div className="space-y-4 border border-[#444385] rounded-lg px-2 py-4 bg-[#00000033]">

          <div className="flex justify-between items-center px-1">
            <h3 className="text-lg font-semibold bg-gradient-to-r from-[#587FFF] to-[#09239F] bg-clip-text text-transparent">
              Swap History
            </h3>
            <span className="text-xs px-2 py-1 rounded-full bg-blue-500/10 text-blue-400">
              {pagination.total} Records
            </span>
          </div>

          {historyLoading && (
            <div className="flex justify-center items-center py-10">
              <Loader size={24} className="text-blue-400 animate-spin" />
            </div>
          )}

          {!historyLoading && historyError && (
            <div className="text-center text-red-400 text-sm py-6 border border-red-500/20 rounded-xl bg-red-500/5">
              {historyError}
              <button
                onClick={() => fetchHistory(currentPage)}
                className="block mx-auto mt-3 text-xs text-blue-400 underline"
              >
                Retry
              </button>
            </div>
          )}

          {!historyLoading && !historyError && swaps.length === 0 && (
            <div className="text-center text-gray-500 text-sm py-10">
              No swap history found.
            </div>
          )}

          {!historyLoading && !historyError && swaps.length > 0 && (
            <div className="rounded-lg border border-[#81ECFF66] p-[1px] bg-[linear-gradient(217deg,_rgba(88,127,255,0.4),_rgba(0,7,64,0.2))]">
              <div className="rounded-lg bg-[#0B0F1A] backdrop-blur-xl overflow-x-auto">
                <table className="min-w-[700px] w-full text-sm">
                  <thead className="bg-[linear-gradient(90deg,_rgba(88,127,255,0.1),_transparent)]">
                    <tr className="text-white border-b border-[#1f2430]">
                      <th className="px-3 py-3 text-left">Sr</th>
                      <th className="px-3 py-3 text-left">Swap ID</th>
                      <th className="px-3 py-3 text-left">From</th>
                      <th className="px-3 py-3 text-center">Amount</th>
                      <th className="px-3 py-3 text-center">Fee</th>
                      <th className="px-3 py-3 text-center">Received</th>
                      <th className="px-3 py-3 text-center">Status</th>
                      <th className="px-3 py-3 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {swaps.map((item, i) => (
                      <tr
                        key={item._id}
                        className="border-b border-[#1f2430] hover:bg-[linear-gradient(90deg,_rgba(88,127,255,0.1),_transparent)]"
                      >
                        <td className="px-3 py-3 text-blue-400 font-medium">
                          {(currentPage - 1) * 10 + i + 1}
                        </td>
                        <td className="px-3 py-3 font-mono text-xs text-gray-300">
                          {item.swapId?.slice(-8)}
                        </td>
                        <td className="px-3 py-3">
                          <span className={`text-xs px-2 py-1 rounded-full capitalize ${
                            item.fromWallet === "roi"
                              ? "bg-blue-500/20 text-blue-300"
                              : "bg-purple-500/20 text-purple-300"
                          }`}>
                            {item.fromWallet}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-center text-white font-medium">
                          {item.fromAmount} {item.fromWallet === "referral" ? "USDC" : "CIP"}
                        </td>
                        <td className="px-3 py-3 text-center text-white font-medium">
                          {item.feePercentage != null ? `${item.feePercentage}%` : "-"}
                        </td>
                        <td className="px-3 py-3 text-center font-semibold text-[#81ECFF]">
                          {item.finalAmount != null ? `$${item.finalAmount.toFixed(2)}` : "-"}
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className={`text-xs px-2 py-1 rounded-full ${
                            item.status === "completed"
                              ? "bg-emerald-500/20 text-emerald-400"
                              : "bg-yellow-500/20 text-yellow-400"
                          }`}>
                            {item.status}
                          </span>
                        </td>
                        <td className="px-3 py-3 text-right text-xs text-gray-400">
                          <div>{formatDate(item.createdAt)}</div>
                          <div className="text-[10px] text-gray-500">{formatTime(item.createdAt)}</div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {pagination.totalPages > 1 && (
            <div className="flex justify-between items-center mt-4">
              <p className="text-xs text-gray-400">
                Page <span className="text-white">{pagination.page}</span> of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <button onClick={() => setCurrentPage(1)} disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-[#444385] rounded disabled:opacity-40">⏮</button>
                <button onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-[#444385] rounded disabled:opacity-40">←</button>
                <button onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage === pagination.totalPages}
                  className="px-2 py-1 text-xs border border-[#444385] rounded disabled:opacity-40">→</button>
                <button onClick={() => setCurrentPage(pagination.totalPages)} disabled={currentPage === pagination.totalPages}
                  className="px-2 py-1 text-xs border border-[#444385] rounded disabled:opacity-40">⏭</button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
};

export default SwapDeposit;
