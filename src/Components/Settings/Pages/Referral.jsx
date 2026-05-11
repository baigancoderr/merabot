'use client';
import React, { useState, useEffect ,useMemo } from "react";
import bgImg from "../../../assets/bgImg.png";
import btmimg from "../../../assets/btmimg.png";
import { ArrowLeft, Users, Network, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import api from "../../../api/axios";
import SkeletonPage from "../../../Layout/Skeleton"
import { useQuery } from "@tanstack/react-query";


const Referral = () => {

  const { data: tree = [], isLoading, isError } = useQuery({
  queryKey: ["referralTree"],
  queryFn: async () => {
    const res = await api.get("/user/team-tree-view");

    if (res.data.status !== "success") {
      throw new Error("Failed to fetch");
    }

    return res.data.data.tree || [];
  },
});

  const navigate = useNavigate();
  // const [loading, setLoading] = useState(true);
  const [referralLink, setReferralLink] = useState("");

  // API States
  // const [directReferrals, setDirectReferrals] = useState(0);
  // const [teamSize, setTeamSize] = useState(0);
  // const [tableData, setTableData] = useState([]);

  // Filter & Pagination States
  const [selectedLevel, setSelectedLevel] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;



  // Calculate Direct Referrals & Total Team Size
  const calculateTeamStats = (treeArray) => {
    if (!treeArray || treeArray.length === 0) {
      return { directCount: 0, totalTeamSize: 0 };
    }

    let directCount = 0;
    let totalTeamSize = 0;

    const traverse = (nodes) => {
      nodes.forEach((node) => {
        totalTeamSize += 1;
        if (node.level === 1) directCount += 1;
        if (node.children?.length) traverse(node.children);
      });
    };

    traverse(treeArray);
    return { directCount, totalTeamSize };
  };

  // Flatten Tree for Table
  const flattenTreeForTable = (treeArray) => {
    const result = [];
    const traverse = (nodes) => {
      nodes.forEach((node) => {
        if (node.level > 0) {
          result.push({
            id: node.userId || node.referralCode || "N/A",
            name: node.name?.trim() || node.username || "Unknown User",
            level: node.level,
            selfInvestment: node.selfInvestment || 0,
            date: "12 Mar 2026", // Replace with actual date from API later
          });
        }
        if (node.children?.length) {
          traverse(node.children);
        }
      });
    };
    traverse(treeArray);
    return result;
  };

    // Fetch Team Tree
const { directReferrals, teamSize, tableData } = useMemo(() => {
  const stats = calculateTeamStats(tree);
  const flattened = flattenTreeForTable(tree);

  return {
    directReferrals: stats.directCount,
    teamSize: stats.totalTeamSize,
    tableData: flattened,
  };
}, [tree]);

  // Filter data based on selected level
  const filteredData = selectedLevel === "All"
    ? tableData
    : tableData.filter(item => item.level === parseInt(selectedLevel));

  // Pagination Logic
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLast = currentPage * itemsPerPage;
  const indexOfFirst = indexOfLast - itemsPerPage;
  const currentData = filteredData.slice(indexOfFirst, indexOfLast);

  const goToPage = (page) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
  };

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedLevel]);


useEffect(() => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));

    if (user?.referralCode) {
      const link = `https://t.me/cipera_bot?startapp=${user.referralCode}`;
      setReferralLink(link);
    }
  } catch (err) {
    console.error("Referral link error:", err);
  }
}, []);

