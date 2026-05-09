'use client';

import {
  User, Users, TrendingUp, Wallet,
  Plus, Clock, Download, ChevronRight , ArrowLeft
} from "lucide-react";
import { FaQuestion } from "react-icons/fa";
import { MdOutlinePolicy } from "react-icons/md";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import settingImg from "../../assets/setting/user-img.jpeg";
import { FaGavel } from "react-icons/fa";
import { useEffect, useState } from "react";

const SettingsComponent = () => {
  const navigate = useNavigate();
 const [tgUser, setTgUser] = useState(null);
 const [showLogoutPopup, setShowLogoutPopup] = useState(false);
 const handleLogout = () => {
  localStorage.clear();

  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.close(); // ✅ mini app band
  } else {
    navigate("/"); // fallback
  }
};

 useEffect(() => {
  if (window.Telegram?.WebApp) {
    window.Telegram.WebApp.ready();
    window.Telegram.WebApp.expand();

    const user = window.Telegram.WebApp.initDataUnsafe.user;
    console.log("USER:", user);

    setTgUser(user);
  }
}, []);

  const menuItems = [
    // {
    //   icon: <User size={18} />,
    //   title: "Account",
    //   subtitle: "Security, change number",
    //   action: () => navigate("/settings/profile"),
    // },
       {
      icon: <User size={18} />,
      title: "Account",
      subtitle: "Security, change number",
      action: () => navigate("/settings/WebProfile"),
    },
    {
      icon: <Users size={18} />,
      title: "My Referrals",
      subtitle: "Invite & manage referrals",
      action: () => navigate("/settings/referral"),
    },
    {
      icon: <TrendingUp size={18} />,
      title: "Referral Earnings",
      subtitle: "Track your earnings",
      action: () => navigate("/settings/referral-earning-history"),
    },
    {
      icon: <Wallet size={18} />,
      title: "Investment History",
      subtitle: "history of your investments",
      action: () => navigate("/settings/investment-history"),
    },
    {
      icon: <Plus size={18} />,
      title: "Add Funds",
      subtitle: "Deposit crypto",
      action: () => navigate("/addfund"),
    },
    {
      icon: <Clock size={18} />,
      title: "Deposit History",
      subtitle: "All transactions",
      action: () => navigate("/settings/deposit-history"),
    },
    {
      icon: <Download size={18} />,
      title: "Swap to Deposit",
      subtitle: "Convert ROI / Referral to deposit",
      action: () => navigate("/settings/swap-deposit"),
    },
    {
      icon: <Wallet size={18} />,
      title: "Withdraw USDT",
      subtitle: "Transfer funds",
      action: () => navigate("/settings/withdraw-usdt"),
    },
    {
      icon: <FaQuestion size={18} />,
      title: "FAQs",
      subtitle: "Common questions",
      action: () => navigate("/settings/faqs"),
    },
    {
      icon: <FaGavel size={18} />,
      title: "Terms & Conditions",
      subtitle: "Legal info",
      action: () => navigate("/settings/term-condition"),
    },
    {
      icon: <MdOutlinePolicy size={18} />,
      title: "Privacy Policy",
      subtitle: "Your data safety",
      action: () => navigate("/settings/privacy"),
    },
  ];

  return (
    <>
    <div className="min-h-screen  text-white pb-24">
  <div className="max-w-md mx-auto w-full">

      {/* 🔥 HEADER */}
      <div className="relative h-48 bg-gradient-to-b from-[#587FFF] to-black rounded-b-[50px] flex flex-col items-center justify-end pb-6">

  {/* 🔙 Back Button (Top Left) */}
  <button
    onClick={() => navigate("/")}
    className="absolute top-4 left-4 p-2 rounded-lg bg-[#000] border border-[#444385]"
  >
    <ArrowLeft size={18} />
  </button>
  <button
  onClick={() => setShowLogoutPopup(true)}
  className="absolute top-4 right-4 px-4 py-1.5 text-xs font-medium
  text-[#fff] rounded-lg

  bg-gradient-to-b from-red-500 to-red-800/40
  border border-[#fff] backdrop-blur-md

  shadow-[0_4px_0_#7f1d1d]
  hover:from-red-400/40 hover:to-red-700/50
  hover:scale-105

  active:translate-y-[2px]
  active:shadow-[0_2px_0_#7f1d1d]

  transition-all duration-150"
>
  Logout
</button>

  {/* 👤 Profile */}
  <div className="flex flex-col items-center">
    <img
      src={tgUser?.photo_url || settingImg}
      alt="profile"
      className="w-20 h-20 rounded-full border-2 border-white shadow-lg"
    />

    <h2 className="mt-2 font-semibold text-lg">
      {tgUser
        ? `${tgUser.first_name} ${tgUser.last_name || ""}`
        : "Loading..."}
    </h2>

    <p className="text-xs text-gray-300">
      {tgUser?.username ? `@${tgUser.username}` : ""}
    </p>
  </div>
</div>

      {/* 🔥 MENU LIST */}
      <div className="mt-4 space-y-1 px-3">

        {menuItems.map((item, index) => (
          <motion.div
            key={index}
            whileTap={{ scale: 0.97 }}
            onClick={item.action}
            className="flex items-center justify-between py-3 border-b border-white/10 cursor-pointer"
          >
            <div className="flex items-center gap-3">

              <div className="p-2 bg-white/5 rounded-lg">
                {item.icon}
              </div>

              <div>
                <p className="text-sm">{item.title}</p>
                <p className="text-xs text-gray-400">
                  {item.subtitle}
                </p>
              </div>
            </div>

            <ChevronRight size={18} className="text-gray-500" />
          </motion.div>
        ))}

      </div>
    </div>
    </div>

    
    {showLogoutPopup && (
  <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
    <div className="bg-gradient-to-r from-[#587FFF] to-[#09239F] p-6 rounded-xl w-[300px] text-center border border-[#fff]">

      <h2 className="text-lg font-semibold mb-3">
        Confirm Logout
      </h2>

      <p className="text-sm text-[#fff] mb-5">
        Are you sure you want to logout?
      </p>

      <div className="flex gap-3">
        {/* Cancel */}
       <button
  onClick={() => setShowLogoutPopup(false)}
  className="w-full py-2 rounded-lg 
  bg-gradient-to-b from-gray-600 to-gray-800 
  shadow-[0_4px_0_#1f2937] 
  active:shadow-[0_2px_0_#1f2937] 
  active:translate-y-[2px]
  hover:from-gray-500 hover:to-gray-700
  transition-all duration-150"
>
  Cancel
</button>

{/* Logout */}
<button
  onClick={handleLogout}
  className="w-full py-2 rounded-lg 
  bg-gradient-to-b from-red-400 to-red-700 
  shadow-[0_4px_0_#7f1d1d] 
  active:shadow-[0_2px_0_#7f1d1d] 
  active:translate-y-[2px]
  hover:from-red-300 hover:to-red-600
  transition-all duration-150"
>
  Logout
</button>

      </div>

    </div>
  </div>
)}
    </>
  );
};

export default SettingsComponent;