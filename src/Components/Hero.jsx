import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  DollarSign,
  Wallet,
  TrendingUp,
  Users,
  Coins,
  BarChart3,
  Copy,
  Share2,
  User,
  X,
} from "lucide-react";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Line } from "react-chartjs-2";
import api from "../api/axios";
import DashboardSkeletonPage from "../Layout/Skeleton"
import {
  Chart as ChartJS,
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler,
} from "chart.js";
import { QRCodeSVG } from "qrcode.react";

ChartJS.register(
  LineElement,
  PointElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Filler
);

const HomeDashboard = () => {
  // const [activeFilter, setActiveFilter] = useState("1D");
  const [deposits, setDeposits] = useState([]);
  const [depositsLoading, setDepositsLoading] = useState(true);
  const [chartFilter, setChartFilter] = useState("1W");
const [investmentChartData, setInvestmentChartData] = useState(null);
const [showQR, setShowQR] = useState(false);
const [tokenInfo, setTokenInfo] = useState({ totalSupply: 0, burnSupply: 0, updatedAt: "" });
const [tokenLoading, setTokenLoading] = useState(true);
  // const [dashboardData, setDashboardData] = useState(null);
  // const [loading, setLoading] = useState(true);
  // const [error, setError] = useState(null);

  const navigate = useNavigate();

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
    const fetchDeposits = async () => {
      const telegramId = getTelegramId();
      
      if (!telegramId) {
        setDepositsLoading(false);
        return;
      }

      try {
        const res = await api.get("/user/deposit-history", {
          params: { telegramId, page: 1, limit: 3 },
        });
        
        if (res.data.success) {
          // Filter only completed status
          const completedDeposits = res.data.deposits?.filter(
            d => d.status === "completed" || d.status === "Completed"
          ) || [];
          setDeposits(completedDeposits.slice(0, 3));
        }
      } catch (error) {
        console.error("Error fetching deposits:", error);
      } finally {
        setDepositsLoading(false);
      }
    };

    fetchDeposits();
  }, []);
  useEffect(() => {
  const fetchInvestments = async () => {
    try {
      const res = await api.get("/user/investments", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      });
      if (res.data.status === "success") {
        setInvestmentChartData(res.data.data.investments);
      }
    } catch (error) {
      console.error("Error fetching investments:", error);
    }
  };
  fetchInvestments();
}, []);

useEffect(() => {
  const fetchTokenInfo = async () => {
    setTokenLoading(true);
    const endpoints = ["/public/supply", "/token/supply", "/token/info", "/token", "/token/token-info"];

    for (const endpoint of endpoints) {
      try {
        const res = await api.get(endpoint);
        const payload = res.data?.data || res.data;

        if (
          payload &&
          (payload.totalSupply !== undefined ||
            payload.burnSupply !== undefined ||
            payload.burnedSupply !== undefined ||
            payload.burned !== undefined)
        ) {
          setTokenInfo({
            totalSupply: Number(payload.totalSupply || 0),
            burnSupply: Number(
              payload.burnSupply ?? payload.burnedSupply ?? payload.burned ?? 0
            ),
            updatedAt: payload.updatedAt || res.data?.updatedAt || "",
          });
          break;
        }
      } catch (err) {
        // try next endpoint
      }
    }

    setTokenLoading(false);
  };

  fetchTokenInfo();
}, []);

  // Icon Mapping (Backend does not send icons)
 const getIcon = (title) => {
  switch (title?.toUpperCase()) {
    case "LIVE PRICE (CIP)":
      return <TrendingUp size={18} />;

    case "TOTAL DEPOSIT":
      return <DollarSign size={18} />;

    case "WALLET BALANCE":
      return <Wallet size={18} />;

    case "TOTAL EARNINGS":
      return <Coins size={18} />;

    case "TOTAL USERS":
      return <Users size={18} />;

    case "ACTIVE USERS":
      return <Users size={18} className="text-green-400" />;

    case "TEAM":
      return <Users size={18} />;

    default:
      return <TrendingUp size={18} />;
  }
};

  // Fetch Dashboard Data from Backend