const handleShare = () => {
  const text = "Join and earn 🚀";
  const url = referralLink;

  if (!url) {
    toast.error("Referral link not ready ");
    return;
  }

  if (window.Telegram?.WebApp) {
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent(
      url
    )}&text=${encodeURIComponent(text)}`;

    window.Telegram.WebApp.openTelegramLink(telegramShareUrl);
  } else if (navigator.share) {
    navigator.share({
      title: "Join Now 🚀",
      text,
      url,
    });
  } else {
    window.open(
      `https://t.me/share/url?url=${encodeURIComponent(
        url
      )}&text=${encodeURIComponent(text)}`,
      "_blank"
    );
  }
};

if (isLoading) {
  return <SkeletonPage type="referral" />;
}

if (isError) {
  return <p className="text-center text-red-400">Failed to load data</p>;
}

  return (
    <div className="pb-20 py-3 px-3 text-white font-sans flex justify-center">
      <div className="w-full max-w-md mx-auto relative">
        {/* Header */}
        <div className="flex justify-between items-center mb-5">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/settings")}
              className="p-2 rounded-lg bg-[#00000033] border border-[#444385]"
            >
              <ArrowLeft size={18} />
            </button>
            <h2 className="text-lg font-semibold">Referral</h2>
          </div>
          <div
            onClick={() => navigate("/settings")}
            className="w-10 h-10 flex items-center justify-center rounded-xl
              bg-gradient-to-r from-[#587FFF] to-[#09239F]
              shadow-lg shadow-blue-500/20 cursor-pointer active:scale-95 transition"
          >
            <User size={18} />
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-4 hover:border-blue-400">
            <div className="flex items-center gap-2 mb-3">
              <Users size={20} className="text-emerald-400" />
              <p className="text-xs text-gray-400">Direct Referrals</p>
            </div>
        <p className="text-xl font-bold">{directReferrals}</p>
            <p className="text-emerald-400 text-sm mt-1">Active Users</p>
          </div>

          <div 
            onClick={() => navigate("/referral-team-tree")}
            className="bg-white/10 backdrop-blur-xl border border-white/10 rounded-xl px-4 py-4 cursor-pointer active:scale-95 transition hover:border-blue-400"
          >
            <div className="flex items-center gap-2 mb-3">
              <Network size={20} className="text-blue-400" />
              <p className="text-xs text-gray-400">Team Size</p>
            </div>
            <p className="text-xl font-bold">{teamSize}</p>
            <p className="text-blue-400 text-sm mt-1">View Full Tree →</p>
          </div>
        </div>

        {/* Referral Network Section */}
        <div className="mt-6 border border-[#444385] rounded-lg px-4 py-5 bg-[#00000033]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-md font-semibold">Referral Network</h2>

            {/* Level Filter Select Box */}
            <div className="relative">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="bg-[#0B0F1A] border border-[#444385] text-white text-sm rounded-lg px-4 py-2 
                           focus:outline-none focus:border-[#81ECFF] cursor-pointer appearance-none pr-8"
                disabled={isLoading}
              >
                <option value="All">All Levels</option>
                <option value="1">Level 1</option>
                <option value="2">Level 2</option>
                <option value="3">Level 3</option>
                <option value="4">Level 4</option>
                <option value="5">Level 5</option>
                {/* Add more levels if your app supports deeper levels */}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-gray-400">
                ▼
              </div>
            </div>
          </div>

          {/* Table */}
         <div className="rounded-lg border border-[#81ECFF66] p-[1px] bg-[linear-gradient(217deg,_rgba(88,127,255,0.4),_rgba(0,7,64,0.2))]">
  <div className="rounded-lg bg-[#0B0F1A] backdrop-blur-xl overflow-hidden">
    <div className="overflow-x-auto">
      <table className="min-w-[600px] w-full text-sm">
        <thead className="bg-[linear-gradient(90deg,_rgba(88,127,255,0.1),_transparent)] uppercase">
          <tr className="text-white border-b border-[#1f2430]">
            <th className="px-4 py-3 text-left">S.No</th>
            <th className="px-4 py-3 text-left">ID</th>
            <th className="px-4 py-3 text-left">Name</th>
            <th className="px-4 py-3 text-left">Level</th>
            <th className="px-4 py-3 text-center">Investment</th>
            <th className="px-4 py-3 text-right">Date</th>
          </tr>
        </thead>

       <tbody>
  {currentData.length === 0 ? (
    <tr>
      <td colSpan="6" className="text-center py-10 text-gray-400">
        No referrals found for selected level
      </td>
    </tr>
  ) : (
    currentData.map((item, i) => (
      <tr
        key={item.id || i}
        className="border-b border-[#1f2430] hover:bg-[linear-gradient(90deg,_rgba(88,127,255,0.1),_transparent)]"
      >
        {/* S.No */}
        <td className="px-4 py-3 text-blue-400 font-medium">
          {indexOfFirst + i + 1}
        </td>

        {/* ID */}
        <td className="px-4 py-3">
          {item.id}
        </td>

        {/* Name */}
        <td
          className="px-4 py-3 font-medium whitespace-nowrap overflow-hidden text-ellipsis max-w-[150px]"
          title={item.name}
        >
          {item.name}
        </td>

        {/* Level */}
        <td className="px-4 py-3">
          <span
            className={`text-xs px-3 py-1 rounded-full ${
              item.level === 1
                ? "bg-blue-500/20 text-blue-300"
                : "bg-green-500/20 text-green-300"
            }`}
          >
             {item.level}
          </span>
        </td>

        {/* Investment */}
        <td className="px-4 py-3 text-center font-bold text-[#81ECFF]">
          {item.selfInvestment}
        </td>

        {/* Date */}
        <td className="px-4 py-3 text-right text-xs text-gray-400">
          {item.date}
        </td>
      </tr>
    ))
  )}
</tbody>


      </table>
    </div>
  </div>
</div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-4 px-1">
              <p className="text-xs text-gray-400">
                Page <span className="text-white">{currentPage}</span> of {totalPages}
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-[#444385] rounded disabled:opacity-40"
                >
                  ⏮
                </button>
                <button
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-2 py-1 text-xs border border-[#444385] rounded disabled:opacity-40"
                >
                  ←
                </button>
                <button
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs border border-[#444385] rounded disabled:opacity-40"
                >
                  →
                </button>
                <button
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-2 py-1 text-xs border border-[#444385] rounded disabled:opacity-40"
                >
                  ⏭
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Image Section */}
        <div className="relative mt-8">
          <img src={btmimg} alt="No Referrals" className="w-full rounded-3xl" />
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-8">
            <div className="mt-6">
              <h2 className="text-lg font-semibold mb-2">No Referrals Yet</h2>
              <p className="text-gray-300 text-[14px] leading-relaxed max-w-[330px]">
                Start sharing your referral code to earn commission on every trade your friends make.
              </p>
            </div>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full px-10">
              <button
                className="w-full font-semibold text-md py-3 rounded-xl shadow-xl active:scale-95 transition-all text-white"
                style={{ background: 'linear-gradient(45deg, #587FFF 0%, #09239F 100%)' }}
                onClick={handleShare}
              >
                Invite Friends
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Referral;