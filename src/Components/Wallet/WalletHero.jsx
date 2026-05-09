import { Coins, CheckCircle, ArrowLeft, Loader, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import api from "../../api/axios";

const WalletHero = () => {
  const navigate = useNavigate();
  const [showAll, setShowAll] = useState(false);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [investmentsLoading, setInvestmentsLoading] = useState(true);
  const format3 = (num) => Number(num || 0).toFixed(3);
  const [overview, setOverview] = useState({
    wallets: {
      mainBalance: 0,
      deposit: 0,
      referral: 0,
      roi: 0,
    },
    investments: {
      totalInvested: 0,
    },
    currentTokenPrice: 0,
    roiInUsd: 0,
  });
  const [investments, setInvestments] = useState([]);

  // Same pattern as InvestmentHistory
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
    } catch (e) {
      console.error("Failed to parse user from localStorage", e);
    }
    return null;
  };

  useEffect(() => {
    const fetchOverview = async () => {
      try {
        const res = await api.get("/user/overview");
        if (res.data.status === "success" || res.data.success) {
          setOverview(res.data.data);
        }
      } catch (error) {
        console.error("Error fetching overview:", error);
      } finally {
        setOverviewLoading(false);
      }
    };

    const fetchInvestments = async () => {
      const telegramId = getTelegramId();
      
      if (!telegramId) {
        console.error("No telegram ID found");
        setInvestmentsLoading(false);
        return;
      }

      try {
        const res = await api.get("/user/investments", {
          params: { telegramId, page: 1, limit: 5 },
        });
        console.log("FULL RESPONSE:", res.data);

        let data = [];
        if (res.data.status === "success") {
          data = res.data.data?.investments || [];
        } else if (res.data.success) {
          data = res.data.data?.investments || res.data.data || [];
        }

        console.log("FINAL DATA:", data);
        setInvestments(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Error fetching investments:", error);
      } finally {
        setInvestmentsLoading(false);
      }
    };

    fetchOverview();
    fetchInvestments();
  }, []);

  const walletData = [
  {
    title: "DEPOSIT (Usdc)",
    value: `$${format3(overview.wallets.deposit)}`,
    sub: "Wallet Balance",
  },
    {
    title: "TOTAL INVESTMENT",

    value: `$${format3(overview.investments.totalInvested)}`,
    sub: "All Time",
  },
{
  title: "REFERRAL (Usdc)",
  value: `$${format3(overview.wallets.referral)}`,
  sub: "Earnings",
  button: "Withdraw",
  path: "/settings/withdraw-usdt",
},
{
  title: "ROI (CIP)",
  value: `${format3(overview.wallets.roi)}`,
  sub: "Earnings",
  button: "Withdraw",
  path: "/settings/withdraw-usdt",
},

];


  const visibleData = investments && investments.length > 0 
    ? (showAll ? investments : investments.slice(0, 5)) 
    : [];
  

  return (
    <div className="w-full flex justify-center  px-3 py-3">
      

      <div className="w-full max-w-md space-y-6">
          <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg bg-[#00000033] border border-[#444385]"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold">Wallet </h2>
          </div>

          <div
            onClick={() => navigate("/settings")}
            className="w-10 h-10 flex items-center justify-center rounded-xl 
              bg-gradient-to-r from-[#587FFF] to-[#09239F] 
              shadow-lg shadow-blue-500/20
              cursor-pointer active:scale-95 transition"
          >
            <User size={18} />
          </div>
        </div>
        

        {/* ===== WALLET OVERVIEW ===== */}
        <div className="rounded-2xl p-3 border border-blue-500/20 shadow-2xl">

          <div className="flex justify-between items-center mb-2">
            <h2 className="text-white font-semibold text-lg">
              Wallet Overview
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3">
  {walletData.map((item, i) => (
    <div
      key={i}
      className="group rounded-2xl border-2 border-[#444385] hover:border-transparent   overflow-hidden"
    >
      <div className="bg-[#00000033] p-3 backdrop-blur-[20px] h-full min-h-[110px]
        transition-all duration-300
        group-hover:bg-[linear-gradient(180deg,_#020204_0%,_#2C6096_100%)]
        group-hover:border-l-[5px] group-hover:border-l-[#587FFF]">

        <p className="text-gray-400 text-xs">{item.title}</p>

        <p className="text-white text-md font-semibold mt-1">
          {item.value}
        </p>

    <p className="text-xs text-gray-400 mt-2">
  {item.sub}
</p>

{item.button && (
  <button
    onClick={() => navigate(item.path)}
    className="
      relative mt-3 w-full overflow-hidden
      rounded-lg border border-[#5B7FFF]
      bg-[linear-gradient(180deg,#0B1020_0%,#132A63_100%)]
      px-4 py-1.5
      text-xs font-semibold tracking-wide text-white
      shadow-[0_0_5px_rgba(88,127,255,0.25)]
      transition-all duration-300

      hover:scale-[1.02]
      hover:border-[#8EA7FF]
      hover:shadow-[0_0_10px_rgba(88,127,255,0.45)]

      active:scale-[0.98]
    "
  >
    {/* Glow Effect */}
    <span
      className="
        absolute inset-0
        bg-gradient-to-r from-transparent via-white/10 to-transparent
        translate-x-[-120%]
        hover:translate-x-[120%]
        transition-transform duration-700
      "
    />

    {/* Button Content */}
    <span className="relative z-10 flex items-center justify-center gap-2">
      Withdraw
    </span>
  </button>
)}

      </div>
    </div>
  ))}
</div>
        </div>

        {/* ===== INVESTMENT HISTORY ===== */}
        <div className="rounded-2xl p-3
          bg-[linear-gradient(217.49deg,_rgba(88,127,255,0.5)_1.24%,_rgba(0,7,64,0.245)_20.92%)]
          border border-blue-500/50 shadow-2xl backdrop-blur-2xl">

          {/* Header */}
          <div className="flex justify-between items-center mb-5">
            <h3 className="text-white font-semibold text-base">
              Investment History
            </h3>

            <button
  onClick={() => navigate("/settings/investment-history")}
  className="text-blue-400 text-xs hover:text-blue-300 transition"
>
  Show All →
</button>
          </div>

        
          
         {/* Cards */}
{/* Cards */}
<div className="space-y-3">
  {investmentsLoading ? (
    <div className="flex justify-center items-center py-6">
      <Loader size={24} className="text-blue-400 animate-spin" />
    </div>
  ) : !investments || investments.length === 0 ? (
    <div className="text-center text-gray-500 text-sm py-6">
      No investments found.
    </div>
  ) : (
    <>
      {visibleData.map((item) => {
        const isActive = item?.status === "active";
        const daysCompleted = Math.min(item?.claimedDays || 0, item?.totalDays || 700);
        const progress =
          (daysCompleted / (item?.totalDays || 700)) * 100;

        return (
          <div
            key={item?._id || item?.id}
            className="group rounded-2xl border border-[#444385] overflow-hidden"
          >
            <div
              className="bg-[#00000033] p-3 backdrop-blur-[20px]
              group-hover:bg-[linear-gradient(180deg,#020204,#2C6096)]
              transition-all duration-300"
            >
              {/* Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div
                    className={`p-1.5 rounded-xl ${
                      isActive
                        ? "bg-blue-500/10"
                        : "bg-green-500/10"
                    }`}
                  >
                    {isActive ? (
                      <Loader
                        size={16}
                        className="text-blue-400 animate-spin"
                      />
                    ) : (
                      <CheckCircle
                        size={16}
                        className="text-green-400"
                      />
                    )}
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <Coins size={14} className="text-purple-400" />
                      <span className="text-white text-sm font-semibold">
                        {item?.amount || 0} USDC
                      </span>
                    </div>

                    <span className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded-full">
                     {format3(item?.tokensReceived)}
                      CIP tokens
                    </span>
                  </div>
                </div>

                <div className="text-right text-[10px] flex flex-col items-end gap-1">
                  <div
                    className={`flex items-center gap-2 ${
                      isActive
                        ? ""
                        : "flex-col items-end gap-1"
                    }`}
                  >
                    <p className="text-gray-400">
                      {item?.startDate
                        ? new Date(item.startDate).toLocaleTimeString(
                            "en-IN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            }
                          )
                        : "—"}
                    </p>

                    <span
                      className={`px-2 py-1 rounded-full text-[10px] ${
                        isActive
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-green-500/20 text-green-400"
                      }`}
                    >
                      {isActive ? "Active" : "Completed"}
                    </span>
                  </div>

                  <p className="text-gray-500 text-[9px]">
                    {item?.startDate
                      ? new Date(item.startDate).toLocaleDateString(
                          "en-IN",
                          {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          }
                        )
                      : "—"}
                  </p>
                </div>
              </div>

              {/* Body */}
              <div className="mt-2 flex justify-between items-center ">
               <p className="text-cyan-400 text-sm font-medium flex items-center gap-1">
  <span>{format3(item?.dailyIncomeTokens)}</span>
  <span>CIP / day</span>
</p>

                <p className="text-xs text-gray-400">
                  {daysCompleted} / {item?.totalDays || 700} days
                </p>
              </div>

              {/* Progress */}
              <div className="w-full h-1.5 bg-[#111] rounded-full mt-2 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#587FFF] to-[#09239F]"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>
        );
      })}
    </>
  )}
</div>
</div>

      </div>
    </div>
  );
};

export default WalletHero;