const {
  data,
  isLoading,
  error,
} = useQuery({
  queryKey: ["dashboard"],
  queryFn: () =>
    api
      .get("/user/dashboard", {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      .then((res) => res.data),
  staleTime: 1000 * 60 * 5,
});

  // Share Handler
 const handleShare = () => {
  const referralLink = data?.dashboard?.referralLink;
  if (!referralLink) return;

  const text = "Join Cipera and start earning daily! 🚀";

  if (window.Telegram?.WebApp) {
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
      referralLink
    )}&text=${encodeURIComponent(text)}`;
    window.Telegram.WebApp.openTelegramLink(telegramShareUrl);
  } else if (navigator.share) {
    navigator.share({
      title: "Join Now 🚀",
      text,
      url: referralLink,
    });
  } else {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }
};

  // Copy Handler
 const handleCopy = async () => {
  const referralLink = data?.dashboard?.referralLink;
  if (!referralLink) return;

  try {
    await navigator.clipboard.writeText(referralLink);
    toast.success("Referral link copied! 🚀");
  } catch (err) {
    toast.error("Failed to copy link");
  }
};



const buildChartData = (investments, filter) => {
  if (!investments || investments.length === 0) {
    return { labels: [], data: [] };
  }

  const now = new Date();
  let points = [];

  if (filter === "1W") {
    // Last 7 days
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const label = d.toLocaleDateString("en-IN", { weekday: "short" });
      const total = investments
        .filter(inv => new Date(inv.startDate) <= d)
        .reduce((sum, inv) => sum + inv.amount, 0);
      points.push({ label, total });
    }
  } else if (filter === "1M") {
    // Last 4 weeks
    for (let i = 3; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i * 7);
      const label = `W${4 - i}`;
      const total = investments
        .filter(inv => new Date(inv.startDate) <= d)
        .reduce((sum, inv) => sum + inv.amount, 0);
      points.push({ label, total });
    }
  } else if (filter === "1Y") {
    // Last 12 months
    for (let i = 11; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const label = d.toLocaleDateString("en-IN", { month: "short" });
      const total = investments
        .filter(inv => new Date(inv.startDate) <= new Date(d.getFullYear(), d.getMonth() + 1, 0))
        .reduce((sum, inv) => sum + inv.amount, 0);
      points.push({ label, total });
    }
  }

  return {
    labels: points.map(p => p.label),
    data: points.map(p => p.total),
  };
};



 const { labels: chartLabels, data: chartValues } = 
  buildChartData(investmentChartData, chartFilter);

const chartData = {
  labels: chartLabels,
  datasets: [
    {
      data: chartValues,
      borderColor: "#587FFF",
      tension: 0.4,
      fill: true,
      pointRadius: 3,
      pointHoverRadius: 6,
      pointBackgroundColor: "#587FFF",
      backgroundColor: (context) => {
        const ctx = context.chart.ctx;
        const gradient = ctx.createLinearGradient(0, 0, 0, 250);
        gradient.addColorStop(0, "rgba(88,127,255,0.4)");
        gradient.addColorStop(1, "rgba(88,127,255,0)");
        return gradient;
      },
    },
  ],
};

const chartOptions = {
  responsive: true,
  plugins: {
    legend: { display: false },
    tooltip: {
      callbacks: {
        label: (ctx) => `$${ctx.parsed.y.toFixed(2)}`,
      },
    },
  },
  scales: {
    x: {
      ticks: { color: "#888", font: { size: 11 } },
      grid: { display: false },
    },
    y: {
      ticks: {
        color: "#888",
        font: { size: 11 },
        callback: (val) => `$${val}`,
      },
      grid: { color: "#1f1f2e" },
    },
  },
};



  // Loading State
if (isLoading) {
  return <DashboardSkeletonPage />;
}

  // Error State
if (error || !data) {
  return (
    <div className="min-h-screen flex items-center justify-center text-white">
      <p>Error loading dashboard</p>
    </div>
  );
}

const { user, dashboard } = data;
const stats = dashboard.stats
  .filter(
    (item) =>
      item.title !== "ACTIVE PACKAGE" &&
    item.title !== "WALLET BALANCE" &&
    item.title !== "ROI EARNINGS" &&
    item.title !== "DIRECT TEAM" &&
    item.title!== "TOTAL DEPOSIT" &&
    item.title !== "TOTAL EARNINGS" &&
    item.title !== "ROI (CIP) EARNINGS" &&
    item.title !== "REFERRAL EARNINGS" 
  )
  .map((item) => ({
    ...item,
    value:
      item.title === "LIVE PRICE (CIP)"
        ? `$${dashboard.tokenPrice}`
        : item.value,
  }));

  return (
    <motion.div
      className="min-h-screen text-white px-3 py-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="max-w-md mx-auto space-y-6">

        {/* HEADER */}
        <motion.div
          className="flex items-center justify-between bg-[#00000033] backdrop-blur-[20px] border border-[#444385] rounded-2xl px-4 py-3"
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div>
            <p className="text-xs text-gray-400">User ID</p>
            <h2 className="text-lg font-semibold bg-gradient-to-r from-[#FFF] to-[#587FFF] bg-clip-text text-transparent">
              {user.userId}
            </h2>
          </div>

          <div
            onClick={() => navigate("/settings")}
            className="w-10 h-10 flex items-center justify-center rounded-xl bg-gradient-to-r from-[#587FFF] to-[#09239F] shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 transition"
          >
            <User size={18} />
          </div>
        </motion.div>

        {/* STATS CARDS */}
        <motion.div
          className="grid grid-cols-2 gap-3"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {stats.map((item, i) => (
            <motion.div
              key={i}
              className="group rounded-2xl border-2 border-[#444385] overflow-hidden hover:scale-105 transition-transform duration-300"
              whileHover={{ scale: 1.02 }}
            >
              <div className="bg-[#00000033] p-4 backdrop-blur-[20px] transition-all duration-300 group-hover:bg-[linear-gradient(180deg,#020204,#2C6096)] group-hover:border-l-[5px] group-hover:border-l-[#587FFF]">
                <div className="flex justify-between">
                  <p className="text-gray-400 text-xs">{item.title}</p>
                  <div className="text-blue-400">{getIcon(item.title)}</div>
                </div>
                <p className="text-white text-lg font-semibold mt-2">
                  {item.value}
                </p>
              </div>
            </motion.div>
          ))}
        </motion.div>

        <motion.div
          className="space-y-4 "
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.22 }}
        >
          <motion.div
            className="group rounded-2xl border-2 border-[#444385] overflow-hidden hover:scale-105 transition-transform duration-300"
            whileHover={{ scale: 1.02 }}
          >
            <div className="bg-[#00000033] p-4 backdrop-blur-[20px] transition-all duration-300 group-hover:bg-[linear-gradient(180deg,#020204,#2C6096)] group-hover:border-l-[5px] group-hover:border-l-[#587FFF]">
              <div className="flex justify-between">
                <p className="text-gray-400 text-xs">Total Supply</p>
                <div className="text-yellow-300">
                  <Coins size={18} />
                </div>
              </div>
              <p className="text-white text-lg font-semibold mt-2">
                {tokenLoading ? "..." : Number(tokenInfo.totalSupply || 0).toLocaleString()}
              </p>
            </div>
          </motion.div>

          <motion.div
            className="group rounded-2xl border-2 border-[#444385] overflow-hidden hover:scale-105 transition-transform duration-300"
            whileHover={{ scale: 1.02 }}
          >
            <div className="bg-[#00000033] p-4 backdrop-blur-[20px] transition-all duration-300 group-hover:bg-[linear-gradient(180deg,#020204,#2C6096)] group-hover:border-l-[5px] group-hover:border-l-[#587FFF]">
              <div className="flex justify-between">
                <p className="text-gray-400 text-xs">Burned Supply</p>
                <div className="text-cyan-300">
                  <BarChart3 size={18} />
                </div>
              </div>
              <p className="text-white text-lg font-semibold mt-2">
                {tokenLoading ? "..." : Number(tokenInfo.burnSupply || 0).toLocaleString()}
              </p>
            </div>
          </motion.div>
        </motion.div>

        {/* DEXSCREENER CHART */}
<motion.div
  className="rounded-2xl border-2 border-[#444385] overflow-hidden"
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ delay: 0.25 }}
>
  <div className="bg-[#00000033] p-2 backdrop-blur-[20px]">
    <style>
      {`
        #dexscreener-embed {
          position: relative;
          width: 100%;
          padding-bottom: 125%;
        }

        @media (min-width: 1400px) {
          #dexscreener-embed {
            padding-bottom: 95%;
          }
        }

        #dexscreener-embed iframe {
          position: absolute;
          width: 100%;
          height: 100%;
          top: 0;
          left: 0;
          border: 0;
          border-radius: 16px;
        }
      `}
    </style>

    <div id="dexscreener-embed">
      <iframe
        src="https://dexscreener.com/base/0x5100eBE2e02b20FC92CA9339CFDD1C109a16186e?embed=1&loadChartSettings=0&chartLeftToolbar=0&chartDefaultOnMobile=1&chartTheme=dark&theme=dark&chartStyle=0&chartType=usd&interval=15"
        title="DexScreener Chart"
        allowFullScreen
      />
    </div>
  </div>
</motion.div>

        {/* CHART */}
       <motion.div
  className="rounded-2xl border-2 border-[#444385] overflow-hidden"
  initial={{ y: 20, opacity: 0 }}
  animate={{ y: 0, opacity: 1 }}
  transition={{ delay: 0.3 }}
>
  <div className="bg-[#00000033] p-4 backdrop-blur-[20px]">
    <div className="flex items-center justify-between mb-3">
      <p className="text-gray-300 text-sm">Investment Overview</p>
      <p className="text-blue-400 text-sm font-semibold">
        ${investmentChartData?.reduce((s, i) => s + i.amount, 0) || 0} total
      </p>
    </div>

    {chartLabels.length === 0 ? (
      <div className="h-[200px] flex items-center justify-center text-gray-500 text-sm">
        No investment data
      </div>
    ) : (
      <Line data={chartData} options={chartOptions} />
    )}

    <div className="flex justify-between mt-4">
      {["1W", "1M", "1Y"].map((item) => (
        <button
          key={item}
          onClick={() => setChartFilter(item)}
          className={`text-xs px-4 py-2 rounded-full transition-all active:scale-95 ${
            chartFilter === item
              ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
              : "text-gray-400 hover:bg-gray-700"
          }`}
        >
          {item}
        </button>
      ))}
    </div>
  </div>
</motion.div>


        {/* REFERRAL LINK */}
        <motion.div
          className="rounded-2xl border-2 border-[#444385] overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="bg-[#00000033] p-4 backdrop-blur-[20px]">
            <p className="text-sm text-gray-300 mb-2">Referral Link</p>

          <div className="bg-black border border-[#81ECFF] rounded-lg p-3 text-xs mb-4 truncate">
  {dashboard.referralLink}
</div>

            <div className="flex gap-3">
              <button
                onClick={handleCopy}
                className="flex-1 bg-[linear-gradient(45deg,#587FFF,#09239F)] hover:bg-[linear-gradient(45deg,#6C8CFF,#0B2ED1)] text-white text-sm py-3 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Copy size={16} />
                Copy
              </button>

              <button
                onClick={handleShare}
                className="flex-1 bg-[linear-gradient(45deg,#587FFF,#09239F)] hover:bg-[linear-gradient(45deg,#6C8CFF,#0B2ED1)] text-white text-sm py-3 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <Share2 size={16} />
                Share
              </button>

              <button
  onClick={() => setShowQR(true)}
  className="flex-1 bg-[linear-gradient(45deg,#587FFF,#09239F)] hover:bg-[linear-gradient(45deg,#6C8CFF,#0B2ED1)] text-white text-sm py-3 rounded-full flex items-center justify-center gap-2 transition-all active:scale-95"
>
  QR Code
</button>
            </div>
          </div>
        </motion.div>

        {/* RECENT BUY TABLE */}
        <motion.div
          className="rounded-2xl border-2 border-[#444385] overflow-hidden"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          <div className="bg-[#00000033] p-4 backdrop-blur-[20px]">
            <p className="text-sm text-gray-300 mb-3">Recent Deposit</p>

            <div className="overflow-x-auto">
              <table className="min-w-[500px] w-full text-xs">
                <thead>
                  <tr className="text-gray-400 border-b border-[#333] text-left">
                    <th className="px-3 py-3 w-[60px]">S.No</th>
                   
                    <th className="py-2">Deposit ID</th>
                    <th>Amount</th>
                    <th>Date</th>
                    <th className="text-right">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {depositsLoading ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-gray-400">
                        Loading...
                      </td>
                    </tr>
                  ) : deposits.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center py-4 text-gray-500">
                        No deposits yet
                      </td>
                    </tr>
                  ) : (
                    deposits.map((deposit, index) => (
                      <tr key={deposit._id || index} className="border-b border-[#222] hover:bg-[#ffffff05] transition">
                        <td className="px-3 py-3 text-blue-400 font-medium">{index + 1}</td>
                        <td>#{deposit._id?.slice(-6) || "TXN"}</td>
                        <td>${deposit.creditedAmount}</td>
                        <td>{deposit.createdAt ? new Date(deposit.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "-"}</td>
                        <td className="text-right">
                          <span className="text-green-400 text-xs">completed</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>



      </div>

      {/* QR Modal */}
{showQR && (
  <div className="fixed  inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm px-2">
    
    <div className="relative  mb-20 w-full max-w-sm rounded-xl border border-[#81ECFF55] bg-[#0B0F19] px-4 py-4 text-center">

      {/* Close */}
     {/* Close */}
<button
  onClick={() => setShowQR(false)}
  className="absolute top-3 right-3 w-9 h-9 flex items-center justify-center rounded-full bg-white/5 border border-white/10 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 active:scale-95"
>
  <X size={18} strokeWidth={2.5} />
</button>

      <h2 className="text-xl font-semibold mb-2">
        Referral QR Code
      </h2>

      {/* QR */}
      <div className="bg-white p-4 rounded-2xl inline-block">
        <QRCodeSVG
  value={dashboard.referralLink}
  size={200}
/>
      </div>

      {/* Link */}
      <p className="text-xs text-gray-500 break-all mt-2">
        {dashboard.referralLink}
      </p>

      {/* Copy */}
      <button
        onClick={handleCopy}
        className="w-full mt-2 py-3 rounded-xl bg-gradient-to-r from-[#587FFF] to-[#09239F]"
      >
        Copy Referral Link
      </button>
    </div>
  </div>
)}
    </motion.div>
  );
};

export default HomeDashboard;